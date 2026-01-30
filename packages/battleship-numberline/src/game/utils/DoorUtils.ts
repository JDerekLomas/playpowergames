import { announceToScreenReader } from "@k8-games/sdk";
import { BaseScene } from "../scenes/BaseScene";

export class DoorUtils {
    private scene: BaseScene;

    constructor(scene: BaseScene) {
        this.scene = scene;
    }

    openDoors(callback?: () => void): void {
        const doorLeft = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'door').setOrigin(1, 0.5).setDepth(100);

        const doorRight = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'door').setOrigin(0, 0.5).setFlipX(true).setDepth(100);

        setTimeout(() => {
            this.scene.audioManager.playSoundEffect('door_open');
        }, 500);

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

            const imageKey = `countdown_${currentNumber}`;
            
            countdownImage = scene.addImage(
                scene.display.width / 2, 
                scene.display.height / 2, 
                imageKey
            )
            .setOrigin(0.5)
            .setDepth(200);
            countdownImage.setScale(220/countdownImage.height);
            scene.audioManager.playSoundEffect('countdown');
        }

        showCountdown();

        const timer = scene.time.addEvent({
            delay: 1000,
            callback: () => {
                // Announce to screen reader
                announceToScreenReader(currentNumber > 0 ? currentNumber.toString() : '');
                currentNumber--;
                
                if (currentNumber >= 1) {
                    showCountdown();
                } else {
                    // delay callback for completing announcement
                    scene.time.delayedCall(500, () => {
                        onComplete?.();
                    });
                    timer.destroy();
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
        scene.load.setPath('assets/images/common');
        scene.load.image('door', 'door.png');
        scene.load.image('countdown_1', `countdown_1.png`);
        scene.load.image('countdown_2', `countdown_2.png`);
        scene.load.image('countdown_3', `countdown_3.png`);

        scene.load.setPath('assets/audios/sound_effects');
        scene.load.audio('door_close', 'door_close.wav');
        scene.load.audio('door_open', 'door_open.wav');
    }
}