import { announceToScreenReader, BaseScene, ButtonHelper, i18n, TextOverlay } from "@k8-games/sdk";
import { StepEquations } from "../mechanic/StepEquations";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { DoorUtils } from "../utils/DoorUtils";

class StepEquationsTutorial {
    private scene: BaseScene;
    private level: number;
    private doorUtils!: DoorUtils;
    private stepEquations: StepEquations;
    private parentScene: string = 'SplashScene';
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private isSkipped: boolean = false;
    private hand: Phaser.GameObjects.Image | null = null;
    private buttonsDisabled: boolean = false; // Add this flag
    private stepTitleOverlay!: TextOverlay;
    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    constructor(scene: BaseScene, level: number) {
        this.scene = scene;
        this.level = level;
        this.stepEquations = new StepEquations(scene, level, true);
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || 'en';
        StepEquations._preload(scene);

        // Load hand image
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image('hand', 'hand.png');
        scene.load.image('hand_click', 'hand_click.png');

        // Load audio files
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/step_equations`);
        scene.load.audio('se_step_1', `step_1_${lang}.mp3`);
        scene.load.audio('se_step_2', `step_2_${lang}.mp3`);
        scene.load.audio('se_step_3', `step_3_${lang}.mp3`);
        scene.load.audio('se_step_4', `step_4_${lang}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/step_equations/multiply_divide`);
        scene.load.audio('se_step_1_md', `step_1_${lang}.mp3`);
        scene.load.audio('se_step_2_md', `step_2_${lang}.mp3`);
        scene.load.audio('se_step_3_md', `step_3_${lang}.mp3`);
        scene.load.audio('se_step_4_md', `step_4_${lang}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/step_equations/two_step_l1`);
        scene.load.audio('se_step_1_2se_l1', `step_1_${lang}.mp3`);
        scene.load.audio('se_step_2_2se_l1', `step_2_${lang}.mp3`);
        scene.load.audio('se_step_3_2se_l1', `step_3_${lang}.mp3`);
        scene.load.audio('se_step_4_2se_l1', `step_4_${lang}.mp3`);
        scene.load.audio('se_step_5_2se_l1', `step_5_${lang}.mp3`);
        scene.load.audio('se_step_6_2se_l1', `step_6_${lang}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/step_equations/two_step_l2`);
        scene.load.audio('se_step_1_2se_l2', `step_1_${lang}.mp3`);
        scene.load.audio('se_step_2_2se_l2', `step_2_${lang}.mp3`);
        scene.load.audio('se_step_3_2se_l2', `step_3_${lang}.mp3`);
        scene.load.audio('se_step_4_2se_l2', `step_4_${lang}.mp3`);
        scene.load.audio('se_step_5_2se_l2', `step_5_${lang}.mp3`);
        scene.load.audio('se_step_6_2se_l2', `step_6_${lang}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/step_equations/distribution`); //distribution.
        scene.load.audio('se_step_1_dist', `step_1_${lang}.mp3`);
        scene.load.audio('se_step_2_dist', `step_2_${lang}.mp3`);
        scene.load.audio('se_step_3_dist', `step_3_${lang}.mp3`);
        scene.load.audio('se_step_4_dist', `step_4_${lang}.mp3`);
        scene.load.audio('se_step_5_dist', `step_5_${lang}.mp3`);
        scene.load.audio('se_step_6_dist', `step_6_${lang}.mp3`);
        scene.load.audio('se_step_7_dist', `step_7_${lang}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/step_equations/double_variable`); //double_variable
        scene.load.audio('se_step_1_vb', `step_1_${lang}.mp3`);
        scene.load.audio('se_step_2_vb', `step_2_${lang}.mp3`);
        scene.load.audio('se_step_3_vb', `step_3_${lang}.mp3`);
        scene.load.audio('se_step_4_vb', `step_4_${lang}.mp3`);
        scene.load.audio('se_step_5_vb', `step_5_${lang}.mp3`);
        scene.load.audio('se_step_6_vb', `step_6_${lang}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        scene.load.audio("hit_play", `hit_play_${lang}.mp3`);
    }

    init(data?: { reset?: boolean, level: number, parentScene: string }) {
        if (data?.parentScene) {
            this.parentScene = data.parentScene;
        }
        this.stepEquations.init(data);
    }

    create() {
        // Add black title background
        this.scene.addRectangle(this.scene.display.width / 2, 96, this.scene.display.width, 128, 0x00141A, 1).setDepth(2);

        // Add how to play text
        const howToPlayText = this.scene.addText(this.scene.display.width / 2, 96, i18n.t('info.howToPlay'), {
            font: "700 26px Exo",
            color: '#FFFFFF',
        }).setOrigin(0.5).setDepth(2);
 
        this.createSkipButton();

        // Add text overlay
        new TextOverlay(this.scene, howToPlayText, { label: i18n.t('info.howToPlay'), tag: 'h1', role: 'heading' });
 
        this.stepEquations.create(this.parentScene);
        this.stepTitleOverlay = new TextOverlay(this.scene, this.stepEquations.titleText, {
            label: "",
            tag: "h2",
            role: "heading"
        });
        this.doorUtils = new DoorUtils(this.scene);

        // Disable options on start
        this.stepEquations.isOptionsDisabled = true;

        const timer = this.scene.time.delayedCall(1000, () => {
            this.playStep(1);
        });
        this.delayedCalls.push(timer);
    }

    private getStepCount(): number {
        // Determine the max step for the current topic/level
        if (this.stepEquations['topic'] === 'grade7_topic5' && this.level === 1) {
            return 6; // 2se_l1 has step1 to step6
        } else if (this.stepEquations['topic'] === 'grade7_topic5' && this.level === 2) {
            return 6; // 2se_l2 has step1 to step6
        } else if (this.stepEquations['topic'] === 'grade7_topic5' && this.level === 3) {
            return 7;
        } else if (this.stepEquations['topic'] === 'grade7_topic5' && this.level === 4) {
            return 6;
        }
        return 4; // Default
    }

    private playStep(step: number) {
        if (this.isSkipped) return;

        // Set title text and play audio
        const stepText = i18n.t(this.getStepEquationTextKey(step));
        this.stepEquations.titleText.setText(stepText);
        this.stepTitleOverlay.updateContent(stepText);
        this.queueAnnouncement(stepText, true);
        
        const audioKey = this.getStepEquationAudioKey(step);
        const audio = this.scene.audioManager.playSoundEffect(audioKey);
        this.disableButtons();

        // Handle special logic for certain steps (e.g., hand animation, enabling options)
        if (this.isOptionStep(step)) {
            // Find correct option for this step
            const correctOption = this.findCorrectOptionForStep(step);
            this.createHandClickAnimation(correctOption!);

            audio?.on('complete', () => {
                this.stepEquations.isOptionsDisabled = false;
                
                // Enable current button
                ButtonHelper.enableButton(correctOption!);

                // Repeat the step until correct answer
                const timer = this.scene.time.delayedCall(3000, () => {
                    this.playStep(step);
                });
                this.delayedCalls.push(timer);

                const handleCorrectAnswer = (data: { isCorrect: boolean }) => {
                    if (data.isCorrect) {
                        this.enableButtons();
                        this.stepEquations.isOptionsDisabled = true;
                        this.hand?.destroy();
                        this.hand = null;
                        this.scene.audioManager.stopAllSoundEffects();
                        timer.destroy();
                        const timer2 = this.scene.time.delayedCall(1000, () => {
                            this.playStep(step + 1);
                        });
                        this.delayedCalls.push(timer2);
                    }
                };
                this.scene.events.removeAllListeners('correctanswer');
                this.scene.events.once('correctanswer', handleCorrectAnswer);
            });
        } else if (this.isFinalStep(step)) {
            // Final step logic (e.g., breathing animation, play button)
            audio?.on('complete', () => {
                this.destroyTimers();
                for (const btn of this.stepEquations.optionButtons) btn.destroy();
                this.scene.time.delayedCall(500, () => {
                    if (this.parentScene === 'SplashScene') {
                        this.scene.audioManager.playSoundEffect('hit_play');
                    }
                    this.createPlayButton();
                });
            });
        } else {
            // Default: just go to next step after audio
            audio?.on('complete', () => {
                const timer = this.scene.time.delayedCall(1000, () => {
                    this.playStep(step + 1);
                });
                this.delayedCalls.push(timer);
            });
        }
    }

    private disableButtons() {
        if (this.buttonsDisabled) return; // Only disable once
        
        this.stepEquations.optionButtons.forEach(button => {
            ButtonHelper.disableButton(button);
        });
        this.buttonsDisabled = true; // Mark as disabled
    }

    private enableButtons() {
        this.stepEquations.optionButtons.forEach(button => {
            ButtonHelper.enableButton(button);
        });
        this.buttonsDisabled = false; // Reset flag when enabling
    }

    // Helper to determine if this step is an option step (needs hand animation and answer)
    private isOptionStep(step: number): boolean {
        // For 2se_l1 and 2se_l2, steps 3 and 5 are option steps
        if ((this.stepEquations['topic'] === 'grade7_topic5' && this.level === 1) ||
            (this.stepEquations['topic'] === 'grade7_topic5' && this.level === 2)) {
            return step === 3 || step === 5;
        }

        if((this.stepEquations['topic'] === 'grade7_topic5' && this.level === 3)) {
            return step === 2 || step === 4 || step === 6;
        }

        if((this.stepEquations['topic'] === 'grade7_topic5' && this.level === 4)) {
            return step === 3 || step === 5;
        }
        // Default: step 3 is the option step
        return step === 3;
    }

    // Helper to determine if this is the final step
    private isFinalStep(step: number): boolean {
        return step === this.getStepCount();
    }

    // Helper to find the correct option for a given step
    private findCorrectOptionForStep(step: number): Phaser.GameObjects.Container | undefined {
        // You may want to map step numbers to option values based on topic/level
        if (this.stepEquations['topic'] === 'grade7_topic5' && this.level === 1) {
            if (step === 3) return this.stepEquations.optionButtons.find(btn => btn.getData('option') === '- 3');
            if (step === 5) return this.stepEquations.optionButtons.find(btn => btn.getData('option') === '÷ 2');
        } else if (this.stepEquations['topic'] === 'grade7_topic5' && this.level === 2) {
            if (step === 3) return this.stepEquations.optionButtons.find(btn => btn.getData('option') === '- 3');
            if (step === 5) return this.stepEquations.optionButtons.find(btn => btn.getData('option') === '× 2');
        } else if (this.stepEquations['topic'] === 'grade7_topic5' && this.level === 3) {
            if (step === 2) return this.stepEquations.optionButtons.find(btn => btn.getData('option') === 'distribute 2');
            if (step === 4) return this.stepEquations.optionButtons.find(btn => btn.getData('option') === '- 6');
            if (step === 6) return this.stepEquations.optionButtons.find(btn => btn.getData('option') === '÷ 2');
        } else if (this.stepEquations['topic'] === 'grade7_topic5' && this.level === 4) {
            if (step === 3) return this.stepEquations.optionButtons.find(btn => btn.getData('option') === '- x');
            if (step === 5) return this.stepEquations.optionButtons.find(btn => btn.getData('option') === '- 6');
        }
        // Default logic
        if (step === 3) {
            if (this.stepEquations['topic'] === 'grade6_topic4' && this.level === 2) {
                return this.stepEquations.optionButtons.find(btn => btn.getData('option') === '÷ 2');
            }
            return this.stepEquations.optionButtons.find(btn => btn.getData('option') === '- 4');
        }
        return undefined;
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
        this.hand = this.scene.addImage(handX, handY, 'hand');
        this.hand.setOrigin(0.5);
        this.hand.setDepth(10);
        this.hand.setScale(0.13);

        // Add single click animation using both textures
        this.scene.tweens.chain({
            targets: this.hand,
            tweens: [
                {
                    x: targetButton.x + this.scene.getScaledValue(15),
                    y: targetButton.y + this.scene.getScaledValue(10),
                    duration: 1000,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        this.hand?.setTexture("hand_click");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        this.hand?.setTexture("hand");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        this.hand?.destroy();
                    }
                },
            ],
        });
    }

    // private playStep1() {
    //     if (this.isSkipped) {
    //         return;
    //     }
    //     this.stepEquations.titleText.setText(i18n.t(this.getStepEquationTextKey(1)));
    //     const step1 = this.scene.audioManager.playSoundEffect(this.getStepEquationAudioKey(1));
    //     step1?.setVolume(0.5);

    //     // Start breathing animation for the question text
    //     const { lhs, rhs, equals } = this.stepEquations.equations[0];
    //     const breathingTween = this.scene.tweens.add({
    //         targets: [lhs, rhs, equals],
    //         props: {
    //             scale: {
    //                 getEnd: (target: typeof Phaser.GameObjects) => {
    //                     if (target instanceof Phaser.GameObjects.Container) {
    //                         return 1.2;
    //                     }
    //                     return this.scene.getScaledValue(1.2);
    //                 }
    //             }
    //         },
    //         duration: 700,
    //         ease: "Sine.easeInOut",
    //         yoyo: true,
    //         repeat: -1,
    //         onStop: () => {
    //             // Reset scale
    //             this.scene.tweens.add({
    //                 targets: [lhs, rhs, equals],
    //                 scale: {
    //                     getStart: (target: typeof Phaser.GameObjects) => {
    //                         if (target instanceof Phaser.GameObjects.Container) {
    //                             return 1;
    //                         }
    //                         return this.scene.getScaledValue(1);
    //                     }
    //                 },
    //                 duration: 500,
    //                 ease: "Sine.easeInOut",
    //             });
    //         }
    //     });

    //     step1?.on('complete', () => {
    //         // Stop breathing animation
    //         breathingTween.stop();

    //         const timer = this.scene.time.delayedCall(1000, () => {
    //             this.playStep2();
    //         });
    //         this.delayedCalls.push(timer);
    //     });
    // }

    // private playStep2() {
    //     if (this.isSkipped) {
    //         return;
    //     }
    //     this.stepEquations.titleText.setText(i18n.t(this.getStepEquationTextKey(2)));
    //     const step2 = this.scene.audioManager.playSoundEffect(this.getStepEquationAudioKey(2));
    //     step2?.setVolume(0.5);

    //     step2?.on('complete', () => {
    //         const timer = this.scene.time.delayedCall(1000, () => {
    //             this.playStep3();
    //         });
    //         this.delayedCalls.push(timer);
    //     });
    // }

    // private playStep3() {
    //     if (this.isSkipped) {
    //         return;
    //     }
    //     this.stepEquations.titleText.setText(i18n.t(this.getStepEquationTextKey(3)));
    //     const step3 = this.scene.audioManager.playSoundEffect(this.getStepEquationAudioKey(3));
    //     step3?.setVolume(0.5);

        

    //     // Find correct option button
    //     let correctOption = this.stepEquations.optionButtons.find(button => button.getData('option') === '- 4');

    //     if(this.stepEquations['topic'] === 'grade6_topic4' && this.level === 2) {
    //         correctOption = this.stepEquations.optionButtons.find(button => button.getData('option') === '÷ 2');
    //     }

    //     // Create hand click animation
    //     this.createHandClickAnimation(correctOption!);

    //     step3?.on('complete', () => {
    //         // Enable options
    //         this.stepEquations.isOptionsDisabled = false;

    //         // Repeat the step 3
    //         const timer = this.scene.time.delayedCall(3000, () => {
    //             this.playStep3();
    //         });
    //         this.delayedCalls.push(timer);

    //         const handleCorrectAnswer = (data: { isCorrect: boolean }) => {
    //             if (data.isCorrect) {
    //                 // Disable options
    //                 this.stepEquations.isOptionsDisabled = true;

    //                 // Destroy hand click animation
    //                 this.hand?.destroy();
    //                 this.hand = null;

    //                 // Stop previous sound effect
    //                 this.scene.audioManager.stopAllSoundEffects();

    //                 // destroy the timer
    //                 timer.destroy();
    //                 const timer2 = this.scene.time.delayedCall(1000, () => {
    //                     this.playStep4();
    //                 });
    //                 this.delayedCalls.push(timer2);
    //             }
    //         };

    //         // Remove all listeners
    //         this.scene.events.removeAllListeners('correctanswer');
    //         // Listen for correct answer event
    //         this.scene.events.once('correctanswer', handleCorrectAnswer);
    //     });
    // }

    // private playStep4() {
    //     if (this.isSkipped) {
    //         return;
    //     }
    //     this.stepEquations.titleText.setText(i18n.t(this.getStepEquationTextKey(4)));
    //     const step4 = this.scene.audioManager.playSoundEffect(this.getStepEquationAudioKey(4));
    //     step4?.setVolume(0.5);

    //     // Last step
    //     const { lhs, rhs, equals } = this.stepEquations.equations[this.stepEquations.equations.length - 1];

    //     // Start breathing animation for the answer text
    //     const breathingTween = this.scene.tweens.add({
    //         targets: [lhs, rhs, equals],
    //         props: {
    //             scale: {
    //                 getEnd: (target: typeof Phaser.GameObjects) => {
    //                     if (target instanceof Phaser.GameObjects.Container) {
    //                         return 1.2;
    //                     }
    //                     return this.scene.getScaledValue(1.2);
    //                 }
    //             }
    //         },
    //         duration: 700,
    //         ease: "Sine.easeInOut",
    //         yoyo: true,
    //         repeat: -1,
    //     });

    //     step4?.on('complete', () => {
    //         // Stop breathing animation
    //         breathingTween.stop();
    //         // Reset scale
    //         this.scene.tweens.add({
    //             targets: [lhs, rhs, equals],
    //             props: {
    //                 scale: {
    //                     getStart: (target: typeof Phaser.GameObjects) => {
    //                         if (target instanceof Phaser.GameObjects.Container) {
    //                             return 1;
    //                         }
    //                         return this.scene.getScaledValue(1);
    //                     }
    //                 }
    //             },
    //             duration: 500,
    //             ease: "Sine.easeInOut",
    //         });

    //         this.destroyTimers();

    //         // Destroy all option buttons
    //         for (const btn of this.stepEquations.optionButtons) {
    //             btn.destroy();
    //         }

    //         // Start the game scene and destroy this scene
    //         this.scene.time.delayedCall(500, () => {
    //             if (this.parentScene === 'SplashScene') {
    //                 const hitPlay = this.scene.audioManager.playSoundEffect('hit_play');
    //                 hitPlay?.setVolume(0.5);
    //             }
    //             this.createPlayButton();
    //         });
    //     });
    // }

    public startGameScene() {
        if (this.parentScene === 'SplashScene') {
            // Close doors and start game scene
            this.doorUtils.closeDoors(() => {
                this.scene.audioManager.stopAllSoundEffects();
                this.scene.scene.stop('InstructionsScene');
                this.scene.scene.start('GameScene', {
                    reset: true,
                    mechanic: 'step_equations',
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

    private getStepEquationTextKey(step: number): string {
        if (this.stepEquations['topic'] === 'grade6_topic4' && this.level === 2) {
            return `info.stepEquation.step${step}_md`;
        } else if (this.stepEquations['topic'] === 'grade7_topic5' && this.level === 1) {
            return `info.stepEquation.step${step}_2se_l1`;
        } else if( this.stepEquations['topic'] === 'grade7_topic5' && this.level === 2) {
            return `info.stepEquation.step${step}_2se_l2`;
        } else if( this.stepEquations['topic'] === 'grade7_topic5' && this.level === 3) {
            return `info.stepEquation.step${step}_dist`;
        } else if( this.stepEquations['topic'] === 'grade7_topic5' && this.level === 4) {
            return `info.stepEquation.step${step}_vb`;
        } 
        return `info.stepEquation.step${step}`;
    }

    private getStepEquationAudioKey(step: number): string {
        if (this.stepEquations['topic'] === 'grade6_topic4' && this.level === 2) {
            return `se_step_${step}_md`;
        } else if (this.stepEquations['topic'] === 'grade7_topic5' && this.level === 1) {
            return `se_step_${step}_2se_l1`;
        } else if( this.stepEquations['topic'] === 'grade7_topic5' && this.level === 2) {
            return `se_step_${step}_2se_l2`;
        } else if( this.stepEquations['topic'] === 'grade7_topic5' && this.level === 3) {
            return `se_step_${step}_dist`;
        } else if( this.stepEquations['topic'] === 'grade7_topic5' && this.level === 4) {
            return `se_step_${step}_vb`;
        }
        return `se_step_${step}`;
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

export default StepEquationsTutorial;