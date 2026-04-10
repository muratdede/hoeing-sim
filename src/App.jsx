import { useRef, useEffect, useState, useCallback } from 'react';
import { SimulationEngine, FIELD, ROBOT } from './engine/simulation.js';
import Header from './components/Header';
import SimCanvas from './components/SimCanvas';
import ERotorMatrix from './components/sidebar/ERotorMatrix';
import FieldProgress from './components/sidebar/FieldProgress';
import Statistics from './components/sidebar/Statistics';
import PerformanceMetrics from './components/sidebar/PerformanceMetrics';
import LiveCharts from './components/sidebar/LiveCharts';
import RobotControls from './components/sidebar/RobotControls';
import VisionModelConfig from './components/sidebar/VisionModelConfig';
import VideoFeedPanel from './components/sidebar/VideoFeedPanel';
import Legend from './components/sidebar/Legend';
import DetectionLog from './components/sidebar/DetectionLog';

export default function App() {
    const engineRef = useRef(null);
    const [simState, setSimState] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    // Initialize engine once
    useEffect(() => {
        const engine = new SimulationEngine();
        engineRef.current = engine;

        engine.onUpdate = (state) => {
            setSimState({ ...state });
            setIsRunning(engine._running);
        };

        engine.start();
        setIsRunning(true);

        return () => {
            engine.pause();
        };
    }, []);

    const handleConfigure = useCallback((config) => {
        engineRef.current?.configure(config);
    }, []);

    const handlePause = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        if (engine._running) {
            engine.pause();
            setIsRunning(false);
        } else {
            engine.resume();
            setIsRunning(true);
        }
    }, []);

    const handleReset = useCallback((config) => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.reset(config);
        engine.start();
        setIsRunning(true);
    }, []);

    const handleSteer = useCallback((direction) => {
        const robot = engineRef.current?._robot;
        if (!robot) return;
        robot.lateralOffset += direction * 5;
    }, []);

    if (!simState) return null;

    const { rows, robot, stats } = simState;

    // Render layout
    return (
        <div className="app-layout">
            <Header />
            <main className="canvas-area">
                <SimCanvas engine={engineRef.current} />
                <div className="canvas-overlay-label">TOP-DOWN VIEW · World Space</div>
            </main>
            <aside className="sidebar">
                <ERotorMatrix rotors={robot.rotors} />
                <FieldProgress robot={robot} />
                <Statistics stats={stats} />
                <PerformanceMetrics stats={stats} />
                <LiveCharts stats={stats} />
                <RobotControls
                    robot={robot}
                    isRunning={isRunning}
                    onConfigure={handleConfigure}
                    onPause={handlePause}
                    onReset={handleReset}
                    onSteer={handleSteer}
                />
                <VisionModelConfig onConfigure={handleConfigure} />
                <VideoFeedPanel engine={engineRef.current} />
                <Legend />
                <DetectionLog actionLog={stats.actionLog} />
            </aside>
        </div>
    );
}
