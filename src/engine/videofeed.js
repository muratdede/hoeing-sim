/* videofeed.js - Real video input pipeline | ES module */

export class VideoFeed extends EventTarget {
    constructor(config = {}) {
        super();
        this.endpoint    = config.endpoint    ?? 'http://localhost:5000/infer';
        this.fps         = config.fps         ?? 10;
        this.jpegQuality = config.jpegQuality ?? 0.8;
        this.showPreview = config.showPreview ?? true;

        this._video      = document.createElement('video');
        this._video.muted       = true;
        this._video.autoplay    = true;
        this._video.playsInline = true;

        this._offscreen    = document.createElement('canvas');
        this._offscreenCtx = this._offscreen.getContext('2d');
        this._preview      = null;
        this._previewCtx   = null;

        this._intervalId = null;
        this._stream     = null;
        this._active     = false;
    }

    setPreviewCanvas(canvas) {
        this._preview = canvas;
        this._previewCtx = canvas?.getContext('2d') ?? null;
    }

    async startWebcam() {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
        });
        await this._attachStream(stream);
    }

    async startFile(file) {
        this._video.src  = URL.createObjectURL(file);
        this._video.loop = true;
        await this._video.play();
        this._beginCapture();
    }

    stop() {
        this._active = false;
        clearInterval(this._intervalId);
        this._stream?.getTracks().forEach(t => t.stop());
        this._stream        = null;
        this._video.srcObject = null;
        this._video.src     = '';
    }

    async _attachStream(stream) {
        this._stream          = stream;
        this._video.srcObject = stream;
        await this._video.play();
        this._beginCapture();
    }

    _beginCapture() {
        this._active     = true;
        this._intervalId = setInterval(() => { if (this._active) this._processFrame(); }, Math.round(1000 / this.fps));
    }

    _processFrame() {
        const vw = this._video.videoWidth;
        const vh = this._video.videoHeight;
        if (!vw || !vh) return;

        this._offscreen.width  = vw;
        this._offscreen.height = vh;
        this._offscreenCtx.drawImage(this._video, 0, 0, vw, vh);

        if (this.showPreview && this._preview && this._previewCtx) {
            this._preview.width  = this._preview.clientWidth  || 268;
            this._preview.height = this._preview.clientHeight || 90;
            this._previewCtx.drawImage(this._video, 0, 0, this._preview.width, this._preview.height);
            this._previewCtx.strokeStyle = 'rgba(240,200,64,0.7)';
            this._previewCtx.lineWidth   = 2;
            this._previewCtx.strokeRect(1, 1, this._preview.width - 2, this._preview.height - 2);
            this._previewCtx.fillStyle = 'rgba(240,200,64,0.9)';
            this._previewCtx.font      = 'bold 11px monospace';
            this._previewCtx.fillText('● LIVE', 8, 16);
        }

        const frameB64 = this._offscreen.toDataURL('image/jpeg', this.jpegQuality);
        this._sendToModel(frameB64, vw, vh);
    }

    async _sendToModel(frameB64, width, height) {
        try {
            const res = await fetch(this.endpoint, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ frame: frameB64, width, height }),
            });
            if (!res.ok) { this.dispatchEvent(new CustomEvent('error', { detail: new Error(`HTTP ${res.status}`) })); return; }
            const json = await res.json();
            if (Array.isArray(json.detections)) {
                this.dispatchEvent(new CustomEvent('detection', { detail: json.detections }));
            }
        } catch (err) {
            this.dispatchEvent(new CustomEvent('error', { detail: err }));
        }
    }
}
