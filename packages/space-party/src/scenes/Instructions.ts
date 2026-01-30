import { BaseScene, ButtonHelper, i18n, VolumeSlider, setSceneBackground } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS } from "../config/common";
import { animateDoors } from '../utils/helper';
import { NumberPad } from "../game/NumberPad";

export class InstructionsScene extends BaseScene {
    private parentScene?: string;
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private infoArrows!: Phaser.GameObjects.Image;
    private hand!: Phaser.GameObjects.Image;
    private ghostTween!: Phaser.Tweens.Tween;
    private handTween!: Phaser.Tweens.Tween;
    private instructionLoopTimer?: Phaser.Time.TimerEvent;
    private playButton?: Phaser.GameObjects.Container;
    // private isMobile: boolean;
    private infoCircleLeftTween!: Phaser.Tweens.Tween;
    private mooncakes: Phaser.GameObjects.Image[] = [];
    private mooncakeEaten?: Phaser.GameObjects.Image;
    // private currentStep: number = 1;
    private numberPad?: NumberPad;
    private successImage?: Phaser.GameObjects.Image;
    private keypadButtons: Phaser.GameObjects.Container[] = [];
    private textCloudText?: Phaser.GameObjects.Text;
    private mooncakeGlowTweenChain?: Phaser.Tweens.Tween;
    private grade? = "3";

    constructor() {
        super('InstructionsScene');
        // Check if device is mobile or iPad
        // const userAgent = navigator.userAgent.toLowerCase();
        // this.isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    }

    private createKeypad() {
        const buttonWidth = 73;
        const buttonHeight = 75;
        const gap = 23;
        const baseX = 246 - (buttonWidth / 2);
        const baseY = this.display.height - 78 - (buttonHeight / 2);

        for (let i = 0; i < 10; i++) {
            const buttonX = baseX + (i * (buttonWidth + gap));
            const buttonText = i.toString();

            const button = ButtonHelper.createButton({
                scene: this,
                imageKeys: {
                    default: 'keypad_btn',
                    hover: 'keypad_btn_hover',
                    pressed: 'keypad_btn_pressed'
                },
                text: buttonText,
                label: buttonText,
                textStyle: {
                    font: "700 36px Exo",
                    color: '#000000'
                },
                imageScale: 1,
                x: buttonX,
                y: baseY,
                // onClick: () => {
                //     this.handleNumberInput(buttonText);
                // }
            });

            // Store reference to the button
            this.keypadButtons[i] = button;
        }
    }

    private updateTextCloudDialogue(text: string) {
        // Remove existing text if any
        if (this.textCloudText) {
            this.textCloudText.destroy();
        }

        // Create new text in the text cloud
        this.textCloudText = this.addText(850, 304, text, {
            font: '400 18px Exo',
            color: '#000000',
            fixedWidth: 220,
            align: 'center',
            wordWrap: { width: 220 }
        }).setOrigin(0.5).setDepth(3);
    }

    private playStep1() {
        // Step 1: No mooncakes on table, no eaten mooncake in plate
        this.clearMooncakes();
        // this.currentStep = 1;

        // Wait 2 seconds then go to step 2
        this.time.delayedCall(2000, () => {
            this.playStep2();
        });
    }

    private playStep2() {
        // Step 2: Add 4 mooncakes on the table
        this.clearMooncakes();
        this.addMooncakes(4);
        // this.currentStep = 2;

        // Update dialogue
        this.updateTextCloudDialogue("I had 4 tasty mooncakes... but I already ate one!");

        // Wait 3 seconds then go to step 3
        this.time.delayedCall(3000, () => {
            this.playStep3();
        });
    }

    private playStep3() {
        // Step 3: 3 mooncakes on table, 1 eaten mooncake in plate
        this.clearMooncakes();
        this.addMooncakes(3);
        this.addMooncakeEaten();
        // this.currentStep = 3;

        // Update dialogue
        this.updateTextCloudDialogue("Let's figure out how many mooncakes are left!");

        // Glow mooncakes one by one, then proceed to the next step
        this.startMooncakeGlowAnimation(() => {
            this.time.delayedCall(500, () => { // small delay before next step
                this.playStep4();
            });
        });
    }

    private playStep4() {
        // Step 4: Hand moves to keypad button 3 and clicks it
        // this.currentStep = 4;

        // Calculate position of button 3 (index 3 in 0-9 sequence)
        const buttonWidth = 73;
        const gap = 23;
        const baseX = 246 - (buttonWidth / 2);
        const baseY = this.display.height - 78 - (75 / 2);
        const button3X = baseX + (3 * (buttonWidth + gap));
        const button3Y = baseY;

        // Start hand from bottom right
        const startX = this.display.width - 200;
        const startY = this.display.height - 200;

        // Create hand and animate from bottom right to button 3
        this.hand = this.addImage(startX, startY, 'hand')
            .setOrigin(0).setScale(0.13).setVisible(true);

        this.handTween = this.tweens.add({
            targets: this.hand,
            x: button3X + 120,
            y: button3Y + 200,
            duration: 1500,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // Click animation
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
                            // Change button to pressed state
                            this.updateKeypadButtonState(3, 'pressed');
                        } else {
                            this.hand.setTexture('hand');
                            // Change button to hover state
                            this.updateKeypadButtonState(3, 'hover');
                        }
                    },
                    onComplete: () => {
                        // Highlight button 4
                        this.numberPad?.highlightButton(3);
                        // Reset button to default state
                        this.updateKeypadButtonState(3, 'default');
                        this.hand.setVisible(false);
                        this.handTween.stop();
                        this.handTween.destroy();

                        // Wait 2 seconds then restart the sequence
                        this.time.delayedCall(2000, () => {
                            this.playStep5();
                        });
                    }
                });
            }
        });
    }

    private playStep5() {
        // Step 5: Show success image over the keypad area
        // this.currentStep = 5;

        // Calculate position to center over the keypad
        const keypadX = 641; // Center of keypad background
        const keypadY = 650; // Y position of keypad background

        this.successImage = this.addImage(keypadX, keypadY, 'success')
            .setOrigin(0.5).setDepth(10); // High depth to appear over everything

        // Wait 3 seconds then destroy success image and close doors
        this.time.delayedCall(3000, () => {
            // Hide success image
            if (this.successImage) {
                this.successImage.destroy();
                this.successImage = undefined;
            }

            // Close doors immediately after success image is destroyed
            this.closeDoors();
        });
    }

    private playStep6() {
        // Step 6: Clear all mooncakes, show play button in center of screen
        // this.currentStep = 6;

        // Clear all mooncakes
        this.clearMooncakes();

        // Show play button in the center of the screen
        this.playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t('common.play'),
            label: i18n.t('common.play'),
            textStyle: {
                font: '700 32px Exo',
                color: '#ffffff',
            },
            raisedOffset: 3.5,
            imageScale: 0.8,
            x: this.display.width / 2, // Center of screen
            y: this.display.height / 2, // Center of screen
            onClick: () => {
                if (!this.parentScene) {
                    if (this.playButton) {
                        this.playButton.destroy();
                        this.playButton = undefined;
                    }
                    this.handleOnClick();
                } else {
                    this.handleOnClick();
                }
            },
        });

        // Set high depth to appear above everything
        this.playButton.setDepth(10);

        ButtonHelper.startBreathingAnimation(this.playButton, {
            scale: 1.1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });

        // No automatic restart - the play button stays until clicked
    }

    private updateKeypadButtonState(buttonIndex: number, state: 'default' | 'hover' | 'pressed') {
        // Get the button container for the specified index
        const button = this.keypadButtons[buttonIndex];
        if (!button) return;

        // Get the button image (first child of the container)
        const buttonImage = button.getAt(0) as Phaser.GameObjects.Image;
        if (!buttonImage) return;

        // Update the texture based on the state
        switch (state) {
            case 'default':
                buttonImage.setTexture('keypad_btn');
                break;
            case 'hover':
                buttonImage.setTexture('keypad_btn_hover');
                break;
            case 'pressed':
                buttonImage.setTexture('keypad_btn_pressed');
                break;
        }
    }

    private addMooncakes(count: number) {
        const positions = [
            { x: 340, y: 500 },
            { x: 540, y: 500 },
            { x: 740, y: 500 },
            { x: 940, y: 500 }
        ];

        for (let i = 0; i < count; i++) {
            const mooncake = this.addImage(positions[i].x, positions[i].y, 'mooncake')
                .setOrigin(0.5).setDepth(2);
            this.mooncakes.push(mooncake);
        }
    }

    private addMooncakeEaten() {
        this.mooncakeEaten = this.addImage(641, 400, 'mooncake_eaten')
            .setOrigin(0.5).setDepth(2).setScale(0.5);
    }

    private clearMooncakes() {
        // Clear existing mooncakes
        this.mooncakes.forEach(mooncake => mooncake.destroy());
        this.mooncakes = [];

        // Clear eaten mooncake
        if (this.mooncakeEaten) {
            this.mooncakeEaten.destroy();
            this.mooncakeEaten = undefined;
        }
    }

    init(data?: { parentScene: string }) {
        if (data?.parentScene) {
            this.parentScene = data.parentScene;
        }

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
        this.addImage(this.display.width / 2, this.display.height / 2, 'info_screen_bg')
            .setOrigin(0.5);
        this.addImage(600, 50, 'info_progress').setOrigin(0.5).setDepth(2).setScale(0.9);

        if (this.grade === "3") {
            // For grade 3, start the NumpadTutorial instead
            this.scene.start('NumpadTutorial', { parentScene: this.parentScene });
            return;
        }

        // Default to grade K instructions
        this.addImage(641, 174, 'info_question').setOrigin(0.5);
        this.addImage(641, 374, 'alien_green').setOrigin(0.5).setDepth(2).setScale(0.7);
        this.addImage(830, 304, 'text_cloud').setOrigin(0.5).setScale(0.9);
        this.addImage(641, 474, 'table_plate').setOrigin(0.5).setDepth(2);
        this.addImage(641, 650, 'numpad_bg').setOrigin(0.5);
        // Create keypad
        this.createKeypad();
        // Show initial dialogue
        this.updateTextCloudDialogue("Ahoy, math friend! I'm Captain Zog");

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

        if (!this.parentScene) {
            this.audioManager.initialize(this);
        } else {
            this.audioManager.setMusicMute(true);
        }

        this.time.delayedCall(1000, () => {
            this.playStep1();
        });
    }

    preload() { }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || 'en';
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image('info_screen_bg', 'info_screen_bg.png');
        scene.load.image('success', 'success.png');
        scene.load.image('numpad_bg', 'numpad_bg.png');
        scene.load.image('info_progress', 'info_progress.png');
        scene.load.image('info_question', 'info_question.png');
        scene.load.image('hand', 'hand.png');
        scene.load.image('hand_click', 'hand_click.png');
        scene.load.image('alien_green_dark', 'alien_green_dark.png');
        scene.load.image('alien_red_dark', 'alien_red_dark.png');
        scene.load.image('alien_purple_dark', 'alien_purple_dark.png');
        scene.load.image('text_cloud', 'text_cloud.png');
        scene.load.image('table_plate', 'table_plate.png');
        scene.load.image('mooncake', 'mooncake_full.png');
        scene.load.image('mooncake_eaten', 'mooncake_eaten.png');
        scene.load.image('mooncake_glow', 'mooncake_glow.png');
        scene.load.image('reset_btn', 'reset_btn.png');
        scene.load.image('reset_btn_hover', 'reset_btn_hover.png');
        scene.load.image('reset_btn_pressed', 'reset_btn_pressed.png');
        scene.load.image('check_btn', 'check_btn.png');
        scene.load.image('check_btn_hover', 'check_btn_hover.png');
        scene.load.image('check_btn_pressed', 'check_btn_pressed.png');
        scene.load.image('keypad_btn', 'keypad_btn.png');
        scene.load.image('keypad_btn_hover', 'keypad_btn_hover.png');
        scene.load.image('keypad_btn_pressed', 'keypad_btn_pressed.png');
        scene.load.image('info_fire', 'info_fire.png');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/common`);
        scene.load.image('door', 'door.png');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        // Load appropriate audio based on device type
        const isMobile = scene.isTouchDevice();
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
    }

    private handleOnClick() {
        if (this.parentScene) {
            this.scene.stop();
            this.audioManager.setMusicMute(false);
            this.destroyTweens();
            this.scene.resume(this.parentScene);
        } else {
            this.destroyTweens();
            this.scene.start('GameScene');
        }
    }

    private closeDoors() {
        const doorLeft = this.addImage(0, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(1, 0.5).setDepth(3);
        const doorRight = this.addImage(this.display.width, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(0, 0.5).setFlipX(true).setDepth(3);

        animateDoors({
            scene: this,
            leftDoor: doorLeft,
            rightDoor: doorRight,
            open: false,
            duration: 1000,
            delay: 500,
            soundEffectKey: 'door_close',
            onComplete: () => {
                this.audioManager.stopSoundEffect('door_close');
                // After doors close, show play button in center
                this.playStep6();
            }
        });
    }

    private destroyTweens() {
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

        if (this.mooncakeGlowTweenChain) {
            this.mooncakeGlowTweenChain.stop();
            this.mooncakeGlowTweenChain.destroy();
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
        if (this.infoArrows) {
            this.infoArrows.setTexture('info_arrows');
        }

        // Clear mooncakes
        this.clearMooncakes();
        // this.currentStep = 1;

        // Clear success image and play button
        if (this.successImage) {
            this.successImage.destroy();
            this.successImage = undefined;
        }
        if (this.playButton) {
            this.playButton.destroy();
            this.playButton = undefined;
        }

        // Clear text cloud text
        if (this.textCloudText) {
            this.textCloudText.destroy();
            this.textCloudText = undefined;
        }

        // Clear keypad buttons array
        this.keypadButtons = [];

        // Stop any playing audio
        this.audioManager.stopAllSoundEffects();
    }

    private startMooncakeGlowAnimation(onComplete: () => void) {
        if (this.mooncakes.length === 0) {
            onComplete();
            return;
        }

        const glowTweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [];
        const glowImages: Phaser.GameObjects.Image[] = [];

        this.mooncakes.forEach(mooncake => {
            // Unscale coordinates before passing them to addImage
            const unscaledX = mooncake.x / this.display.scale;
            const unscaledY = mooncake.y / this.display.scale;

            // Create glow image at exact same position and scale as the mooncake
            const glowImage = this.addImage(unscaledX, unscaledY, 'mooncake_glow')
                .setOrigin(0.5)
                .setDepth(mooncake.depth + 1) // Place glow above the mooncake
                .setAlpha(0)
                .setScale(mooncake.scaleX); // Use exact scale of mooncake

            glowImages.push(glowImage);

            glowTweens.push({
                targets: glowImage,
                alpha: { from: 0, to: 0.8 }, // More subtle glow effect
                scale: { from: mooncake.scaleX, to: mooncake.scaleX * 1.3 }, // Slightly larger glow
                duration: 1000, // Slower animation
                yoyo: true,
                ease: 'Sine.easeInOut',
                hold: 500, // Hold the glow longer
                onStart: () => {
                    // Hide original mooncake when glow starts
                    mooncake.setVisible(false);
                },
                onComplete: () => {
                    // Show original mooncake when glow ends
                    mooncake.setVisible(true);
                },
            });
        });

        this.mooncakeGlowTweenChain = this.tweens.chain({
            tweens: glowTweens,
            onComplete: () => {
                glowImages.forEach(img => img.destroy());
                // Ensure all mooncakes are visible after the chain completes
                this.mooncakes.forEach(m => m.setVisible(true));
                onComplete();
            }
        }) as any;
    }
}
