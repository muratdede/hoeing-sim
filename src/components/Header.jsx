export default function Header() {
    return (
        <header className="app-header">
            <div className="header-logo">
                <div className="logo-icon">🌱</div>
                <div>
                    <div className="header-title">Robocrop InRow eRotor Simulator</div>
                    <div className="header-subtitle">vision model: MockVisionModel v1.0 · mode: sync-inference</div>
                </div>
            </div>
            <div className="header-spacer"></div>
        </header>
    );
}
