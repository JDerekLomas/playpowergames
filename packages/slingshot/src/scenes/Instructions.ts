import { announceToScreenReader, BaseScene, ButtonHelper, focusToGameContainer, i18n, TextOverlay } from "@k8-games/sdk";
import { Slingshot } from "../Slingshot";
import { ASSETS_PATHS, BUTTONS } from "../config/common";

export class InstructionsScene extends BaseScene {
    private slingshot: Slingshot;
    private parentScene: string = 'SplashScene';
    private isSkipped: boolean = false;

    constructor() {
        super("InstructionsScene");
        this.slingshot = new Slingshot(this, true);
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || "en";
        Slingshot._preload(scene);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image('hand', 'hand.png');
        scene.load.image('hand_click', 'hand_click.png');
        scene.load.image('top_layer_instruction', 'top_layer_instruction.png');

        // Load tutorial audio files
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        scene.load.audio('step_1', `step_1_${lang}.mp3`);
        scene.load.audio('step_2', `step_2_${lang}.mp3`);
        scene.load.audio('step_3', `step_3_${lang}.mp3`);

        scene.load.setPath(`${BUTTONS.PURPLE_PATH}`);
        scene.load.image(BUTTONS.HALF_BUTTON.KEY, BUTTONS.HALF_BUTTON.PATH);
        scene.load.image(BUTTONS.HALF_BUTTON_HOVER.KEY, BUTTONS.HALF_BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.HALF_BUTTON_PRESSED.KEY, BUTTONS.HALF_BUTTON_PRESSED.PATH);
    }

    init(data: { reset?: boolean, parentScene: string }) {
        if (data.parentScene) {
            this.parentScene = data.parentScene;
        }
        this.slingshot.init(data);
        this.slingshot.isSkipped = false;
    }

    create() {
        // Iframe label announcement support
        const inIframe = this.isInsideIframe();
        if (this.parentScene === 'GameScene') {
            if (inIframe) {
                window.parent.postMessage({
                    type: 'UPDATE_IFRAME_LABEL',
                    label: i18n.t('info.helpPage')
                }, '*');
            }
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                this.announceToScreenReaderIframeAware(i18n.t('info.helpPage'));
            });
        }

        this.addImage(this.display.width / 2, 75, 'top_layer_instruction').setOrigin(0.5);
        const howToPlayText = this.addText(this.display.width / 2, 55, i18n.t('info.howToPlay'), {
            font: "700 30px Exo",
            color: '#FFFFFF',
        }).setOrigin(0.5).setDepth(1);
        new TextOverlay(this, howToPlayText, { 
            label: i18n.t('info.howToPlay'),
            tag: 'h1',
            role: 'heading'
        });
        const howToPlayDescriptionText = this.addText(this.display.width / 2, 120, i18n.t('info.howToPlayDescription'), {
            font: "400 24px Exo",
            color: '#FFFFFF',
        }).setOrigin(0.5).setDepth(1);
        new TextOverlay(this, howToPlayDescriptionText, { 
            label: i18n.t('info.howToPlayDescription'),
            tag: 'h2',
            role: 'heading'
        });

        this.createSkipButton();

        this.slingshot.create();
        // Load tutorial question
        this.slingshot.loadTutorialQuestion();

        // Always announce the question after initial setup
        // Delay longer if coming from GameScene to avoid collision with "help page" announcement
        const questionDelay = this.parentScene === 'GameScene' ? 1500 : 500;
        this.time.delayedCall(questionDelay, () => {
            const question = this.slingshot['question'];
            if (question) {
                const operatorMap: Record<string, string> = {
                    '+': 'plus',
                    '−': 'minus',
                    '-': 'minus',
                    '×': 'times',
                    '÷': 'divided by'
                };
                const spokenOperator = operatorMap[question.operator] || question.operator;
                const questionText = `${question.operand1} ${spokenOperator} ${question.operand2} equals`;
                this.announceToScreenReaderIframeAware(i18n.t('accessibility.questionAnnouncement', { 
                    question: questionText, 
                    instructions: i18n.t('accessibility.gameInstructions') 
                }), 'polite');
            }
        });

        // Initially disable slingshot interactions
        this.slingshot.setInteractionsEnabled(false);

        // Set up projectile event handling for instruction mode
        this.setupProjectileEvents();

        this.time.delayedCall(1000, () => {
            this.slingshot.playStep1();
        });
    }

    private createSkipButton() {
        ButtonHelper.createButton({
            scene: this,
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
            x: this.display.width - 54,
            y: 60,
            onClick: () => {
                if (this.isSkipped) return;
                this.audioManager.stopAllSoundEffects();
                this.slingshot.isSkipped = true;
                this.startGameScene();
            }
        }).setDepth(1);
    }

    public startGameScene() {
        // Iframe label reset support
        const inIframe = this.isInsideIframe();
        if (inIframe && this.parentScene === 'GameScene') {
            window.parent.postMessage({
                type: 'UPDATE_IFRAME_LABEL',
                label: 'Game'
            }, '*');
        }
        if (this.parentScene === 'SplashScene') {
            this.audioManager.stopAllSoundEffects();
            this.scene.stop('InstructionsScene');
            this.scene.start('GameScene');
        } else {
            // Re-enable drum overlays focusability when returning to GameScene
            const gameScene = this.scene.get('GameScene') as any;
            if (gameScene?.slingshot) {
                gameScene.slingshot.enableDrumOverlaysFocusability();
            }
            
            this.scene.stop('InstructionsScene');
            this.scene.resume('GameScene');
            this.audioManager.resumeAll();
        }
    }
    // Helper to check if inside an iframe
    private isInsideIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            // Cross-origin error means we're in an iframe
            return true;
        }
    }

    private announceToScreenReaderIframeAware(message: string, ariaLive?: 'off' | 'polite' | 'assertive') {
        const inIframe = this.isInsideIframe();
        
        if (inIframe) {
            // Send announcement to parent frame via postMessage
            window.parent.postMessage({
                type: 'ANNOUNCE_TO_SCREEN_READER',
                message: message,
                ariaLive: ariaLive || 'assertive'
            }, '*');
        } else {
            // Use standard SDK announcement for standalone game
            announceToScreenReader(message, ariaLive);
        }
    }

    private setupProjectileEvents(): void {
        // Set up global pointer down event
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Check if click is on projectile
            const projectile = this.slingshot.getProjectile();
            if (projectile && this.isPointerOverProjectile(pointer, projectile)) {
                this.slingshot.handlePointerDown(pointer);
            }
        });

        // Set up global pointer move event
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            this.slingshot.handlePointerMove(pointer);
        });

        // Set up global pointer up event
        this.input.on('pointerup', () => {
            this.slingshot.handlePointerUp();
        });
    }

    private isPointerOverProjectile(pointer: Phaser.Input.Pointer, projectile: Phaser.GameObjects.Image): boolean {
        const projectileX = projectile.x;
        const projectileY = projectile.y;
        const distance = Phaser.Math.Distance.Between(pointer.x, pointer.y, projectileX, projectileY);
        
        // Check if pointer is within 30 pixels of projectile center
        return distance <= 30;
    }
}
