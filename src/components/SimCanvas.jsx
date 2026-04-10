import { useRef, useEffect, useCallback } from 'react';
import { FIELD, PLANT, ROBOT, ROTOR } from '../engine/simulation.js';

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

function drawBackground(ctx, W, H) {
    ctx.fillStyle = CLR.soil;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = CLR.grid; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function drawRows(ctx, rows) {
    rows.forEach(row => {
        ctx.fillStyle = CLR.rowSoil;
        ctx.fillRect(row.centreX - 22, FIELD.MARGIN_TOP, 44, FIELD.ROW_LENGTH);
    });
}

function drawCamera(ctx, robot) {
    if (!robot.rows || robot.rows.length === 0) return;
    const offset = robot.lateralOffset;
    const x0 = robot.rows[0].centreX - FIELD.ROW_SPACING / 2 + offset;
    const x1 = robot.rows[robot.rows.length - 1].centreX + FIELD.ROW_SPACING / 2 + offset;
    ctx.fillStyle = CLR.fovFill; ctx.strokeStyle = CLR.fovBorder; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.fillRect(x0, robot.y, x1 - x0, robot.cameraFovAhead);
    ctx.strokeRect(x0, robot.y, x1 - x0, robot.cameraFovAhead);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(100,200,255,0.6)'; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('CAMERA FOV', x0 + 4, robot.y + 12);
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = (Math.PI / 2) * 3; const step = Math.PI / spikes;
    ctx.beginPath(); ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR); rot += step;
        ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR); rot += step;
    }
    ctx.closePath(); ctx.fill();
}

function drawPlants(ctx, rows) {
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

            const grd = ctx.createRadialGradient(plant.x, plant.y, 0, plant.x, plant.y, plant.radius * 2);
            grd.addColorStop(0, color); grd.addColorStop(0.6, color + 'aa'); grd.addColorStop(1, color + '00');
            ctx.globalAlpha = 0.25; ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(plant.x, plant.y, plant.radius * 2, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; ctx.fillStyle = color;

            if (plant.type === 'crop') {
                drawStar(ctx, plant.x, plant.y, 5, plant.radius, plant.radius * 0.4);
            } else {
                ctx.beginPath(); ctx.arc(plant.x, plant.y, plant.radius, 0, Math.PI * 2); ctx.fill();
            }
        });
    });
}

function drawDetections(ctx, rows, robot) {
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

function drawRotors(ctx, robot) {
    robot.rotors.forEach(rotor => {
        const cx = rotor.rowCentreX, cy = robot.y + 40;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = rotor.isHalted ? CLR.rotorHalted : CLR.rotor;
        ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        rotor.getTinePositions(cy).forEach(t => {
            const cShapeRadius = 6;
            const a = Math.atan2(t.y - cy, t.x - cx);

            ctx.strokeStyle = rotor.isHalted ? CLR.tineHalted : CLR.tine;
            ctx.fillStyle = rotor.isHalted ? CLR.tineHalted : CLR.tine;
            ctx.lineWidth = 2;

            const startX = cx + Math.cos(a) * cShapeRadius;
            const startY = cy + Math.sin(a) * cShapeRadius;
            const endX = t.x + Math.cos(a) * 2;
            const endY = t.y + Math.sin(a) * 2;

            ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();

            const minusTheta = a - Math.PI;
            const gap = Math.PI / 3;

            ctx.beginPath();
            ctx.arc(cx, cy, cShapeRadius, minusTheta + gap, minusTheta + 2 * Math.PI - gap);
            ctx.stroke();
        });
    });
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function drawRobot(ctx, robot, rows) {
    const offset = robot.lateralOffset;
    const x0 = rows[0].centreX - 30 + offset;
    const w = rows[rows.length - 1].centreX - rows[0].centreX + 60;
    const grd = ctx.createLinearGradient(x0, robot.y, x0, robot.y + 36);
    grd.addColorStop(0, '#d4a82a55'); grd.addColorStop(1, '#8a601055');
    ctx.fillStyle = grd; ctx.strokeStyle = '#f0c840'; ctx.lineWidth = 2;
    roundRect(ctx, x0, robot.y, w, 36, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('eROTOR UNIT', x0 + 8, robot.y + 14);
    ctx.font = '9px monospace'; ctx.fillStyle = '#f0c840';
    ctx.fillText(`${robot.speed.toFixed(0)} px/s`, x0 + 8, robot.y + 28);

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

function drawHUD(ctx, robot, W, H) {
    const progress = Math.min((robot.y - FIELD.MARGIN_TOP) / FIELD.ROW_LENGTH, 1);
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, H - 6, W, 6);
    const grd = ctx.createLinearGradient(0, 0, W, 0);
    grd.addColorStop(0, '#f0c840'); grd.addColorStop(1, '#4caf72');
    ctx.fillStyle = grd; ctx.fillRect(0, H - 6, W * progress, 6);
}

export default function SimCanvas({ engine }) {
    const canvasRef = useRef(null);

    // Resize listener
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    // Native rendering loop, outside React state updates
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !engine) return;

        const ctx = canvas.getContext('2d');
        let frameId;

        const loop = () => {
            const state = engine.getState();
            if (state.rows && state.robot) {
                const { rows, robot } = state;
                const W = canvas.width, H = canvas.height;
                const scroll = Math.max(0, robot.y - H * 0.40);

                ctx.clearRect(0, 0, W, H);
                ctx.save();
                ctx.translate(0, -scroll);
                drawBackground(ctx, W, H + scroll);
                drawRows(ctx, rows);
                drawCamera(ctx, robot);
                drawPlants(ctx, rows);
                drawDetections(ctx, rows, robot);
                drawRotors(ctx, robot);
                drawRobot(ctx, robot, rows);
                ctx.restore();
                drawHUD(ctx, robot, W, H);
            }
            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [engine]);

    return <canvas id="sim-canvas" ref={canvasRef} />;
}
