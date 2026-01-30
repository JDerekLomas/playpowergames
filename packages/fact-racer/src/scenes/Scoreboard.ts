import { BaseScene, ButtonHelper, i18n, VolumeSlider, setSceneBackground, ScoreboardHelper, GameConfigManager, TextOverlay, ButtonOverlay, AnalyticsHelper } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, MULTIVERSE_TOPICS, SUCCESS_TEXT_KEYS } from '../config/common';

interface PlayerRanking {
    name: string;
    spaceship: string;
    x: number;
    isUser?: boolean;
}

interface ScoreboardData {
    rounds: number;
    totalRounds: number;
    score: number;
    rankings: PlayerRanking[];
}

export class ScoreboardScene extends BaseScene {
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private scoreboardHelper!: ScoreboardHelper;
    private gameData!: ScoreboardData;

    constructor() {
        super('Scoreboard');
        this.scoreboardHelper = new ScoreboardHelper(this, i18n, SUCCESS_TEXT_KEYS, 'fact_racer');
    }

    init(data: ScoreboardData) {
        this.gameData = data;

        ScoreboardHelper.init(this);
    }

    create() {
        this.registry.set('isGameCompleted', true);
        setSceneBackground('assets/images/scoreboard/scoreboard_screen_bg.png', true);
        this.audioManager.initialize(this);
        this.addImage(this.display.width / 2, this.display.height / 2, 'scoreboard_screen_bg').setOrigin(0.5).setDepth(-2);

        this.scoreboardHelper.createTextBlock(this.gameData.rounds, this.gameData.totalRounds, () => {
            this.scoreboardHelper.createMainBoard(this.gameData.score, this.gameData.rounds, this.gameData.totalRounds, 10);
            const playAgainButton = this.scoreboardHelper.createPlayAgainButton({
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            }, this.gameData.rounds === this.gameData.totalRounds, () => {
                this.scene.start('GameScene', { reset: true });
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
        if (this.shouldShowMultiverseButton()) {
            const backToMapButton = this.createBackToMultiverseButton();
            backToMapButton.setPosition(backToMapButton.width / 2, 0);
            buttonContainer.add(backToMapButton);
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
        } else {
            // Only Play Again button: center it
            const bounds = playAgainButton.getBounds();
            const width = bounds.right - bounds.left;
            const height = bounds.bottom - bounds.top;
            buttonContainer.setSize(width, height);
            buttonContainer.setX(this.getScaledValue(this.display.width / 2) - width / 2);
            // Optional: ensure overlay matches after size/position changes
            const playAgainButtonOverlay = (playAgainButton as any).buttonOverlay;
            playAgainButtonOverlay?.recreate?.();
        }
        });

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
        this.volumeSlider.create(this.display.width - 220, 160, 'blue', i18n.t('common.volume'));
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

        this.events.on('shutdown', () => {
            this.audioManager.stopAllSoundEffects();
        });
    }

    public createLeaderboard(container: Phaser.GameObjects.Container) {
        const rankingsText = this.addText(-300, -168, i18n.t('scoreboard.rankings'), {
            font: "600 18px Exo"
        }).setOrigin(0, 0.5);
        container.add(rankingsText);

        const rowStartX = -300;
        const rowStartY = -125;
        const rowGap = 45;
        const rankings: PlayerRanking[] = this.gameData.rankings;

        rankings.forEach((r, idx) => {
            this.createPlayerRow(rowStartX, rowStartY + idx * rowGap, idx + 1, r.name, r.spaceship, container, r.isUser);
        });

        const pointsSideBg = this.addImage(172, -80, 'points_side_bg').setOrigin(0.5);
		container.add(pointsSideBg);
	}

    private createPlayerRow(x: number, y: number, rank: number, name: string, spaceship: string, container: Phaser.GameObjects.Container, isUser?: boolean) {
        const row = this.add.container(this.getScaledValue(x), this.getScaledValue(y));

        if (isUser) {
            const bgKey = rank === this.gameData.rankings.length ? 'user_row_bg_last' : 'user_row_bg';
            row.add(this.addImage(-21, -4, bgKey).setOrigin(0, 0.5));
        }

        const rankText = this.addText(0, 0, `${i18n.t(`scoreboard.rank${rank}`)}`, { 
            font: isUser ? '700 23px Exo' : '700 18px Exo',
            color: isUser ? '#FFD025' : '#FFFFFF'
        }).setOrigin(0, 0.5);
        row.add(rankText);

        const shipImg = this.addImage(91, -4, spaceship).setOrigin(0, 0.5).setScale(0.4);
        row.add(shipImg);

        const nameText = this.addText(141, 0, name, { 
            font: isUser ? '600 20px Exo' : '600 16px Exo',
            color: isUser ? '#FFD025' : '#FFFFFF'
        }).setOrigin(0, 0.5);
        row.add(nameText);

        container.add(row);

        new TextOverlay(this, rankText, { label: `${i18n.t(`scoreboard.rank${rank}`)}` });
        new TextOverlay(this, nameText, { label: name });
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
                    gameName: 'fact_racer'
                }, '*');
            }

            window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
        };

        const backToMapButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            },
            imageScale: 1,
            text: i18n.t('common.backToMultiverse'),
            label: i18n.t('common.backToMultiverse'),
            textStyle: {
                font: '700 30px Exo',
                color: '#ffffff',
            },
            x: 0,
            y: 0,
            onClick: handleClick,
        });

        return backToMapButton;
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/scoreboard`);
        scene.load.image('scoreboard_screen_bg', 'scoreboard_screen_bg.png');
        // Load custom main board background to override the default one
        scene.load.image('main_board_bg', 'main_board_bg.png');
        scene.load.image('board_progress_bg', 'board_progress_bg.png');
        scene.load.image('points_bg', 'points_bg.png');
        scene.load.image('points_side_bg', 'points_side_bg.png');
        scene.load.image('user_row_bg', 'user_row_bg.png');
        scene.load.image('user_row_bg_last', 'user_row_bg_last.png');
        scene.load.image('board_progressbar_bg', 'board_progressbar_bg.png');
        ScoreboardHelper._preload(scene, 'fact_racer');
        // Button assets (ensure available even if scoreboard loads first)
        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.ICON_BTN.KEY, BUTTONS.ICON_BTN.PATH);
        scene.load.image(BUTTONS.ICON_BTN_HOVER.KEY, BUTTONS.ICON_BTN_HOVER.PATH);
        scene.load.image(BUTTONS.ICON_BTN_PRESSED.KEY, BUTTONS.ICON_BTN_PRESSED.PATH);
        scene.load.image(BUTTONS.ICON_BTN_DISABLED.KEY, BUTTONS.ICON_BTN_DISABLED.PATH);
        scene.load.image(BUTTONS.MUTE_ICON.KEY, BUTTONS.MUTE_ICON.PATH);
        scene.load.image(BUTTONS.UNMUTE_ICON.KEY, BUTTONS.UNMUTE_ICON.PATH);
        scene.load.image(BUTTONS.SETTINGS_ICON.KEY, BUTTONS.SETTINGS_ICON.PATH);
        // Full-size button assets (match MainMenu usage)
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.BUTTON_HOVER.KEY, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.BUTTON_PRESSED.KEY, BUTTONS.BUTTON_PRESSED.PATH);
        // Generic blue button assets (fallback if constants differ)
        scene.load.setPath('assets/components/button/images/blue');
        scene.load.image('btn_default', 'btn_default.png');
        scene.load.image('btn_hover', 'btn_hover.png');
        scene.load.image('btn_pressed', 'btn_pressed.png');
        scene.load.setPath('assets/components/button/audios');
        scene.load.audio('button_click', 'button_click.mp3');
        VolumeSlider.preload(scene, 'blue');
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

    // Topic-based logic mirroring MainMenu implementation
    private shouldShowMultiverseButton(): boolean {
        try {
            const gameConfigManager = GameConfigManager.getInstance();
            const topic = gameConfigManager.get('topic');
            if (topic && MULTIVERSE_TOPICS.includes(topic)) return true;
        } catch {
            return false;
        }
        return false;
    }
}
