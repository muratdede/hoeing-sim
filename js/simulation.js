/* simulation.js - Robocrop simulation engine | no ES modules, works via file:// */

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD = {
    ROWS: 6,
    ROW_SPACING: 90,
    ROW_LENGTH: 1800,
    MARGIN_TOP: 60,
    MARGIN_LEFT: 40,
};

const PLANT = {
    CROP_RADIUS: 10,
    WEED_RADIUS: 6,
    MIN_SPACING: 38,
};

const ROBOT = {
    WIDTH: 60,
    HEIGHT: 80,
    CAMERA_FOV_AHEAD: 120,
    CAMERA_FOV_SIDE: FIELD.ROW_SPACING / 2,
};

const ROTOR = {
    TINE_COUNT: 1,
    TINE_RADIUS: 18,
    RPM: 120,
    OFFSET: 10,
};

// ─── Entity Classes ───────────────────────────────────────────────────────────

let _nextId = 0;
const uid = () => `e${_nextId++}`;

class Plant {
    constructor(x, y, type) {
        this.id = uid();
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = type === 'crop' ? PLANT.CROP_RADIUS : PLANT.WEED_RADIUS;
        this.state = 'alive';   // 'alive' | 'removed' | 'damaged'
        this.w = this.radius * 2;
        this.h = this.radius * 2;
    }
}

class CropRow {
    constructor(index) {
        this.index = index;
        this.centreX = FIELD.MARGIN_LEFT + ROBOT.WIDTH / 2 + index * FIELD.ROW_SPACING;
        this.plants = [];
    }

    populate(weedDensity = 0.35) {
        this.plants = [];
        let y = FIELD.MARGIN_TOP + 30;
        while (y < FIELD.MARGIN_TOP + FIELD.ROW_LENGTH - 30) {
            const type = Math.random() < weedDensity ? 'weed' : 'crop';
            const plant = new Plant(this.centreX, y, type);
            const tooClose = this.plants.some(p => Math.abs(p.y - y) < PLANT.MIN_SPACING);
            if (!tooClose) this.plants.push(plant);
            y += PLANT.MIN_SPACING * (0.8 + Math.random() * 0.8);
        }
    }
}

class ERotor {
    constructor(rowCentreX) {
        this.rowCentreX = rowCentreX + ROTOR.OFFSET + ROTOR.TINE_RADIUS / 2;
        this.angle = -Math.PI / 2;
        this.isRetracted = true;
        this.rpm = ROTOR.RPM;
        this.trackedCrops = new Map(); // entityId -> plant object
    }

    addDetection(plant) {
        this.trackedCrops.set(plant.id, plant);
    }

    update(deltaMs, robotY, robotSpeed) {
        // Clean up crops that have safely passed behind the tractor completely
        for (const [id, p] of this.trackedCrops.entries()) {
            if (p.y > robotY + 120) this.trackedCrops.delete(id);
        }

        const cy = robotY + ROBOT.HEIGHT / 2;
        const speedPxPerMs = robotSpeed / 1000;
        const y_prime = PLANT.CROP_RADIUS * 3; // bitkinin eksen üzerindeki uzunluğu + displacement ve tolerans

        let targetW = 0;
        for (const crop of this.trackedCrops.values()) {
            // bitki geldiğinde w=(2.pi.V) / y' açısal hızıyla dönüp bitkiden kaçınacak
            if (cy >= crop.y - (y_prime / 2) && cy <= crop.y + (y_prime / 2)) {
                targetW = (2 * Math.PI * speedPxPerMs) / y_prime;
                break;
            }
        }

        if (targetW === 0) {
            this.angle = -Math.PI / 2;
        } else {
            this.angle += targetW * deltaMs;
            this.angle %= (2 * Math.PI);
        }
    }

    getTinePositions(robotY) {
        const positions = [];
        for (let i = 0; i < ROTOR.TINE_COUNT; i++) {
            // sistemin sıfır açısı: şuanki -90 derece 0 derece yapıldı
            const a = this.angle - (Math.PI / 2) + (i / ROTOR.TINE_COUNT) * 2 * Math.PI;
            positions.push({
                x: this.rowCentreX + Math.cos(a) * ROTOR.TINE_RADIUS,
                y: robotY + Math.sin(a) * ROTOR.TINE_RADIUS,
            });
        }
        return positions;
    }
}

class Robot {
    constructor(rows) {
        this.rows = rows;
        this.y = FIELD.MARGIN_TOP;
        this.speed = 60;
        this.lateralOffset = 0; // px displacement left/right from ideal center
        this.rotors = rows.map(row => new ERotor(row.centreX));
        this.cameraFovAhead = ROBOT.CAMERA_FOV_AHEAD;
        this.finished = false;
    }

    update(deltaMs) {
        if (this.finished) return;
        this.y += (this.speed * deltaMs) / 1000;
        if (this.y >= FIELD.MARGIN_TOP + FIELD.ROW_LENGTH) {
            this.y = FIELD.MARGIN_TOP + FIELD.ROW_LENGTH;
            this.finished = true;
        }

        // Rotors move with lateralOffset
        this.rotors.forEach((r, i) => {
            r.rowCentreX = this.rows[i].centreX + ROTOR.OFFSET + ROTOR.TINE_RADIUS / 2 + this.lateralOffset;
            r.update(deltaMs, this.y, this.speed);
        });
    }

    getVisibleEntities(rows) {
        const visible = [];
        const yMin = this.y;
        const yMax = this.y + this.cameraFovAhead;
        // Camera also shifts with lateral offset
        const xOffset = 0; //this.lateralOffset;

        rows.forEach(row => {
            row.plants.forEach(plant => {
                // If it's outside the shifted FOV horizontally, we shouldn't see it (for extreme shifts)
                // But simplified: assuming FOV is wide enough. We just shift the returned X.
                if (plant.state === 'alive' && plant.y >= yMin && plant.y <= yMax) {
                    visible.push({
                        id: plant.id, type: plant.type,
                        x: plant.x - plant.radius - xOffset, // camera sees it offset
                        y: plant.y - plant.radius,
                        w: plant.w, h: plant.h,
                        _plant: plant, _rowIndex: row.index,
                    });
                }
            });
        });
        return visible;
    }
}

class Stats {
    constructor() { this.reset(); }

    reset() {
        this.weedsRemoved = 0;
        this.weedsTotal = 0;
        this.cropsDamaged = 0;
        this.cropsTotal = 0;
        this.truePositives = 0;
        this.falsePositives = 0;
        this.falseNegatives = 0;
        this.actionLog = [];
        this.weedRemovedTimeline = [];
        this._elapsedMs = 0;
    }

    get precision() { const d = this.truePositives + this.falsePositives; return d ? this.truePositives / d : 1; }
    get recall() { const d = this.truePositives + this.falseNegatives; return d ? this.truePositives / d : 1; }
    get weedClearanceRate() { return this.weedsTotal ? this.weedsRemoved / this.weedsTotal : 0; }
    get cropSafetyRate() { return this.cropsTotal ? 1 - (this.cropsDamaged / this.cropsTotal) : 1; }

    log(event) {
        this.actionLog.unshift({ ...event, t: this._elapsedMs });
        if (this.actionLog.length > 60) this.actionLog.pop();
    }
}

// ─── Simulation Engine ────────────────────────────────────────────────────────

class SimulationEngine {
    constructor(config = {}) {
        this.config = {
            rows: config.rows ?? FIELD.ROWS,
            weedDensity: config.weedDensity ?? 0.35,
            robotSpeed: config.robotSpeed ?? 60,
            accuracy: config.accuracy ?? 0.92,
            fpr: config.fpr ?? 0.05,
        };
        this.model = new MockVisionModel({ accuracy: this.config.accuracy, falsePositiveRate: this.config.fpr, latencyMs: 0 });
        this.stats = new Stats();
        this._rows = [];
        this._robot = null;
        this._running = false;
        this._lastTs = null;
        this._rafId = null;
        this._processedIds = new Set();
        this._pendingExternalDets = [];
        this.onUpdate = null;
        this._initField();
    }

    start() {
        if (this._running) return;
        this._running = true;
        this._lastTs = performance.now();
        this._rafId = requestAnimationFrame(ts => this._loop(ts));
    }

    pause() {
        this._running = false;
        if (this._rafId) cancelAnimationFrame(this._rafId);
    }

    resume() {
        if (this._running) return;
        this._running = true;
        this._lastTs = performance.now();
        this._rafId = requestAnimationFrame(ts => this._loop(ts));
    }

    reset(config = {}) {
        this.pause();
        Object.assign(this.config, config);
        this.model.configure({ accuracy: this.config.accuracy, falsePositiveRate: this.config.fpr });
        this._processedIds.clear();
        this._pendingExternalDets = [];
        this.stats.reset();
        this._initField();
        this._emitUpdate();
    }

    configure(config = {}) {
        Object.assign(this.config, config);
        if (this._robot) this._robot.speed = this.config.robotSpeed;
        this.model.configure({ accuracy: this.config.accuracy, falsePositiveRate: this.config.fpr });
    }

    applyExternalDetections(detections) {
        this._pendingExternalDets.push(...detections);
    }

    matchDetectionsToPlants(rawBoxes) {
        const alive = [];
        this._rows.forEach(row => row.plants.forEach(p => { if (p.state === 'alive') alive.push(p); }));

        return rawBoxes.map(box => {
            const bCx = box.bbox.x + box.bbox.w / 2;
            const bCy = box.bbox.y + box.bbox.h / 2;
            let closest = null, minDist = Infinity;
            alive.forEach(p => {
                const d = (p.x - bCx) ** 2 + (p.y - bCy) ** 2;
                if (d < minDist) { minDist = d; closest = p; }
            });
            return { entityId: closest?.id ?? null, label: box.label, confidence: box.confidence, bbox: box.bbox };
        }).filter(d => d.entityId !== null);
    }

    getState() {
        return { rows: this._rows, robot: this._robot, stats: this.stats, config: this.config };
    }

    // ── Private ──────────────────────────────────────────────────────────────

    _initField() {
        _nextId = 0;
        this._rows = [];
        for (let i = 0; i < this.config.rows; i++) {
            const row = new CropRow(i);
            row.populate(this.config.weedDensity);
            this._rows.push(row);
        }
        this._robot = new Robot(this._rows);
        this._robot.speed = this.config.robotSpeed;
        this._rows.forEach(row => row.plants.forEach(p => {
            if (p.type === 'crop') this.stats.cropsTotal++;
            else this.stats.weedsTotal++;
        }));
    }

    _loop(timestamp) {
        if (!this._running) return;
        const deltaMs = Math.min(timestamp - this._lastTs, 100);
        this._lastTs = timestamp;
        this.stats._elapsedMs += deltaMs;
        this._robot.update(deltaMs);
        this._runDetection();
        this._checkCollisions();
        this._emitUpdate();
        if (this._robot.finished) { this._running = false; return; }
        this._rafId = requestAnimationFrame(ts => this._loop(ts));
    }

    _runDetection() {
        const visible = this._robot.getVisibleEntities(this._rows);
        const visibleMap = new Map(visible.map(v => [v.id, v]));

        const external = this._pendingExternalDets.splice(0);
        if (external.length > 0) { this._applyDetections(external, visibleMap); return; }

        if (visible.length === 0) return;
        this._applyDetections(this.model.detectSync(visible), visibleMap);
    }

    _applyDetections(detections, visibleMap) {
        detections.forEach(det => {
            if (this._processedIds.has(det.entityId)) return;
            const entity = visibleMap.get(det.entityId);
            if (!entity) return;
            const rowIndex = entity._rowIndex;
            if (det.label === 'crop') {
                // Pass the ground-truth physical properties of the detected crop to the rotor 
                // so it can predict physics
                this._robot.rotors[rowIndex].addDetection(entity._plant);

                if (det.trueType === 'weed') {
                    this.stats.falseNegatives++;
                    this.stats.log({ type: 'fn', label: 'Yabancı ot kaçtı', entityId: det.entityId, y: entity._plant.y, row: rowIndex });
                }
            } else {
                if (det.trueType === 'crop') this.stats.falsePositives++;
                else this.stats.truePositives++;
            }
            this._processedIds.add(det.entityId);
            entity._plant._detection = det;
        });
    }

    _checkCollisions() {
        this._rows.forEach((row, rowIndex) => {
            const rotor = this._robot.rotors[rowIndex];
            const tines = rotor.getTinePositions(this._robot.y + ROBOT.HEIGHT / 2);
            row.plants.forEach(plant => {
                if (plant.state !== 'alive') return;
                if (plant.y < this._robot.y || plant.y > this._robot.y + ROBOT.HEIGHT) return;
                const hit = tines.some(t => Math.sqrt((t.x - plant.x) ** 2 + (t.y - plant.y) ** 2) < plant.radius + 2);
                if (hit) {
                    if (plant.type === 'weed') {
                        plant.state = 'removed';
                        this.stats.weedsRemoved++;
                        this.stats.weedRemovedTimeline.push({ t: this.stats._elapsedMs, count: this.stats.weedsRemoved });
                        this.stats.log({ type: 'tp', label: 'Yabancı ot temizlendi ✓', entityId: plant.id, y: plant.y, row: rowIndex });
                    } else {
                        plant.state = 'damaged';
                        this.stats.cropsDamaged++;
                        this.stats.log({ type: 'fp', label: 'Ürün zarar gördü ✗', entityId: plant.id, y: plant.y, row: rowIndex });
                    }
                }
            });
        });
    }

    _emitUpdate() {
        if (typeof this.onUpdate === 'function') this.onUpdate(this.getState());
    }
}
