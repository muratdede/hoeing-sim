const CLR = {
    soil: '#2a1f0e', rowSoil: '#3b2a14',
    cropAlive: '#4caf72', cropDamaged: '#e74c3c',
    weedAlive: '#c0392b', weedRemoved: '#555',
    rotor: '#ddd', rotorHalted: '#3498db',
    fovFill: 'rgba(100,200,255,0.05)', fovBorder: 'rgba(100,200,255,0.25)',
    bboxCrop: 'rgba(76,175,114,0.85)',
    bboxWeed: 'rgba(220,80,60,0.85)',
    bboxFp: 'rgba(255,165,0,0.85)',
    tine: '#ccc', tineHalted: 'rgba(52,152,219,0.7)',
    grid: 'rgba(255,255,255,0.04)',
};

// ─── Canvas Renderer ──────────────────────────────────────────────────────────

class CanvasRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this._scroll = 0;
    }

    render(state) {
        const { rows, robot, stats } = state;
        const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        this._scroll = Math.max(0, robot.y - H * 0.40);
        ctx.clearRect(0, 0, W, H);
        ctx.save();
        ctx.translate(0, -this._scroll);
        this._drawBackground(W, H + this._scroll);
        this._drawRows(rows);
        this._drawCamera(robot);
        this._drawPlants(rows);
        this._drawDetections(rows, robot);
        this._drawRotors(robot);
        this._drawRobot(robot, rows);
        ctx.restore();
        this._drawHUD(ctx, stats, robot, W, H);
    }

    _drawBackground(W, H) {
        const ctx = this.ctx;
        ctx.fillStyle = CLR.soil;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = CLR.grid; ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }

    _drawRows(rows) {
        const ctx = this.ctx;
        rows.forEach(row => {
            ctx.fillStyle = CLR.rowSoil;
            ctx.fillRect(row.centreX - 22, FIELD.MARGIN_TOP, 44, FIELD.ROW_LENGTH);
        });
    }

    _drawCamera(robot) {
        const ctx = this.ctx, rows = robot.rows;
        if (!rows || rows.length === 0) return;
        const offset = robot.lateralOffset; // apply lateral camera twist
        const x0 = rows[0].centreX - FIELD.ROW_SPACING / 2 + offset;
        const x1 = rows[rows.length - 1].centreX + FIELD.ROW_SPACING / 2 + offset;
        ctx.fillStyle = CLR.fovFill; ctx.strokeStyle = CLR.fovBorder; ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.fillRect(x0, robot.y, x1 - x0, robot.cameraFovAhead);
        ctx.strokeRect(x0, robot.y, x1 - x0, robot.cameraFovAhead);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(100,200,255,0.6)'; ctx.font = '10px Inter, sans-serif';
        ctx.fillText('CAMERA FOV', x0 + 4, robot.y + 12);
    }

    _drawPlants(rows) {
        const ctx = this.ctx;
        rows.forEach(row => {
            row.plants.forEach(plant => {
                if (plant.state === 'removed') {
                    ctx.globalAlpha = 0.3; ctx.strokeStyle = CLR.weedRemoved; ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(plant.x - 5, plant.y - 5); ctx.lineTo(plant.x + 5, plant.y + 5);
                    ctx.moveTo(plant.x + 5, plant.y - 5); ctx.lineTo(plant.x - 5, plant.y + 5);
                    ctx.stroke(); ctx.globalAlpha = 1; return;
                }
                const color = plant.type === 'crop'
                    ? (plant.state === 'damaged' ? CLR.cropDamaged : CLR.cropAlive)
                    : CLR.weedAlive;

                // Glow
                const grd = ctx.createRadialGradient(plant.x, plant.y, 0, plant.x, plant.y, plant.radius * 2);
                grd.addColorStop(0, color); grd.addColorStop(0.6, color + 'aa'); grd.addColorStop(1, color + '00');
                ctx.globalAlpha = 0.25; ctx.fillStyle = grd;
                ctx.beginPath(); ctx.arc(plant.x, plant.y, plant.radius * 2, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1; ctx.fillStyle = color;

                if (plant.type === 'crop') {
                    this._drawStar(ctx, plant.x, plant.y, 5, plant.radius, plant.radius * 0.4);
                } else {
                    ctx.beginPath(); ctx.arc(plant.x, plant.y, plant.radius, 0, Math.PI * 2); ctx.fill();
                }
            });
        });
    }

    _drawStar(ctx, cx, cy, spikes, outerR, innerR) {
        let rot = (Math.PI / 2) * 3; const step = Math.PI / spikes;
        ctx.beginPath(); ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR); rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR); rot += step;
        }
        ctx.closePath(); ctx.fill();
    }

    _drawDetections(rows, robot) {
        const ctx = this.ctx;
        rows.forEach(row => {
            row.plants.forEach(plant => {
                if (!plant._detection || plant.state !== 'alive') return;
                if (plant.y < robot.y || plant.y > robot.y + robot.cameraFovAhead) return;
                const det = plant._detection;
                const isFP = det.label === 'weed' && det.trueType === 'crop';
                const color = det.label === 'crop' ? CLR.bboxCrop : (isFP ? CLR.bboxFp : CLR.bboxWeed);
                ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
                ctx.strokeRect(det.bbox.x, det.bbox.y, det.bbox.w, det.bbox.h);
                ctx.setLineDash([]);
                ctx.fillStyle = color; ctx.font = 'bold 9px Inter, monospace';
                ctx.fillText(`${det.label} ${(det.confidence * 100).toFixed(0)}%`, det.bbox.x, det.bbox.y - 3);
            });
        });
    }

    _drawRotors(robot) {
        const ctx = this.ctx;
        robot.rotors.forEach(rotor => {
            const cx = rotor.rowCentreX, cy = robot.y + 40;
            ctx.globalAlpha = 0.3;
            // Draw mechanical hub
            ctx.fillStyle = rotor.isHalted ? CLR.rotorHalted : CLR.rotor;
            ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;

            rotor.getTinePositions(cy).forEach(t => {
                const cShapeRadius = 6;
                const a = Math.atan2(t.y - cy, t.x - cx); // teta angle (radial)

                ctx.strokeStyle = rotor.isHalted ? CLR.tineHalted : CLR.tine;
                ctx.fillStyle = rotor.isHalted ? CLR.tineHalted : CLR.tine;
                ctx.lineWidth = 2;
                
                const startX = cx + Math.cos(a) * cShapeRadius;
                const startY = cy + Math.sin(a) * cShapeRadius;
                const endX = t.x + Math.cos(a) * 2;
                const endY = t.y + Math.sin(a) * 2;
                
                ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();

                // Draw C shape at the center
                const minusTheta = a - Math.PI; // -theta direction (negative tangential)
                const gap = Math.PI / 3;

                ctx.beginPath();
                ctx.arc(cx, cy, cShapeRadius, minusTheta + gap, minusTheta + 2 * Math.PI - gap);
                ctx.stroke();
            });
        });
    }

    _drawRobot(robot, rows) {
        const ctx = this.ctx;
        // The base frame doesn't shift, it's on fixed rails. Or does the whole frame shift?
        // Let's assume the side-shift frame shifts relative to the main chassis, 
        // so we draw the shifted eROTOR block.
        const offset = robot.lateralOffset;
        const x0 = rows[0].centreX - 30 + offset;
        const w = rows[rows.length - 1].centreX - rows[0].centreX + 60;
        const grd = ctx.createLinearGradient(x0, robot.y, x0, robot.y + 36);
        grd.addColorStop(0, '#d4a82a55'); grd.addColorStop(1, '#8a601055');
        ctx.fillStyle = grd; ctx.strokeStyle = '#f0c840'; ctx.lineWidth = 2;
        this._roundRect(ctx, x0, robot.y, w, 36, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText('eROTOR UNIT', x0 + 8, robot.y + 14);
        ctx.font = '9px monospace'; ctx.fillStyle = '#f0c840';
        ctx.fillText(`${robot.speed.toFixed(0)} px/s`, x0 + 8, robot.y + 28);

        // Draw the red reference line for robot.y
        ctx.beginPath();
        ctx.moveTo(rows[0].centreX - FIELD.ROW_SPACING, robot.y);
        ctx.lineTo(rows[rows.length - 1].centreX + FIELD.ROW_SPACING, robot.y);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'red';
        ctx.font = '10px monospace';
        ctx.fillText('robot.y ref', rows[rows.length - 1].centreX + FIELD.ROW_SPACING + 5, robot.y + 3);
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }

    _drawHUD(ctx, stats, robot, W, H) {
        const progress = Math.min((robot.y - FIELD.MARGIN_TOP) / FIELD.ROW_LENGTH, 1);
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, H - 6, W, 6);
        const grd = ctx.createLinearGradient(0, 0, W, 0);
        grd.addColorStop(0, '#f0c840'); grd.addColorStop(1, '#4caf72');
        ctx.fillStyle = grd; ctx.fillRect(0, H - 6, W * progress, 6);
    }
}

// ─── Sparkline Chart ──────────────────────────────────────────────────────────

class SparkChart {
    constructor(canvas, color = '#4caf72') {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.color = color; this.data = []; this.maxPts = 120;
    }
    push(value) {
        this.data.push(value);
        if (this.data.length > this.maxPts) this.data.shift();
        this._draw();
    }
    _draw() {
        const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        ctx.clearRect(0, 0, W, H);
        if (this.data.length < 2) return;
        const max = Math.max(...this.data, 1);
        const pts = this.data.map((v, i) => ({ x: (i / (this.data.length - 1)) * W, y: H - (v / max) * H * 0.9 }));
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, this.color + '55'); grd.addColorStop(1, this.color + '00');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(pts[0].x, H);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, H); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke();
    }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

class Dashboard {
    constructor(engine) {
        this.engine = engine;
        this._weedChart = new SparkChart(document.getElementById('weed-chart'), '#e74c3c');
        this._cropChart = new SparkChart(document.getElementById('crop-chart'), '#4caf72');
        this._tick = 0;
        this._bindControls();
    }

    update(state) {
        const { stats, robot } = state;
        this._tick++;

        this._setText('stat-weeds-removed', stats.weedsRemoved);
        this._setText('stat-weeds-total', stats.weedsTotal);
        this._setText('stat-crops-damaged', stats.cropsDamaged);
        this._setText('stat-crops-total', stats.cropsTotal);
        this._setText('stat-precision', (stats.precision * 100).toFixed(1) + '%');
        this._setText('stat-recall', (stats.recall * 100).toFixed(1) + '%');
        this._setText('stat-clearance', (stats.weedClearanceRate * 100).toFixed(1) + '%');
        this._setText('stat-safety', (stats.cropSafetyRate * 100).toFixed(1) + '%');

        this._setBar('bar-clearance', stats.weedClearanceRate);
        this._setBar('bar-safety', stats.cropSafetyRate);
        this._setBar('bar-precision', stats.precision);

        const progress = Math.min((robot.y - 60) / 1800, 1);
        this._setBar('bar-progress', progress);
        this._setText('stat-progress', (progress * 100).toFixed(0) + '%');

        if (this._tick % 15 === 0) {
            this._weedChart.push(stats.weedsRemoved);
            this._cropChart.push(stats.cropsTotal - stats.cropsDamaged);
        }
        if (this._tick % 6 === 0) this._updateLog(stats.actionLog);

        // Render eRotor Matrix
        const matrixEl = document.getElementById('erotor-matrix');
        if (matrixEl) {
            matrixEl.innerHTML = robot.rotors.map((r, i) => {
                const bg = r.isHalted ? '#3498db' : '#2ecc71';
                const opacity = r.isHalted ? '1' : '0.4';
                return `<div style="flex:1; text-align:center; padding:4px; border-radius:3px; background:${bg}; opacity:${opacity}; color:#fff; font-size:10px; font-weight:bold; font-family:monospace; margin-right:2px; box-shadow: 0 0 5px ${bg}88;">R${i + 1}</div>`;
            }).join('');
        }

        // Steer text
        const alignText = document.getElementById('alignment-text');
        if (alignText) {
            if (robot.lateralOffset === 0) {
                alignText.textContent = 'Hizalı (Offset: 0px)';
                alignText.style.color = 'var(--text-muted)';
            } else {
                const dir = robot.lateralOffset > 0 ? 'Sağ' : 'Sol';
                alignText.textContent = `${dir}a Kaydı (Offset: ${Math.abs(robot.lateralOffset)}px)`;
                alignText.style.color = 'var(--accent-red)';
            }
        }
    }

    _updateLog(log) {
        const el = document.getElementById('detection-log');
        if (!el) return;
        
        if (log.length === 0) {
            if (this._lastLogTime !== null) {
                el.innerHTML = '';
                this._lastLogTime = null;
            }
            return;
        }

        if (this._lastLogTime === log[0].t) return;
        
        const newLogs = [];
        for (let i = 0; i < Math.min(log.length, 14); i++) {
            const e = log[i];
            if (this._lastLogTime !== null && e.t <= this._lastLogTime) break;
            newLogs.push(e);
        }

        this._lastLogTime = log[0].t;

        const newHtml = newLogs.map(e => {
            const cls = e.type === 'tp' ? 'log-tp' : e.type === 'fn' ? 'log-fn' : 'log-fp';
            return `<div class="log-entry ${cls}">
                <span class="log-time">${(e.t / 1000).toFixed(1)}s</span>
                <span class="log-row">R${e.row + 1}</span>
                <span class="log-msg">${e.label}</span>
            </div>`;
        }).join('');

        el.insertAdjacentHTML('afterbegin', newHtml);

        while (el.children.length > 14) {
            el.removeChild(el.lastChild);
        }
    }

    _bindControls() {
        this._bindSlider('ctrl-speed', v => this.engine.configure({ robotSpeed: v }));
        this._bindSlider('ctrl-accuracy', v => this.engine.configure({ accuracy: v / 100 }));
        this._bindSlider('ctrl-fpr', v => this.engine.configure({ fpr: v / 100 }));

        const updateAlignUI = () => {
            const off = this.engine._robot?.lateralOffset ?? 0;
            const l = document.getElementById('align-l');
            const c = document.getElementById('align-c');
            const r = document.getElementById('align-r');
            if (!l || !c || !r) return;
            l.style.color = off < 0 ? 'var(--accent-red)' : 'var(--text-muted)';
            c.style.color = off === 0 ? 'var(--text-primary)' : 'var(--text-muted)';
            r.style.color = off > 0 ? 'var(--accent-red)' : 'var(--text-muted)';
        };

        document.getElementById('btn-steer-left')?.addEventListener('click', () => {
            if (this.engine._robot) {
                this.engine._robot.lateralOffset -= 5;
                updateAlignUI();
            }
        });
        document.getElementById('btn-steer-right')?.addEventListener('click', () => {
            if (this.engine._robot) {
                this.engine._robot.lateralOffset += 5;
                updateAlignUI();
            }
        });

        document.getElementById('btn-pause')?.addEventListener('click', () => {
            const btn = document.getElementById('btn-pause');
            if (this.engine._running) {
                this.engine.pause();
                btn.textContent = '▶ Resume'; btn.classList.add('paused');
            } else {
                this.engine.resume();
                btn.textContent = '⏸ Pause'; btn.classList.remove('paused');
            }
        });

        document.getElementById('btn-reset')?.addEventListener('click', () => {
            const speed = parseInt(document.getElementById('ctrl-speed')?.value ?? 60);
            const accuracy = parseInt(document.getElementById('ctrl-accuracy')?.value ?? 92) / 100;
            const fpr = parseInt(document.getElementById('ctrl-fpr')?.value ?? 5) / 100;
            const density = parseInt(document.getElementById('ctrl-density')?.value ?? 35) / 100;
            this.engine.reset({ robotSpeed: speed, accuracy, fpr, weedDensity: density });
            document.getElementById('btn-pause').textContent = '⏸ Pause';
            document.getElementById('btn-pause').classList.remove('paused');
            this.engine.start();
            this._weedChart.data = []; this._cropChart.data = [];
        });
    }

    _bindSlider(id, onChange) {
        const el = document.getElementById(id), out = document.getElementById(id + '-val');
        if (!el) return;
        el.addEventListener('input', () => { if (out) out.textContent = el.value; onChange(parseFloat(el.value)); });
    }

    _setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
    _setBar(id, ratio) { const el = document.getElementById(id); if (el) el.style.width = (Math.min(ratio, 1) * 100).toFixed(1) + '%'; }
}

// ─── VideoFeed wiring ─────────────────────────────────────────────────────────

function initVideoFeed(engine) {
    let activeFeed = null;

    const setFeedStatus = (msg, color = 'var(--text-muted)') => {
        const el = document.getElementById('feed-status');
        if (el) { el.textContent = msg; el.style.color = color; }
    };

    const startFeed = async (startFn) => {
        if (activeFeed) { activeFeed.stop(); activeFeed = null; }
        const endpoint = document.getElementById('feed-endpoint')?.value ?? 'http://localhost:5000/infer';
        const feed = new VideoFeed({ endpoint, fps: 8 });

        feed.addEventListener('detection', ({ detail: detections }) => {
            const matched = engine.matchDetectionsToPlants(detections);
            engine.applyExternalDetections(matched);
        });
        feed.addEventListener('error', ({ detail: err }) => {
            setFeedStatus(`⚠ Model hatası: ${err.message}`, 'var(--accent-red)');
        });

        try {
            await startFn(feed);
            activeFeed = feed;
            setFeedStatus('● Canlı — gerçek model aktif', 'var(--accent-green)');
        } catch (err) {
            setFeedStatus(`✗ ${err.message}`, 'var(--accent-red)');
        }
    };

    document.getElementById('btn-webcam')?.addEventListener('click', () => startFeed(f => f.startWebcam()));
    document.getElementById('video-file-input')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) startFeed(f => f.startFile(file));
    });
    document.getElementById('btn-stop-feed')?.addEventListener('click', () => {
        activeFeed?.stop(); activeFeed = null;
        setFeedStatus('Bağlı değil — mock model aktif');
    });
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

function initUI() {
    const canvas = document.getElementById('sim-canvas');
    const engine = new SimulationEngine();
    const renderer = new CanvasRenderer(canvas);
    const dashboard = new Dashboard(engine);

    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    engine.onUpdate = state => { renderer.render(state); dashboard.update(state); };
    engine.start();

    // Density slider (only used on reset)
    const densitySlider = document.getElementById('ctrl-density');
    const densityVal = document.getElementById('ctrl-density-val');
    densitySlider?.addEventListener('input', () => { if (densityVal) densityVal.textContent = densitySlider.value; });

    initVideoFeed(engine);
}
