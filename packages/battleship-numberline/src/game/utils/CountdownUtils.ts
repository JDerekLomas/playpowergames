import { announceToScreenReader } from "../../../../sdk/dist/utils/ariaAnnouncer";
import { BaseScene } from "../scenes/BaseScene";

export class CountdownUtils {
    private scene: BaseScene;

    constructor(scene: BaseScene) {
        this.scene = scene;
    }

    startCountdown(onComplete?: () => void): void {
        let currentNumber = 3;
        let countdownImage: Phaser.GameObjects.Image;

        const showCountdown = () => {
            if (countdownImage) {
                countdownImage.destroy();
            }

            const imageKey = `countdown_${currentNumber}`;
            
            countdownImage = this.scene.addImage(
                this.scene.display.width / 2, 
                this.scene.display.height / 2, 
                imageKey
            )
            .setOrigin(0.5)
            .setDepth(200);
            countdownImage.setScale(220/countdownImage.height);
            this.scene.audioManager.playSoundEffect('countdown');
        }

        showCountdown();

        const timer = this.scene.time.addEvent({
            delay: 1000,
            callback: () => {
                // Announce to screen reader
                announceToScreenReader(currentNumber > 0 ? currentNumber.toString() : '');
                currentNumber--;
                
                if (currentNumber >= 1) {
                    showCountdown();
                } else {
                    // delay callback for completing announcement
                    this.scene.time.delayedCall(500, () => {
                        onComplete?.();
                    });
                    timer.destroy();
                    if (countdownImage) {
                        countdownImage.destroy();
                    }
                }
            },
            callbackScope: this.scene,
            loop: true
        });
    }

    static _preload(scene: BaseScene): void {
        scene.load.setPath('assets/images/common');
        scene.load.image('countdown_1', `countdown_1.png`);
        scene.load.image('countdown_2', `countdown_2.png`);
        scene.load.image('countdown_3', `countdown_3.png`);

        scene.load.setPath('assets/audios/sound_effects');
        scene.load.audio('countdown', 'countdown.wav');
    }
} 