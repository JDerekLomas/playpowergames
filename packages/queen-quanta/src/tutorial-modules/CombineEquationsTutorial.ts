import { announceToScreenReader, BaseScene, ButtonHelper, i18n, TextOverlay } from "@k8-games/sdk";
import { CombineEquations } from "../mechanic/CombineEquations";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { DoorUtils } from "../utils/DoorUtils";

class CombineEquationsTutorial {
    private scene: BaseScene;
    private level: number;
    private doorUtils!: DoorUtils;
    private combineEquations: CombineEquations;
    private parentScene: string = 'SplashScene';
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private isSkipped: boolean = false;
    private isSkippedButton: Phaser.GameObjects.Container | null = null;
    private titleOverlay!: TextOverlay;
    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    constructor(scene: BaseScene, level: number) {
        this.scene = scene;
        this.level = level;
        this.combineEquations = new CombineEquations(scene, level, true);
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || "en";
        CombineEquations._preload(scene);

        // Load hand image
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image('hand', 'hand.png');
        scene.load.image('hand_click', 'hand_click.png');

        // Load instruction audio files
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/combine_equations`);
        scene.load.audio("ce_step_0", `step_0_${lang}.mp3`);
        scene.load.audio("ce_step_1", `step_1_${lang}.mp3`);
        scene.load.audio("ce_step_2", `step_2_${lang}.mp3`);
        scene.load.audio("ce_step_3", `step_3_${lang}.mp3`);
        scene.load.audio("ce_step_4", `step_4_${lang}.mp3`);
        scene.load.audio("ce_step_5", `step_5_${lang}.mp3`);

        // Load instruction audio files
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/combine_equations/distribution`);
        scene.load.audio("ce_step_0_dist", `step_0_${lang}.mp3`);
        scene.load.audio("ce_step_1_dist", `step_1_${lang}.mp3`);
        scene.load.audio("ce_step_2_dist", `step_2_${lang}.mp3`);
        scene.load.audio("ce_step_3_dist", `step_3_${lang}.mp3`);
        scene.load.audio("ce_step_4_dist", `step_4_${lang}.mp3`);
        scene.load.audio("ce_step_5_dist", `step_5_${lang}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        scene.load.audio("hit_play", `hit_play_${lang}.mp3`);
    }

    init(data?: { reset?: boolean, level: number, parentScene: string }) {
        if (data?.parentScene) {
            this.parentScene = data.parentScene;
        }
        this.combineEquations.init(data);
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

        this.combineEquations.create(this.parentScene);
        this.titleOverlay = new TextOverlay(
            this.scene,
            this.combineEquations.titleText!,
            {
                label: "",
                tag: "h2",
                role: "heading"
            }
        );
        this.doorUtils = new DoorUtils(this.scene);

        // Disable All options including check button
        this.combineEquations.optionButtons.forEach(button => {
            if (button.getData('text') !== undefined || button.getData('type') === 'check') {
                ButtonHelper.disableButton(button);
            }
        });

        const timer = this.scene.time.delayedCall(1000, () => {
            this.playStep0();
        });
        this.delayedCalls.push(timer);
    }

    private createSkipButton() {
        this.isSkippedButton = ButtonHelper.createButton({
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

    private createHandClickAnimation(targetButton: Phaser.GameObjects.Container, repeat: number = 1, onComplete?: () => void) {
        // Create hand image for click animation
        const handX = targetButton.x / this.scene.display.scale + this.scene.getScaledValue(50);
        const handY = targetButton.y / this.scene.display.scale - this.scene.getScaledValue(20);
        const hand = this.scene.addImage(handX, handY, 'hand');
        hand.setOrigin(0.5);
        hand.setDepth(10);
        hand.setScale(0.13);

        // Create click animation tweens array
        const clickTweens = [];

        // Add initial move animation
        clickTweens.push({
            x: targetButton.x + this.scene.getScaledValue(15),
            y: targetButton.y + this.scene.getScaledValue(10),
            duration: 1000,
            ease: "Sine.easeInOut"
        });

        // Add repeated click animations
        for (let i = 0; i < repeat; i++) {
            // Click down
            clickTweens.push({
                alpha: 1,
                duration: 500,
                onComplete: () => {
                    hand.setTexture("hand_click");
                }
            });

            // Click up
            clickTweens.push({
                alpha: 1,
                duration: 500,
                onComplete: () => {
                    hand.setTexture("hand");
                }
            });
        }

        // Add final cleanup
        clickTweens.push({
            alpha: 1,
            duration: 200,
            onComplete: () => {
                hand.destroy();
                onComplete?.();
            }
        });

        // Execute the animation chain
        this.scene.tweens.chain({
            targets: hand,
            tweens: clickTweens
        });
    }

    private handleDistributiveClickAnimation(targetButton: Phaser.GameObjects.Container, repeat: number = 1, onComplete?: () => void) {

        this.createHandClickAnimation(targetButton, repeat, () => {
            // Enable target button
            ButtonHelper.enableButton(targetButton);
            // Handle option click event
            let clicksThisStep = 0;
            const handleOptionClick = (_data: { buttonKey: string }) => {
                // Count clicks during this guided step only, independent of cumulative tile count
                clicksThisStep++;
                if (clicksThisStep >= repeat) {
                    // Disable target button and proceed
                    ButtonHelper.disableButton(targetButton);
                    // Clean up listener for safety
                    this.scene.events.off('optionclick', handleOptionClick);
                    onComplete?.();
                }
            };

            // Remove all event listeners
            this.scene.events.removeAllListeners('optionclick');
            // Add event listener for option click
            this.scene.events.on('optionclick', handleOptionClick);
        });
    }

    private playStep0() {
        if (this.isSkipped) {
            return;
        }
        // TODO: Update the audio.
        const step0 = this.scene.audioManager.playSoundEffect(this.getCombineEquationAudioKey(0));

        const txt = i18n.t(this.getCombineEquationTextKey(0));
        this.combineEquations.titleText.setText(txt);
        
        this.titleOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);
        
        step0?.on('complete', () => {
            const timer = this.scene.time.delayedCall(1000, () => {
                if(this.isDistributiveTopic) {
                    this.playStep1Distributive();
                } else {
                    this.playStep1();
                }
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep1Distributive() {
        if (this.isSkipped) {
            return;
        }
        const txt = i18n.t(this.getCombineEquationTextKey(1));
        this.combineEquations.titleText.setText(txt);

        this.titleOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);

        const step1 = this.scene.audioManager.playSoundEffect(this.getCombineEquationAudioKey(1));

        step1?.on('complete', () => {

            // Find target opttion button
            const targetButton1 = this.combineEquations.optionButtons.find(button => button.getData('text') === this.combineEquations.formatForDisplay('x'));

            const targetButton2 = this.combineEquations.optionButtons.find(button => button.getData('text') === '1');

            this.handleDistributiveClickAnimation(targetButton1!, 1, () => {
                this.handleDistributiveClickAnimation(targetButton2!, 3, () => {
                    const timer = this.scene.time.delayedCall(200, () => {
                        this.playStep2Distributive();
                    });
                    this.delayedCalls.push(timer);
                });
            });
        });
    }

    private playStep1() {
        if (this.isSkipped) {
            return;
        }
        const txt = i18n.t(this.getCombineEquationTextKey(1));
        this.combineEquations.titleText.setText(txt);
    
        this.titleOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);

        const step1 = this.scene.audioManager.playSoundEffect(this.getCombineEquationAudioKey(1));

        // Find target opttion button
        const targetButton = this.combineEquations.optionButtons.find(button => button.getData('text') === this.combineEquations.formatForDisplay('x'));

        this.createHandClickAnimation(targetButton!, 2);

        step1?.on('complete', () => {

            // Enable target button
            ButtonHelper.enableButton(targetButton!);

            // Handle option click event
            const handleOptionClick = (data: { buttonKey: string }) => {
                if (this.combineEquations.tileButtons.has(data.buttonKey)) {
                    const buttonData = this.combineEquations.tileButtons.get(data.buttonKey)!;
                    if (buttonData.count === 2) {
                        // Disable target button
                        ButtonHelper.disableButton(targetButton!);
                        const timer = this.scene.time.delayedCall(1000, () => {
                            this.playStep2();
                        });
                        this.delayedCalls.push(timer);
                    }
                }
            }

            // Remove all event listeners
            this.scene.events.removeAllListeners('optionclick');
            // Add event listener for option click
            this.scene.events.on('optionclick', handleOptionClick);
        });
    }

    private playStep2Distributive() {
        if (this.isSkipped) {
            return;
        }
        
        const targetButton1 = this.combineEquations.optionButtons.find(button => button.getData('text') === this.combineEquations.formatForDisplay('x'));

        const targetButton2 = this.combineEquations.optionButtons.find(button => button.getData('text') === '1');

        this.handleDistributiveClickAnimation(targetButton1!, 1, () => {
            this.handleDistributiveClickAnimation(targetButton2!, 3, () => {
                const timer = this.scene.time.delayedCall(1000, () => {
                    this.playStep3();
                });
                this.delayedCalls.push(timer);
            });
        });
    }

    private playStep2() {
        if (this.isSkipped) {
            return;
        }
        const txt = i18n.t(this.getCombineEquationTextKey(2));
        this.combineEquations.titleText.setText(txt);

        this.titleOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);

        const step2 = this.scene.audioManager.playSoundEffect(this.getCombineEquationAudioKey(2));
        // Find target opttion button
        const targetButton = this.combineEquations.optionButtons.find(button => button.getData('text') === '1');

        if(this.isDistributiveTopic) {
            this.createHandClickAnimation(targetButton!, 6);
        } else {
            this.createHandClickAnimation(targetButton!, 3);
        }

        step2?.on('complete', () => {
            // Enable target button
            ButtonHelper.enableButton(targetButton!);

            // Handle option click event
            const handleOptionClick = (data: { buttonKey: string }) => {
                if (this.combineEquations.tileButtons.has(data.buttonKey)) {
                    const buttonData = this.combineEquations.tileButtons.get(data.buttonKey)!;
                    if (buttonData.count === (this.isDistributiveTopic ? 6 : 3)) {
                        // Disable target button
                        ButtonHelper.disableButton(targetButton!);
                        const timer = this.scene.time.delayedCall(1000, () => {
                            this.playStep3();
                        });
                        this.delayedCalls.push(timer);
                    }
                }
            }

            // Remove all event listeners
            this.scene.events.removeAllListeners('optionclick');
            // Add event listener for option click
            this.scene.events.on('optionclick', handleOptionClick);
        });
    }

    private playStep3() {
        if (this.isSkipped) {
            return;
        }
        const txt = i18n.t(this.getCombineEquationTextKey(3));
        this.combineEquations.titleText.setText(txt);

        this.titleOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);
        
        const step3 = this.scene.audioManager.playSoundEffect(this.getCombineEquationAudioKey(3));

        // Find target opttion button
        const targetButton = this.combineEquations.optionButtons.find(button => button.getData('text') === this.combineEquations.formatForDisplay('-x'));

        this.createHandClickAnimation(targetButton!, 1);

        step3?.on('complete', () => {
            // Enable target button
            ButtonHelper.enableButton(targetButton!);

            // Handle option click event
            const handleOptionClick = (data: { buttonKey: string }) => {
                if (this.combineEquations.tileButtons.has(data.buttonKey)) {
                    const buttonData = this.combineEquations.tileButtons.get(data.buttonKey)!;
                    if (buttonData.count === 1) {
                        // Disable target button
                        ButtonHelper.disableButton(targetButton!);
                        const timer = this.scene.time.delayedCall(1000, () => {
                            this.playStep4();
                        });
                        this.delayedCalls.push(timer);
                    }
                }
            }

            // Remove all event listeners
            this.scene.events.removeAllListeners('optionclick');
            // Add event listener for option click
            this.scene.events.on('optionclick', handleOptionClick);
        });
    }

    private playStep4() {
        if (this.isSkipped) {
            return;
        }
        const txt = i18n.t(this.getCombineEquationTextKey(4));
        this.combineEquations.titleText.setText(txt);

        this.titleOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);

        const step4 = this.scene.audioManager.playSoundEffect(this.getCombineEquationAudioKey(4));

        // Find positive x tile
        let positiveXTile: any = null;
        let negativeXTile: any = null;
        this.combineEquations.tileButtons.forEach((value, key) => {
            if (key.endsWith('add_x')) {
                positiveXTile = value;
            }
            if (key.endsWith('subtract_-x')) {
                negativeXTile = value;
            }
        });

        // Start breathing animation for both tile
        const breathingTween = this.scene.tweens.add({
            targets: [positiveXTile.button, negativeXTile.button],
            scale: 1.2,
            duration: 700,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: -1,
            onStop: () => {
                // Reset scale
                positiveXTile.button.setScale(1);
                negativeXTile.button.setScale(1);
            }
        });

        // Create hand click and drag animation
        const handStartX = positiveXTile.button.x / this.scene.display.scale + 15;
        const handStartY = positiveXTile.button.y / this.scene.display.scale + 10;
        const handEndX = negativeXTile.button.x + this.scene.getScaledValue(15);
        const handEndY = negativeXTile.button.y + this.scene.getScaledValue(10);
        const hand = this.scene.addImage(handStartX, handStartY, 'hand');
        hand.setOrigin(0.5);
        hand.setDepth(10);
        hand.setScale(0.13);

        this.scene.tweens.chain({
            targets: hand,
            tweens: [
                {
                    alpha: 1,
                    duration: 500,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        hand.setTexture("hand_click");
                    }
                },
                {
                    x: handEndX,
                    y: handEndY,
                    duration: 1000,
                    ease: "Sine.easeInOut",
                },
                {
                    alpha: 1,
                    duration: 500,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        hand.setTexture("hand");
                    }
                },
                {
                    alpha: 1,
                    duration: 500,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        hand.destroy();
                    }
                }
            ]
        });

        // Handle combine tiles event
        const handleCombineTiles = (data: { sourceKey: string, targetKey: string }) => {
            if ((data.sourceKey.endsWith('add_x') && data.targetKey.endsWith('subtract_-x')) || (data.sourceKey.endsWith('subtract_-x') && data.targetKey.endsWith('add_x'))) {
                const timer = this.scene.time.delayedCall(1000, () => {
                    this.playStep5();
                });
                this.delayedCalls.push(timer);
            }
        }

        // Remove all event listeners
        this.scene.events.removeAllListeners('combinetiles');
        // Add event listener for combine tiles
        this.scene.events.on('combinetiles', handleCombineTiles);

        step4?.on('complete', () => {
            // Stop breathing animation and reset scale
            breathingTween.stop();
        });
    }

    private playStep5() {
        if (this.isSkipped) {
            return;
        }
        const txt = i18n.t('info.combineEquations.step5');
        this.combineEquations.titleText.setText(txt);

        this.titleOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);
        
        const step5 = this.scene.audioManager.playSoundEffect('ce_step_5');

        // Add hand click animation
        const checkButton = this.combineEquations.optionButtons.find(button => button.getData('type') === 'check');
        this.createHandClickAnimation(checkButton!, 1);

        step5?.on('complete', () => {
            ButtonHelper.enableButton(checkButton!);
            // Handle check answer event
            const handleCheckAnswer = (data: { isCorrect: boolean }) => {
                if (data.isCorrect) {
                    this.destroyTimers();

                    // Stop all sound effects
                    this.scene.audioManager.stopAllSoundEffects();


                    // Destroy all option buttons
                    this.combineEquations.optionButtons.forEach(button => {
                        button.destroy();
                    });

                    // Start the game scene and destroy this scene
                    this.scene.time.delayedCall(500, () => {
                        if (this.parentScene === 'SplashScene') {
                            this.combineEquations.titleText.setText(i18n.t('game.combineEssences'));
                            this.scene.audioManager.playSoundEffect('hit_play');
                        }
                        this.isSkippedButton?.destroy();
                        this.createPlayButton();
                    });
                }
            }

            // Remove all event listeners
            this.scene.events.removeAllListeners('checkanswer');
            // Add event listener for check answer
            this.scene.events.on('checkanswer', handleCheckAnswer);
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
                    mechanic: 'combine_equations',
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

    private getCombineEquationTextKey(step: number): string {
        if (this.isDistributiveTopic) {
            return `info.combineEquations.step${step}_dist`;
        }
        return `info.combineEquations.step${step}`;
    }

    private getCombineEquationAudioKey(step: number): string {
        if (this.isDistributiveTopic) {
            return `ce_step_${step}_dist`;
        }
        return `ce_step_${step}`;
    }

    private get isDistributiveTopic(): boolean {
        // You may want to check for topic and level, adjust as needed
        // This assumes CombineEquations exposes topic/level or you pass it in
        // Example: topic === 'grade7_topic4' && level === 2
        return (this.combineEquations['topic'] === 'grade7_topic4' && this.level === 2);
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

export default CombineEquationsTutorial;