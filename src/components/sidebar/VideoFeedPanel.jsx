import { useRef, useState, useCallback } from 'react';
import { VideoFeed } from '../../engine/videofeed.js';

export default function VideoFeedPanel({ engine }) {
    const [status, setStatus] = useState('Bağlı değil — mock model aktif');
    const [statusColor, setStatusColor] = useState('var(--text-muted)');
    const [endpoint, setEndpoint] = useState('http://localhost:5000/infer');
    const previewRef = useRef(null);
    const feedRef = useRef(null);

    const startFeed = useCallback(async (startFn) => {
        if (feedRef.current) { feedRef.current.stop(); feedRef.current = null; }
        const feed = new VideoFeed({ endpoint, fps: 8 });

        if (previewRef.current) feed.setPreviewCanvas(previewRef.current);

        feed.addEventListener('detection', ({ detail: detections }) => {
            const matched = engine.matchDetectionsToPlants(detections);
            engine.applyExternalDetections(matched);
        });
        feed.addEventListener('error', ({ detail: err }) => {
            setStatus(`⚠ Model hatası: ${err.message}`);
            setStatusColor('var(--accent-red)');
        });

        try {
            await startFn(feed);
            feedRef.current = feed;
            setStatus('● Canlı — gerçek model aktif');
            setStatusColor('var(--accent-green)');
        } catch (err) {
            setStatus(`✗ ${err.message}`);
            setStatusColor('var(--accent-red)');
        }
    }, [engine, endpoint]);

    const handleStop = () => {
        feedRef.current?.stop();
        feedRef.current = null;
        setStatus('Bağlı değil — mock model aktif');
        setStatusColor('var(--text-muted)');
    };

    return (
        <div className="card">
            <div className="card-title">Video Feed → Real Model</div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: '10px' }}
                    onClick={() => startFeed(f => f.startWebcam())}>📷 Webcam</button>
                <label className="btn btn-secondary" style={{ flex: 1, fontSize: '10px', textAlign: 'center', cursor: 'pointer' }}>
                    📁 Dosya
                    <input type="file" accept="video/*" style={{ display: 'none' }}
                        onChange={e => { const file = e.target.files?.[0]; if (file) startFeed(f => f.startFile(file)); }} />
                </label>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: '10px' }}
                    onClick={handleStop}>⏹ Durdur</button>
            </div>

            <div style={{ marginBottom: '8px' }}>
                <div className="control-header" style={{ marginBottom: '4px' }}>
                    <span>REST Endpoint</span>
                </div>
                <input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)}
                    style={{
                        width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', borderRadius: '4px', padding: '5px 8px',
                        fontFamily: 'monospace', fontSize: '10px', outline: 'none',
                    }} />
            </div>

            <canvas ref={previewRef}
                style={{
                    width: '100%', height: '90px', borderRadius: '4px', background: '#000',
                    border: '1px solid var(--border)', display: 'block', objectFit: 'cover',
                }} />
            <div style={{ fontSize: '9px', color: statusColor, marginTop: '4px', fontFamily: 'monospace' }}>
                {status}
            </div>
        </div>
    );
}
