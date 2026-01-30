import { BaseScene, i18n, ImageOverlay, TextOverlay } from "@k8-games/sdk";
import { COMMON_ASSETS } from "../config/common";

export class SortingInfo {
    constructor() {
    }

    public static createInfoModal(scene: BaseScene) {
        const sceneContainer = scene.add.container(scene.getScaledValue(scene.display.width / 2), scene.getScaledValue(scene.display.height / 2));

        // Add modal background
        const graphics = scene.add.graphics();
        graphics.lineStyle(2, 0xC89E61);  // stroke width and color
        graphics.fillStyle(0xF5E6D2);     // fill color

        const radius = scene.getScaledValue(20);
        const width = scene.getScaledValue(1140);
        const height = scene.getScaledValue(628);
        const x = -width / 2;  // Start from negative half width
        const y = -height / 2; // Start from negative half height

        graphics.beginPath();
        graphics.moveTo(x + radius, y);
        graphics.lineTo(x + width - radius, y);
        graphics.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
        graphics.lineTo(x + width, y + height - radius);
        graphics.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
        graphics.lineTo(x + radius, y + height);
        graphics.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
        graphics.lineTo(x, y + radius);
        graphics.arc(x + radius, y + radius, radius, Math.PI, -Math.PI / 2);
        graphics.closePath();
        graphics.fill();
        graphics.stroke();
        sceneContainer.add(graphics);

        // Add title
        const title = scene.addText(0, -270, i18n.t('game.coinValues'), {
            fontSize: '36px',
            fontFamily: 'Exo',
            fontStyle: 'bold',
            color: '#000000',
            align: 'center'
        });
        title.setOrigin(0.5);
        sceneContainer.add(title);

        // Add coin information
        const coinInfo = [
            { name: i18n.t('info.quarter'), value: 25, image: 'quarter' },
            { name: i18n.t('info.dime'), value: 10, image: 'dime' },
            { name: i18n.t('info.nickel'), value: 5, image: 'nickel' },
            { name: i18n.t('info.penny'), value: 1, image: 'penny' }
        ];

        coinInfo.forEach((coin, index) => {
            const x = -270 + (index * 200);

            // Add coin name
            const nameText = scene.addText(x, -180, coin.name, {
                fontSize: '30px',
                fontFamily: 'Exo',
                fontStyle: 'bold',
                color: '#000000',
                align: 'center'
            });
            nameText.setOrigin(0.5);
            sceneContainer.add(nameText);

            // Add coin image
            const coinImage = scene.addImage(x, -60, coin.image).setScale(0.6);
            sceneContainer.add(coinImage);

            // Add coin tray
            const coinTray = scene.addImage(x, 70, 'game_coin_tray');
            sceneContainer.add(coinTray);

            // Add coin value
            const valueText = scene.addText(x, 150, `${coin.value}¢`, {
                fontSize: '30px',
                fontFamily: 'Exo',
                fontStyle: 'bold',
                color: '#000000',
                align: 'center'
            });
            valueText.setOrigin(0.5);
            sceneContainer.add(valueText);
        });

        return sceneContainer;
    }

    public static createInfo(scene: BaseScene) {
        const title = scene.addText(scene.display.width / 2, 50, i18n.t('info.sortInfoTitle'), {
            fontFamily: "Exo",
            fontStyle: "bold",
            fontSize: 35,
            color: '#000000',
        }).setOrigin(0.5);
        new TextOverlay(scene, title, { label: i18n.t('info.sortInfoTitle'), tag: 'h1', role: 'heading' });

        const description = scene.addText(scene.display.width / 2, 90, i18n.t('info.sortInfoDescription'), {
            fontFamily: "Exo",
            fontSize: 25,
            color: '#000000',
        }).setOrigin(0.5);
        new TextOverlay(scene, description, { label: i18n.t('info.sortInfoDescription') });

        // coin info
        const infoRowWidth = scene.display.width - 172;
        const infoColomnWidth = infoRowWidth / 4;
        const coinData = [
            { title: i18n.t('common.quarter'), value: '25¢', image: COMMON_ASSETS.QUARTER.KEY },
            { title: i18n.t('common.dime'), value: '10¢', image: COMMON_ASSETS.DIME.KEY },
            { title: i18n.t('common.nickel'), value: '5¢', image: COMMON_ASSETS.NICKEL.KEY },
            { title: i18n.t('common.penny'), value: '1¢', image: COMMON_ASSETS.PENNY.KEY },
        ]
        const coinContainer = scene.add.container(
            scene.getScaledValue(40),
            scene.getScaledValue(scene.display.height / 2)
        );

        const coinElements = coinData.map((coin, index) => {
            const x = 40 + (infoColomnWidth * index) + (infoColomnWidth / 2);

            // Add coin name
            const nameText = scene.addText(x, -180, coin.title, {
                fontSize: '25px',
                fontFamily: 'Exo',
                fontStyle: 'bold',
                color: '#000000',
                align: 'center'
            });
            nameText.setOrigin(0.5);
            coinContainer.add(nameText);
            new TextOverlay(scene, nameText, { label: coin.title });

            // Add coin tray
            const coinTray = scene.addImage(x, 70, 'game_coin_tray');
            coinContainer.add(coinTray);
            new ImageOverlay(scene, coinTray, { label: i18n.t('common.trayFor', { coin: coin.title }) });

            // Add coin image
            const coinImage = scene.addImage(x, -60, coin.image).setScale(0.6);
            coinContainer.add(coinImage);
            new ImageOverlay(scene, coinImage, { label: i18n.t('common.coinImage', { coin: coin.title }) });

            // Add coin value
            const valueText = scene.addText(x, 150, `${coin.value}`, {
                fontSize: '30px',
                fontFamily: 'Exo',
                fontStyle: 'bold',
                color: '#000000',
                align: 'center'
            });
            valueText.setOrigin(0.5);
            coinContainer.add(valueText);
            new TextOverlay(scene, valueText, { label: coin.value });

            return { nameText, coinImage, coinTray, valueText };
        });

        return coinElements;
    }
}
