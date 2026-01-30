import { BaseScene, ButtonHelper, i18n, VolumeSlider, setSceneBackground, TextOverlay, ImageOverlay, GameConfigManager, getQuestionBankByName, QuestionSelectorHelper, ButtonOverlay, focusToGameContainer, announceToScreenReader } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS, MULTIVERSE_TOPICS } from "../config/common";
import { generateQuestionFromSelector } from "../data/mathQuestions";
import { animateDoors } from '../utils/helper';

const textCords = [
    { x: 255, y: 285 },
    { x: 442, y: 294 },
    { x: 838, y: 285 },
    { x: 1023, y: 294 },
];

export class InstructionsScene extends BaseScene {
    private parentScene?: string;
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    
    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;
    
    private infoArrows!: Phaser.GameObjects.Image;
    private infoBeam!: Phaser.GameObjects.Image;
    private moveText!: Phaser.GameObjects.Text;
    private spacebarText!: Phaser.GameObjects.Text;
    private beamText!: Phaser.GameObjects.Text;
    private hand!: Phaser.GameObjects.Image;
    private ghost!: Phaser.GameObjects.Image;
    private ghostTween!: Phaser.Tweens.Tween;
    private info_fire!: Phaser.GameObjects.Sprite;
    private handTween!: Phaser.Tweens.Tween;
    private instructionLoopTimer?: Phaser.Time.TimerEvent;
    private playButton!: Phaser.GameObjects.Container;
    private isMobile: boolean = false;
    private infoCircleLeft!: Phaser.GameObjects.Image;
    private infoCircleLeftTween!: Phaser.Tweens.Tween;
    private infoCircleRight!: Phaser.GameObjects.Image;
    private handGestureText!: Phaser.GameObjects.Text;
    private beamButtonText!: Phaser.GameObjects.Text;
    private beamButton!: Phaser.GameObjects.Container;
    private topic: string = '2D_addition_upto_100';
    private mode: string | null = null;
    private gameConfigManager!: GameConfigManager;
    private questionSelector!: QuestionSelectorHelper;
    private step1Text!: Phaser.GameObjects.Text;
    private step2Text!: Phaser.GameObjects.Text;
    private playDesc!: Phaser.GameObjects.Text;
    private playDescOverlay!: TextOverlay;
    private step1TextOverlay!: TextOverlay;
    private step2TextOverlay!: TextOverlay;
    private beamTextOverlay!: TextOverlay;
    private spaceBarTextOverlay!: TextOverlay;
    private infoBeamOverlay!: ImageOverlay;
    private moveTextOverlay!: TextOverlay;
    private infoArrowsOverlay!: ImageOverlay;
    private handGestureTextOverlay!: TextOverlay;
    private infoCircleLeftOverlay!: ImageOverlay;
    private infoCircleRightOverlay!: ImageOverlay;
    private beamButtonTextOverlay!: TextOverlay;

    constructor() {
        super('InstructionsScene');
        this.gameConfigManager = GameConfigManager.getInstance();
        this.topic = this.gameConfigManager.get('topic') || '2D_addition_upto_100';
        this.mode = this.gameConfigManager.get('mode') || null;
        
        // Initialize question selector for instructions
        const questionBank = getQuestionBankByName(this.topic);
        if (questionBank) {
            this.questionSelector = new QuestionSelectorHelper(questionBank, 1); // Only need 1 question for instructions
        }
    }

    private playStep5() {
        const step4 = this.audioManager.playSoundEffect('step_4');

        let playButtonTween: Phaser.Tweens.Tween;

        step4?.on('complete', () => {
            if (!this.parentScene) {
                playButtonTween = ButtonHelper.startBreathingAnimation(this.playButton, {
                    scale: 1.1,
                    duration: 1000,
                    ease: 'Sine.easeInOut'
                });
            }
            // Start the next loop iteration after 5 seconds
            this.instructionLoopTimer = this.time.delayedCall(5000, () => {
                if (!this.parentScene) {
                    ButtonHelper.stopBreathingAnimation(playButtonTween, this.playButton);
                }
                this.playStep0();
            });
        });
    }

    // Step 2: Asteroid clicking (no audio, no bottom UI)
    private playStep2() {
        this.playDesc.setText(i18n.t(this.isMobile ? 'info.step3_mobile' : 'info.step3'));
        this.playDescOverlay.updateContent(i18n.t(this.isMobile ? 'info.step3_mobile' : 'info.step3'));

        if (!this.isMobile) {
            this.step1TextOverlay.setAriaHidden(true);
            this.step2TextOverlay.setAriaHidden(true);
            this.beamTextOverlay.setAriaHidden(true);
            this.spaceBarTextOverlay.setAriaHidden(true);
            this.infoBeamOverlay.setAriaHidden(true);
            this.moveTextOverlay.setAriaHidden(true);
            this.infoArrowsOverlay.setAriaHidden(true);
        } else {
            this.handGestureTextOverlay.setAriaHidden(true);
            this.infoCircleLeftOverlay.setAriaHidden(true);
            this.infoCircleRightOverlay.setAriaHidden(true);
            this.beamButtonTextOverlay.setAriaHidden(true);
        }

        // Play step_1 audio at the start of step 2
        this.audioManager.playSoundEffect('step_1');
        // Fade out all UI elements at the start of asteroid demo
        if (!this.isMobile) {
            this.tweens.add({
                targets: [this.infoArrows, this.moveText, this.infoBeam, this.spacebarText, this.beamText, this.step1Text, this.step2Text],
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    this.infoArrows.setVisible(false);
                    this.moveText.setVisible(false);
                    this.infoBeam.setVisible(false);
                    this.spacebarText.setVisible(false);
                    this.beamText.setVisible(false);
                    this.step1Text.setVisible(false);
                    this.step2Text.setVisible(false);
                }
            });
        } else {
            // Fade out mobile UI elements
            this.tweens.add({
                targets: [this.handGestureText, this.infoCircleLeft, this.infoCircleRight, this.beamButtonText, this.beamButton],
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    this.handGestureText.setVisible(false);
                    this.infoCircleLeft.setVisible(false);
                    this.infoCircleRight.setVisible(false);
                    this.beamButtonText.setVisible(false);
                    this.beamButton.setVisible(false);
                }
            });
        }

        // Create hand object first
        this.hand = this.addImage(641, 220, 'hand').setOrigin(0).setScale(0.13);
        this.hand.x = this.getScaledValue(641);
        this.hand.y = this.getScaledValue(220);
        this.hand.setVisible(true);
        this.hand.setTexture('hand');
        this.hand.setDepth(3);

        this.hand.x = this.hand.x + this.getScaledValue(150);

        this.handTween = this.tweens.add({
            targets: this.hand,
            x: this.hand.x - this.getScaledValue(150),
            y: this.hand.y,
            duration: 1000,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.info_fire = this.addSprite(634, 330, 'fire')
                    .setOrigin(0.5).setScale(0.8).setDepth(1);
                this.info_fire.play('info_fire');

                this.handTween = this.tweens.add({
                    targets: { progress: 0 },
                    progress: 1,
                    duration: 800,
                    yoyo: true,
                    repeat: 2,
                    ease: 'Sine.easeInOut',
                    onUpdate: () => {
                        const target = this.handTween.targets[0] as { progress: number };
                        if (target.progress < 0.5) {
                            this.hand.setTexture('hand_click');
                        } else {
                            this.hand.setTexture('hand');
                        }
                    },
                    onComplete: () => {
                        this.hand.setVisible(false);
                        this.info_fire.destroy();

                        this.time.delayedCall(1000, () => {
                            // Check if parentScene exists to determine next step
                            if (this.parentScene) {
                                this.playStep0(); // Loop back to Step 3 for back button
                            } else {
                                this.playStep5(); // Go to Step 5 for play button
                            }
                        });
                    }
                });
            },
        });
    }

    private playStep0() {
        this.playDesc.setText(i18n.t('info.play'));
        this.playDescOverlay.updateContent(i18n.t('info.play'));

        const step0 = this.audioManager.playSoundEffect('step_0');

        step0?.on('complete', () => {
            this.time.delayedCall(1000, () => {
                this.playStep3();
            });
        });
    }

    // Step 3: Show ALL UI + Arrow keys movement demo (step_2 audio) 
    private playStep3() {
        if (!this.isMobile) {
            // Set initial state and make visible
            this.infoArrows.setAlpha(0).setVisible(true);
            this.moveText.setAlpha(0).setVisible(true);
            this.infoBeam.setAlpha(0).setVisible(true);
            this.spacebarText.setAlpha(0).setVisible(true);
            this.beamText.setAlpha(0).setVisible(true);
            this.step1Text.setAlpha(0).setVisible(true);
            this.step2Text.setAlpha(0).setVisible(true);
            this.step1TextOverlay.setAriaHidden(false);
            this.step2TextOverlay.setAriaHidden(false);
            
            this.beamTextOverlay.setAriaHidden(false);
            this.spaceBarTextOverlay.setAriaHidden(false);
            this.infoBeamOverlay.setAriaHidden(false);
            this.moveTextOverlay.setAriaHidden(false);
            this.infoArrowsOverlay.setAriaHidden(false);

            // Fade in all UI elements
            this.tweens.add({
                targets: [this.infoArrows, this.moveText, this.infoBeam, this.spacebarText, this.beamText, this.step1Text, this.step2Text],
                alpha: 1,
                duration: 500,
                ease: 'Sine.easeOut'
            });
        } else {
            // Set initial state and make visible for mobile
            this.handGestureText.setAlpha(0).setVisible(true);
            this.infoCircleLeft.setAlpha(0).setVisible(true);
            this.infoCircleRight.setAlpha(0).setVisible(true);
            this.beamButtonText.setAlpha(0).setVisible(true);
            this.beamButton.setAlpha(0).setVisible(true);

            this.handGestureTextOverlay.setAriaHidden(false);
            this.infoCircleLeftOverlay.setAriaHidden(false);
            this.infoCircleRightOverlay.setAriaHidden(false);
            this.beamButtonTextOverlay.setAriaHidden(false);

            // Fade in all mobile UI elements
            this.tweens.add({
                targets: [this.handGestureText, this.infoCircleLeft, this.infoCircleRight, this.beamButtonText, this.beamButton],
                alpha: 1,
                duration: 500,
                ease: 'Sine.easeOut'
            });
        }

        // Mobile-specific configuration
        const config = {
            handX: this.isMobile ? 320 : 250,
            handY: this.display.height - (this.isMobile ? 200 : 150),
            xOffset: this.isMobile ? 100 : 200,
            ghostXOffset: this.isMobile ? -100 : 100
        };

        // Add hand animation
        if (this.hand) {
            this.hand.destroy();
        }
        this.hand = this.addImage(config.handX, config.handY, 'hand').setOrigin(0).setScale(0.13);
        this.hand.x = this.hand.x + this.getScaledValue(200);

        this.handTween = this.tweens.add({
            targets: this.hand,
            x: this.hand.x - this.getScaledValue(config.xOffset),
            y: this.hand.y,
            duration: 1000,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // Update the button state to hover
                if (this.infoArrows) {
                    this.infoArrows.setTexture('info_arrows_hover');
                }

                // Chain a scale animation after the movement completes
                this.handTween = this.tweens.add({
                    targets: { progress: 0 },
                    progress: 1,
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    onUpdate: () => {
                        const target = this.handTween.targets[0] as { progress: number };
                        if (target.progress < 0.5) {
                            this.hand.setTexture('hand_click');
                        } else {
                            this.hand.setTexture('hand');
                        }
                    }
                });
                
                // Breathing animation for info circle (mobile only)
                if (this.isMobile) {
                    this.infoCircleLeftTween = this.tweens.add({
                        targets: this.infoCircleLeft,
                        scaleX: 1.1,
                        scaleY: 1.1,
                        duration: 800,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut',
                    });
                }

                // Ghost animation
                this.ghost = this.addImage(634, 483, 'astrobot')
                    .setOrigin(0.5).setAlpha(0.5);
                this.ghostTween = this.tweens.add({
                    targets: this.ghost,
                    x: this.ghost.x + this.getScaledValue(config.ghostXOffset),
                    duration: 1000,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        this.ghost.destroy();
                    },
                });

                const step2 = this.audioManager.playSoundEffect('step_2');
                step2?.on('complete', () => {
                    this.time.delayedCall(1000, () => {
                        if (this.infoArrows) {
                            this.infoArrows.setTexture('info_arrows');
                        }
                        this.hand.setTexture('hand');
                        this.hand.setVisible(false);
                        this.handTween.stop();
                        this.handTween.destroy();
                        this.ghost.destroy();
                        this.ghostTween.stop();
                        this.ghostTween.destroy();
                        if (this.isMobile) {
                            this.infoCircleLeftTween.stop();
                            this.infoCircleLeftTween.destroy();
                        }
                        this.playStep4();
                    });
                });
            },
        });
    }

    // Step 4: spacebar/firing demo (step_3 audio)
    private playStep4() {
        // move the hand and then play the sound
        const handY = this.isMobile ? this.display.height - 200 : this.display.height - 153;
        const handX = this.isMobile ? this.display.width - 130 : this.display.width - 260;
        this.hand.x = this.getScaledValue(handX);
        this.hand.y = this.getScaledValue(handY);
        this.hand.setVisible(true);

        this.hand.x = this.hand.x + this.getScaledValue(200);

        this.handTween = this.tweens.add({
            targets: this.hand,
            x: this.hand.x - this.getScaledValue(200),
            y: this.hand.y,
            duration: 1000,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // Update the button state to hover
                if (this.infoBeam) {
                    this.infoBeam.setTexture('info_beam_hover');
                }

                this.info_fire = this.addSprite(634, 330, 'fire')
                    .setOrigin(0.5).setScale(0.8).setDepth(1);
                this.info_fire.play('info_fire');

                // Chain a scale animation after the movement completes
                this.handTween = this.tweens.add({
                    targets: { progress: 0 },
                    progress: 1,
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    onUpdate: () => {
                        const target = this.handTween.targets[0] as { progress: number };
                        if (target.progress < 0.5) {
                            this.hand.setTexture('hand_click');
                        } else {
                            this.hand.setTexture('hand');
                        }
                    }
                });

                const step3 = this.audioManager.playSoundEffect('step_3');
                step3?.on('complete', () => {
                    // hide the hand
                    if (this.infoBeam) {
                        this.infoBeam.setTexture('info_beam');
                    }
                    this.hand.setVisible(false);
                    this.handTween.stop();
                    this.handTween.destroy();
                    this.info_fire.destroy();
                    this.time.delayedCall(1000, () => {
                        // Always go to Step 2 after Step 4, regardless of parentScene
                        this.playStep2();
                    });
                });
            },
        });
    }

    init(data?: { parentScene: string }) {
        this.isMobile = this.isTouchDevice();

        if (data?.parentScene) {
            this.parentScene = data.parentScene;
        }

        this.audioManager.stopBackgroundMusic();
   

        if (!this.anims.exists('info_fire')) {
            this.anims.create({
                key: 'info_fire',
                frames: 'fire',
                frameRate: 24,
                repeat: -1,
                hideOnComplete: false
            })
        }

        setSceneBackground('assets/images/info_screen/info_screen_bg.png');

        if (this.parentScene === 'Shooter') {
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                this.queueAnnouncement(i18n.t('info.helpPage'));
            })
        }

        this.addImage(this.display.width / 2, this.display.height / 2, 'info_screen_bg')
            .setOrigin(0.5);

            // Mute button
        this.muteBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            x: this.display.width - 54,
            y: 66,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });

        // Volume slider
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 220, 160, 'purple', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.display.width - 54,
            y: 142,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });

        this.addImage(641, 274, 'info_asteroid').setOrigin(0.5).setDepth(2);

        const howToPlayText = this.addText(this.display.width / 2, 61, i18n.t('info.howToPlay'), {
            font: "700 30px Exo",
            color: '#ffffff',
        }).setOrigin(0.5);
        new TextOverlay(this, howToPlayText, { label: i18n.t('info.howToPlay'), tag: 'h1', role: 'heading' });

        this.playDesc = this.addText(this.display.width / 2, 123, i18n.t('info.play'), {
            font: "400 30px Exo",
            color: '#ffffff',
        }).setOrigin(0.5);
        this.playDescOverlay = new TextOverlay(this, this.playDesc, { label: i18n.t('info.play')});

        // Get the first question from question selector
        let result;
        if(MULTIVERSE_TOPICS.includes(this.topic)) {
            // addition
            if (this.topic === 'grade2_topic1') {
                result = {
                    questionData: {
                        num1: 7,
                        num2: 5,
                        operator: '+',
                        answer: 12,
                        options: [
                            { number: 12, isCorrect: true },
                            { number: 10, isCorrect: false },
                            { number: 14, isCorrect: false },
                            { number: 7, isCorrect: false },
                            { number: 15, isCorrect: false },
                        ],
                    },
                };
            } else if (this.topic === 'grade2_topic3' || this.topic === 'grade4_topic2') {
                result = {
                    questionData: {
                        num1: 20,
                        num2: 30,
                        operator: '+',
                        answer: 50,
                        options: [
                            { number: 50, isCorrect: true },
                            { number: 40, isCorrect: false },
                            { number: 60, isCorrect: false },
                            { number: 55, isCorrect: false },
                            { number: 45, isCorrect: false },
                        ],
                    },
                };                
            } else if (this.topic === 'grade2_topic4') {
                result = {
                    questionData: {
                        num1: 60,
                        num2: 20,
                        operator: '−',
                        answer: 40,
                        options: [
                            { number: 40, isCorrect: true },
                            { number: 30, isCorrect: false },
                            { number: 50, isCorrect: false },
                            { number: 35, isCorrect: false },
                            { number: 45, isCorrect: false },
                        ],
                    },
                };
            }  else if (this.topic === 'grade6_topic1') {
                result = {
                    questionData: {
                        num1: 1.0,
                        num2: 0.4,
                        operator: '−',
                        answer: 0.6,
                        options: [
                            { number: 0.6, isCorrect: true },
                            { number: 0.4, isCorrect: false },
                            { number: 1.0, isCorrect: false },
                            { number: 0.8, isCorrect: false },
                            { number: 0.2, isCorrect: false },
                        ],
                    },
                };
            } else if (this.topic === 'g5_g6' || this.topic === 'g7_g8') {
                if (this.mode === 'add') {
                    result = {
                        questionData: {
                            num1: 70,
                            num2: 80,
                            operator: '+',
                            answer: 150,
                            options: [
                                { number: 150, isCorrect: true },
                                { number: 140, isCorrect: false },
                                { number: 160, isCorrect: false },
                                { number: 155, isCorrect: false },
                                { number: 145, isCorrect: false },
                            ],
                        },
                    };
                } else if (this.mode === 'sub') {
                    result = {
                        questionData: {
                            num1: 150,
                            num2: 70,
                            operator: '−',
                            answer: 80,
                            options: [
                                { number: 80, isCorrect: true },
                                { number: 70, isCorrect: false },
                                { number: 90, isCorrect: false },
                                { number: 85, isCorrect: false },
                                { number: 75, isCorrect: false },
                            ],
                        },
                    };
                } else if (this.mode === 'mul') {
                    result = {
                        questionData: {
                            num1: 7,
                            num2: 9,
                            operator: '×',
                            answer: 63,
                            options: [
                                { number: 63, isCorrect: true },
                                { number: 64, isCorrect: false },
                                { number: 65, isCorrect: false },
                                { number: 68, isCorrect: false },
                                { number: 67, isCorrect: false },
                            ],
                        },
                    };
                } else if (this.mode === 'div') {
                    result = {
                        questionData: {
                            num1: 56,
                            num2: 7,
                            operator: '÷',
                            answer: 8,
                            options: [
                                { number: 8, isCorrect: true },
                                { number: 7, isCorrect: false },
                                { number: 9, isCorrect: false },
                                { number: 10, isCorrect: false },
                                { number: 11, isCorrect: false },
                            ],
                        },
                    };
                } else {
                    result = {
                        questionData: {
                            num1: 70,
                            num2: 80,
                            operator: '+',
                            answer: 150,
                            options: [
                                { number: 150, isCorrect: true },
                                { number: 140, isCorrect: false },
                                { number: 160, isCorrect: false },
                                { number: 155, isCorrect: false },
                                { number: 145, isCorrect: false },
                            ],
                        },
                    };
                }
            }
            // multiplication
            else {
                result = {
                    questionData: {
                        num1: 1,
                        num2: 1,
                        operator: '×',
                        answer: 1,
                        options: [
                            { number: 1, isCorrect: true },
                            { number: 0, isCorrect: false },
                            { number: 2, isCorrect: false },
                            { number: 5, isCorrect: false },
                            { number: 9, isCorrect: false },
                        ],
                    },
                };
            }
        } else {
            result = generateQuestionFromSelector(this.questionSelector);
        }
        
        if (!result) {
            console.error('No question available');
            return;
        }
        let targetEquation = `${result.questionData.num1} ${result.questionData.operator} ${result.questionData.num2}`;
        let correctAnswer = result.questionData.answer;
        let answerText = correctAnswer.toString();
        if(this.topic === 'grade6_topic1') {
            targetEquation = `${result.questionData.num1.toFixed(1)} ${result.questionData.operator} ${result.questionData.num2.toFixed(1)}`;
            answerText = correctAnswer.toFixed(1);
        }
        const answers = result.questionData.options;
        if (correctAnswer) {
            const overlays: { textObj: Phaser.GameObjects.Text; textVal: string }[] = [];
            const correctAnswerText = this.addText(641, 274, `${answerText}`, {
                font: "700 40px Exo",
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8
            }).setOrigin(0.5).setDepth(2);

            overlays.push({ textObj: correctAnswerText, textVal: answerText });

            answers.filter((a: any) => !a.isCorrect).forEach((answer: any, index: number) => {
                let answersText = answer.number.toString();
                if(this.topic === 'grade6_topic1') {
                    answersText = answer.number.toFixed(1);
                }
                const answerText = this.addText(textCords[index].x, textCords[index].y, `${answersText}`, {
                    font: "700 40px Exo",
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 8
                }).setOrigin(0.5);
                
                overlays.push({ textObj: answerText, textVal: answersText });
            })

            // move correct answer overlay to the second position
            const movedCorrect = overlays.shift();
            const insertIndex = 2; 
            overlays.splice(insertIndex, 0, movedCorrect!);

            overlays.forEach((overlay) => {
                new TextOverlay(this, overlay.textObj, { label: i18n.t('common.asteroidText', { number: overlay.textVal }) });
            })

            const targetEquationText = this.addText(640, 530, `${targetEquation}`, {
                font: "700 20px Exo",
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8
            }).setOrigin(0.5);
            new TextOverlay(this, targetEquationText, { label: i18n.t('common.astronautText', { problem: targetEquation }) });
        }

        if (!this.isMobile) {
            // Add step text for desktop (similar to mobile handGesture and beamButton positions)
            let step1Y = this.display.height - 260;
            let step2Y = this.display.height - 255;
            if (i18n.getLanguage() === 'es') {
                step1Y -= 10;
                step2Y -= 10;
            }
            this.step1Text = this.addText(230, step1Y, i18n.t('info.step1'), {
                font: '400 30px Exo',
                color: '#ffffff',
                fixedWidth: 352,
                fixedHeight: 140,
                align: 'center',
                wordWrap: { width: 352 }
            }).setOrigin(0.5).setVisible(false); // Hide initially
            this.step1TextOverlay = new TextOverlay(this, this.step1Text, { label: i18n.t('info.step1') });

            
            this.infoArrows = this.addImage(213, this.display.height - 150, 'info_arrows')
                .setOrigin(0.5).setVisible(false);
            this.infoArrowsOverlay = new ImageOverlay(this, this.infoArrows, { label: i18n.t('info.arrows') });

            this.moveText = this.addText(214, this.display.height - 65, i18n.t('info.move'), {
                font: "700 30px Exo",
                color: '#ffffff',
            }).setOrigin(0.5).setVisible(false);
            this.moveTextOverlay = new TextOverlay(this, this.moveText, { label: i18n.t('info.move') });

            this.step2Text = this.addText(this.display.width - 280, step2Y, i18n.t('info.step2'), {
                font: '400 30px Exo',
                color: '#ffffff',
                fixedWidth: 352,
                fixedHeight: 140,
                align: 'center',
                wordWrap: { width: 352 }
            }).setOrigin(0.5).setVisible(false); // Hide initially
            this.step2TextOverlay = new TextOverlay(this, this.step2Text, { label: i18n.t('info.step2') });

            this.infoBeam = this.addImage((this.display.width - 260), this.display.height - 153, 'info_beam')
                .setOrigin(0.5).setVisible(false);
            this.infoBeamOverlay = new ImageOverlay(this, this.infoBeam, { label: i18n.t('info.beamControl') });

            this.spacebarText = this.addText(this.display.width - 320, this.display.height - 154, i18n.t('info.spacebar'), {
                font: "700 25px Exo",
                color: '#ffffff',
            }).setOrigin(0.5).setVisible(false);
            this.spaceBarTextOverlay = new TextOverlay(this, this.spacebarText, { label: i18n.t('info.spacebar') });

            this.beamText = this.addText((this.display.width - 259), this.display.height - 65, i18n.t('common.beam'), {
                font: "700 30px Exo",
                color: '#ffffff',
            }).setOrigin(0.5).setVisible(false);
            this.beamTextOverlay = new TextOverlay(this, this.beamText, { label: i18n.t('common.beam') });
            
        } else {
            this.handGestureText = this.addText(230, this.display.height - 260, i18n.t('info.handGesture'), {
                font: '400 30px Exo',
                color: '#ffffff',
                fixedWidth: 352,
                fixedHeight: 100,
                align: 'center',
                wordWrap: { width: 352 }
            }).setOrigin(0.5).setVisible(false); // Hide initially
            this.handGestureTextOverlay = new TextOverlay(this, this.handGestureText, { label: i18n.t('info.handGesture') });
            
            this.infoCircleLeft = this.addImage(this.display.width/2 - 200, this.display.height - 180, 'info_circle')
                .setOrigin(0.5).setVisible(false); // Hide initially
            this.infoCircleLeftOverlay = new ImageOverlay(this, this.infoCircleLeft, { label: i18n.t('info.handGesture') });
            
            this.infoCircleRight = this.addImage(this.display.width/2 + 200, this.display.height - 180, 'info_circle')
                .setOrigin(0.5).setAlpha(0.5).setVisible(false); // Hide initially
            this.infoCircleRightOverlay = new ImageOverlay(this, this.infoCircleRight, { label: i18n.t('info.handGesture') });
            
            this.beamButtonText = this.addText(this.display.width - 180, this.display.height - 270, i18n.t('info.beamButton'), {
                font: '400 30px Exo',
                color: '#ffffff',
                fixedWidth: 352,
                fixedHeight: 100,
                align: 'center',
                wordWrap: { width: 352 }
            }).setOrigin(0.5).setVisible(false); // Hide initially
            this.beamButtonTextOverlay = new TextOverlay(this, this.beamButtonText, { label: i18n.t('info.beamButton') });
            
            this.beamButton = ButtonHelper.createButton({
                scene: this,
                imageKeys: {
                    default: BUTTONS.BUTTON.KEY,
                    hover: BUTTONS.BUTTON_HOVER.KEY,
                    pressed: BUTTONS.BUTTON_PRESSED.KEY
                },
                text: i18n.t('game.beam'),
                textStyle: {
                    font: "700 32px Exo",
                    color: '#C4C4C4'
                },
                imageScale: 1,
                x: this.display.width - 180,
                y: this.display.height - 170,
                isDisabled: true,
            });
            this.beamButton.setVisible(false); // Hide initially
        }

        this.playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: !this.parentScene ? i18n.t('common.play') : i18n.t('common.back'),
            label: !this.parentScene ? i18n.t('common.play') : i18n.t('common.back'),
            textStyle: {
                font: '700 32px Exo',
                color: '#ffffff',
            },
            raisedOffset: 3.5,
            imageScale: 0.8,
            x: this.display.width / 2,
            y: this.display.height - 78,
            onClick: () => {
                if (!this.parentScene) {
                    this.closeDoors();
                } else {
                    this.handleOnClick();
                }
            },
        });

        this.time.delayedCall(1000, () => {
            this.playStep0();
        });
    }

    preload() { }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || 'en';
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image('info_screen_bg', 'info_screen_bg.png');
        scene.load.image('info_arrows', 'info_arrows.png');
        scene.load.image('info_arrows_hover', 'info_arrows_hover.png');
        scene.load.image('info_circle', 'info_circle.png');
        scene.load.image('info_beam', 'info_beam.png');
        scene.load.image('info_beam_hover', 'info_beam_hover.png');
        scene.load.image('hand', 'hand.png');
        scene.load.image('hand_click', 'hand_click.png');
        scene.load.image('astrobot', 'astrobot.png');
        scene.load.image('info_asteroid', 'info_asteroid.png');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/common`);
        scene.load.image('door', 'door.png');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/bullet`);
        scene.load.atlas('fire', 'fire.png', 'fire.json');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        // Load appropriate audio based on device type
        const isMobile = scene.isTouchDevice();
        scene.load.audio('step_0', `step_0_${language}.mp3`);
        scene.load.audio('step_1', isMobile ? `step_1_mobile_${language}.mp3` : `step_1_${language}.mp3`);
        scene.load.audio('step_2', isMobile ? `step_2_mobile_${language}.mp3` : `step_2_${language}.mp3`);
        scene.load.audio('step_3', isMobile ? `step_3_mobile_${language}.mp3` : `step_3_${language}.mp3`);
        scene.load.audio('step_4', `step_4_${language}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('door_close', `door_close.mp3`);

        VolumeSlider.preload(scene, 'blue');
    }

    create() {
    }

    override update(): void {
        // Update mute button icon
        const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
        if (this.audioManager.getIsAllMuted()) {
            muteBtnItem.setTexture(BUTTONS.MUTE_ICON.KEY);
        } else {
            muteBtnItem.setTexture(BUTTONS.UNMUTE_ICON.KEY);
        }

        // Update mute button state
        const label = this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
        const overlay = (this.muteBtn as any).buttonOverlay as ButtonOverlay;
        const muteBtnState = this.muteBtn.getData('state');
        if(muteBtnState != label) {
            this.muteBtn.setData('state', label);
            overlay.setLabel(label);
        }
    }

    private handleOnClick() {
        if (this.parentScene) {
            this.scene.stop();
            this.audioManager.playBackgroundMusic('bg-music');
            this.destroyTweens();
            this.scene.resume(this.parentScene);
        } else {
            this.destroyTweens();
            this.scene.start('Shooter');
        }
    }

    private closeDoors() {
        const doorLeft = this.addImage(0, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(1, 0.5).setDepth(4);
        const doorRight = this.addImage(this.display.width, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(0, 0.5).setFlipX(true).setDepth(4);

        animateDoors({
            scene: this,
            leftDoor: doorLeft,
            rightDoor: doorRight,
            open: false,
            duration: 1000,
            delay: 0,
            soundEffectKey: 'door_close',
            onComplete: () => {
                this.audioManager.stopSoundEffect('door_close');
                this.handleOnClick();
            }
        });
    }

    private destroyTweens() {
        !MULTIVERSE_TOPICS.includes(this.topic) && this.questionSelector.reset();
        // Stop and destroy any active tween
        if (this.handTween) {
            this.handTween.stop();
            this.handTween.destroy();
        }
        if (this.ghostTween) {
            this.ghostTween.stop();
            this.ghostTween.destroy();
        }
        if (this.infoCircleLeftTween) {
            this.infoCircleLeftTween.stop();
            this.infoCircleLeftTween.destroy();
        }
        if (this.info_fire) {
            this.info_fire.destroy();
        }

        // Stop the instruction loop timer
        if (this.instructionLoopTimer) {
            this.instructionLoopTimer.destroy();
            this.instructionLoopTimer = undefined;
        }

        // Reset all game objects to their initial state
        if (this.hand) {
            this.hand.destroy();
        }
        if (!this.isMobile) {
            if (this.infoArrows) {
                this.infoArrows.setTexture('info_arrows');
                this.infoArrows.setVisible(false);
            }
            if (this.infoBeam) {
                this.infoBeam.setTexture('info_beam');
                this.infoBeam.setVisible(false);
            }
            if (this.moveText) {
                this.moveText.setVisible(false);
            }
            if (this.spacebarText) {
                this.spacebarText.setVisible(false);
            }
            if (this.beamText) {
                this.beamText.setVisible(false);
            }
            if (this.step1Text) {
                this.step1Text.setVisible(false);
            }
            if (this.step2Text) {
                this.step2Text.setVisible(false);
            }
        } else {
            // Reset mobile UI elements
            if (this.handGestureText) {
                this.handGestureText.setVisible(false);
            }
            if (this.infoCircleLeft) {
                this.infoCircleLeft.setVisible(false);
            }
            if (this.infoCircleRight) {
                this.infoCircleRight.setVisible(false);
            }
            if (this.beamButtonText) {
                this.beamButtonText.setVisible(false);
            }
            if (this.beamButton) {
                this.beamButton.setVisible(false);
            }
        }

        // Stop any playing audio
        this.audioManager.stopAllSoundEffects();
    }

    private queueAnnouncement(message: string) {
        this.announcementQueue.push(message);
        this.processAnnouncementQueue();
    }

    private processAnnouncementQueue() {
        if (this.isAnnouncing || this.announcementQueue.length === 0) {
            return;
        }

        this.isAnnouncing = true;
        const message = this.announcementQueue.shift()!;

        announceToScreenReader(message);

        // Estimate the duration of the announcement and wait before processing next
        const words = message.split(' ').length;
        const estimatedDuration = (words / 2.5) * 1000; // 2.5 words per second
        const delay = Math.max(estimatedDuration + 500, 2000); // Minimum 2 seconds

        this.time.delayedCall(delay, () => {
            this.isAnnouncing = false;
            this.processAnnouncementQueue();
        });
    }
}