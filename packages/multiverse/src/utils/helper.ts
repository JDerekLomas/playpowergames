import { BaseScene } from "@k8-games/sdk";

export function createGlitch(scene: BaseScene, callback?: () => void) {

    if (!scene.anims.exists('glitch')) {
        scene.anims.create({
            key: 'glitch',
            frames: [
                { key: 'glitch_1' },
                { key: 'glitch_2' },
                { key: 'glitch_3' },
            ],
            frameRate: 24,
            repeat: 0,
        })
    }

    const glitchBg = scene.addSprite(scene.display.width / 2, scene.display.height / 2, 'glitch_1').setOrigin(0.5);
    const glitchAnim = glitchBg.anims.play('glitch');

    scene.audioManager.playSoundEffect('glitch_sfx');
    
    glitchAnim.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        glitchBg.destroy();
        callback?.();
    });
}