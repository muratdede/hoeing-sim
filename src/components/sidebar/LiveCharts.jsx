import { useRef, useEffect } from 'react';

function drawSparkline(canvas, data, color) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (data.length < 2) return;
    const max = Math.max(...data, 1);
    const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * W, y: H - (v / max) * H * 0.9 }));
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, color + '55'); grd.addColorStop(1, color + '00');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(pts[0].x, H);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke();
}

export default function LiveCharts({ stats }) {
    const weedRef = useRef(null);
    const cropRef = useRef(null);
    const weedDataRef = useRef([]);
    const cropDataRef = useRef([]);
    const tickRef = useRef(0);

    useEffect(() => {
        tickRef.current++;
        if (tickRef.current % 15 !== 0) return;

        weedDataRef.current.push(stats.weedsRemoved);
        if (weedDataRef.current.length > 120) weedDataRef.current.shift();

        cropDataRef.current.push(stats.cropsTotal - stats.cropsDamaged);
        if (cropDataRef.current.length > 120) cropDataRef.current.shift();

        if (weedRef.current) drawSparkline(weedRef.current, weedDataRef.current, '#e74c3c');
        if (cropRef.current) drawSparkline(cropRef.current, cropDataRef.current, '#4caf72');
    });

    return (
        <div className="card">
            <div className="card-title">Live Charts</div>
            <div className="chart-row">
                <div className="chart-card">
                    <div className="chart-label">Weeds Removed</div>
                    <canvas ref={weedRef} className="chart-canvas" width="120" height="40" />
                </div>
                <div className="chart-card">
                    <div className="chart-label">Crops Safe</div>
                    <canvas ref={cropRef} className="chart-canvas" width="120" height="40" />
                </div>
            </div>
        </div>
    );
}
