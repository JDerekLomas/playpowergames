import { BaseScene } from "../core/BaseScene";
import { ButtonHelper } from "./ButtonHelper";
import { ImageOverlay } from "./ImageOverlay";
import { I18nHelper } from "./languageHelper";
import { TextOverlay } from "./TextOverlay";
import { announceToScreenReader } from "./ariaAnnouncer";

export type ScoreboardTheme = 'default' | 'queen_quanta' | 'emoji_battle' | 'multi_linear_equation' | 'fact_racer';

export class ScoreboardHelper {
    private scene: BaseScene;
    private i18n: I18nHelper;
    private successTextKeys: string[];
    private theme: ScoreboardTheme;
    private cupLeftShine!: Phaser.GameObjects.Sprite;
    private cupRightShine!: Phaser.GameObjects.Sprite;
    private trophyInterval!: number;


    private progressBarFill!: Phaser.GameObjects.Image;
    private progressBarMask!: Phaser.GameObjects.Graphics;
    private progressTween: Phaser.Tweens.Tween | null = null;
    private currentProgress: number = 0;
    private progressBarWidth: number = 0;

    constructor(scene: BaseScene, i18n: I18nHelper, successTextKeys: string[], theme: ScoreboardTheme = 'default') {
        this.scene = scene;
        this.i18n = i18n;
        this.successTextKeys = successTextKeys;
        this.theme = theme;
    }

    public static _preload(scene: BaseScene, theme: ScoreboardTheme = 'default') {
        scene.load.setPath(`assets/components/scoreboard/images`);
        scene.load.image('points_bg', 'points_bg.png');
        
        if (theme === 'default') scene.load.image('main_board_bg', 'main_board_bg.png');
        else scene.load.image('main_board_bg', `main_board_bg_${theme}.png`);
        
        scene.load.image('board_progress_bg', 'board_progress_bg.png');
        scene.load.image('board_stars', 'board_stars.png');
        scene.load.image('board_tick', 'board_tick.png');
        scene.load.image('board_progressbar_bg', 'board_progressbar_bg.png');
        scene.load.image('board_progressbar_fill', 'board_progressbar_fill.png');
        scene.load.image('score_cup', 'score_cup.png');
        scene.load.spritesheet('confetti', 'confetti.png', { frameWidth: 16, frameHeight: 16 });

        scene.load.setPath(`assets/components/scoreboard/audios`);
        scene.load.audio('scoreboard-music', 'scoreboard-music.mp3');
        scene.load.audio('text_spin', 'text_spin.mp3');

        scene.load.setPath(`assets/components/scoreboard/atlases/cup_shine`);
        scene.load.atlas('cup_animation', 'spritesheet.png', 'spritesheet.json');
    }

    public static init(scene: BaseScene) {
        if (!scene.anims.exists('cup_shine')) {
            scene.anims.create({
                key: 'cup_shine',
                frames: 'cup_animation',
                frameRate: 20,
                repeat: 2,
                hideOnComplete: false
            })
        }
    }

    createConfetti() {
        const emitter = this.scene.add.particles(0, 0, 'confetti', {
            speed: 100,
            lifespan: 5000,
            gravityY: 100,
            frame: [0, 4, 8, 12, 16],
            x: { min: 0, max: this.scene.getScaledValue(this.scene.display.width) },
            scaleX: {
                onEmit: () => {
                    return -1.0
                },
                onUpdate: (particle) => {
                    return (particle.scaleX > 1.0 ? -1.0 : particle.scaleX + 0.05)
                }
            },
            rotate: {
                onEmit: () => {
                    return 0
                },
                onUpdate: (particle) => {
                    return particle.angle + 1
                }
            }
        });
        emitter.setAlpha(0.5);
        emitter.setDepth(-1);
    }

    playTrophyShine() {
        this.scene.time.delayedCall(100, () => {
            this.cupLeftShine.setVisible(true);
            this.cupRightShine.setVisible(true);
            this.cupLeftShine.play('cup_shine');
            this.cupRightShine.play('cup_shine');
        });

        this.trophyInterval = setInterval(() => {
            this.cupLeftShine.play('cup_shine');
            this.cupRightShine.play('cup_shine');
        }, 5000);
    }

    createTextBlock(correct: number, total: number, cb?: () => void) {
        const textContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(this.scene.display.height / 2)).setDepth(1);

        let feedbackText: string = '';

        const percentage = (correct / total) * 100;

        if (percentage === 100) {
            feedbackText = this.i18n.t('common.perfectScore') as string;
        } else if (percentage <= 30) {
            feedbackText = this.i18n.t('common.scoreboardNegativeFeedback') as string;
        } else {
            feedbackText = this.i18n.t(`common.${this.successTextKeys[Math.floor(Math.random() * this.successTextKeys.length)]}`) as string;
        }

        const scoreText = this.scene.addText(0, 0, feedbackText, {
            font: '700 80px Exo',
            color: '#FFCC00',
        }).setOrigin(0.5);
        textContainer.add(scoreText);

        const scoreTextWidth = scoreText.displayWidth / this.scene.display.scale;
        const cupLeft = this.scene.add.container(this.scene.getScaledValue(-(scoreTextWidth / 2) - 100), 0).setRotation(-0.1);
        cupLeft.add(this.scene.addImage(0, 0, 'score_cup').setOrigin(0.5));
        this.cupLeftShine = this.scene.addSprite(0, 3, 'cup_shine').setOrigin(0.5).setScale(0.4).setAlpha(0.7).setVisible(false);
        cupLeft.add(this.cupLeftShine);
        textContainer.add(cupLeft);

        const cupRight = this.scene.add.container(this.scene.getScaledValue((scoreTextWidth / 2) + 100), 0).setRotation(0.1);
        cupRight.add(this.scene.addImage(0, 0, 'score_cup').setOrigin(0.5));
        this.cupRightShine = this.scene.addSprite(0, 3, 'cup_shine').setOrigin(0.5).setScale(0.4).setAlpha(0.7).setVisible(false);
        cupRight.add(this.cupRightShine);
        textContainer.add(cupRight);

        // Set initial alpha to 0
        textContainer.setAlpha(0);

        // Add fade in animation
        this.scene.tweens.add({
            targets: textContainer,
            alpha: 1,
            delay: 1500,
            duration: 1000,
            ease: 'Sine.easeIn',
            onComplete: () => {
                this.playTrophyShine();
                this.createConfetti();
                this.scene.audioManager.playSoundEffect('scoreboard-music');
                this.scene.tweens.add({
                    targets: textContainer,
                    y: this.scene.getScaledValue(this.scene.display.height / 2 - 280),
                    scale: 0.8,
                    duration: 700,
                    ease: 'Power2',
                    onComplete: () => {
                        new TextOverlay(this.scene, scoreText, { label: feedbackText, tag: 'h1', announce: true });
                        cb?.();
                    }
                });
            }
        });
    }

    createMainBoard(score: number, correct: number, total: number, spinInterval: number = 0) {
        const mainContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(this.scene.display.height / 2));
        mainContainer.add(this.scene.addImage(0, 0, 'main_board_bg').setOrigin(0.5));
        mainContainer.add(this.scene.addImage(0, -80, 'points_bg').setOrigin(0.5));
        mainContainer.add(this.scene.addImage(0, 120, 'board_progress_bg').setOrigin(0.5));

        if (this.theme === 'fact_racer' && (this.scene as any).createLeaderboard) {
            (this.scene as any).createLeaderboard(mainContainer);
        }

        let starsImgX = -200;
        let starsImgY = -80;
        if (this.theme === 'fact_racer') {
            starsImgX = 105;
            starsImgY = -122;
        }
        const starsImg = this.scene.addImage(starsImgX, starsImgY, 'board_stars').setOrigin(0.5);
        if (this.theme === 'fact_racer') starsImg.setScale(0.4);
        mainContainer.add(starsImg);
        new ImageOverlay(this.scene, starsImg, { label: this.i18n.t('scoreboard.points') as string + ' ' + this.i18n.t('common.icon') });

        let pointsTextX = 100;
        let pointsTextY = -120;
        if (this.theme === 'fact_racer') {
            pointsTextX = 225;
            pointsTextY = -123;
        }
        const pointsText = this.scene.addText(pointsTextX, pointsTextY, this.i18n.t('scoreboard.points') as string, {
            font: '500 46px Exo',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        mainContainer.add(pointsText);
        new TextOverlay(this.scene, pointsText, { label: this.i18n.t('scoreboard.points') as string });

        let scoreTextX = 35;
        let scoreTextY = -50;
        if (this.theme === 'fact_racer') {
            scoreTextX = 225;
            scoreTextY = -50;
        }
        const scoreText = this.scene.addText(scoreTextX, scoreTextY, '', {
            font: '800 80px Exo',
            color: '#FFFFFF',
        }).setOrigin(0, 0.5);
        if (this.theme === 'fact_racer') scoreText.setOrigin(0.5);
        mainContainer.add(scoreText);
        new TextOverlay(this.scene, scoreText, { label: this.i18n.formatNumberForScreenReader(score) + ' ' + this.i18n.t('scoreboard.points') as string, announce: true });
        let icon = 'board_tick';
        if(this.theme === 'multi_linear_equation') {
            icon = 'monster_1';
        }
        const tickImg = this.scene.addImage(-250, 120, icon).setOrigin(0.5);
        mainContainer.add(tickImg);
        let header = 'scoreboard.noOfCorrect';
        if(this.theme === 'multi_linear_equation') {
            header = 'scoreboard.emojiCorrected';
        }
        new ImageOverlay(this.scene, tickImg, { label: this.i18n.t(header) as string + ' ' + this.i18n.t('common.icon') });

        const correctText = this.scene.addText(-170, 90, this.i18n.t(header) as string, {
            font: '500 30px Exo',
            color: '#FFFFFF',
        }).setOrigin(0, 0.5)
        mainContainer.add(correctText);
        new TextOverlay(this.scene, correctText, { label: this.i18n.t(header) as string });

        mainContainer.add(this.scene.addImage(-10, 140, 'board_progressbar_bg').setOrigin(0.5));
        this.progressBarFill = this.scene.addImage(-174, 137, 'board_progressbar_fill').setOrigin(0, 0.5)
        mainContainer.add(this.progressBarFill);
        new ImageOverlay(this.scene, this.progressBarFill, {
            label: this.i18n.t('scoreboard.progress', { correct, total }) as string
        });
        this.progressBarMask = this.scene.add.graphics();
        this.progressBarMask.setVisible(false);
        this.progressBarFill.setMask(new Phaser.Display.Masks.GeometryMask(this.scene, this.progressBarMask));
        // Get dimensions from the background image
        const bgTexture = this.scene.textures.get('board_progressbar_fill');
        this.progressBarWidth = bgTexture.getSourceImage().width;

        const totalCorrectTextVal = this.i18n.t('scoreboard.correctOutOf', { correct, total }) as string;
        const totalCorrectText = this.scene.addText(230, 140, totalCorrectTextVal, {
            font: '800 22px Exo',
            color: '#FFFFFF',
            align: 'center',
            wordWrap: { width: 130 }
        }).setOrigin(0.5);
        mainContainer.add(totalCorrectText);
        new TextOverlay(this.scene, totalCorrectText, { label: this.i18n.t('scoreboard.correctOutOfAnnounce', { correct, total }) as string, announce: true });

        // Set initial alpha to 0
        mainContainer.setAlpha(0);

        // Add fade in animation
        this.scene.tweens.add({
            targets: mainContainer,
            alpha: 1,
            duration: 1000,
            ease: 'Sine.easeIn',
            onComplete: () => {
                this.scene.audioManager.playSoundEffect('text_spin');
                this.spinText(scoreText, score.toString(), score, spinInterval, () => {
                    this.scene.audioManager.stopSoundEffect('text_spin');
                });
                this.drawProgressFill(correct / total);
            }
        });
    }

    drawProgressFill(progress: number) {
        // If there's an active tween, stop it
        if (this.progressTween) {
            this.progressTween.stop();
        }

        // Create a tween to animate from current progress to target progress
        this.progressTween = this.scene.tweens.add({
            targets: this,
            currentProgress: progress,
            duration: 500,
            ease: "Power2",
            onUpdate: () => {
                this.renderProgressFill(this.currentProgress);
            },
        });
    }

    renderProgressFill(progress: number) {
        if (progress <= 0) return;

        // Get fill image's world position and height
        const matrix = this.progressBarFill.getWorldTransformMatrix();
        const fillX = matrix.tx;
        const fillY = matrix.ty;
        const fillHeight = this.progressBarFill.displayHeight;

        // Update mask
        this.progressBarMask.clear();
        this.progressBarMask.fillStyle(0xffffff);
        this.progressBarMask.fillRect(
            fillX,
            fillY - fillHeight / 2,
            this.scene.getScaledValue(this.progressBarWidth * progress),
            fillHeight
        );
    }

    spinText(
        textObj: Phaser.GameObjects.Text,
        displayValue: string,
        maxValue: number = 9,
        interval: number = 70,
        cb?: () => void,
    ) {
        const spinInterval = interval;
        let spinCount = 0;
        let val = 0;
        const spin = () => {
            if (val < maxValue) {
                textObj.setText(val.toString());
                val += 1;
                spinCount++;
                setTimeout(spin, spinInterval); // Slightly slow down
            } else {
                // Show final value
                textObj.setText(displayValue);
                cb?.();
            }
        };
        spin();
    }

    createBoard(
        x: number, y: number, title: string, background: string, icon: string, value: string, scale?: number,
        textOptions: {
            spinText?: boolean,
            spinInterval?: number,
            textAlign?: 'left' | 'center',
        } = {
                textAlign: 'left',
            }
    ) {
        const boardContainer = this.scene.add.container(this.scene.getScaledValue(x), this.scene.getScaledValue(y));
        boardContainer.add(this.scene.addImage(0, 0, 'board').setScale(0.9).setOrigin(0.5));

        const titleText = this.scene.addText(0, -60, title, {
            fontSize: 30,
            fontStyle: 'bold',
            fontFamily: 'Exo',
            color: '#000000',
        }).setOrigin(0.5);
        boardContainer.add(titleText);
        new TextOverlay(this.scene, titleText, { label: title });

        boardContainer.add(this.scene.addImage(0, 20, background).setScale(0.85).setOrigin(0.5));

        if (textOptions.textAlign === 'left') {
            const iconImage = this.scene.addImage(-70, 20, icon).setScale(0.7).setOrigin(0.5);
            boardContainer.add(iconImage);
            new ImageOverlay(this.scene, iconImage, { label: title + ' ' + this.i18n.t('common.icon') });

            const valueText = this.scene.addText(-25, 23, textOptions.spinText ? "" : value, {
                font: "700 46px Exo",
                color: '#ffffff',
            }).setOrigin(0, 0.5)
            boardContainer.add(valueText);
            new TextOverlay(this.scene, valueText, { label: value });
        } else {
            const boardTextContainer = this.scene.add.container(0, this.scene.getScaledValue(20));

            const iconImage = this.scene.addImage(-10, 0, icon).setScale(0.7).setOrigin(1, 0.5);
            boardTextContainer.add(iconImage);

            const valueText = this.scene.addText(10, 5, textOptions.spinText ? "" : value, {
                font: "700 46px Exo",
                color: '#ffffff',
            }).setOrigin(0, 0.5)
            boardTextContainer.add(valueText);

            boardContainer.add(boardTextContainer);

            new ImageOverlay(this.scene, iconImage, { label: title + ' ' + this.i18n.t('common.icon') });
            new TextOverlay(this.scene, valueText, { label: value });
        }

        if (scale) {
            boardContainer.setScale(scale);
        }

        // Set initial alpha to 0
        boardContainer.setAlpha(0);

        // Add fade in animation
        this.scene.tweens.add({
            targets: boardContainer,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                if (textOptions.spinText) {
                    this.scene.audioManager.playSoundEffect('text_spin');
                    let spinTextItem: Phaser.GameObjects.Text;
                    if (textOptions.textAlign === 'left') {
                        spinTextItem = (boardContainer.getAt(4) as Phaser.GameObjects.Text);
                    } else {
                        spinTextItem = (boardContainer.getAt(3) as Phaser.GameObjects.Container).getAt(1) as Phaser.GameObjects.Text;
                    }
                    this.spinText(spinTextItem, value, parseInt(value), textOptions.spinInterval || 70, () => {
                        this.scene.audioManager.stopSoundEffect('text_spin');
                    });
                }
            }
        });
    }

    fadeInMascot(mascotKey: string) {
        const mascot = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2 - 100, mascotKey)
            .setOrigin(0.5)
            .setScale(0.5)
            .setAlpha(0);

        // Fade in animation
        this.scene.tweens.add({
            targets: mascot,
            alpha: 1,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                // Start floating animation
                this.scene.tweens.add({
                    targets: mascot,
                    x: this.scene.getScaledValue(this.scene.display.width / 2 + 20),
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });
    }

    createPlayAgainButton(imageKeys: {
        default: string,
        hover: string,
        pressed: string,
    }, isPerfect: boolean, cb: () => void): Phaser.GameObjects.Container {
        const playButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys,
            text: !isPerfect ? this.i18n.t('scoreboard.beatYourScore') as string : this.i18n.t('scoreboard.playAgain') as string,
            label: !isPerfect ? this.i18n.t('scoreboard.beatYourScore') as string : this.i18n.t('scoreboard.playAgain') as string,
            textStyle: {
                font: '700 30px Exo',
                color: '#ffffff',
            },
            imageScale: 1,
            x: this.scene.display.width / 2,
            y: this.scene.display.height - 80,
            onClick: () => {
                clearInterval(this.trophyInterval);
                clearTimeout(timeout);
                cb();
            },
        });

        // Start breathing animation after 10s
        const timeout = setTimeout(() => {
            ButtonHelper.startBreathingAnimation(playButton, {
                scale: 1.05,
                duration: 1000,
                ease: 'Sine.easeInOut'
            });
        }, 10000);

        return playButton;
    }
}