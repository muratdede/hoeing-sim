import { FIELD } from '../../engine/simulation.js';

export default function FieldProgress({ robot }) {
    const progress = Math.min((robot.y - FIELD.MARGIN_TOP) / FIELD.ROW_LENGTH, 1);

    return (
        <div className="card">
            <div className="card-title">Field Progress</div>
            <div className="progress-section">
                <div className="bar-track" style={{ flex: 1 }}>
                    <div className="bar-fill gold" style={{ width: `${(progress * 100).toFixed(1)}%` }} />
                </div>
                <span className="progress-label">{(progress * 100).toFixed(0)}%</span>
            </div>
        </div>
    );
}
