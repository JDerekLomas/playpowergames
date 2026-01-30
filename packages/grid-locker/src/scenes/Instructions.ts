import { announceToScreenReader, BaseScene, focusToGameContainer, GameConfigManager, i18n, TextOverlay } from '@k8-games/sdk';
import { FourQuadrant } from '../mechanic/FourQuadrant';
import { FirstQuadrant } from '../mechanic/FirstQuadrant';
import { LinearEquation } from '../mechanic/LinearEquation';
import { MultiLinearEquation } from '../mechanic/MultiLinearEquation';

export class InstructionsScene extends BaseScene {
    private firstQuadrant!: FirstQuadrant;
    private fourQuadrant!: FourQuadrant;
    private linearEquation!: LinearEquation;
    private multiLinearEquation!: MultiLinearEquation;
    private parentScene: string = 'SplashScene';
    private topic: string;
    private gameConfigManager!: GameConfigManager;

    constructor() {
        super('InstructionsScene');
        this.gameConfigManager = GameConfigManager.getInstance();
        this.topic = this.gameConfigManager.get('topic') || 'g6_t2_integers_and_coordinate';
    }

    static _preload(scene: BaseScene) {
        FourQuadrant._preload(scene);
        FirstQuadrant._preload(scene);
        LinearEquation._preload(scene);
        MultiLinearEquation._preload(scene);
    }

    init(data: { parentScene?: string } = {}) {
        this.parentScene = data.parentScene || 'SplashScene';
        if (this.topic === 'g6_t2_integers_and_coordinate') {
            this.fourQuadrant = new FourQuadrant(this, true, this.parentScene);
            this.fourQuadrant.init();
        } else if (this.topic === 'g5_t10_numbers_and_coordinate') {
            this.firstQuadrant = new FirstQuadrant(this, true, this.parentScene);
            this.firstQuadrant.init();
        } else if (this.topic === 'g8_t2_linear_equation') {
            this.linearEquation = new LinearEquation(this, true, this.parentScene);
            this.linearEquation.init();
        } else if (this.topic === 'g8_t5') {
            this.multiLinearEquation = new MultiLinearEquation(this, true, this.parentScene);
            this.multiLinearEquation.init();
        } else {
            this.fourQuadrant.init();
        }
    }

    create() {
        if (this.parentScene === 'GameScene') {
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                announceToScreenReader(i18n.t('info.helpPage'));
            })
        }

        const howToPlayText = this.addText(this.display.width / 2, 50, i18n.t('info.howToPlay'), {
            font: '700 30px Exo',
        }).setOrigin(0.5).setDepth(1);
        new TextOverlay(this, howToPlayText, { label: i18n.t('info.howToPlay'), tag: 'h1', role: 'heading' });
        if (this.topic === 'g6_t2_integers_and_coordinate') {
            this.fourQuadrant.create();
        } else if (this.topic === 'g5_t10_numbers_and_coordinate') {
            this.firstQuadrant.create();
        } else if (this.topic === 'g8_t2_linear_equation') {
            this.linearEquation.create();
        } else if (this.topic === 'g8_t5') {
            this.multiLinearEquation.create();
        } else {
            this.fourQuadrant.create();
        }
    }

    override update(): void {
        if (this.topic === 'g6_t2_integers_and_coordinate') {
            this.fourQuadrant.update();
        } else if (this.topic === 'g5_t10_numbers_and_coordinate') {
            this.firstQuadrant.update();
        } else if (this.topic === 'g8_t2_linear_equation') {
            this.linearEquation.update();
        } else if (this.topic === 'g8_t5') {
            this.multiLinearEquation.update();
        } else {
            this.fourQuadrant.update();
        }
    }
}
