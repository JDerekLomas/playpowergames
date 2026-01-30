import { announceToScreenReader, BaseScene, GameConfigManager } from "@k8-games/sdk";

export class DoorUtils {
    private scene: BaseScene;

    constructor(scene: BaseScene) {
        this.scene = scene;
    }

    openDoors(callback?: () => void): void {
        const doorLeft = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'door').setOrigin(1, 0.5).setDepth(100);

        const doorRight = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'door').setOrigin(0, 0.5).setFlipX(true).setDepth(100);

        this.scene.audioManager.playSoundEffect('door_open');

        callback?.();
        
        this.scene.tweens.add({
            targets: doorLeft,
            x: 0,
            duration: 1000,
            ease: 'Power2'
        });
        this.scene.tweens.add({
            targets: doorRight,
            x: this.scene.getScaledValue(this.scene.display.width),
            duration: 1000,
            ease: 'Power2',
        });
    }

    closeDoors(callback?: () => void, showCountdown: boolean = true): void {
        const doorLeft = this.scene.addImage(0, this.scene.display.height / 2, 'door').setDepth(100).setOrigin(1, 0.5);
        const doorRight = this.scene.addImage(this.scene.display.width, this.scene.display.height / 2, 'door').setDepth(100).setOrigin(0, 0.5).setFlipX(true);

        this.scene.audioManager.playSoundEffect('door_close');

        this.scene.tweens.add({
            targets: doorLeft,
            x: this.scene.getScaledValue(this.scene.display.width / 2),
            duration: 1000,
            ease: 'Power2'
        });
        this.scene.tweens.add({
            targets: doorRight,
            x: this.scene.getScaledValue(this.scene.display.width / 2),
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                this.scene.audioManager.stopSoundEffect('door_close');
                showCountdown ? DoorUtils.startCountdown(this.scene, callback) : callback?.();
            }
        });
    }

    private static startCountdown(scene: BaseScene, onComplete?: () => void): void {
        let currentNumber = 3;
        let countdownImage: Phaser.GameObjects.Image;

        const showCountdown = () => {
            if (countdownImage) {
                countdownImage.destroy();
            }

            // Announce to screen reader
            announceToScreenReader(currentNumber.toString());

            const imageKey = `countdown_${currentNumber}`;
            
            countdownImage = scene.addImage(
                scene.display.width / 2, 
                scene.display.height / 2, 
                imageKey
            )
            .setOrigin(0.5)
            .setDepth(200);
            countdownImage.setScale(245/countdownImage.height);
            scene.audioManager.playSoundEffect('countdown');
        }

        showCountdown();

        const timer = scene.time.addEvent({
            delay: 1000,
            callback: () => {
                currentNumber--;
                
                if (currentNumber >= 1) {
                    showCountdown();
                } else {
                    onComplete?.();
                    timer.destroy();
                    announceToScreenReader('');
                    if (countdownImage) {
                        countdownImage.destroy();
                    }
                }
            },
            callbackScope: scene,
            loop: true
        })
    }

    static _preload(scene: BaseScene): void {
        const gameConfigManager = GameConfigManager.getInstance();
        const mode = gameConfigManager.get('mode') || 'make_ten';

        scene.load.setPath('assets/images/common');
        scene.load.image('door', mode === 'make_20' ? 'make_20_door.png' : 'door.png');
        scene.load.image('countdown_1', `countdown_1.png`);
        scene.load.image('countdown_2', `countdown_2.png`);
        scene.load.image('countdown_3', `countdown_3.png`);

        scene.load.setPath('assets/audio');
        scene.load.audio('countdown', 'countdown.mp3');
        scene.load.audio('door_close', 'door_close.wav');
        scene.load.audio('door_open', 'door_open.wav');
    }
}