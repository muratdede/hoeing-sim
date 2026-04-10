export default function Statistics({ stats }) {
    return (
        <div className="card">
            <div className="card-title">Statistics</div>
            <div className="stats-grid">
                <div className="stat-tile">
                    <span className="stat-label">Weeds Removed</span>
                    <span className="stat-value green">{stats.weedsRemoved}</span>
                    <span className="stat-sub">/ {stats.weedsTotal} total</span>
                </div>
                <div className="stat-tile">
                    <span className="stat-label">Crops Damaged</span>
                    <span className="stat-value red">{stats.cropsDamaged}</span>
                    <span className="stat-sub">/ {stats.cropsTotal} total</span>
                </div>
                <div className="stat-tile">
                    <span className="stat-label">Precision</span>
                    <span className="stat-value blue">{(stats.precision * 100).toFixed(1)}%</span>
                    <span className="stat-sub">TP / (TP+FP)</span>
                </div>
                <div className="stat-tile">
                    <span className="stat-label">Recall</span>
                    <span className="stat-value gold">{(stats.recall * 100).toFixed(1)}%</span>
                    <span className="stat-sub">TP / (TP+FN)</span>
                </div>
            </div>
        </div>
    );
}
