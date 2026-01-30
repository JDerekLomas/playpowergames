import { AnalyticsHelper, BaseScene, ButtonHelper, i18n, ScoreboardHelper, setSceneBackground, VolumeSlider } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, SUCCESS_TEXT_KEYS } from '../config/common';

export class ScoreboardScene extends BaseScene {
    private scoreboardHelper: ScoreboardHelper;
    private volumeSlider!: VolumeSlider;
    private muteBtn!: Phaser.GameObjects.Container;

    constructor() {
        super('ScoreboardScene');
        this.audioManager.initialize(this);
        this.scoreboardHelper = new ScoreboardHelper(this, i18n, SUCCESS_TEXT_KEYS);
    }

    create(data: {
        scoreData: { correctAnswers: number; totalQuestions: number };
        score: number;
    }) {
        this.registry.set('isGameCompleted', true);

        setSceneBackground('assets/images/scoreboard/scoreboard_screen_bg.png', true);
        this.addImage(this.display.width / 2, this.display.height / 2, 'scoreboard_screen_bg').setOrigin(0.5);
        this.audioManager.initialize(this);

        this.addRectangle(this.display.width / 2, this.display.height / 2, this.display.width, this.display.height, 0x000000, 0.5);
        this.scoreboardHelper.createTextBlock(data.scoreData.correctAnswers, data.scoreData.totalQuestions, () => {
            this.scoreboardHelper.createMainBoard(data.score, data.scoreData.correctAnswers, data.scoreData.totalQuestions, 10);
            const playAgainButton = this.scoreboardHelper.createPlayAgainButton({
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            }, data.scoreData.correctAnswers === data.scoreData.totalQuestions, () => {
                this.audioManager.stopAllSoundEffects();
                this.scene.stop();
                this.scene.start("GameScene", { reset: true });
                const analyticsHelper = AnalyticsHelper.getInstance();
                if (analyticsHelper) {
                    analyticsHelper.endLevelSession(true);
                }
            });

            const buttonContainer = this.add.container(
                this.getScaledValue(this.display.width / 2),
                this.getScaledValue(this.display.height - 80),
            )

            playAgainButton.setPosition(playAgainButton.width / 2, 0);

            buttonContainer.add(playAgainButton);

            const backToMapButton = this.createBackToMultiverseButton();
            backToMapButton.setPosition(backToMapButton.width / 2, 0);

            const x_position = 3 * playAgainButton.width / 2 + this.getScaledValue(36);
            backToMapButton.setPosition(x_position, 0);
            buttonContainer.add(backToMapButton);
            const buttonContainerWidth = backToMapButton.getBounds().right - playAgainButton.getBounds().left;
            buttonContainer.setSize(buttonContainerWidth, backToMapButton.height);
            buttonContainer.setX(this.getScaledValue(this.display.width / 2) - buttonContainerWidth / 2);

            // recreate button overlay
            const playAgainButtonOverlay = (playAgainButton as any).buttonOverlay;
            playAgainButtonOverlay?.recreate();
            const backToMapButtonOverlay = (backToMapButton as any).buttonOverlay;
            backToMapButtonOverlay?.recreate();
        });

        // Create mute and volume controls
        this.createMuteButton();
        this.createVolumeControls();

        this.events.on('shutdown', () => {
            this.audioManager.stopAllSoundEffects();
        });
    }

    init() {
        ScoreboardHelper.init(this);
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/scoreboard`);
        scene.load.image('scoreboard_screen_bg', 'scoreboard_screen_bg.png');

        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.BUTTON_HOVER.KEY, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.BUTTON_PRESSED.KEY, BUTTONS.BUTTON_PRESSED.PATH);

        scene.load.setPath(`${BUTTONS.PURPLE_PATH}`);
        scene.load.image(`${BUTTONS.BUTTON.KEY}_purple`, BUTTONS.BUTTON.PATH);
        scene.load.image(`${BUTTONS.BUTTON_HOVER.KEY}_purple`, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(`${BUTTONS.BUTTON_PRESSED.KEY}_purple`, BUTTONS.BUTTON_PRESSED.PATH);
        
        // Preload volume slider assets
        VolumeSlider.preload(scene, 'purple');
        
        ScoreboardHelper._preload(scene);
    }

    private createBackToMultiverseButton() {
        const handleClick = () => {
            this.audioManager.stopAllSoundEffects();
            this.audioManager.stopBackgroundMusic();
            this.scene.stop('ScoreBoard');

            const analyticsHelper = AnalyticsHelper.getInstance();
            if (analyticsHelper) {
                analyticsHelper.endLevelSession();
            }

            if (this.registry.get('isGameCompleted') === true) {
                window.parent.postMessage({ 
                    type: 'GAME_COMPLETED',
                    gameName: 'slingshot'
                }, '*');
            }

            window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
        };

        const backToMapButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: `${BUTTONS.BUTTON.KEY}_purple`,
                hover: `${BUTTONS.BUTTON_HOVER.KEY}_purple`,
                pressed: `${BUTTONS.BUTTON_PRESSED.KEY}_purple`
            },
            imageScale: 1,
            text: i18n.t('scoreboard.backToMultiverse'),
            label: i18n.t('scoreboard.backToMultiverse'),
            textStyle: {
                font: '700 32px Exo',
                color: '#ffffff',
            },
            x: 0,
            y: 0,
            onClick: handleClick,
        });

        return backToMapButton;
    }

    private createMuteButton() {
        this.muteBtn = ButtonHelper.createIconButton({
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
            y: 64,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });
        this.muteBtn.setDepth(1);
    }

    private createVolumeControls() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(
            this.display.width - 210,
            160,
            'purple',
            i18n.t('common.volume')
        );

        const volumeBtn = ButtonHelper.createIconButton({
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
        volumeBtn.setDepth(1);
    }

    update(): void {
        // Update mute button icon
        if (this.muteBtn) {
            const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
            if (this.audioManager.getIsAllMuted()) {
                muteBtnItem.setTexture(BUTTONS.MUTE_ICON.KEY);
            } else {
                muteBtnItem.setTexture(BUTTONS.UNMUTE_ICON.KEY);
            }
        }
    }
}
