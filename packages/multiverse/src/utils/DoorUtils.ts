import { BaseScene, i18n } from '@k8-games/sdk';

export class DoorUtils {
    private scene: BaseScene;

    constructor(scene: BaseScene) {
        this.scene = scene;
    }

    openDoors(callback?: () => void): void {
        const doorLeft = this.scene
            .addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'cutscreen_door_left')
            .setOrigin(1, 0.5)
            .setDepth(100);

        const doorRight = this.scene
            .addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'cutscreen_door_right')
            .setOrigin(0, 0.5)
            .setDepth(100);

        setTimeout(() => {
            this.scene.audioManager.playSoundEffect('door_open');
        }, 100);

        this.scene.tweens.add({
            targets: doorLeft,
            x: 0,
            duration: 2000,
            ease: 'Power2',
        });
        this.scene.tweens.add({
            targets: doorRight,
            x: this.scene.getScaledValue(this.scene.display.width),
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                callback?.();
            }
        });
    }

    closeDoors(callback?: () => void): void {
        this.scene
            .addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'cutscreen_door_left')
            .setOrigin(1, 0.5).setDepth(100);
        this.scene
            .addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'cutscreen_door_right')
            .setOrigin(0, 0.5).setDepth(100);

        this.showInstructions(callback);
    }

    private showInstructions(callback?: () => void): void {
        const boxCenterX = this.scene.display.width / 2;
        const boxCenterY = this.scene.display.height / 2;
        const boxWidth = 600; // adjust as needed

        const textMaxWidth = boxWidth - 40;

        // Vertical positioning
        const clockY = boxCenterY;
        // Create instructions elements
        const instructionsBox = this.scene.addImage(boxCenterX, boxCenterY, 'instructions_box').setOrigin(0.5).setDepth(100);
        const clockImage = this.scene.addImage(boxCenterX, clockY - 100, 'clock').setOrigin(0.5).setDepth(100);
        const boldText = this.scene
            .addText(boxCenterX, clockY + 35, i18n.t('additionAdventure.instructions.title'), {
                font: '700 28px Exo',
                color: '#FFF',
                align: 'center',
                wordWrap: { width: textMaxWidth },
            })
            .setOrigin(0.5)
            .setDepth(100);
        const subtitleText = this.scene
            .addText(boxCenterX, clockY + 100, i18n.t('additionAdventure.instructions.subtitle'), {
                font: '400 22px Exo',
                color: '#FFF',
                align: 'center',
                wordWrap: { width: textMaxWidth },
            })
            .setOrigin(0.5)
            .setDepth(100);

        const instructionAudio = this.scene.audioManager.playSoundEffect('instruction');
        instructionAudio?.on('complete', () => {
            clockImage.destroy();
            boldText.destroy();
            subtitleText.destroy();
            this.startCountdown(instructionsBox, callback);
        });
    }

    private startCountdown(instructionsBox: Phaser.GameObjects.Image, callback?: () => void): void {
        const centerX = this.scene.display.width / 2;
        const centerY = this.scene.display.height / 2;

        const instructLabel = this.scene
            .addText(centerX, 530, i18n.t('additionAdventure.instructions.speedCounts'), {
                font: '400 24px Exo',
                color: '#FFF',
                align: 'center',
            })
            .setDepth(100)
            .setOrigin(0.5);
        this.scene.audioManager.playSoundEffect('countdown');
        this.scene.audioManager.playSoundEffect('start_instruction');

        const countdownCircle = this.scene.addCircle(centerX, centerY - 60, 120, 0x77008e).setDepth(100);
        const countDownText = this.scene
            .addText(centerX, centerY - 60, '3', {
                font: '700 130px Exo',
                color: '#fff',
                align: 'center',
            })
            .setOrigin(0.5)
            .setScale(1)
            .setDepth(100);

        // Helper to animate shrink and expand
        const animateCountdown = (nextValue: string, delay: number) => {
            this.scene.time.delayedCall(delay, () => {
                // Shrink current
                this.scene.tweens.add({
                    targets: [countDownText, countdownCircle],
                    scale: 0,
                    duration: 150,
                    ease: 'Circ.easeIn',
                    onComplete: () => {
                        this.scene.audioManager.playSoundEffect('countdown');

                        countDownText.setText(nextValue);
                        // Expand new
                        this.scene.tweens.add({
                            targets: [countdownCircle],
                            scale: 1,
                            duration: 100,
                            ease: 'Back.easeOut',
                        });
                        this.scene.tweens.add({
                            targets: [countDownText],
                            scale: 1.8,
                            duration: 100,
                            ease: 'Back.easeOut',
                        });
                    },
                });
            });
        };

        countDownText.setScale(1);

        animateCountdown('2', 1000);
        animateCountdown('1', 2000);

        // After 3 seconds, remove the image and trigger subsequent actions
        this.scene.time.delayedCall(3000, () => {
            instructLabel.destroy();
            countdownCircle.destroy();
            countDownText.destroy();
            instructionsBox.destroy();
            callback?.();
        });
    }

    static _preload(scene: BaseScene): void {
        scene.load.setPath('assets/images/common');
        // scene.load.image('door', 'door.png');
        scene.load.image('countdown_1', `countdown_1.png`);
        scene.load.image('countdown_2', `countdown_2.png`);
        scene.load.image('countdown_3', `countdown_3.png`);
    }
}
