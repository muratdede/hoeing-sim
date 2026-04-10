import { useState } from 'react';

export default function VisionModelConfig({ onConfigure }) {
    const [accuracy, setAccuracy] = useState(92);
    const [fpr, setFpr] = useState(5);

    return (
        <div className="card">
            <div className="card-title">Vision Model Config</div>

            <div className="control-row">
                <div className="control-header">
                    <span>Accuracy (%)</span>
                    <span className="control-val">{accuracy}</span>
                </div>
                <input type="range" min="10" max="100" value={accuracy} step="1"
                    onChange={e => { const v = parseInt(e.target.value); setAccuracy(v); onConfigure({ accuracy: v / 100 }); }} />
            </div>

            <div className="control-row">
                <div className="control-header">
                    <span>False Positive Rate (%)</span>
                    <span className="control-val">{fpr}</span>
                </div>
                <input type="range" min="0" max="50" value={fpr} step="1"
                    onChange={e => { const v = parseInt(e.target.value); setFpr(v); onConfigure({ fpr: v / 100 }); }} />
            </div>
        </div>
    );
}
