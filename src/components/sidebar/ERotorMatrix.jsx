export default function ERotorMatrix({ rotors }) {
    return (
        <div className="card">
            <div className="card-title">eRotor Units</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2px', padding: '4px 0' }}>
                {rotors.map((r, i) => {
                    const bg = r.isHalted ? '#3498db' : '#2ecc71';
                    const opacity = r.isHalted ? '1' : '0.4';
                    return (
                        <div key={i} style={{
                            flex: 1, textAlign: 'center', padding: '4px',
                            borderRadius: '3px', background: bg, opacity,
                            color: '#fff', fontSize: '10px', fontWeight: 'bold',
                            fontFamily: 'monospace', marginRight: '2px',
                            boxShadow: `0 0 5px ${bg}88`,
                        }}>
                            R{i + 1}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
