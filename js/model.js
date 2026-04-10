/* model.js - MockVisionModel | no ES modules, works via file:// */

class MockVisionModel {
    constructor(config = {}) {
        this.accuracy = config.accuracy ?? 1.0;
        this.falsePositiveRate = config.falsePositiveRate ?? 0.0;
        this.latencyMs = config.latencyMs ?? 80;
    }

    detect(visibleEntities) {
        return new Promise(resolve => {
            setTimeout(() => resolve(visibleEntities.map(e => this._classifyEntity(e))), this.latencyMs);
        });
    }

    detectSync(visibleEntities) {
        return visibleEntities.map(e => this._classifyEntity(e));
    }

    _classifyEntity(entity) {
        const isCrop = entity.type === 'crop';
        const roll = Math.random();
        let predictedLabel, confidence;

        if (isCrop) {
            if (roll < this.accuracy) {
                predictedLabel = 'crop'; confidence = 0.70 + Math.random() * 0.28;
            } else {
                predictedLabel = 'weed'; confidence = 0.50 + Math.random() * 0.30;
            }
        } else {
            if (roll < this.falsePositiveRate) {
                predictedLabel = 'crop'; confidence = 0.50 + Math.random() * 0.30;
            } else {
                predictedLabel = 'weed'; confidence = 0.70 + Math.random() * 0.28;
            }
        }

        return {
            entityId: entity.id,
            trueType: entity.type,
            label: predictedLabel,
            confidence,
            bbox: { x: entity.x, y: entity.y, w: entity.w, h: entity.h },
        };
    }

    configure({ accuracy, falsePositiveRate, latencyMs } = {}) {
        if (accuracy !== undefined) this.accuracy = accuracy;
        if (falsePositiveRate !== undefined) this.falsePositiveRate = falsePositiveRate;
        if (latencyMs !== undefined) this.latencyMs = latencyMs;
    }

    /** Replace body with fetch() call to plug in your real model */
    async detectRemote(endpoint, visibleEntities) {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entities: visibleEntities }),
        });
        return (await response.json()).detections;
    }
}
