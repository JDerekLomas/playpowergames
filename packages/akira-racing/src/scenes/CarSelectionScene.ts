import { BaseScene, ButtonHelper, i18n, TextOverlay } from "@k8-games/sdk";
import { BUTTONS, CARS } from "../config/common";

export class CarSelectionScene extends BaseScene {
    private selectedCar: string = 'red';
    private carTitle!: Phaser.GameObjects.Text;
    private carTitleOverlay!: TextOverlay;
    private carImage!: Phaser.GameObjects.Image;
    
    constructor() {
        super('CarSelectionScene');
    }

    init() {
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath('assets/images/car_selection_screen');
        scene.load.image('car_selection_bg', 'car_selection_bg.png');
        scene.load.image('left_arrow', 'left_arrow.png');
        scene.load.image('right_arrow', 'right_arrow.png');
        scene.load.image('red_car_select', 'red_car_select.png');
        scene.load.image('yellow_car_select', 'yellow_car_select.png');
        scene.load.image('pink_car_select', 'pink_car_select.png');
    }

    create() {
        this.addImage(this.display.width / 2, this.display.height / 2, 'car_selection_bg').setOrigin(0.5);

        const title = this.addText(this.display.width / 2, 60, i18n.t('game.selectCar'), {
            font: "700 30px Exo",
        }).setOrigin(0.5);
        new TextOverlay(this, title, { label: i18n.t('game.selectCar'), tag: 'h1', role: 'heading' })

        this.carTitle = this.addText(this.display.width / 2, 146, '', {
            font: "700 60px Exo",
            stroke: '#000000',
            strokeThickness: 12
        }).setOrigin(0.5);
        this.carTitleOverlay = new TextOverlay(this, this.carTitle, { label: '' })
        this.updateCarTitle(this.selectedCar);

        this.carImage = this.addImage(this.display.width / 2, 552, 'red_car_select').setOrigin(0.5, 1);

        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: 'left_arrow',
            x: this.display.width / 2 - 450,
            y: this.display.height / 2,
            label: i18n.t('common.previousCar'),
            onClick: () => {
                this.selectPreviousCar();
            }
        });

        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: 'right_arrow',
            x: this.display.width / 2 + 450,
            y: this.display.height / 2,
            label: i18n.t('common.nextCar'),
            onClick: () => {
                this.selectNextCar();
            }
        });

        ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            x: this.display.width / 2,
            y: this.display.height - 76,
            text: i18n.t('common.select'),
            textStyle: {
                font: "700 32px Exo"
            },
            label: i18n.t('common.select'),
            onClick: () => {
                this.registry.set('selected_car', this.selectedCar);
                this.scene.start('InstructionsScene', { parentScene: 'CarSelectionScene' });
            }
        });
    }

    private selectNextCar() {
        const currentIndex = CARS.findIndex(car => car.KEY === this.selectedCar);
        const nextIndex = (currentIndex + 1) % CARS.length;
        this.selectedCar = CARS[nextIndex].KEY;
        this.updateCarDisplay();
    }

    private selectPreviousCar() {
        const currentIndex = CARS.findIndex(car => car.KEY === this.selectedCar);
        const previousIndex = currentIndex === 0 ? CARS.length - 1 : currentIndex - 1;
        this.selectedCar = CARS[previousIndex].KEY;
        this.updateCarDisplay();
    }

    private updateCarDisplay() {
        this.carImage.setTexture(`${this.selectedCar}_car_select`);
        this.updateCarTitle(this.selectedCar);
    }

    private updateCarTitle(key: string) {
        const lang = i18n.getLanguage() || 'en';
        const car = CARS.find(car => car.KEY === key);
        if (car) {
            this.carTitle.setText(lang === 'en' ? car.NAME_EN : car.NAME_ES);
            this.carTitle.setColor(car.COLOR);
            this.carTitleOverlay.updateContent(lang === 'en' ? car.NAME_EN : car.NAME_ES);
        }
    }
}