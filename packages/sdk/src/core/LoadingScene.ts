import { COMMON_ASSETS } from '../config/common';
import { ASSETS_PATHS } from '../config/common';
import { GameConfigManager } from '../utils/GameConfigManager';
import { ImageOverlay } from '../utils/ImageOverlay';
import { TextOverlay } from '../utils/TextOverlay';
import { BaseScene } from './BaseScene';

export class LoadingScene {
    private static instance: LoadingScene;
    private progressBar!: Phaser.GameObjects.Image;
    private progressBarMask!: Phaser.GameObjects.Graphics;
    private progressBarWidth!: number;
    private progressBarHeight: number = 20; // Adjust as needed or get from image
    private lang: string = 'en';

    constructor() {
    }

    private setupLoadingBar(scene: BaseScene) {
        const loadingBar = scene.add.container(
            scene.getScaledValue(scene.display.width / 2),
            scene.getScaledValue(scene.display.height - 132)
        );
        const loadingBarText = scene.addText(0, 0, this.lang === 'en' ? 'Loading...' : 'Cargando...', {
            fontFamily: 'Exo',
            fontSize: 24,
            color: '#ffffff',
        }).setOrigin(0.5);
        loadingBar.add(loadingBarText);
        new TextOverlay(scene, loadingBarText, { label: this.lang === 'en' ? 'Loading...' : 'Cargando...' });

        loadingBar.add(scene.addImage(0, 38, 'loading_bar_base').setOrigin(0.5));
        // Position the progress bar to start from the left edge of the container
        this.progressBarWidth = scene.textures.get('loading_bar_progress').getSourceImage().width;
        this.progressBarHeight = scene.textures.get('loading_bar_progress').getSourceImage().height;
        this.progressBar = scene.addImage(-this.progressBarWidth / 2, 36, 'loading_bar_progress')
            .setOrigin(0, 0.5);  // Keep origin at left side
        loadingBar.add(this.progressBar);
        new ImageOverlay(scene, this.progressBar, { label: this.lang === 'en' ? 'Loading Bar' : 'Barra de Carga' });

        // Create the mask graphics
        this.progressBarMask = scene.add.graphics();
        this.progressBarMask.setVisible(false);
        this.progressBar.setMask(new Phaser.Display.Masks.GeometryMask(scene, this.progressBarMask));

        // Initialize mask to 0 width
        this.updateProgressBarMask(0, scene);
        loadingBar.add(scene.addImage(0, 38, 'loading_bar_bg').setOrigin(0.5));
    }

    private updateProgressBarMask(progress: number, scene: BaseScene) {
        if (!this.progressBarMask) return;

        const matrix = this.progressBar.getWorldTransformMatrix();
        const fillX = matrix.tx;
        const fillY = matrix.ty;
        const fillHeight = this.progressBarHeight;

        this.progressBarMask.clear();
        const width = this.progressBarWidth * progress;

        if (width > 0) {
            this.progressBarMask.fillStyle(0xffffff);
            this.progressBarMask.fillRect(fillX, fillY - scene.getScaledValue(fillHeight / 2 - 3.5), scene.getScaledValue(width), scene.getScaledValue(fillHeight - 3));
        }
    }

    private setupProgressEvents(scene: BaseScene, nextScene: string, data?: object) {
        scene.load.on('progress', (progress: number) => {
            this.updateProgressBarMask(progress, scene);
        });

        scene.load.on('complete', () => {
            scene.scene.start(nextScene, data);
        });
    }

    static getInstance(): LoadingScene {
        if (!LoadingScene.instance) {
            LoadingScene.instance = new LoadingScene();
        }
        return LoadingScene.instance;
    }

    public init(scene: BaseScene, nextScene: string, data?: object, bgKey?: string) {
        const gameConfigManager = GameConfigManager.getInstance();
        const lang = gameConfigManager.get('lang') || 'en';
        if (lang) {
            this.lang = lang;
        }

        scene.addImage(
            scene.display.width / 2,
            scene.display.height / 2,
            bgKey || COMMON_ASSETS.BACKGROUND.KEY,
        ).setOrigin(0.5);

        const logo = scene.addImage(
            scene.display.width / 2,
            360,
            COMMON_ASSETS.LOGO.KEY,
        ).setOrigin(0.5);
        new ImageOverlay(scene, logo, { label: 'Playpower Labs'})

        const loadingScene = LoadingScene.getInstance();

        loadingScene.setupLoadingBar(scene);
        loadingScene.setupProgressEvents(scene, nextScene, data);
    }

    static preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${COMMON_ASSETS.PATH}`);
        scene.load.image(COMMON_ASSETS.BACKGROUND.KEY, COMMON_ASSETS.BACKGROUND.PATH);
        scene.load.image(COMMON_ASSETS.LOGO.KEY, COMMON_ASSETS.LOGO.PATH);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/loading_screen`);
        scene.load.image('loading_bar_bg', 'loading_bar_bg.png');
        scene.load.image('loading_bar_base', 'loading_bar_base.png');
        scene.load.image('loading_bar_progress', 'loading_bar_progress.png');

        scene.load.setPath(`${ASSETS_PATHS.COMPONENTS}/button/audios`);
        scene.load.audio('button_click', 'button_click.mp3');
    }
}