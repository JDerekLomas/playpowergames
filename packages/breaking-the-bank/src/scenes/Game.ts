import { BaseScene, ButtonHelper, i18n, setSceneBackground, ProgressBar, VolumeSlider, getQuestionBankByName, questionBankNames, ImageOverlay, TextOverlay, announceToScreenReader, QuestionSelectorHelper, Question, GameConfigManager, scormService, ButtonOverlay, focusToGameContainer, AnalyticsHelper } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS, PIGGY_THEMES } from '../config/common';

type CoinType = 'quarter' | 'dime' | 'nickel' | 'penny';
interface Coin {
    image: Phaser.GameObjects.Image;
    value: number;
    type: CoinType;
    currentTray?: Phaser.GameObjects.Image;
    flatImage?: Phaser.GameObjects.Image;
    overlay?: ImageOverlay;
}

export class GameScene extends BaseScene {
    private mode: 'sorting' | 'counting' = 'counting';
    private coins: Coin[] = [];
    private trays: Phaser.GameObjects.Image[] = [];
    private trayDepths: Map<Phaser.GameObjects.Image, number> = new Map();
    private hoveredTray: Phaser.GameObjects.Image | null = null;
    private checkButton!: Phaser.GameObjects.Container;
    private clearButton!: Phaser.GameObjects.Container;
    private totalCentsText!: Phaser.GameObjects.Text;
    private totalCentsTextOverlay!: TextOverlay;
    private backgroundOverlay!: Phaser.GameObjects.Rectangle;
    private dropDistance: number = 100;
    private muteButton!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private currentRound: number = 1;
    private totalRounds: number = 10;
    private successOverlay!: Phaser.GameObjects.Rectangle;
    private successStars!: Phaser.GameObjects.Container;
    private attemptedPerRound: number = 0;
    private correctRounds: number = 0;
    private isProcessing: boolean = false;
    private progressBar!: ProgressBar;
    private questionSelector!: QuestionSelectorHelper;
    private currentQuestion?: Question;
    // Announcement queue system (to ensure screen reader announcements don't clash with animations)
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;
    private callStartNextRoundAfterAnnouncements: boolean = false;

    private doorLeft!: Phaser.GameObjects.Image;
    private doorRight!: Phaser.GameObjects.Image;
    private currentThemeIndex: number = 0;
    private coinTypeTexts: Phaser.GameObjects.Text[] = [];
    // DOM lists for accessibility (one per coin type group)
    private coinLists: HTMLElement[] = [];
    private gameConfigManager!: GameConfigManager;
    private analyticsHelper!: AnalyticsHelper;
    private MAX_INPUT_LENGTH = 3;
    private isShaking: boolean = false;

    constructor() {
        super('GameScene');
        this.audioManager.initialize(this);
        this.gameConfigManager = GameConfigManager.getInstance();
        const questionBank = getQuestionBankByName(questionBankNames.coin_couting);
        if (!questionBank) {
            throw new Error('Question bank not found');
        }
        this.questionSelector = new QuestionSelectorHelper(questionBank, this.totalRounds);
    }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || 'en';

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('game_coin_tray', 'game_coin_tray.png');
        scene.load.image('game_correct_icon', 'correct_icon.png');
        scene.load.image('modal_btn', 'modal_btn.png');
        scene.load.image('modal_btn_hover', 'modal_btn_hover.png');
        scene.load.image('modal_btn_pressed', 'modal_btn_pressed.png');
        scene.load.image('quarter_flat', 'quarter_flat.png');
        scene.load.image('dime_flat', 'dime_flat.png');
        scene.load.image('nickel_flat', 'nickel_flat.png');
        scene.load.image('penny_flat', 'penny_flat.png');
        scene.load.image('keypad_btn', 'keypad_btn.png');
        scene.load.image('keypad_btn_hover', 'keypad_btn_hover.png');
        scene.load.image('keypad_btn_pressed', 'keypad_btn_pressed.png');
        scene.load.image('cents_input_bg', 'cents_input_bg.png');
        scene.load.image('btn_alter', 'btn_alter.png');
        scene.load.image('btn_alter_hover', 'btn_alter_hover.png');
        scene.load.image('btn_alter_pressed', 'btn_alter_pressed.png');
        scene.load.image('btn_purple', 'btn_purple.png');
        scene.load.image('btn_purple_hover', 'btn_purple_hover.png');
        scene.load.image('btn_purple_pressed', 'btn_purple_pressed.png');
        scene.load.image('instruction_piggy', 'instruction_piggy.png');
        scene.load.image('crack1', 'crack1.png');
        scene.load.image('crack2', 'crack2.png');
        scene.load.image('crack3', 'crack3.png');
        scene.load.image('countdown_1', 'countdown_1.png');
        scene.load.image('countdown_2', 'countdown_2.png');
        scene.load.image('countdown_3', 'countdown_3.png');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/hammer`);
        scene.load.atlas('hammer', 'spritesheet.png', 'spritesheet.json');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/crack`);
        scene.load.atlas('crack', 'spritesheet.png', 'spritesheet.json');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/smoke`);
        scene.load.atlas('smoke', 'spritesheet.png', 'spritesheet.json');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/piggy_themes`);
        PIGGY_THEMES.forEach(theme => {
            scene.load.image(theme.BACKGROUND.KEY, theme.BACKGROUND.PATH);
            scene.load.image(theme.PIGGY_BANK.KEY, theme.PIGGY_BANK.PATH);
        });

        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.ICON_BTN.KEY, BUTTONS.ICON_BTN.PATH);
        scene.load.image(BUTTONS.ICON_BTN_HOVER.KEY, BUTTONS.ICON_BTN_HOVER.PATH);
        scene.load.image(BUTTONS.ICON_BTN_PRESSED.KEY, BUTTONS.ICON_BTN_PRESSED.PATH);
        scene.load.image(BUTTONS.PAUSE_ICON.KEY, BUTTONS.PAUSE_ICON.PATH);
        scene.load.image(BUTTONS.RESUME_ICON.KEY, BUTTONS.RESUME_ICON.PATH);
        scene.load.image(BUTTONS.HELP_ICON.KEY, BUTTONS.HELP_ICON.PATH);
        scene.load.image(BUTTONS.MUTE_ICON.KEY, BUTTONS.MUTE_ICON.PATH);
        scene.load.image(BUTTONS.UNMUTE_ICON.KEY, BUTTONS.UNMUTE_ICON.PATH);
        scene.load.image(BUTTONS.SETTINGS_ICON.KEY, BUTTONS.SETTINGS_ICON.PATH);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${COMMON_ASSETS.PATH}`);
        scene.load.image(COMMON_ASSETS.DOOR.KEY, COMMON_ASSETS.DOOR.PATH);
        scene.load.image('info_text_audio_button', 'unmute_icon.png');
        scene.load.image('transparent', 'transparent.png');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('correct', 'correct.mp3');
        scene.load.audio('bg-music', 'bg-music.mp3');
        scene.load.audio('incorrect', 'incorrect.mp3');
        scene.load.audio('scatter-coins', 'scatter-coins.mp3');
        scene.load.audio('coin-drop-on-tray', 'coin-drop-on-tray.mp3');
        scene.load.audio('door_open', 'door_open.wav');
        scene.load.audio('coin_shake', 'coin_shake.mp3');
        scene.load.audio('hammer_hit', 'hammer_hit.mp3');
        scene.load.audio('countdown', 'countdown.mp3');
        scene.load.audio('info_description', `info_description_${language}.mp3`);
        scene.load.audio('break_piggy', `break_piggy_${language}.mp3`);

        VolumeSlider.preload(scene, 'blue');
        ProgressBar.preload(scene, 'light');
    }

    init(data?: { restart?: boolean, themeIndex?: number }) {
        this.mode = this.gameConfigManager.get('mode') === 'sorting' ? 'sorting' : 'counting';
        this.currentThemeIndex = data?.themeIndex || 0;

        // Only reset state if explicitly restarting
        if (data?.restart) {
            this.resetGameState();
        }

        if (!this.anims.exists('hammer_hit')) {
            this.anims.create({
                key: 'hammer_hit',
                frames: 'hammer',
                frameRate: 24,
                repeat: 0,
                hideOnComplete: true
            })
        }

        if (!this.anims.exists('smoke_animation')) {
            this.anims.create({
                key: 'smoke_animation',
                frames: 'smoke',
                frameRate: 24,
                repeat: 0,
                hideOnComplete: true
            })
        }

        ProgressBar.init(this);
    }

    private createDoors() {
        this.doorLeft = this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(1, 0.5).setDepth(100);
        this.doorRight = this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(0, 0.5).setFlipX(true).setDepth(100);
    }

    private openDoors() {
        const countdownImg = this.addImage(this.display.width / 2, this.display.height / 2, 'countdown_3').setOrigin(0.5).setDepth(101);
        countdownImg.setScale(250/countdownImg.height);

        let count = 3;

        this.audioManager.playSoundEffect('countdown');
        this.time.addEvent({
            delay: 1000,
            callbackScope: this,
            repeat: 3,
            callback: () => {
                // Announce to screen reader
                announceToScreenReader(count > 0 ? count.toString() : '');
                count--;
                if (count > 0) {
                    this.audioManager.playSoundEffect('countdown');
                    countdownImg.setTexture(`countdown_${count}`);
                } else if (count === 0) {
                    countdownImg.destroy();
                    this.audioManager.playSoundEffect('door_open');
                    this.tweens.add({
                        targets: this.doorLeft,
                        x: 0,
                        duration: 1000,
                        ease: 'Power2'
                    });
                    this.tweens.add({
                        targets: this.doorRight,
                        x: this.getScaledValue(this.display.width),
                        duration: 1000,
                        ease: 'Power2',
                    });
                    setTimeout(() => {
                        this.audioManager.playSoundEffect('break_piggy');
                        this.audioManager.playBackgroundMusic('bg-music');
                    }, 1000);
                }
            }
        });
    }

    private closeDoors() {
        setTimeout(() => {
            this.audioManager.playSoundEffect('door_close');
        }, 500);

        this.tweens.add({
            targets: this.doorLeft,
            x: this.getScaledValue(this.display.width / 2),
            duration: 1000,
            ease: 'Power2'
        });
        this.tweens.add({
            targets: this.doorRight,
            x: this.getScaledValue(this.display.width / 2),
            duration: 1000,
            ease: 'Power2',
        });
    }

    private loadCommonItems() {
        // Create background overlay
        this.backgroundOverlay = this.addRectangle(
            this.display.width / 2,
            this.display.height / 2,
            this.display.width,
            this.display.height,
            0xFF3700,
            0.5
        ).setVisible(false);

        this.progressBar = new ProgressBar(this, 'light', i18n);
        this.progressBar.create(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(51),
        );
        this.progressBar.getContainer().setVisible(false);

        this.createPauseButton();
        this.createMuteButton();
        this.createSettingsButton();
        this.createHelpButton();
    }

    private loadThemeBackground() {
        const themeAssets = PIGGY_THEMES[this.currentThemeIndex];

        // Add theme background
        const themeBg = this.addImage(this.display.width / 2, -40, themeAssets.BACKGROUND.KEY).setOrigin(0.5, 0);
        this.tweens.add({
            targets: themeBg,
            y: 0,
            delay: 1000,
            duration: 1000,
            ease: 'Power2',
        });
    }

    private loadPiggyBank(cb?: () => void) {
        // delay announcement for countdown and then announce interaction instructions
        this.time.delayedCall(4000, () => {
            announceToScreenReader(i18n.t('common.hammerPiggyBank'));
        });
        
        // Additional announcement for screen reader users about keyboard navigation
        this.time.delayedCall(5000, () => {
            announceToScreenReader('Use Tab to navigate to the piggy bank, then press Enter or Space to break it.');
        });
        const themeAssets = PIGGY_THEMES[this.currentThemeIndex];
        setSceneBackground(`${ASSETS_PATHS.IMAGES}/piggy_themes/${themeAssets.BACKGROUND.PATH}`, true);
        const overlay = this.addRectangle(this.display.width / 2, this.display.height / 2, this.display.width, this.display.height, 0x000000, 0.5);

        // Add theme piggy bank
        const crackY = this.currentThemeIndex === 0 ? this.display.height / 2 - 240 : this.display.height / 2 - 210;
        const piggyBank = this.addImage(this.display.width / 2, this.display.height / 2 - 250, themeAssets.PIGGY_BANK.KEY).setOrigin(0.5, 0).setAlpha(0);
        const piggyBankOverlay = new ImageOverlay(this, piggyBank, { 
            label: i18n.t('common.piggyBank') + '. Press Enter or Spacebar to hammer.',
            announce: true 
        });
        const crack = this.addImage(this.display.width / 2, crackY, 'crack1').setOrigin(0.5, 0).setScale(0.4).setVisible(false);

        // Add fade in animation
        this.tweens.add({
            targets: piggyBank,
            alpha: 1,
            duration: 1000,
            ease: 'Sine.easeIn',
            onComplete: () => {
                piggyBank.setInteractive();
                
                // Focus the piggy bank element for screen readers after it appears
                this.time.delayedCall(3000, () => {
                    const domElement = (piggyBankOverlay as any).domElement;
                    if (domElement?.node) {
                        const htmlElement = domElement.node as HTMLElement;
                        htmlElement.focus();
                    }
                });
            }
        });

        // Add info text
        const infoText = this.addText(this.display.width / 2, this.display.height - 100, i18n.t('game.piggyBankInstruction'), {
            font: "700 26px Exo",
            color: "#000000"
        }).setOrigin(0.5);

        new TextOverlay(this, infoText, { label: i18n.t('game.piggyBankInstruction'), tag: 'h1', role: 'heading' });

        // Add hammer
        const hammer = this.addSprite(0, 0, 'hammer')
            .setOrigin(1, 0.5)
            .setVisible(false);

        let hits = 0;
        let isHitting = false;

        // Helper function to handle hammer action
        const handleHammerAction = (x?: number, y?: number) => {
            if (isHitting) {
                return;
            }

            isHitting = true;

            // Use provided coordinates or default to piggy bank center for keyboard users
            hammer.x = x !== undefined ? x + this.getScaledValue(100) : piggyBank.x + this.getScaledValue(50);
            hammer.y = y !== undefined ? y - this.getScaledValue(120) : piggyBank.y + this.getScaledValue(100);

            // Show hammer
            hammer.setVisible(true);
            hammer.play('hammer_hit');

            hammer.once('animationcomplete', () => {
                hits++;
                crack.setVisible(true);
                crack.setTexture(`crack${hits}`);
                this.audioManager.playSoundEffect('hammer_hit');

                // Announce progress to screen reader
                if (hits === 1) {
                    announceToScreenReader(i18n.t('game.firstHit') || `Hit ${hits} of 3`);
                } else if (hits === 2) {
                    announceToScreenReader(i18n.t('game.secondHit') || `Hit ${hits} of 3`);
                } else if (hits === 3) {
                    announceToScreenReader(i18n.t('game.piggyBankBroken') || 'Piggy bank broken! Coins scattered!');
                    
                    // Immediately disable piggy bank interaction when broken
                    piggyBank.removeInteractive();
                    
                    // Make overlay non-focusable immediately
                    if (piggyBankOverlay) {
                        const domElement = (piggyBankOverlay as any).domElement;
                        if (domElement?.node) {
                            const htmlElement = domElement.node as HTMLElement;
                            htmlElement.setAttribute('tabindex', '-1');
                            htmlElement.setAttribute('aria-hidden', 'true');
                            htmlElement.style.pointerEvents = 'none';
                            
                            // Move focus away if currently focused
                            if (document.activeElement === htmlElement) {
                                (htmlElement as HTMLElement).blur();
                            }
                        }
                    }
                }

                // Add camera shake effect
                this.cameras.main.shake(50, 0.003, false);
                // Add shake animation to piggy bank and crack
                const piggyBankTween = this.tweens.add({
                    targets: [piggyBank, crack],
                    x: piggyBank.x + this.getScaledValue(10),
                    duration: 50,
                    yoyo: true,
                    repeat: 2,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        isHitting = false;
                        if (hits === 3) {
                            overlay.destroy();
                            piggyBank.setVisible(false);
                            crack.setVisible(false);
                            setSceneBackground(`${ASSETS_PATHS.IMAGES}/piggy_themes/${themeAssets.BACKGROUND.PATH}`);

                            const smoke = this.addSprite(crack.x / this.display.scale, crack.y / this.display.scale, 'smoke').setOrigin(0.5);
                            smoke.play('smoke_animation');
                            this.audioManager.playSoundEffect('scatter-coins');

                            smoke.once('animationcomplete', () => {
                                smoke.destroy();

                                // Stop specific tweens
                                if (piggyBankTween) {
                                    piggyBankTween.stop();
                                    piggyBankTween.destroy();
                                }

                                // Clean up the piggy bank overlay and make it non-focusable
                                if (piggyBankOverlay) {
                                    const domElement = (piggyBankOverlay as any).domElement;
                                    if (domElement?.node) {
                                        const htmlElement = domElement.node as HTMLElement;
                                        // Make element non-focusable immediately
                                        htmlElement.setAttribute('tabindex', '-1');
                                        htmlElement.setAttribute('aria-hidden', 'true');
                                        htmlElement.style.display = 'none';
                                        htmlElement.style.pointerEvents = 'none';
                                        
                                        // Remove from tab order completely
                                        if (document.activeElement === htmlElement) {
                                            (htmlElement as HTMLElement).blur();
                                        }
                                    }
                                    // Destroy the overlay
                                    piggyBankOverlay.destroy();
                                }

                                // Destroy the objects
                                hammer.destroy();
                                piggyBank.destroy();
                                crack.destroy();
                                infoText.destroy();

                                cb?.();
                            });
                        }
                    }
                });

            });
        };

        // Make piggy bank accessible to screen readers with keyboard interaction
        const domElement = (piggyBankOverlay as any).domElement;
        if (domElement?.node) {
            const htmlElement = domElement.node as HTMLElement;
            htmlElement.setAttribute('tabindex', '0');
            htmlElement.setAttribute('role', 'button');
            htmlElement.setAttribute('aria-label', i18n.t('common.piggyBank') + '. Press Enter or Spacebar to hammer.');
            
            // Add keyboard event listener directly to the DOM element
            htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    handleHammerAction();
                }
            });

            // Completely hide all focus indicators and visual outlines
            htmlElement.style.cssText += `
                outline: none !important;
                border: none !important;
                box-shadow: none !important;
                background: transparent !important;
                -webkit-focus-ring-color: transparent !important;
                -webkit-tap-highlight-color: transparent !important;
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
                appearance: none !important;
            `;
            
            // Also add focus and blur event listeners to ensure no visual feedback
            htmlElement.addEventListener('focus', () => {
                htmlElement.style.outline = 'none !important';
                htmlElement.style.border = 'none !important';
                htmlElement.style.boxShadow = 'none !important';
            });
            
            htmlElement.addEventListener('blur', () => {
                htmlElement.style.outline = 'none !important';
                htmlElement.style.border = 'none !important';
                htmlElement.style.boxShadow = 'none !important';
            });
        }

        // Make the game canvas focusable as fallback
        const canvas = this.game.canvas;
        canvas.tabIndex = 0;

        // Make piggy bank interactive for mouse users
        piggyBank.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            handleHammerAction(pointer.x, pointer.y);
        });
    }

    create() {
        const _analyticsHelper = AnalyticsHelper.getInstance();
        if (_analyticsHelper) {
            this.analyticsHelper = _analyticsHelper;
        } else {
            console.error('AnalyticsHelper not found');
        }
        this.analyticsHelper?.createSession('game.mini_banker.default');

        // Focus the game canvas for keyboard interaction
        focusToGameContainer();

        // Add background
        this.createDoors();

        this.loadThemeBackground();
        this.loadCommonItems();
        this.loadPiggyBank(() => {
            // Start the game mode
            if (this.mode === 'counting') {
                this.createInstructionBar();
                this.createCountingMode();
                this.pressCheckOnEnterKey();
            } else {
                this.createInstructionBar();
                this.createSortingMode();
            }
        });

        setTimeout(() => {
            this.openDoors();
        }, 500);
    }

    private pressCheckOnEnterKey(): void {
        // Only add Enter key listener for counting/sorting after piggy bank is broken
        // This prevents conflicts with the piggy bank interaction
        this.input.keyboard?.on('keydown-ENTER', () => {
            // Don't trigger if the focused element is the piggy bank or if processing
            if (this.isProcessing) return;
            
            // Check if focus is on a DOM overlay element (like piggy bank)
            const activeElement = document.activeElement;
            if (activeElement && activeElement.getAttribute('role') === 'button') {
                return; // Let the DOM element handle its own keyboard events
            }
            
            if (this.mode === 'sorting') {
                this.checkSorting();
            } else {
                this.checkCounting();
            }
        });
    }

    private createTrays() {
        const trayWidth = 222;
        const traySpacing = 60;
        const startX = this.display.width / 2 - ((trayWidth + traySpacing) * 3) / 2;
        const trayY = this.display.height - 200;

        // Create slots for each coin type
        const trayTypes = [
            { value: 25, label: i18n.t('common.quarter') },
            { value: 10, label: i18n.t('common.dime') },
            { value: 5, label: i18n.t('common.nickel') },
            { value: 1, label: i18n.t('common.penny') }
        ];

        trayTypes.forEach((type, index) => {
            // Create coin holder image
            const tray = this.addImage(
                startX + (trayWidth + traySpacing) * index,
                trayY,
                'game_coin_tray'
            );
            tray.setInteractive();
            new ImageOverlay(this, tray, { label: i18n.t('common.trayFor', { coin: type.label }) });

            const label = this.addText(
                startX + (trayWidth + traySpacing) * index,
                trayY + 80,
                type.label,
                {
                    fontSize: '25px',
                    fontStyle: 'bold',
                    fontFamily: 'Exo',
                    color: '#000000',
                    align: 'center',
                }
            );
            label.setOrigin(0.5);
            new TextOverlay(this, label, { label: type.label });

            this.trays.push(tray);
            this.trayDepths.set(tray, 0); // Initialize depth counter for each tray
        });
    }

    private createInstructionBar() {
        const container = this.add.container(this.getScaledValue(this.display.width / 2), -this.getScaledValue(50));

        const rectWidth = 700;
        const rectHeight = 56;
        const rectBorderRadius = 10;
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRoundedRect(
            -this.getScaledValue(rectWidth / 2),
            -this.getScaledValue(rectHeight / 2),
            this.getScaledValue(rectWidth),
            this.getScaledValue(rectHeight),
            this.getScaledValue(rectBorderRadius)
        );
        container.add(graphics);

        const circle = this.addCircle(-rectWidth / 2, 0, 39.5, 0xffffff, 1).setOrigin(0.5);
        container.add(circle);

        const image = this.addImage(-rectWidth / 2, 0, 'instruction_piggy').setOrigin(0.5);
        container.add(image);

        const text = this.mode === 'sorting' ? i18n.t('game.sortingInstruction') : i18n.t('game.countingInstruction');
        const instructionText = this.addText(0, 0, text, {
            font: "700 26px Exo",
            color: '#000000',
        }).setOrigin(0.5);
        container.add(instructionText);

        container.setDepth(50);

        this.tweens.add({
            targets: container,
            y: this.getScaledValue(50),
            ease: 'Power2',
            delay: 2500,
            duration: 1000,
            onComplete: () => {
                const soundEffect = 'info_description';
                const sound = this.audioManager.playSoundEffect(soundEffect);
                this.audioManager.duckBackgroundMusic();
                if (sound) {
                    sound.once(Phaser.Sound.Events.COMPLETE, () => {
                        this.audioManager.unduckBackgroundMusic();
                    });
                } else {
                    this.audioManager.unduckBackgroundMusic();
                }
                new TextOverlay(this, instructionText, { label: text, tag: 'h1', announce: true });
                // Wait for 2 seconds before sliding out
                this.time.delayedCall(2000, () => {
                    // Slide out animation
                    this.tweens.add({
                        targets: container,
                        y: -this.getScaledValue(50),
                        ease: 'Power2',
                        duration: 1000,
                        onComplete: () => {
                            this.progressBar.getContainer().setVisible(true);
                            container.destroy();
                        },
                    });
                });
            },
        });
    }

    private createSortingMode() {
        // Create coin slots at the bottom
        this.createTrays();

        this.addRectangle(this.display.width / 2, this.display.height - 50, this.display.width, 100, 0xFBC374, 0.5);

        // Create check button
        this.createCheckButton();

        // Create and scatter coins
        this.createCoins(false);
    }

    private createKeypad() {
        const buttonWidth = 73;
        const buttonHeight = 75;
        const gap = 23;
        const baseX = 246 - (buttonWidth / 2);
        let baseY = this.display.height - 128 - (buttonHeight / 2);

        // Add keyboard event listener
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            // Only handle number keys 0-9
            if (/^[0-9]$/.test(event.key)) {
                this.handleNumberInput(event.key);
            } else if (event.key === 'Backspace') {
                this.handleBackspace();
            }
        });

        for (let i = 0; i < 10; i++) {
            let buttonX = baseX + (i * (buttonWidth + gap));
            if (i === 5) {
                baseY = this.display.height - 30 - (buttonHeight / 2);
            }

            if (i >= 5) {
                buttonX = baseX + ((i - 5) * (buttonWidth + gap));
            }
            let buttonText = (i + 1).toString();
            if (i === 9) {
                buttonText = `0`;
            }
            ButtonHelper.createButton({
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
                onClick: () => {
                    this.handleNumberInput(buttonText);
                }
            });
        }
    }

    private handleNumberInput(input: string) {
        if (this.isShaking) {
            return;
        }

        this.totalCentsText.setStyle({ color: '#000000' });
        let current = this.totalCentsText.text.replace(' ¢', '');
    
        // If placeholder text, start fresh
        if (this.totalCentsText.text === i18n.t('game.totalCents')) {
            current = '';
        }
        // Prevent overflow
        if (current.length >= this.MAX_INPUT_LENGTH) {
            this.shakeInputBox();
            return;
        }
    
        const updated = current + input + ' ¢';
        this.totalCentsText.text = updated;
        this.totalCentsTextOverlay.updateContent(updated);
    }

    private shakeInputBox() {
        // Prevent overlapping shake animations
        if (this.isShaking) {
            return;
        }
        this.isShaking = true;

        // Announce to screen reader that maximum length has been reached
        announceToScreenReader(i18n.t('game.maxInputReached') || 'Maximum 3 digits allowed');
        
        const originalX = this.totalCentsText.x;
        this.tweens.add({
            targets: this.totalCentsText,
            x: originalX - this.getScaledValue(10),
            duration: 45,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.totalCentsText.x = originalX; // restore original X
                this.isShaking = false;
            }
        });
    }

    private handleBackspace() {
        if (this.totalCentsText.text === i18n.t('game.totalCents')) {
            return;
        }

        // Remove the ¢ symbol and last character
        const currentText = this.totalCentsText.text.replace(' ¢', '');
        if (currentText.length > 0) {
            const newText = currentText.slice(0, -1);
            if (newText.length === 0) {
                // If no digits left, reset to default text
                this.totalCentsText.setStyle({ color: '#595959' });
                this.totalCentsText.text = i18n.t('game.totalCents');
            } else {
                this.totalCentsText.text = newText + ' ¢';
            }
        }
        this.totalCentsTextOverlay.updateContent(this.totalCentsText.text);
    }

    private createCountingMode() {
        this.addRectangle(this.display.width / 2, this.display.height - 112, this.display.width, 224, 0xFBC374, 0.5);

        // Create and arrange coins
        this.createCoins(true);

        // Create keypad
        this.createKeypad();

        // Create total cents input field
        this.createTotalCentsInput();

        // Create clear button
        this.createClearButton();

        // Create check button
        this.createCheckButton();
    }

    private createCheckButton() {

        this.checkButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: "btn_purple",
                hover: "btn_purple_hover",
                pressed: "btn_purple_pressed"
            },
            text: i18n.t('game.check'),
            label: i18n.t('game.check'),
            textStyle: {
                font: `700 ${this.mode === 'sorting' ? '32px' : '36px'} Exo`,
                color: '#ffffff',
            },
            imageScale: 1,
            x: this.mode === 'sorting' ? this.display.width / 2 : 977,
            y: this.mode === 'sorting' ? this.display.height - 50 : this.display.height - 67.5,
            onClick: () => {
                if (this.isProcessing) return;
                if (this.mode === 'sorting') {
                    this.checkSorting();
                } else {
                    this.checkCounting();
                }
            }
        });

        const overlay = (this.checkButton as any).buttonOverlay;
        if (overlay) {
            overlay.element.setAttribute('aria-live', 'off');
        }

        // Hide button initially
        if (this.mode === 'sorting') {
            this.checkButton.setVisible(false);
        } else {
            this.checkButton.setPosition(this.clearButton.getBounds().right + this.checkButton.width / 2 + this.getScaledValue(20), this.clearButton.y);
        }
    }

    private createTotalCentsInput() {
        const inputBg = this.addImage(890, this.display.height - 165, 'cents_input_bg').setOrigin(0.5);
        new ImageOverlay(this, inputBg, { label: i18n.t('common.answerInput') });

        this.totalCentsText = this.addText(760, this.display.height - 180, i18n.t('game.totalCents'), {
            font: "700 30px Exo",
            color: '#595959',
        });
        this.totalCentsTextOverlay = new TextOverlay(this, this.totalCentsText, { label: i18n.t('game.totalCents') });
    }

    private createClearButton() {
        this.clearButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: "btn_alter",
                hover: "btn_alter_hover",
                pressed: "btn_alter_pressed"
            },
            text: i18n.t('game.clear'),
            label: i18n.t('game.clear'),
            textStyle: {
                font: "700 36px Exo",
                color: '#ffffff',
            },
            imageScale: 1,
            x: 802.5,
            y: this.display.height - 67.5,
            onClick: () => {
                this.totalCentsText.setStyle({ color: '#595959' });
                this.totalCentsText.text = i18n.t('game.totalCents');
                this.totalCentsTextOverlay.updateContent(i18n.t('game.totalCents'));
            }
        });
    }

    private generateCoins() {
        const coinTypes = [
            { type: 'quarter', short: 'Q', value: 25 },
            { type: 'dime', short: 'D', value: 10 },
            { type: 'nickel', short: 'N', value: 5 },
            { type: 'penny', short: 'P', value: 1 }
        ];

        const question = this.questionSelector.getNextQuestion();
        if (!question) {
            return [];
        };

        this.currentQuestion = question;

        // Start with an empty set of coins
        const generatedCoins: { type: CoinType, value: number, count: number }[] = [];

        question.operand1.split(',').forEach(coin => {
            const coinType = coinTypes.find(c => c.short === coin[1]) || coinTypes[0];
            const coinCount = parseInt(coin[0]);
            generatedCoins.push({
                type: coinType.type as CoinType,
                value: coinType.value,
                count: coinCount
            })
        });

        // Sort coins by value in descending order (highest to lowest)
        return generatedCoins.sort((a, b) => b.value - a.value);
    }

    // Generate jittered grid positions
    private generateAvailablePositions(
        minX: number,
        minY: number,
        spacing: number,
        maxX: number,
        maxY: number,
        jitter: { x: number; y: number }
    ): { x: number; y: number }[] {
        const positions: { x: number; y: number }[] = [];

        for (let y = minY; y <= maxY; y += spacing) {
            const rowStartX = minX + Phaser.Math.Between(-20, 20);

            for (let x = rowStartX; x <= maxX; x += spacing) {
                const offsetX = Phaser.Math.Between(-jitter.x, jitter.x);
                const offsetY = Phaser.Math.Between(-jitter.y, jitter.y);
                positions.push({ x: x + offsetX, y: y + offsetY });
            }
        }

        return positions;
    }

    private scatterCoins(generatedCoins: { type: CoinType, value: number, count: number }[]) {
        const gridSpacing = 120;
        const xPadding = 120;
        const yPadding = 150;
        const jitter = { x: 10, y: 10 };

        // Generate spaced positions with jitter
        const availablePositions = this.generateAvailablePositions(
            xPadding,
            yPadding,
            gridSpacing,
            this.display.width - xPadding,
            400,
            jitter
        );

        // Randomize positions to avoid patterns
        Phaser.Utils.Array.Shuffle(availablePositions);

        // Place coins (lists are already created in loadCommonItems)
        generatedCoins.forEach(({ type, value: _value, count }) => {
            for (let i = 0; i < count && availablePositions.length > 0; i++) {
                const { x, y } = availablePositions.pop()!;

                const coin = this.addImage(this.display.width / 2, this.display.height / 2, type);
                coin.setScale(0.6);
                coin.setInteractive({ draggable: true });
                coin.setRotation(Phaser.Math.Between(-5, 5));

                this.input.setDraggable(coin);
                this.tweens.add({
                    targets: coin,
                    x: this.getScaledValue(x),
                    y: this.getScaledValue(y),
                    rotation: 0,
                    duration: 1000,
                    ease: 'Power2',
                    onComplete: () => {
                        // Do not create per-coin ImageOverlay (keep visuals non-focusable).
                        // Accessibility is provided via off-screen DOM lists instead.
                        this.coins.push({ image: coin, value: _value, type });
                    }
                });
            }
        });
    }

    private arrangeCoins(generatedCoins: { type: CoinType, value: number, count: number }[]) {
        const startY = 190; // Starting Y position
        const startX = 160; // Starting X position from left
        const gridSize = 110; // Size of each cell in the 2x2 grid
        const typeSpacing = 280; // Horizontal space between different coin types

        // Define fixed column mapping for each coin type
        const coinTypeColumns = {
            'quarter': 0,
            'dime': 1,
            'nickel': 2,
            'penny': 3
        };

    generatedCoins.forEach(({ type, value: _value, count }) => {
            // Use fixed column index based on coin type (lists are already created in loadCommonItems)
            const columnIndex = coinTypeColumns[type];

            const typeText = this.addText(startX + (columnIndex * typeSpacing) + gridSize / 2, startY - 80, i18n.t(`info.${type}`), {
                font: "700 30px Exo",
                color: '#000000'
            }).setOrigin(0.5);
            this.coinTypeTexts.push(typeText);

            // For each coin in this type (up to 4 coins in a 2x2 grid)
            for (let i = 0; i < count; i++) {
                const row = Math.floor(i / 2); // 0 for top row, 1 for bottom row
                const col = i % 2; // 0 for left column, 1 for right column

                const coin = this.addImage(
                    this.display.width / 2,
                    this.display.height / 2,
                    type
                );

                coin.setScale(0.6);
                coin.setRotation(Phaser.Math.Between(-5, 5));
                coin.setInteractive({ draggable: true });

                this.coins.push({
                    image: coin,
                    value: _value,
                    type: type,
                });

                this.input.setDraggable(coin);

                this.tweens.add({
                    targets: coin,
                    x: this.getScaledValue(startX + (columnIndex * typeSpacing) + (col * gridSize)),
                    y: this.getScaledValue(startY + (row * gridSize)),
                    rotation: 0,
                    duration: 1000,
                    ease: 'Power2',
                });
            }
        });
    }

    private findClosestTray(x: number, y: number) {
        // Check for nearby trays during drag
        let closestTray: Phaser.GameObjects.Image | null = null;
        let minDistance = Infinity;

        this.trays.forEach((tray) => {
            const distance = Phaser.Math.Distance.Between(
                x,
                y,
                tray.x,
                tray.y
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestTray = tray;
            }
        });

        return minDistance < this.getScaledValue(this.dropDistance) ? closestTray : null;
    }

    private createCoins(isArranged: boolean = false) {
        // Generate a random set of coins with total under $1
        const generatedCoins = this.generateCoins();

        // Create screen reader accessible coin lists based on the actual generated coins
        this.createCoinListsForScreenReader(generatedCoins);

        // Create the coins based on the generated set
        if (isArranged) {
            this.arrangeCoins(generatedCoins);
        } else {
            this.scatterCoins(generatedCoins);
        }

        // Add drag events
        this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
            gameObject.setAlpha(0.7);
            const coinData = this.coins.find(c => c.image === gameObject);
            if (coinData) {
                coinData.overlay?.destroy();
            }
        });

        this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
            if (this.volumeSlider) {
                return; 
            }

            gameObject.x = dragX;
            gameObject.y = dragY;

            // Check for nearby trays during drag
            const closestTray = this.findClosestTray(dragX, dragY);

            // If we found a tray and it's within a reasonable distance
            if (closestTray !== null) {
                if (this.hoveredTray !== closestTray) {
                    // Scale up new tray
                    this.hoveredTray = closestTray as Phaser.GameObjects.Image;
                    const coinsInTray = this.coins.filter(c => c.currentTray === closestTray).map(c => c.flatImage);
                    this.tweens.add({
                        targets: [this.hoveredTray],
                        scale: this.getScaledValue(1.1),
                        duration: 200,
                        ease: 'Power2'
                    });
                    this.tweens.add({
                        targets: [...coinsInTray],
                        scale: this.getScaledValue(0.9),
                        duration: 200,
                        ease: 'Power2'
                    });
                }
            } else {
                // Reset scale if coin is not near any tray
                if (this.hoveredTray) {
                    const coinsInTray = this.coins.filter(c => c.currentTray === this.hoveredTray).map(c => c.flatImage);
                    this.tweens.add({
                        targets: [this.hoveredTray],
                        scale: this.getScaledValue(1),
                        duration: 200,
                        ease: 'Power2'
                    });
                    this.tweens.add({
                        targets: [...coinsInTray],
                        scale: this.getScaledValue(0.8),
                        duration: 200,
                        ease: 'Power2'
                    });
                    this.hoveredTray = null;
                }
            }
        });

        this.input.on('dragend', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
            gameObject.setAlpha(1);

            if (this.hoveredTray) {
                const coinsInTray = this.coins.filter(c => c.currentTray === this.hoveredTray).map(c => c.flatImage);
                this.tweens.add({
                    targets: this.hoveredTray,
                    scale: this.getScaledValue(1),
                    duration: 200,
                    ease: 'Power2'
                });
                this.tweens.add({
                    targets: [...coinsInTray],
                    scale: this.getScaledValue(0.8),
                    duration: 200,
                    ease: 'Power2'
                });
                this.hoveredTray = null;
            } else {
                const coinData = this.coins.find(c => c.image === gameObject);
                if (coinData) {
                    coinData.overlay?.recreate();
                }
            }

            if (this.mode === 'sorting') {
                this.checkCoinDrop(gameObject);
            }
        });
    }

    private checkCoinDrop(coin: Phaser.GameObjects.Image) {
        const coinData = this.coins.find(c => c.image === coin);
        if (!coinData) return;

        // Find the closest tray
        let closestTray = this.findClosestTray(coin.x, coin.y);

        // If we found a tray and it's within a reasonable distance (100 pixels)
        if (closestTray !== null) {
            const tray = closestTray as Phaser.GameObjects.Image;

            // Count how many coins are already in this tray
            const coinsInTray = this.coins.filter(c => c.currentTray === tray);
            const stackHeight = coinsInTray.length;

            // Use a consistent base offset for all coin types
            const baseYOffset = -20;
            const coinHeight = 17; // 10 pixels per coin in the stack

            // Add additional offset for stacking
            const stackOffset = stackHeight * coinHeight;
            const yOffset = baseYOffset - stackOffset;
            const newY = tray.y + this.getScaledValue(yOffset);

            // Snap coin to tray center with type-specific offset
            coin.x = tray.x;
            coin.y = newY;

            // Set the original coin's opacity to almost invisible
            coin.setAlpha(0.01);

            // Always destroy existing flat image if it exists
            if (coinData.flatImage) {
                coinData.flatImage.destroy();
                coinData.flatImage = undefined;
            }

            this.audioManager.playSoundEffect('coin-drop-on-tray');

            // Create new flat image at the new position
            const flatImageKey = `${coinData.type}_flat`;
            coinData.flatImage = this.addImage((tray.x / this.display.scale), (newY / this.display.scale), flatImageKey);
            coinData.flatImage.setScale(0.8);

            // Update the current slot for this coin
            coinData.currentTray = tray;

            // Set the depth of the coin to be higher than all other coins in the tray
            const currentDepth = this.trayDepths.get(tray) || 0;
            const newDepth = currentDepth + 1;
            coin.setDepth(newDepth);
            this.trayDepths.set(tray, newDepth);
        } else {
            // Coin is not in any slot
            if (coinData.flatImage) {
                // Destroy the flat image if it exists
                coinData.flatImage.destroy();
                coinData.flatImage = undefined;
            }
            coinData.currentTray = undefined;
            // Reset the coin's depth when it's dragged out
            coin.setDepth(0);
        }

        // After dropping the coin, check if all coins are sorted
        this.checkAllCoinsSorted();
    }

    private checkAllCoinsSorted() {
        // Check if all coins are placed in slots
        const allCoinsSorted = this.coins.every(coin => coin.currentTray !== undefined);

        // Show check button if all coins are sorted
        this.checkButton.setVisible(allCoinsSorted);
    }

    private getCoinCountText(): string {
        if (!this.currentQuestion) {
            return 'Count the coins';
        }

        const coinNames = {
            'Q': { singular: 'quarter', plural: 'quarters' },
            'D': { singular: 'dime', plural: 'dimes' },
            'N': { singular: 'nickel', plural: 'nickels' },
            'P': { singular: 'penny', plural: 'pennies' }
        };

        const parts = this.currentQuestion.operand1.split(',').map(coin => {
            const count = parseInt(coin[0]);
            const type = coin[1];
            const coinInfo = coinNames[type as keyof typeof coinNames];
            const coinName = count === 1 ? coinInfo.singular : coinInfo.plural;
            return `${count} ${coinName}`;
        });

        return parts.join(', ');
    }

    private checkCounting() {
        // Check if the total amount is correct
        let isTotalCorrect = true;
        const enteredTotal = parseInt(this.totalCentsText.text.replace(' ¢', '')) || 0;

        // Calculate the actual total
        const actualTotal = this.coins.reduce((total, coin) => total + coin.value, 0);

        if (enteredTotal !== actualTotal) {
            isTotalCorrect = false;
        }

        if (isTotalCorrect) {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: 5,
                achievedPoints: 5,
                questionText: this.getCoinCountText(),
                isCorrect: true,
                questionMechanic: 'default',
                gameLevelInfo: 'game.mini_banker.default',
                studentResponse: enteredTotal.toString() + ' ¢',
                studentResponseAccuracyPercentage: '100%',
            });

            this.questionSelector.answerCorrectly();
            this.updateScormScore();
            this.showSuccessAnimation();
        } else {
            this.showTryAgainAnimation();
        }
    }

    private checkSorting() {
        // First check if all coins are in trays
        const allCoinsInTrays = this.coins.every(coin => coin.currentTray !== undefined);

        if (!allCoinsInTrays) {
            this.showTryAgainAnimation();
            return;
        }

        let isCorrect = true;
        const slotValues = [25, 10, 5, 1];
        const incorrectCoins: Coin[] = [];

        // Check each tray
        this.trays.forEach((tray, index) => {
            const trayValue = slotValues[index];

            const coinsInTray = this.coins.filter(c => c.currentTray === tray);

            // Check if all coins in tray have correct value
            const incorrectCoinsInTray = coinsInTray.filter(coin => coin.value !== trayValue);
            if (incorrectCoinsInTray.length > 0) {
                isCorrect = false;
                incorrectCoins.push(...incorrectCoinsInTray);
            }
        });

        if (isCorrect) {
            this.questionSelector.answerCorrectly();
            this.updateScormScore();
            this.showSuccessAnimation();
        } else {
            this.showTryAgainAnimation();
            // Pop out incorrect coins
            this.popOutIncorrectCoins(incorrectCoins);
        }
    }

    private popOutIncorrectCoins(incorrectCoins: Coin[]) {
        // Group incorrect coins by their tray
        const incorrectCoinsByTray = new Map<Phaser.GameObjects.Image, Coin[]>();

        incorrectCoins.forEach(coin => {
            if (coin.currentTray) {
                const trayCoins = incorrectCoinsByTray.get(coin.currentTray) || [];
                trayCoins.push(coin);
                incorrectCoinsByTray.set(coin.currentTray, trayCoins);
            }
        });

        let isPoppingOut = false;
        // Handle each tray that has incorrect coins
        incorrectCoinsByTray.forEach((trayIncorrectCoins, tray) => {
            // Add shake animation to the tray
            this.tweens.add({
                targets: tray,
                x: tray.x + 10,
                duration: 100,
                yoyo: true,
                repeat: 3,
                ease: 'Sine.easeInOut'
            });

            // Get all coins in this tray
            const allCoinsInTray = this.coins.filter(c => c.currentTray === tray);

            // Remove incorrect coins from the tray
            trayIncorrectCoins.forEach(coin => {
                // Remove the flat image
                if (coin.flatImage) {
                    coin.flatImage.destroy();
                    coin.flatImage = undefined;
                }

                // Make the original coin visible again
                coin.image.setAlpha(1);
                // Reset the depth
                coin.image.setDepth(0);

                isPoppingOut = true;
                // Animate the coin popping out
                this.tweens.add({
                    targets: coin.image,
                    y: coin.image.y - this.getScaledValue(50), // Pop up
                    duration: 500,
                    ease: 'Bounce',
                    onComplete: () => {
                        // After popping up, scatter the coin
                        this.tweens.add({
                            targets: coin.image,
                            x: Phaser.Math.Between(this.getScaledValue(100), this.getScaledValue(this.display.width - 100)),
                            y: Phaser.Math.Between(this.getScaledValue(160), this.getScaledValue(400)),
                            duration: 500,
                            ease: 'Power2'
                        });
                    }
                });

                // Clear the tray reference
                coin.currentTray = undefined;
            });

            if (isPoppingOut) this.audioManager.playSoundEffect('coin_shake');

            // Get remaining coins in the tray
            const remainingCoins = allCoinsInTray.filter(coin =>
                !trayIncorrectCoins.includes(coin)
            );

            // Rearrange remaining coins in the stack
            const baseYOffset = -20;
            const coinHeight = 17;

            remainingCoins.forEach((coin, index) => {
                // Calculate new position
                const stackOffset = index * coinHeight;
                const yOffset = baseYOffset - stackOffset;
                const newY = tray.y + this.getScaledValue(yOffset);

                // Update position
                if (coin.flatImage) {
                    coin.flatImage.destroy();
                    coin.flatImage = this.addImage((tray.x / this.display.scale), (newY / this.display.scale), `${coin.type}_flat`).setScale(0.8);
                }

                // Update depth (index + 1 to ensure proper stacking)
                coin.image.setDepth(index + 1);
            });

            // Update the tray's maximum depth
            this.trayDepths.set(tray, remainingCoins.length);
        });
    }

    private showSuccessAnimation() {
        // Queue the announcement so it doesn't clash with other UI updates (progress bar, etc.)
        this.queueAnnouncement(i18n.t('common.wellDone'));
        this.callStartNextRoundAfterAnnouncements = true;
        this.correctRounds++;
        this.isProcessing = true;

        const width = this.display.width;
        const height = 209;
        const successContainer = this.add.container(this.getScaledValue(this.display.width / 2), this.getScaledValue(this.display.height + height / 2));

        // Create background rectangle
        const bgRect = this.addRectangle(0, 0, width, height, 0x007E11);
        successContainer.add(bgRect);

        const bgRectTop = this.addRectangle(0, -height / 2, width, 7, 0x24E13E).setOrigin(0.5, 0);
        successContainer.add(bgRectTop);

        // Create icon and text
        const feedbackContainer = this.add.container(0, 0);
        const icon = this.addImage(0, 0, 'game_correct_icon').setOrigin(0, 0.5);
        const feedbackText = this.addText(0, 0, "Well Done!", {
            font: "700 36px Exo",
        }).setOrigin(0, 0.5);

        feedbackText.setX(icon.getBounds().right + this.getScaledValue(14));

        feedbackContainer.add([icon, feedbackText]);

        feedbackContainer.setX(feedbackContainer.x - feedbackContainer.getBounds().width / 2);

        successContainer.add(feedbackContainer);

        this.audioManager.playSoundEffect('correct');
        announceToScreenReader(i18n.t('common.wellDone'));

        // Simple slide up animation
        this.tweens.add({
            targets: successContainer,
            y: this.getScaledValue(this.display.height - height / 2),
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                new ImageOverlay(this, icon, { label: i18n.t('common.correct') + ' ' + i18n.t('common.icon') });
                new TextOverlay(this, feedbackText, { label: i18n.t('common.wellDone') });
                // Wait for a moment and then slide down
                this.time.delayedCall(500, () => {
                    this.tweens.add({
                        targets: successContainer,
                        y: this.getScaledValue(this.display.height + height / 2),
                        duration: 500,
                        ease: "Power2",
                        onComplete: () => {
                            successContainer.destroy();
                        }
                    });
                });
            }
        });

        // Only start next round after announcements processed to avoid collision with progress bar
        if (!this.isAnnouncing) {
            this.startNextRound();
        } else {
            // Will be triggered by processAnnouncementQueue when queue empties
        }
    }

    private queueAnnouncement(message: string) {
        this.announcementQueue.push(message);
        this.processAnnouncementQueue();
    }

    private processAnnouncementQueue() {
        if (this.isAnnouncing || this.announcementQueue.length === 0) return;

        this.isAnnouncing = true;
        const message = this.announcementQueue.shift()!;

        announceToScreenReader(message);

        // Estimate duration and wait before processing next
        const words = message.split(' ').length;
        const estimatedDuration = (words / 2.5) * 1000; // 2.5 words per second
        const delay = Math.max(estimatedDuration + 500, 2000); // Minimum 2s

        this.time.delayedCall(delay, () => {
            this.isAnnouncing = false;
            if (this.announcementQueue.length > 0) {
                this.processAnnouncementQueue();
            } else if (this.callStartNextRoundAfterAnnouncements) {
                this.callStartNextRoundAfterAnnouncements = false;
                this.startNextRound();
            }
        });
    }

    // clearAnnouncementQueue() removed — not needed currently

    private startNextRound() {
        // Ensure progress bar is visible before drawing progress
        if (!this.progressBar.getContainer().visible) {
            this.progressBar.getContainer().setVisible(true);
        }
        this.progressBar.drawProgressFill(this.currentRound / this.totalRounds, 0);

        // Check if this was the last round
        if (this.currentRound >= this.totalRounds) {
            // Show scoreboard scene with game data
            this.time.delayedCall(2000, () => {
                this.successOverlay?.destroy();
                this.successStars?.destroy();
                this.closeDoors();
                this.time.delayedCall(1500, () => {
                    this.updateScormScore(true);
                    this.scene.start('ScoreboardScene', {
                        rounds: this.correctRounds,
                        score: this.correctRounds * 5,
                        totalRounds: this.totalRounds,
                        themeIndex: this.currentThemeIndex
                    });
                });
            });
        } else {
            // Move to next round
            this.time.delayedCall(1000, () => {
                this.successOverlay?.destroy();
                this.successStars?.destroy();
                this.currentRound++;
                this.attemptedPerRound = 0;
                this.resetGame();
                this.createCoins(this.mode === 'counting');
                this.time.delayedCall(500, () => {
                    this.isProcessing = false;
                });
            });
        }
    }

    private resetGame() {
        // Reset the input field
        if (this.totalCentsText) {
            this.totalCentsText.setStyle({ color: '#595959' });
            this.totalCentsText.text = i18n.t('game.totalCents');
            this.totalCentsTextOverlay.updateContent(i18n.t('game.totalCents'));
        }

        if (this.checkButton) {
            ButtonHelper.setButtonText(this.checkButton, i18n.t('game.check'));
            if (this.clearButton) {
                this.checkButton.setX(this.clearButton.getBounds().right + this.checkButton.width / 2 + this.getScaledValue(20));
            }
        }

        // Hide the check button
        if (this.mode === 'sorting') {
            this.checkButton.setVisible(false);
        }

        // Reset the coins
        this.resetCoins();
    }

    private resetCoins() {
        // Remove all drag events
        this.input.off('dragstart');
        this.input.off('drag');
        this.input.off('dragend');

        // Destroy all coin type text labels
        this.coinTypeTexts.forEach(text => text.destroy());
        this.coinTypeTexts = [];

        // Destroy all existing coins and their flat versions
        this.coins.forEach(coin => {
            // Remove interactivity before destroying
            if (coin.image) {
                coin.image.removeInteractive();
                coin.image.destroy();
            }
            if (coin.flatImage) {
                coin.flatImage.destroy();
            }
            // Clear the slot reference
            coin.currentTray = undefined;
        });

        // Clear the coins array
        this.coins = [];

        // Remove any off-screen DOM coin lists used for accessibility
        try {
            this.coinLists.forEach(list => {
                if (list && list.parentNode) {
                    list.parentNode.removeChild(list);
                }
            });
        } catch (e) {
            // ignore
        }
        this.coinLists = [];
    }

    private showTryAgainAnimation() {
        this.isProcessing = true;
        // Show the background overlay
        this.backgroundOverlay.setVisible(true);

        // this.audioManager.playSoundEffect('incorrect');

        // Change the check button text to "Try Again"
        ButtonHelper.setButtonText(this.checkButton, i18n.t('game.tryAgain'));

        const enteredTotal = this.totalCentsText ? parseInt(this.totalCentsText.text.replace(' ¢', '')) || 0 : 0;

        // Clear text from input
        if (this.totalCentsText && this.totalCentsTextOverlay) {
            this.totalCentsText.setStyle({ color: '#595959' });
            this.totalCentsText.text = i18n.t('game.totalCents');
            this.totalCentsTextOverlay.updateContent(i18n.t('game.totalCents'));
        }

        if (this.clearButton) {
            this.checkButton.setX(this.clearButton.getBounds().right + this.checkButton.getBounds().width / 2 + this.getScaledValue(20));
        }

        // Hide the overlay after 1 second
        this.time.delayedCall(1000, () => {
            this.backgroundOverlay.setVisible(false);
            this.time.delayedCall(500, () => {
                this.isProcessing = false;
            });
        });

        // Update the check button click handler to check coins when Try Again is clicked
        // this.checkButton.removeAllListeners('pointerdown');
        // this.checkButton.on('pointerdown', () => {
        //     if (this.mode === 'sorting') {
        //         this.checkSorting();
        //     }
        // });

        this.attemptedPerRound++;
        if (this.attemptedPerRound > 1) {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: 5,
                achievedPoints: 0,
                questionText: this.getCoinCountText(),
                isCorrect: false,
                questionMechanic: 'default',
                gameLevelInfo: 'game.mini_banker.default',
                studentResponse: enteredTotal.toString() + ' ¢',
                studentResponseAccuracyPercentage: '0%',
            });
            this.queueAnnouncement(i18n.t('common.inCorrect'));
            
            this.questionSelector.answerIncorrectly(this.currentQuestion!);
            this.startNextRound();
        } else {
            this.queueAnnouncement(i18n.t('game.tryAgain'));
        }
    }

    private createPauseButton() {
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.PAUSE_ICON.KEY,
            label: i18n.t('common.pause'),
            x: this.display.width - 54,
            y: 64,
            onClick: () => {
                this.scene.pause();
                this.scene.launch("PauseScene", { parentScene: "GameScene" });
                this.audioManager.pauseAll();
            },
        }).setName('pause_btn').setDepth(1);
    }

    private createMuteButton() {
        this.muteButton = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            x: this.display.width - 54,
            y: 142,
            onClick: () => this.toggleMute()
        }).setDepth(1);

        const handleMuteBtnUpdate = () => {
            const muteBtnItem = this.muteButton.getAt(1) as Phaser.GameObjects.Sprite;
            muteBtnItem.setTexture(this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);

            // Update mute button state
            const label = this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
            const overlay = (this.muteButton as any).buttonOverlay as ButtonOverlay;
            const muteBtnState = this.muteButton.getData('state');
            if(muteBtnState != label) {
                this.muteButton.setData('state', label);
                overlay.setLabel(label);
            }
        }
        // Add update event listener to the mute button
        this.events.on("update", handleMuteBtnUpdate);
        // Remove event listener when mute button is destroyed
        this.muteButton.on("destroy", () => {
            this.events.off("update", handleMuteBtnUpdate);
        });
    }

    private toggleMute() {
        this.audioManager.setMute(!this.audioManager.getIsAllMuted());
        const icon = this.muteButton.getAt(1) as Phaser.GameObjects.Image;
        icon.setTexture(this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);
    }

    private createSettingsButton() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 210, 238, 'blue', i18n.t('common.volume'));
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
            y: 220,
            onClick: () => this.volumeSlider.toggleControl(),
        }).setDepth(1);
    }

    private createHelpButton() {
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.HELP_ICON.KEY,
            label: i18n.t('common.help'),
            x: this.display.width - 54,
            y: 300,
            onClick: () => {
                this.scene.pause();
                this.scene.launch("InfoScene", { parentScene: "GameScene", mode: this.mode });
                this.scene.bringToTop("InfoScene");
            },
        }).setDepth(1);
    }

    private createCoinListsForScreenReader(generatedCoins: { type: CoinType, value: number, count: number }[]) {
        // Create TextOverlay elements for each coin group (a11y)
        // This ensures the lists appear in the correct navigation order after the help button
        generatedCoins.forEach(({ type, value: _value, count }) => {
            // Create an invisible text object as the target for TextOverlay
            const hiddenText = this.addText(-1000, -1000, '', {
                fontSize: '1px',
                color: 'transparent'
            }).setVisible(false);

            // Build the list items array
            const listItems = [];
            for (let i = 0; i < count; i++) {
                listItems.push(`${i18n.t(`common.${type}`)} ${i + 1}`);
            }

            // Get coin value for better accessibility
            const coinName = i18n.t(`info.${type}`);

            // Create TextOverlay with proper list structure
            const overlay = new TextOverlay(this, hiddenText, {
                label: `${coinName}`,
                listItems: listItems,
                ariaLive: 'off',
                style: {
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    margin: '-1px',
                    padding: '0',
                    border: '0',
                    clip: 'rect(0 0 0 0)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                }
            });

            // Store references for cleanup
            this.coinLists.push(overlay.element);
        });
    }

    private resetGameState() {
        // Reset only state variables
        this.currentRound = 1;
        this.correctRounds = 0;
        this.attemptedPerRound = 0;
        this.coins = [];
        this.trays = [];
        this.trayDepths = new Map();
        this.isProcessing = false;
        this.questionSelector.reset(true);
    }

    update() {
    }

    shutdown() {
        this.audioManager.stopAllSoundEffects();
    }

    private updateScormScore(isEndGame: boolean = false) {
        try {
            scormService.setScore(this.correctRounds * 5, 0, isEndGame ? this.totalRounds * 5 : undefined);
            if (isEndGame) {
                const isMastery = Math.round((this.correctRounds / this.totalRounds) * 100) > 70;
                scormService.setStatus(isMastery ? 'passed' : 'failed');
            }
        } catch (error) {
            console.warn('Failed to update SCORM score:', error);
        }
    }
}
