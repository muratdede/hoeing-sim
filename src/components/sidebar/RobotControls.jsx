import { useState } from 'react';

export default function RobotControls({ robot, isRunning, onConfigure, onPause, onReset, onSteer }) {
    const [speed, setSpeed] = useState(60);
    const [density, setDensity] = useState(35);

    const offset = robot.lateralOffset;

    return (
        <div className="card">
            <div className="card-title">Robot Controls</div>

            <div className="control-row">
                <div className="control-header">
                    <span>Robot Speed (px/s)</span>
                    <span className="control-val">{speed}</span>
                </div>
                <input type="range" min="10" max="200" value={speed} step="5"
                    onChange={e => { const v = parseInt(e.target.value); setSpeed(v); onConfigure({ robotSpeed: v }); }} />
            </div>

            <div className="control-row">
                <div className="control-header">
                    <span>Weed Density (%)</span>
                    <span className="control-val">{density}</span>
                </div>
                <input type="range" min="5" max="80" value={density} step="5"
                    onChange={e => setDensity(parseInt(e.target.value))} />
            </div>

            <div className="control-row align-row" style={{ marginTop: '10px' }}>
                <div className="control-header">
                    <span>Lateral Alignment (Steer)</span>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--bg-card-alt)', padding: '6px', borderRadius: '4px',
                    fontFamily: 'monospace', marginTop: '4px',
                }}>
                    <button className="btn btn-secondary" style={{ fontSize: '14px', padding: '2px 8px' }}
                        onClick={() => onSteer(-1)}>◀ L</button>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
                        <span style={{ color: offset < 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>❮</span>
                        <span style={{ color: offset === 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>●</span>
                        <span style={{ color: offset > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>❯</span>
                    </div>
                    <button className="btn btn-secondary" style={{ fontSize: '14px', padding: '2px 8px' }}
                        onClick={() => onSteer(1)}>R ▶</button>
                </div>
                <div style={{ textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {offset === 0
                        ? 'Hizalı (Offset: 0px)'
                        : `${offset > 0 ? 'Sağ' : 'Sol'}a Kaydı (Offset: ${Math.abs(offset)}px)`
                    }
                </div>
            </div>

            <div className="btn-row">
                <button className={`btn btn-primary ${!isRunning ? 'paused' : ''}`} onClick={onPause}>
                    {isRunning ? '⏸ Pause' : '▶ Resume'}
                </button>
                <button className="btn btn-secondary" onClick={() => {
                    onReset({ robotSpeed: speed, weedDensity: density / 100 });
                }}>
                    ↺ Reset
                </button>
            </div>
        </div>
    );
}
