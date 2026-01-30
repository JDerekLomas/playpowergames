import { useRef } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/PhaserGame';
import './style.css';

function App() {
    // The sprite can only be moved in the MainMenu Scene
    // const [currentActiveScene, setCurrentActiveScene] = useState<string>();
    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const appRef = useRef<HTMLDivElement | null>(null);

    // Event emitted from the PhaserGame component
    // const currentScene = (scene: Phaser.Scene) => {
    //     setCurrentActiveScene(scene.scene.key);
    // };

    return (
        <div id="app" ref={appRef}>
            <PhaserGame ref={phaserRef} />
        </div>
    );
}

export default App;
