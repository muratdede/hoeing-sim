export default function Legend() {
    const items = [
        { color: '#4caf72', label: 'Crop (alive)' },
        { color: '#e74c3c', label: 'Crop (damaged)' },
        { color: '#c0392b', label: 'Weed (alive)' },
        { color: '#555', label: 'Weed (removed)' },
        { color: '#60b4f0', label: 'Camera FOV', square: true },
        { color: '#f0c840', label: 'eRotor unit', square: true },
    ];

    return (
        <div className="card">
            <div className="card-title">Legend</div>
            <div className="legend">
                {items.map(item => (
                    <div key={item.label} className="legend-item">
                        <div className="legend-dot" style={{
                            background: item.color,
                            borderRadius: item.square ? '2px' : '50%',
                        }} />
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
