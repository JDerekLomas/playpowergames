import { BaseScene, i18n, ImageOverlay, TextOverlay, focusToGameContainer } from "@k8-games/sdk";
import { COMMON_ASSETS } from "../config/common";

export class CountingInfo {
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

            // Add coin value
            const valueText = scene.addText(x, 50, `${coin.value}¢`, {
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
        // Focus to game container for accessibility
        focusToGameContainer();
        
        const title = scene.addText(scene.display.width / 2, 50, i18n.t('info.countingInfoTitle'), {
            fontFamily: "Exo",
            fontStyle: "bold",
            fontSize: 35,
            color: '#000000',
        }).setOrigin(0.5);
        new TextOverlay(scene, title, { label: i18n.t('info.countingInfoTitle'), tag: 'h1', role: 'heading' });

        const description = scene.addText(scene.display.width / 2, 90, i18n.t('info.countingInfoDescription'), {
            fontFamily: "Exo",
            fontSize: 25,
            color: '#000000',
        }).setOrigin(0.5);
        new TextOverlay(scene, description, { label: i18n.t('info.countingInfoDescription'), tag: 'h2', role: 'heading' });

        // coin info
        const infoRowWidth = scene.display.width - 172;
        const infoColomnWidth = infoRowWidth / 4;
        const coinData = [
            { title: i18n.t('common.quarter'), value: '50¢', image: COMMON_ASSETS.QUARTER_GRP.KEY },
            { title: i18n.t('common.dime'), value: '20¢', image: COMMON_ASSETS.DIME_GRP.KEY },
            { title: i18n.t('common.nickel'), value: '10¢', image: COMMON_ASSETS.NICKEL_GRP.KEY },
            { title: i18n.t('common.penny'), value: '4¢', image: COMMON_ASSETS.PENNY_GRP.KEY },
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
            // new TextOverlay(scene, nameText, { label: coin.title });

            // Add coin image
            const coinImage = scene.addImage(x, -60, coin.image).setScale(1);
            coinContainer.add(coinImage);
            // new ImageOverlay(scene, coinImage, { label: i18n.t('common.coinImage', { coin: coin.title }) });
            
            // Create accessibility list for the coin images based on counting mode counts
            const coinCounts = [2, 2, 2, 4]; // quarter, dime, nickel, penny counts for counting mode
            const coinCount = coinCounts[index];
            
            // Create hidden text element for accessibility list
            const hiddenListText = scene.addText(-1000, -1000, '', {
                fontSize: '1px',
                color: 'transparent'
            }).setVisible(false);
            coinContainer.add(hiddenListText);
            
            // Build list items for multiple coins of this type
            const listItems = [];
            for (let i = 0; i < coinCount; i++) {
                listItems.push(`${coin.title} ${i + 1}`);
            }
            
            new TextOverlay(scene, hiddenListText, { 
                label: `${coin.title} ${coin.value}`,
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

            // Add coin value
            const valueText = scene.addText(x, 30, `${coin.value}`, {
                fontSize: '30px',
                fontFamily: 'Exo',
                fontStyle: 'bold',
                color: '#000000',
                align: 'center'
            });
            valueText.setOrigin(0.5);
            coinContainer.add(valueText);
            new TextOverlay(scene, valueText, { label: coin.value });

            return { nameText, image: coinImage, valueText };
        });

        const inputElements = this.createInputContainer(scene);
        return { coinElements, inputElements };
    }

    private static createInputContainer(scene: BaseScene) {
        const inputContainer = scene.add.container(scene.getScaledValue(scene.display.width / 2), scene.getScaledValue(scene.display.height - 200));

        // keypad buttons
        const gap = 18;
        const startX = -289.35;
        const startY = -66.5;
        const buttonWidth = 56.3;
        const buttonHeight = 58.04;

        const numpadButtons = [];
        const numpadTexts = [];
        for (let i = 0; i < 10; i++) {
            const buttonX = startX + (i >= 5 ? (i - 5) * (gap + buttonWidth) : i * (gap + buttonWidth));
            const buttonY = i >= 5 ? startY + (buttonHeight + gap) : startY;
            const button = scene.addImage(buttonX, buttonY, "counting_num_button").setOrigin(0.5).setAlpha(0.3);
            const num = i === 9 ? '0' : (i + 1).toString();
            const buttonText = scene.addText(buttonX, buttonY, num, {
                fontFamily: 'Exo',
                fontSize: '30px',
                fontStyle: 'bold',
                color: '#000000',
            }).setAlpha(0.3).setOrigin(0.5);
            inputContainer.add([button, buttonText]);
            new ImageOverlay(scene, button, { label: i18n.formatNumber(Number(num)) });
            numpadButtons.push(button);
            numpadTexts.push(buttonText);
        }

        // input box
        const inputBox = scene.addImage(191.745, startY, "counting_input").setOrigin(0.5).setAlpha(0.3);
        inputContainer.add(inputBox);
        new ImageOverlay(scene, inputBox, { label: i18n.t('common.answerInput') });

        const inputText = scene.addText(90, startY + 4, i18n.t('game.totalCents'), {
            fontFamily: 'Exo',
            fontSize: '30px',
            fontStyle: 'bold',
            color: '#989898',
        }).setOrigin(0, 0.5).setAlpha(0.3);
        inputContainer.add(inputText);
        const inputTextOverlay = new TextOverlay(scene, inputText, { label: '' });

        // clear button
        const clearPadding = 15;
        const clearButtonContainer = scene.add.container(scene.getScaledValue(65), scene.getScaledValue(startY + buttonHeight + gap));
        const clearButton = scene.addImage(0, 0, "counting_clear_button").setOrigin(0, 0.5).setAlpha(0.3);
        const clearText = scene.addText(0, 0, i18n.t('game.clear'), {
            fontFamily: 'Exo',
            fontSize: '30px',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        const requiredClearWidth = clearText.width + (clearPadding * 2);
        const clearScaleX = Math.max(requiredClearWidth / clearButton.width, 1);
        clearButton.setScale(clearScaleX, 1);
        clearText.x = clearButton.getBounds().centerX;
        clearButtonContainer.add([clearButton, clearText]);
        inputContainer.add(clearButtonContainer);
        new ImageOverlay(scene, clearButton, { label: i18n.t('game.clear') });

        // check button
        const checkPadding = 15;
        const checkButtonContainer = scene.add.container(scene.getScaledValue(65 + clearButton.width + 10), scene.getScaledValue(startY + buttonHeight + gap));
        const checkButton = scene.addImage(0, 0, "counting_check_button").setOrigin(0, 0.5).setAlpha(0.3);
        const checkText = scene.addText(0, 0, i18n.t('game.check'), {
            fontFamily: 'Exo',
            fontSize: '30px',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const requiredCheckWidth = checkText.width + (checkPadding * 2);
        const checkScaleX = Math.max(requiredCheckWidth / checkButton.width, 1);
        checkButton.setScale(checkScaleX, 1);
        checkText.x = checkButton.getBounds().centerX;
        checkButtonContainer.add([checkButton, checkText]);
        inputContainer.add(checkButtonContainer);
        new ImageOverlay(scene, checkButton, { label: i18n.t('game.check') });

        return { inputText, inputBox, checkButtonContainer, clearButtonContainer, numpadButtons, numpadTexts, inputTextOverlay };
    }
}
