export default function PerformanceMetrics({ stats }) {
    return (
        <div className="card">
            <div className="card-title">Performance</div>

            <div className="metric-row">
                <div className="metric-header">
                    <span>Weed Clearance Rate</span>
                    <span className="metric-val">{(stats.weedClearanceRate * 100).toFixed(1)}%</span>
                </div>
                <div className="bar-track">
                    <div className="bar-fill green" style={{ width: `${(Math.min(stats.weedClearanceRate, 1) * 100).toFixed(1)}%` }} />
                </div>
            </div>

            <div className="metric-row">
                <div className="metric-header">
                    <span>Crop Safety Rate</span>
                    <span className="metric-val">{(stats.cropSafetyRate * 100).toFixed(1)}%</span>
                </div>
                <div className="bar-track">
                    <div className="bar-fill blue" style={{ width: `${(Math.min(stats.cropSafetyRate, 1) * 100).toFixed(1)}%` }} />
                </div>
            </div>

            <div className="metric-row">
                <div className="metric-header">
                    <span>Model Precision</span>
                    <span className="metric-val"></span>
                </div>
                <div className="bar-track">
                    <div className="bar-fill gold" style={{ width: `${(Math.min(stats.precision, 1) * 100).toFixed(1)}%` }} />
                </div>
            </div>
        </div>
    );
}
