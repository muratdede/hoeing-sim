import { useRef, useEffect } from 'react';

export default function DetectionLog({ actionLog }) {
    const containerRef = useRef(null);
    const lastLogTimeRef = useRef(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        if (actionLog.length === 0) {
            if (lastLogTimeRef.current !== null) {
                el.innerHTML = '';
                lastLogTimeRef.current = null;
            }
            return;
        }

        if (lastLogTimeRef.current === actionLog[0].t) return;

        const newLogs = [];
        for (let i = 0; i < Math.min(actionLog.length, 14); i++) {
            const e = actionLog[i];
            if (lastLogTimeRef.current !== null && e.t <= lastLogTimeRef.current) break;
            newLogs.push(e);
        }

        lastLogTimeRef.current = actionLog[0].t;

        const newHtml = newLogs.map(e => {
            const cls = e.type === 'tp' ? 'log-tp' : e.type === 'fn' ? 'log-fn' : 'log-fp';
            return `<div class="log-entry ${cls}">
                <span class="log-time">${(e.t / 1000).toFixed(1)}s</span>
                <span class="log-row">R${e.row + 1}</span>
                <span class="log-msg">${e.label}</span>
            </div>`;
        }).join('');

        el.insertAdjacentHTML('afterbegin', newHtml);

        while (el.children.length > 14) {
            el.removeChild(el.lastChild);
        }
    }); // No dependency array: runs every render, safe because of lastLogTimeRef check

    return (
        <div className="card">
            <div className="card-title">Detection Event Log</div>
            <div ref={containerRef} className="detection-log">
                <div className="log-entry" style={{ color: '#4a5060', fontSize: '10px', padding: '8px 0', fontFamily: 'monospace' }}>
                    Simülasyon başlıyor...
                </div>
            </div>
        </div>
    );
}
