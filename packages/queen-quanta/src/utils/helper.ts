import { topics } from "../data/topics.json";

export interface CometConfig {
    startX: number;
    startY: number;
}

export function resetCometPosition(comet: Phaser.GameObjects.Image, config: CometConfig) {
    comet.x = config.startX;
    comet.y = config.startY;
}

// Door animation helper
export interface DoorAnimationOptions {
    scene: Phaser.Scene;
    leftDoor: Phaser.GameObjects.Image;
    rightDoor: Phaser.GameObjects.Image;
    open: boolean; // true = open, false = close
    duration?: number;
    delay?: number;
    onComplete?: () => void;
    soundEffectKey?: string;
}

export function animateDoors({
    scene,
    leftDoor,
    rightDoor,
    open,
    duration = 1000,
    delay = 500,
    onComplete,
    soundEffectKey
}: DoorAnimationOptions) {
    const displayWidth = (scene as any).display?.width || scene.sys.game.config.width;
    const getScaledValue = (scene as any).getScaledValue
        ? (scene as any).getScaledValue.bind(scene)
        : (v: number) => v;
    const targetXLeft = open ? 0 : getScaledValue(displayWidth / 2);
    const targetXRight = open ? getScaledValue(displayWidth) : getScaledValue(displayWidth / 2);

    scene.tweens.add({
        targets: leftDoor,
        x: targetXLeft,
        duration,
        delay,
        ease: 'Power2'
    });
    scene.tweens.add({
        targets: rightDoor,
        x: targetXRight,
        duration,
        delay,
        ease: 'Power2',
        onStart: () => {
            if (soundEffectKey && (scene as any).audioManager) {
                (scene as any).audioManager.playSoundEffect(soundEffectKey);
            }
        },
        onComplete: () => {
            if (soundEffectKey && (scene as any).audioManager) {
                (scene as any).audioManager.stopSoundEffect(soundEffectKey);
            }
            if (onComplete) onComplete();
        }
    });
}

export function getGameSubtitle(topic: string, level: number) {
    const topicData = topics.find(t => t.name === topic);
    const levelData = topicData?.levels.find(l => l.level === level);
    let gameSubtitle = levelData?.subtitle || 'unknown';
    gameSubtitle = gameSubtitle.replace(/\s+/g, "_").replace(/\n/g, "_");
    return gameSubtitle;
}