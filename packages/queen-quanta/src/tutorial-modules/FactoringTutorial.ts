import { announceToScreenReader, BaseScene, ButtonHelper, i18n, TextOverlay } from "@k8-games/sdk";
import { Factoring } from "../mechanic/Factoring";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { DoorUtils } from "../utils/DoorUtils";

class FactoringTutorial {
    private scene: BaseScene;
    private level: number;
    private factoring: Factoring;
    private doorUtils!: DoorUtils;
    private parentScene: string = 'SplashScene';
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private isSkipped: boolean = false;
    private titleOverlay!: TextOverlay;
    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    constructor(scene: BaseScene, level: number) {
        this.scene = scene;
        this.level = level;
        this.factoring = new Factoring(scene, level, true);
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || "en";
        Factoring._preload(scene);

        // Load instruction audio files
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/factoring`);
        scene.load.audio("factoring_step_1", `step_1_${lang}.mp3`);
        scene.load.audio("factoring_step_2", `step_2_${lang}.mp3`);
        scene.load.audio("factoring_step_3", `step_3_${lang}.mp3`);
        scene.load.audio("factoring_step_4", `step_4_${lang}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        scene.load.audio("hit_play", `hit_play_${lang}.mp3`);
    }

    init(data?: { reset?: boolean, level: number, parentScene: string }) {
        if (data?.parentScene) {
            this.parentScene = data.parentScene;
        }
        this.factoring.init(data);
    }

    create() {
        // Add black title background
        this.scene.addRectangle(this.scene.display.width / 2, 96, this.scene.display.width, 128, 0x00141A, 1).setDepth(2);

        // Add how to play text
        const howToPlayText = this.scene.addText(this.scene.display.width / 2, 96, i18n.t('info.howToPlay'), {
            font: "700 26px Exo",
            color: '#FFFFFF',
        }).setOrigin(0.5).setDepth(2);

        // Add text overlay
        new TextOverlay(this.scene, howToPlayText, { label: i18n.t('info.howToPlay'), tag: 'h1', role: 'heading' });

        this.createSkipButton();

        this.factoring.create(this.parentScene);
        this.titleOverlay = new TextOverlay(
            this.scene,
            this.factoring.titleText!,
            {
                label: "",
                tag: "h2",
                role: "heading"
            }
        );
        this.doorUtils = new DoorUtils(this.scene);

        const timer = this.scene.time.delayedCall(1000, () => {
            this.playStep1();
        });
        this.delayedCalls.push(timer);
    }

    private createSkipButton() {
        ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.HALF_BUTTON.KEY,
                hover: BUTTONS.HALF_BUTTON_HOVER.KEY,
                pressed: BUTTONS.HALF_BUTTON_PRESSED.KEY,
            },
            text: i18n.t('common.skip'),
            label: i18n.t('common.skip'),
            textStyle: {
                font: "700 32px Exo",
                color: '#FFFFFF',
            },
            imageScale: 1,
            x: this.scene.display.width - 54,
            y: 96,
            onClick: () => {
                if (this.isSkipped) {
                    return;
                }
                this.scene.audioManager.stopAllSoundEffects();
                this.isSkipped = true;
                this.startGameScene();
            }
        }).setDepth(2);
    }

    private createPlayButton(): void {
        const playButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: this.parentScene === 'SplashScene' ? i18n.t("common.play") : i18n.t("common.back"),
            label: this.parentScene === 'SplashScene' ? i18n.t("common.play") : i18n.t("common.back"),
            textStyle: {
                font: "700 32px Exo",
                color: "#ffffff",
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.scene.display.width / 2,
            y: this.scene.display.height - 88,
            onClick: () => {
                if (this.isSkipped) {
                    return;
                }
                this.scene.audioManager.stopAllSoundEffects();
                this.isSkipped = true;
                this.startGameScene();
            },
        });
        playButton.setDepth(20);

        ButtonHelper.startBreathingAnimation(playButton, {
            scale: 1.1,
            duration: 1000,
            ease: "Sine.easeInOut",
        });
    }

    private createHandClickAnimation(targetButton: Phaser.GameObjects.Container) {
        // Create hand image for single click animation\
        const handX = targetButton.x / this.scene.display.scale + this.scene.getScaledValue(50);
        const handY = targetButton.y / this.scene.display.scale - this.scene.getScaledValue(20);
        const hand = this.scene.addImage(handX, handY, 'hand');
        hand.setOrigin(0.5);
        hand.setDepth(10);
        hand.setScale(0.13);

        // Add single click animation using both textures
        this.scene.tweens.chain({
            targets: hand,
            tweens: [
                {
                    x: targetButton.x + this.scene.getScaledValue(15),
                    y: targetButton.y + this.scene.getScaledValue(10),
                    duration: 1000,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        hand.setTexture("hand_click");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        hand.setTexture("hand");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        hand.destroy();
                    }
                },
            ],
        });
    }

    private playStep1() {
        if (this.isSkipped) {
            return;
        }
        const txt = i18n.t('info.factoring.step1');
        this.factoring.titleText.setText(txt);
        
        this.titleOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);
        
        const step1 = this.scene.audioManager.playSoundEffect('factoring_step_1');

        // Start breathing animation for the question text
        const breathingTween = this.scene.tweens.add({
            targets: this.factoring.questionText,
            scale: this.scene.getScaledValue(1.2),
            duration: 700,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: -1,
        });

        step1?.on('complete', () => {
            // Stop breathing animation and reset scale
            breathingTween.stop();
            this.factoring.questionText?.setScale(1);

            const timer = this.scene.time.delayedCall(1000, () => {
                this.playStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep2() {
        if (this.isSkipped) {
            return;
        }
        const txt = i18n.t('info.factoring.step2');
        this.factoring.titleText.setText(txt);
        
        this.titleOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);
        
        const step2 = this.scene.audioManager.playSoundEffect('factoring_step_2');

        // Show answer
        this.factoring.showAnswer();
        // Start breathing animation for the answer text
        const breathingTween = this.scene.tweens.add({
            targets: this.factoring.answerText,
            scale: this.scene.getScaledValue(1.1),
            duration: 700,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: -1,
        });

        step2?.on('complete', () => {
            // Stop breathing animation and reset scale
            breathingTween.stop();
            this.factoring.answerText?.setScale(1);

            const timer = this.scene.time.delayedCall(1000, () => {
                this.playStep3();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep3() {
        if (this.isSkipped) {
            return;
        }
        const txt = i18n.t('info.factoring.step3');
        this.factoring.titleText.setText(txt);
        
        this.titleOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);
        
        const step3 = this.scene.audioManager.playSoundEffect('factoring_step_3');

        step3?.on('complete', () => {
            const timer = this.scene.time.delayedCall(1000, () => {
                this.playStep4();
            });
            this.delayedCalls.push(timer);
        });

    }

    private playStep4() {
        if (this.isSkipped) {
            return;
        }
        const txt = i18n.t('info.factoring.step4');
        this.factoring.titleText.setText(txt);
        
        this.titleOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);
        
        const step4 = this.scene.audioManager.playSoundEffect('factoring_step_4');

        // Start breathing animation for the correct option
        let correctBtn!: Phaser.GameObjects.Container;
        // Find the correct option
        for (const btn of this.factoring.optionBtns) {
            if (btn.getData('text') === this.factoring.currentQuestion?.answer) {
                correctBtn = btn;
                break;
            }
        }

        this.createHandClickAnimation(correctBtn);

        step4?.on('complete', () => {

            const timer = this.scene.time.delayedCall(3000, () => {
                this.playStep4();
            });
            this.delayedCalls.push(timer);

            const handleCorrectAnswer = (data: { isCorrect: boolean }) => {
                if (data.isCorrect) {
                    this.destroyTimers();
                    // Stop all sound effects
                    this.scene.audioManager.stopAllSoundEffects();

                    // Destroy all option buttons
                    for (const btn of this.factoring.optionBtns) {
                        btn.destroy();
                    }

                    // Start the game scene and destroy this scene
                    this.scene.time.delayedCall(500, () => {
                        // Reset title text
                        this.factoring.titleText.setText(i18n.t('game.findGCF'));
                        if (this.parentScene === 'SplashScene') {
                            this.scene.audioManager.playSoundEffect('hit_play');
                        }
                        this.createPlayButton();
                    });
                }
            }

            // Remove all listeners
            this.scene.events.removeAllListeners('correctanswer');
            // Listen for correct answer event
            this.scene.events.once('correctanswer', handleCorrectAnswer);
        });
    }

    public startGameScene() {
        if (this.parentScene === 'SplashScene') {
            // Close doors and start game scene
            this.doorUtils.closeDoors(() => {
                this.scene.audioManager.stopAllSoundEffects();
                this.scene.scene.stop('InstructionsScene');
                this.scene.scene.start('GameScene', {
                    reset: true,
                    mechanic: 'factoring',
                    level: this.level
                });
            });
        } else {
            this.scene.audioManager.playBackgroundMusic('bg_music');
            this.scene.scene.resume('GameScene');
            this.scene.scene.stop('InstructionsScene');
            this.scene.audioManager.resumeAll();
        }
    }

    private destroyTimers() {
        this.delayedCalls.forEach(timer => timer.destroy());
        this.delayedCalls = [];
    }

    private queueAnnouncement(message: string, priority: boolean = false) {
        if (priority) {
            // For priority announcements (like feedback), clear queue and add immediately
            this.announcementQueue = [message];
            this.isAnnouncing = false;
        } else {
            this.announcementQueue.push(message);
        }
        this.processAnnouncementQueue();
    }
    
    private processAnnouncementQueue() {
        if (this.isAnnouncing || this.announcementQueue.length === 0) {
            return;
        }
    
        this.isAnnouncing = true;
        const message = this.announcementQueue.shift()!;
    
        // Clear first, then announce with a small delay
        announceToScreenReader('', 'assertive');
        
        setTimeout(() => {
            announceToScreenReader(message, 'assertive');
            
            // Estimate the duration of the announcement
            const words = message.split(' ').length;
            const estimatedDuration = (words / 2.5) * 1000; // 2.5 words per second
            const delay = Math.max(estimatedDuration + 500, 2000); // Minimum 2 seconds
    
            this.scene.time.delayedCall(delay, () => {
                this.isAnnouncing = false;
                this.processAnnouncementQueue();
            });
        }, 50);
    }
}

export default FactoringTutorial;   