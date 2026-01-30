import { BaseScene } from "./BaseScene";
import { topics } from "../../resources/topics.json";
import { ButtonHelper, ButtonOverlay, GameConfigManager, i18n, TextOverlay } from "@k8-games/sdk";
import { islandState } from "../managers/IslandStateManager";
import { CommonConfig } from "../config/CommonConfig";
import { GameScreenConfig } from "../config/GameScreenConfig";
import { ThemeManager } from "../managers/ThemeManager";
import { extractGameParams } from "../utils/UrlParamsUtils";
import { MapScreenConfig } from "../config/MapScreenConfig";

// Island names in order of appearance
const ISLAND_NAMES = CommonConfig.ISLAND_NAMES;

export class MapScene extends BaseScene {
    private topic: string;
    private levelsData: any[] = [];
    private totalLevels: number;
    private islands: Phaser.GameObjects.Container[] = [];
    private popups: Phaser.GameObjects.Container[] = [];
    private startButton: Phaser.GameObjects.Container | null = null;
    private startButtons: Phaser.GameObjects.Container[] = [];
    private ship: Phaser.GameObjects.Container | null = null;
    private scrollContainer: Phaser.GameObjects.Container | null = null;
    private scrollHeight: number = 0;
    // private isScrolling: boolean = false;
    // private lastPointerY: number = 0;
    private completedLevels: Set<number> = new Set();
    private lastCompletedLevel: number = -1;
    private currentShipIslandIndex: number = -1;
    private isAnimationRunning: boolean = false;

    // Audio and volume button properties
    private currentPlayingAudio: string | null = null;
    private currentVolumeButton: Phaser.GameObjects.Image | null = null;
    private volumeAnimationTimer: Phaser.Time.TimerEvent | null = null;
    private currentVolumeLevel: number = 0;
    private parentScene: string = '';

    // Layer containers for proper z-ordering
    private backgroundLayer: Phaser.GameObjects.Container | null = null;
    private waterLayer: Phaser.GameObjects.Container | null = null;
    private fishLayer: Phaser.GameObjects.Container | null = null;
    private islandLayer: Phaser.GameObjects.Container | null = null;
    private shipLayer: Phaser.GameObjects.Container | null = null;
    private popupLayer: Phaser.GameObjects.Container | null = null;
    private birdLayer: Phaser.GameObjects.Container | null = null;

    constructor() {
        super('MapScene');
    }

    init(data: { topic: string; completedLevels?: number[], parentScene?: string }) {
        this.topic = data.topic;
        this.levelsData = topics.find((t) => t.name === this.topic)?.levels ?? [];
        this.totalLevels = this.levelsData.length;
        this.parentScene = data.parentScene ?? '';

        // Get completed levels from island state
        const globalCompletedLevels = islandState.getCompletedLevels(this.topic);
        this.completedLevels = new Set(globalCompletedLevels);
        if (globalCompletedLevels.length > 0) {
            this.lastCompletedLevel = globalCompletedLevels[globalCompletedLevels.length - 1];
        }

        // this.audioManager.initialize(this);
        this.audioManager.stopAllSoundEffects();
        this.audioManager.stopBackgroundMusic();

        if (!this.anims.exists('map_shark_animation')) {
            this.anims.create({
                key: 'map_shark_animation',
                frames: 'map_shark',
                frameRate: 20,
                repeat: -1,
                hideOnComplete: false,
            });
        };

        if (!this.anims.exists('bird_animation')) {
            this.anims.create({
                key: 'bird_animation',
                frames: 'bird',
                frameRate: 24,
                repeat: -1,
                hideOnComplete: false,
            });
        };
    }

    create() {
        this.audioManager.playBackgroundMusic('ocean_waves');

        this.cameras.main.setBackgroundColor('#002A49');
        // zoom out camera to 0.98 to match the scale of the land
        this.cameras.main.setZoom(0.98);

        // Create scroll container
        this.createScrollContainer();

        // Add land pieces using TileSprite
        this.createLandPieces();

        this.createSideWaterWaves();

        // Add islands to scroll container
        this.createIslands();

        this.createBirds();

        // Setup scrolling
        // this.setupScrolling();

        // Start initial scroll animation if there are more than 3 levels
        if (this.parentScene === 'SplashScene') {
            // this.startInitialScrollAnimation();
        }

        // Remove clouds if coming from MenuScene
        if (this.parentScene === 'MenuScene') {
            this.removeClouds();
        }
    }

    private createScrollContainer() {
        this.scrollContainer = this.add.container(0, 0);

        // Create layer containers in proper z-order (bottom to top)
        this.backgroundLayer = this.add.container(0, 0);
        this.waterLayer = this.add.container(0, 0);
        this.fishLayer = this.add.container(0, 0);
        this.islandLayer = this.add.container(0, 0);
        this.shipLayer = this.add.container(0, 0);
        this.popupLayer = this.add.container(0, 0);
        this.birdLayer = this.add.container(0, 0);

        // Add layering of containers
        this.scrollContainer.add(this.waterLayer);
        this.scrollContainer.add(this.backgroundLayer);
        this.scrollContainer.add(this.islandLayer);
        this.scrollContainer.add(this.fishLayer);
        this.scrollContainer.add(this.popupLayer);
        this.scrollContainer.add(this.shipLayer);
        this.scrollContainer.add(this.birdLayer);

        // Calculate total height needed for all islands
        // const islandHeight = 220; // Height per island
        // const totalIslands = this.totalLevels;
        // this.scrollHeight = totalIslands * islandHeight + 200; // Extra space for padding
        this.scrollHeight = this.display.height;

        // Set initial position so that scroll container bottom aligns with screen bottom
        // This means the container's bottom edge should be at display.height
        // this.scrollContainer.setY(this.getScaledValue(this.display.height - this.scrollHeight));
    }

    // private setupScrolling() {
    //     // Enable pointer events for scrolling
    //     this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    //         this.isScrolling = true;
    //         this.lastPointerY = pointer.y;
    //     });

    //     this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    //         if (this.isScrolling && this.scrollContainer) {
    //             const deltaY = pointer.y - this.lastPointerY;
    //             const newY = this.scrollContainer.y + deltaY;

    //             // Constrain scrolling
    //             // minY: when container bottom is at screen bottom (showing bottom islands)
    //             // maxY: when container top is at screen top (showing top islands)
    //             const minY = this.getScaledValue(this.display.height - this.scrollHeight);
    //             const maxY = 0;

    //             this.scrollContainer.setY(Phaser.Math.Clamp(newY, minY, maxY));
    //             this.lastPointerY = pointer.y;
    //         }
    //     });

    //     this.input.on('pointerup', () => {
    //         this.isScrolling = false;
    //     });

    //     // Add mouse wheel support
    //     this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number, _deltaZ: number) => {
    //         if (this.scrollContainer) {
    //             const scrollSpeed = 1;
    //             const newY = this.scrollContainer.y - deltaY * scrollSpeed;

    //             // Constrain scrolling
    //             // minY: when container bottom is at screen bottom (showing bottom islands)
    //             // maxY: when container top is at screen top (showing top islands)
    //             const minY = this.getScaledValue(this.display.height - this.scrollHeight);
    //             const maxY = 0;

    //             this.scrollContainer.setY(Phaser.Math.Clamp(newY, minY, maxY));
    //         }
    //     });
    // }

    // private startInitialScrollAnimation() {
    //     // Only show scroll animation if there are more than 3 levels
    //     if (this.totalLevels <= 3) return;

    //     this.time.delayedCall(3000, () => {
    //         if (!this.scrollContainer) return;

    //         this.isAnimationRunning = true;
    //         if (this.startButton) {
    //             ButtonHelper.disableButton(this.startButton);
    //         }

    //         const startY = this.scrollContainer.y;
    //         const scrollUpY = startY + this.getScaledValue(100); // Scroll up by 200px

    //         // First animate scroll up by 200px
    //         this.tweens.add({
    //             targets: this.scrollContainer,
    //             y: scrollUpY,
    //             duration: 700,
    //             ease: 'Power2.easeOut',
    //             onComplete: () => {
    //                 // Then animate back down to original position
    //                 this.tweens.add({
    //                     targets: this.scrollContainer,
    //                     y: startY,
    //                     delay: 300,
    //                     duration: 700,
    //                     ease: 'Power2.easeIn',
    //                     onComplete: () => {
    //                         this.isAnimationRunning = false;
    //                         if (this.startButton) {
    //                             ButtonHelper.enableButton(this.startButton);
    //                         }
    //                     }
    //                 });
    //             }
    //         });
    //     });
    // }

    private createLandPieces() {
        if (!this.backgroundLayer) return;

        // // Create left land using TileSprite
        // const leftLand = this.addTileSprite(
        //     -270, 
        //     0,
        //     'land_left',
        //     590,
        //     this.scrollHeight,
        // ).setOrigin(0, 0);
        // leftLand.tilePositionY = this.getScaledValue(-leftLand.height + this.scrollHeight);
        // this.backgroundLayer.add(leftLand);

        // // Create right land using TileSprite
        // const rightLand = this.addTileSprite(
        //     this.display.width - 270, 
        //     0, 
        //     'land_right',
        //     590,
        //     this.scrollHeight,
        // ).setOrigin(0, 0);
        // rightLand.tilePositionY = this.getScaledValue(-rightLand.height + this.scrollHeight);
        // this.backgroundLayer.add(rightLand);
        const land = this.addImage(this.display.width / 2, this.display.height / 2, 'land').setOrigin(0.5);
        this.backgroundLayer.add(land);
    }

    // private createFloatingLandPiece(x: number, y: number, imageKey: string) {
    //     if (!this.backgroundLayer) return;

    //     const piece = this.addImage(x, y, imageKey).setOrigin(0.5);
    //     this.backgroundLayer.add(piece);
    // }

    // private createWaterPieces(x: number, y: number) {
    //     if (!this.waterLayer) return;

    //     const positions = [
    //         { x: 20, y: 0 },
    //         { x: 18, y: 8 },
    //         { x: 5, y: 20 },
    //         { x: 40, y: 35 }
    //     ]

    //     for (let i = 0; i < positions.length; i++) {
    //         const waterPiece = this.addImage(x + positions[i].x, y + positions[i].y, 'water_piece').setOrigin(0.5);
    //         waterPiece.setScale(0.7);
    //         this.tweens.add({
    //             targets: waterPiece,
    //             scale: this.getScaledValue(1),
    //             duration: 1000,
    //             delay: i * 400,
    //             yoyo: true,
    //             repeat: -1,
    //         })
    //         this.waterLayer.add(waterPiece);
    //     }
    // }

    // Safely get island config for current totalLevels, with a fallback to 2-level layout
    private getIslandConfigForIndex(index: number) {
        const group = (MapScreenConfig.ISLANDS as any)[this.totalLevels] as any[] | undefined;
        const fallbackGroup = (MapScreenConfig.ISLANDS as any)[2] as any[] | undefined;
        if (group && group[index]) return group[index];
        if (fallbackGroup && fallbackGroup.length > 0) return fallbackGroup[Math.min(index, fallbackGroup.length - 1)];
        return undefined;
    }

    private createIslands() {
        if (!this.scrollContainer) return;

        for (let i = 0; i < this.totalLevels; i++) {

            const island = this.getIslandConfigForIndex(i);
            if (!island) continue;

            // Check if this level is completed
            const isCompleted = this.completedLevels.has(i + 1);

            // create island button with appropriate state
            this.createIslandButton(island.X, island.Y, {
                default: isCompleted ? `${island.NAME}_default` : `${island.NAME}_destroyed_default`,
                hover: isCompleted ? `${island.NAME}_hover` : `${island.NAME}_destroyed_hover`,
                pressed: isCompleted ? `${island.NAME}_default` : `${island.NAME}_destroyed_default`,
            }, i);

            const popup = this.createPopup(i, isCompleted);
            this.popups.push(popup);
            this.createAudioButtonOverlay(i);

            const startButton = this.createStartButton(popup, i);
            startButton.setVisible(false);
            this.startButtons.push(startButton);

            // Animate achieved island
            if (i + 1 === this.lastCompletedLevel) {
                this.animateAchievedIsland(i);
            }

            // create flowers
            island.FLOWERS?.forEach((flower: any) => {
                const flowerImage = this.addImage(flower.X, flower.Y, 'flower').setOrigin(0.5);
                this.islandLayer?.add(flowerImage);
            });

            // Randomly set the direction of the fishes
            const isLeft = Phaser.Math.Between(0, 1) === 0;
            if (isLeft) {
                this.createBigFish(island.X + Phaser.Math.Between(90, 110), island.Y - Phaser.Math.Between(20, 40), true);
                this.createSmallFishes(island.X - 50, island.Y + 200, false);
            } else {
                this.createBigFish(island.X - Phaser.Math.Between(60, 120), island.Y - 50, false);
                this.createSmallFishes(island.X + 50, island.Y + 150, true);
            }
        }
    }

    private animateShip(islandIndex: number) {
        // If ship is already at this island, don't animate again
        if (this.currentShipIslandIndex === islandIndex && this.ship) {
            return;
        }

        this.currentShipIslandIndex = islandIndex;

        // If ship exists but is at a different island, destroy it
        if (this.ship) {
            this.ship.destroy();
            this.ship = null;
        }

        if (!this.scrollContainer) return;

        this.audioManager.stopSoundEffect('ship_horn_arrival');
        this.audioManager.playSoundEffect('ship_horn_arrival');

        // Calculate start and end positions relative to scroll container
        // let startX: number, startY: number;
        let endX: number, endY: number;

        // Get popup position relative to scroll container
        const popup = this.popups[islandIndex].getBounds();
        // const scrollContainerY = this.scrollContainer.y;

        endX = (popup.centerX / this.display.scale) + 160;
        endY = (popup.centerY / this.display.scale) - 10;

        // Create ship at start position within scroll container
        this.ship = this.add.container(this.getScaledValue(endX), this.getScaledValue(endY));

        const shipImage = this.addImage(
            0,
            0,
            'map_ship'
        ).setOrigin(0.5);

        const shipShadow = this.addImage(
            0,
            80,
            'map_ship_shadow'
        ).setOrigin(0.5);

        this.ship.add(shipShadow);
        this.ship.add(shipImage);
        this.ship.setAlpha(0);

        // Add ship to ship layer
        this.shipLayer?.add(this.ship);

        this.tweens.add({
            targets: this.ship,
            alpha: 1,
            duration: 1000,
            ease: 'Sine.easeInOut',
        });

        this.tweens.add({
            targets: this.ship,
            rotation: 0.05,
            duration: 1500,
            yoyo: true,
            repeat: -1,
        })
    }

    private createIslandButton(x: number, y: number, imageKeys: {
        default: string;
        hover: string;
        pressed: string;
    }, islandIndex: number): Phaser.GameObjects.Container {
        if (!this.islandLayer) return this.add.container(0, 0);

        const button = this.add.container(this.getScaledValue(x), this.getScaledValue(y));

        // Get island name for wave positioning
        // const islandName = ISLAND_NAMES[Math.min(islandIndex, ISLAND_NAMES.length - 1)];
        const islandName = this.getIslandConfigForIndex(islandIndex)?.NAME || ISLAND_NAMES[Math.min(islandIndex, ISLAND_NAMES.length - 1)];

        // adjust wave position based on island type
        const water_positions: { [key: string]: { x: number, y: number } } = {
            'volcano': { x: 0, y: 50 },
            'mayan_electric_temple': { x: 0, y: 50 },
            'colosseum': { x: 0, y: 50 },
            'lighthouse': { x: 0, y: 70 },
            'desert': { x: 0, y: 50 },
            'arctic_doomsday': { x: 0, y: 50 }
        }

        const shadow_positions: { [key: string]: { x: number, y: number } } = {
            'volcano': { x: 0, y: 90 },
            'mayan_electric_temple': { x: 0, y: 100 },
            'colosseum': { x: 0, y: 110 },
            'lighthouse': { x: 0, y: 140 },
            'desert': { x: 0, y: 85 },
            'arctic_doomsday': { x: 0, y: 105 }
        }

        const wave_positions: { [key: string]: { x: number, y: number } } = {
            'volcano': { x: -8, y: 85 },
            'mayan_electric_temple': { x: -5, y: 77 },
            'colosseum': { x: -5, y: 85 },
            'lighthouse': { x: -10, y: 105 },
            'desert': { x: -5, y: 75 },
            'arctic_doomsday': { x: -3, y: 85 }
        }

        const water_position = water_positions[islandName] || { x: 0, y: 50 };
        const shadow_position = shadow_positions[islandName] || { x: 0, y: 50 };
        const wave_position = wave_positions[islandName] || { x: 0, y: 70 };

        const water = this.addImage(water_position.x, water_position.y, 'island_water').setOrigin(0.5);
        const shadow = this.addImage(shadow_position.x, shadow_position.y, `${islandName}_shadow`).setOrigin(0.5);
        const water_waves = this.addImage(wave_position.x, wave_position.y, 'island_water_waves').setOrigin(0.5);
        const buttonBg = this.addImage(0, 0, imageKeys.default).setOrigin(0.5);
        buttonBg.setName('buttonBg');

        button.add(water);
        button.add(shadow);
        button.add(water_waves);
        button.add(buttonBg);

        button.setSize(buttonBg.width * buttonBg.scaleX, buttonBg.height * buttonBg.scaleY);

        button.setInteractive({ useHandCursor: true });

        // Add button to island layer
        this.islandLayer.add(button);
        this.islands.push(button);

        const pointerOver = () => {
            if (this.isAnimationRunning) return;

            buttonBg.setScale(1);
            shadow.setScale(1);
            water_waves.setScale(1);
            buttonBg.setTexture(imageKeys.hover);
        }

        const pointerOut = () => {
            if (this.isAnimationRunning) return;

            buttonBg.setScale(1);
            shadow.setScale(1);
            water_waves.setScale(1);
            buttonBg.setTexture(imageKeys.default);
        }

        const pointerDown = () => {
            if (this.isAnimationRunning) return;

            this.audioManager.playSoundEffect('button_click');
            this.tweens.add({
                targets: [buttonBg, shadow, water_waves],
                scale: this.getScaledValue(1.25),
                duration: 200,
                ease: 'Power2'
            })
        }

        const pointerUp = () => {
            if (this.isAnimationRunning) return;

            buttonBg.setTexture(imageKeys.default);
            this.tweens.add({
                targets: [buttonBg, shadow, water_waves],
                scale: this.getScaledValue(1),
                duration: 200,
                ease: 'Power2'
            })
            this.handleIslandClick(islandIndex);
        }

        const lang = i18n.getLanguage();
        const buttonLabel = lang === 'es' ? this.levelsData[islandIndex].nameEs : this.levelsData[islandIndex].name;
        new ButtonOverlay(this, button, { label: buttonLabel, onKeyDown: pointerDown, onKeyUp: pointerUp, onFocus: pointerOver, onBlur: pointerOut })

        button.on('pointerover', pointerOver);
        button.on('pointerout', pointerOut);
        button.on('pointerdown', pointerDown);
        button.on('pointerup', pointerUp);

        return button;
    }

    private animateClouds(cb: () => void) {
        const offset = 500;
        const cloud1 = this.addImage(-offset, this.display.height + offset, 'cloud').setOrigin(0.5);
        const cloud2 = this.addImage(this.display.width + offset, -offset, 'cloud').setOrigin(0.5);

        cloud1.setAlpha(0);
        cloud2.setAlpha(0);

        this.tweens.add({
            targets: [cloud1, cloud2],
            alpha: 1,
            x: this.getScaledValue(this.display.width / 2),
            y: this.getScaledValue(this.display.height / 2),
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                cb();
                this.destroy();
            }
        });
    }

    private removeClouds() {
        const offset = 500;
        const cloud1 = this.addImage(this.display.width / 2, this.display.height / 2, 'cloud').setOrigin(0.5).setDepth(1000);
        const cloud2 = this.addImage(this.display.width / 2, this.display.height / 2, 'cloud').setOrigin(0.5).setDepth(1000);

        this.tweens.add({
            targets: cloud1,
            alpha: 0,
            x: -offset,
            y: this.getScaledValue(this.display.height + offset),
            duration: 1000,
            ease: 'Sine.easeOut',
            onComplete: () => {
                cloud1.destroy();
                cloud2.destroy();
            }
        });

        this.tweens.add({
            targets: cloud2,
            alpha: 0,
            x: this.getScaledValue(this.display.height + offset),
            y: -offset,
            duration: 1000,
            ease: 'Sine.easeOut',
        });
    }

    private handleIslandClick(islandIndex: number) {
        // Stop current audio if switching to a different island
        if (this.currentPlayingAudio && this.currentPlayingAudio !== `level_${islandIndex + 1}_text`) {
            this.stopCurrentAudio();
        }

        // Animate ship to current island
        this.animateShip(islandIndex);

        const popup = this.popups[islandIndex];
        if (popup) {
            for (let i = 0; i < this.startButtons.length; i++) {
                const btn = this.startButtons[i];
                if (btn && btn.active) {
                    btn.setVisible(i === islandIndex);
                    const overlay = (btn as any).buttonOverlay;
                    this.showOverlay(overlay.element, i === islandIndex);
                    if (i === islandIndex) {
                        overlay.element.focus({ preventScroll: true });
                    }
                }
            }
        }
    }

    private createStartButton(popup: Phaser.GameObjects.Container, islandIndex: number): Phaser.GameObjects.Container {
        const startButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: 'popup_button_default',
                hover: 'popup_button_hover',
                pressed: 'popup_button_pressed',
            },
            text: i18n.t('common.start'),
            label: i18n.t('common.start'),
            textStyle: {
                fontSize: '20px',
                fontFamily: 'Exo',
                fontStyle: 'bold'
            },
            x: 0,
            y: 55,
            onClick: () => {
                if (this.isAnimationRunning) return;

                // destroy popups
                for (const popup of this.popups) {
                    popup.destroy();
                }
                this.popups = [];
                this.startButtons = [];

                if (this.currentPlayingAudio) {
                    this.audioManager.stopSoundEffect(this.currentPlayingAudio);
                }
                this.audioManager.stopBackgroundMusic();

                // set theme based on island
                const islandTheme = GameScreenConfig.getThemeForIsland(islandIndex);
                ThemeManager.getInstance().setTheme(islandTheme);

                this.animateClouds(() => {
                    let showTutorial = islandIndex === 0;

                    if (this.topic === 'place_value_magnitude') {
                        showTutorial = true;
                    } else if (this.topic === 'explore_numbers_to_1000') {
                        showTutorial = true;
                    } else if (this.topic === 'add_and_subtract_within_100') {
                        showTutorial = true;
                    } else if (this.topic === 'subtract_within_1000') {
                        showTutorial = true;
                    } else if (this.topic === 'fractions_as_numbers') {
                        showTutorial = true;
                    } else if (this.topic === 'addition_and_subtraction_of_fractions_mixed_numbers') {
                        showTutorial = true;
                    } else if (this.topic === 'understand_and_compare_decimals') {
                        showTutorial = true;
                    } else if (this.topic === 'add_and_subtract_decimals') {
                        showTutorial = true;
                    } else if (this.topic === 'add_and_subtract_fractions') {
                        showTutorial = true;
                    } else if (this.topic === 'percents') {
                        showTutorial = true;
                    } else if (this.topic === 'rational_numbers') {
                        showTutorial = true;
                    } else if (this.topic === 'multiply_fractions') {
                        showTutorial = true;
                    }

                    // If coming from MenuScene, destroy the original GameScreen scene
                    if (this.parentScene === 'MenuScene') {
                        this.scene.stop('GameScreen');
                    }

                    const isCampaign = this.topic === 'campaign';
                    const sceneData = isCampaign
                        ? { useQuestionBank: false, topic: this.topic, level: islandIndex, parentScene: 'MapScene' }
                        : { useQuestionBank: true, topic: this.topic, mapLevel: islandIndex + 1, parentScene: 'MapScene' };

                    if (isCampaign || showTutorial) {
                        this.scene.start("HowToPlayScene", sceneData);
                    } else {
                        this.scene.start('GameScreen', sceneData);
                        this.audioManager.playBackgroundMusic(CommonConfig.ASSETS.KEYS.MUSIC.GAME_THEME);
                    }
                });
            }
        });

        popup.add(startButton);

        const overlay = (startButton as any).buttonOverlay;
        overlay.recreate();
        this.showOverlay(overlay.element, false);

        return startButton;
    }

    private showOverlay(overlay: HTMLElement, show: boolean) {
        if (show) {
            overlay.removeAttribute('aria-hidden');
            overlay.tabIndex = 0; // make focusable
            overlay.style.pointerEvents = 'auto';
            overlay.style.display = 'block'; // or initial depending on your layout
        } else {
            overlay.setAttribute('aria-hidden', 'true');
            overlay.blur();
            overlay.tabIndex = -1;
            overlay.style.pointerEvents = 'none';
            overlay.style.display = 'none';
        }
    }

    private createPopup(islandIndex: number, isCompleted: boolean = false): Phaser.GameObjects.Container {
        if (!this.scrollContainer) return this.add.container(0, 0);

        const topicsWithAudioButton = ['add_and_subtract_within_100', 'explore_numbers_to_1000', 'subtract_within_1000'];

        const popup = this.add.container(0, 0);

        // Create popup background
        const popupBg = this.addImage(0, 0, isCompleted ? 'banner_complete' : 'banner_incomplete').setOrigin(0.5);
        popupBg.setName('popupBg');
        popup.add(popupBg);

        // Create level number text
        const lang = i18n.getLanguage();
        const translatedLevelName = lang === 'es' ? this.levelsData[islandIndex].nameEs : this.levelsData[islandIndex].name;
        const levelText = this.addText(topicsWithAudioButton.includes(this.topic) ? 12 : 0, -2, translatedLevelName, {
            font: '500 14px Exo',
            color: isCompleted ? '#000000' : '#FFFFFF',
            align: 'center',
            wordWrap: {
                width: topicsWithAudioButton.includes(this.topic) ? 170 : 180,
            }
        }).setOrigin(0.5).setName('level_text_' + islandIndex);
        popup.add(levelText);

        // Create volume button (only for topics with audio button)
        if (topicsWithAudioButton.includes(this.topic)) {
            const volumeButtonY = levelText.getBounds().centerY - this.getScaledValue(2);
            const volumeButtonContainer = this.add.container(this.getScaledValue(-90), volumeButtonY);
            volumeButtonContainer.setName('audio_btn_' + islandIndex);
            const volumeButton = this.addImage(0, 0, 'volume_3').setOrigin(0.5).setScale(0.5);
            // Apply tint only if level not completed
            if (!isCompleted) {
                volumeButton.setTintFill(0x85d0ff);
            }
            volumeButtonContainer.add(volumeButton);
            volumeButton.setInteractive({ useHandCursor: true });

            volumeButton.on('pointerdown', () => {
                if (this.isAnimationRunning) return;

                if (this.currentVolumeButton) {
                    this.currentVolumeButton.setTexture('volume_3');
                }
                this.currentVolumeButton = volumeButton;
                this.handleVolumeButtonClick(islandIndex);
            });

            popup.add(volumeButtonContainer);
        }

        const island = this.islands[islandIndex].getBounds();

        const popupX = island.centerX;
        const popupY = island.centerY + this.getScaledValue(35);

        popup.setPosition(popupX, popupY);

        // Add popup to popup layer
        this.popupLayer?.add(popup);

        // Add hover functionality to the popup background
        popupBg.setInteractive({ useHandCursor: true });

        popupBg.on('pointerover', () => {
            if (this.isAnimationRunning) return;
            this.handleIslandClick(islandIndex);
        });

        return popup;
    }

    private createAudioButtonOverlay(islandInd: number) {
        const popupContainer = this.popups[islandInd];
        const audioButton = popupContainer.getByName('audio_btn_' + islandInd) as Phaser.GameObjects.Container;

        if (!audioButton) return;

        const lang = i18n.getLanguage();
        const translatedLevelName = lang === 'es' ? this.levelsData[islandInd].nameEs : this.levelsData[islandInd].name;

        new ButtonOverlay(this, audioButton, {
            label: i18n.t('common.voiceOverFor', { text: translatedLevelName }),
            onKeyDown: () => {
                if (this.isAnimationRunning) return;

                if (this.currentVolumeButton) {
                    this.currentVolumeButton.setTexture('volume_3');
                }
                this.currentVolumeButton = audioButton.getAt(0) as Phaser.GameObjects.Image;
                this.handleVolumeButtonClick(islandInd);
            },
            style: {
                height: `${(audioButton.getAt(0) as Phaser.GameObjects.Image).displayHeight}px`,
                width: `${(audioButton.getAt(0) as Phaser.GameObjects.Image).displayWidth}px`,
            }
        })
    }

    private createSideWaterWaves() {

        const createWaveAnimation = (x: number, y: number, imageKey: string, isLeft: boolean) => {
            const wave = this.addImage(x, y + 25, imageKey).setOrigin(0.5).setAlpha(0);
            if (isLeft) {
                wave.x += this.getScaledValue(25);
            } else {
                wave.x -= this.getScaledValue(25);
            }

            this.tweens.add({
                targets: wave,
                y: "-=" + this.getScaledValue(15),
                x: isLeft ? "-=" + this.getScaledValue(15) : "+=" + this.getScaledValue(15),
                alpha: 1,
                duration: 2000,
                delay: 5000,
                ease: 'Sine.easeIn',
                onComplete: () => {
                    this.tweens.add({
                        targets: wave,
                        alpha: 0,
                        y: "-=" + this.getScaledValue(15),
                        x: isLeft ? "-=" + this.getScaledValue(15) : "+=" + this.getScaledValue(15),
                        duration: 2000,
                        ease: 'Sine.easeOut',
                        onComplete: () => wave.destroy()
                    })
                }
            });

            this.waterLayer?.add(wave);
        };

        const createWaveTimer = (x: number, y: number, imageKey: string, isLeft: boolean) => {
            this.time.addEvent({
                delay: Phaser.Math.Between(5000, 10000),
                loop: true,
                callback: () => createWaveAnimation(x, y, imageKey, isLeft)
            });
        };

        MapScreenConfig.WATER_WAVES.forEach(wave => {
            if (wave.DIRECTION === 'left') {
                createWaveTimer(wave.X, wave.Y, 'water_wave_left', true);
            } else {
                createWaveTimer(wave.X, wave.Y, 'water_wave_right', false);
            }
        });
    }

    private createBigFish(x: number, y: number, isLeft: boolean) {
        if (!this.fishLayer) return;

        this.time.addEvent({
            delay: Phaser.Math.Between(12000, 17000),
            loop: true,
            callback: () => {
                const fishScale = 0.2;
                const bigFish = this.addSprite(x, y, 'map_shark').setOrigin(0.5).setAlpha(0).setScale(fishScale);

                if (isLeft) bigFish.setScale(-fishScale, fishScale);

                bigFish.play('map_shark_animation');

                this.fishLayer?.add(bigFish);

                this.tweens.add({
                    targets: bigFish,
                    alpha: 0.6,
                    duration: 2000,
                    ease: 'Sine.easeOut',
                    onComplete: () => {
                        this.tweens.add({
                            targets: bigFish,
                            alpha: 0,
                            ease: 'Sine.easeIn',
                            duration: 2000,
                        })
                    }
                })

                this.tweens.add({
                    targets: bigFish,
                    alpha: 0.6,
                    x: isLeft ? "+= " + this.getScaledValue(100) : "-= " + this.getScaledValue(100),
                    y: "+= " + this.getScaledValue(40),
                    duration: 4000,
                    onComplete: () => bigFish.destroy()
                });
            }
        });
    }

    private createSmallFishes(x: number, y: number, isLeft: boolean) {
        if (!this.fishLayer) return;

        this.time.addEvent({
            delay: Phaser.Math.Between(8000, 15000),
            loop: true,
            callback: () => {
                const smallFish = this.addImage(x, y, 'fishes').setOrigin(0.5).setAlpha(0);

                if (isLeft) smallFish.setScale(-1, 1);

                this.fishLayer?.add(smallFish);

                this.tweens.add({
                    targets: smallFish,
                    alpha: 1,
                    duration: 2500,
                    ease: 'Sine.easeOut',
                    onComplete: () => {
                        this.tweens.add({
                            targets: smallFish,
                            alpha: 0,
                            ease: 'Sine.easeIn',
                            duration: 2500,
                        })
                    }
                });

                this.tweens.add({
                    targets: smallFish,
                    alpha: 1,
                    x: isLeft ? "+= " + this.getScaledValue(150) : "-= " + this.getScaledValue(150),
                    y: "-= " + this.getScaledValue(80),
                    duration: 5000,
                    onComplete: () => smallFish.destroy()
                });
            }
        });
    }

    private createBirds() {
        if (!this.birdLayer) return;

        const birds_spacing = 600;
        const birds_count = Math.ceil(this.scrollHeight / birds_spacing);

        for (let i = 0; i < birds_count; i++) {
            const birds_start_y = Phaser.Math.Between(100, 200);
            const y = birds_start_y + i * birds_spacing;

            this.time.addEvent({
                delay: 14000,
                loop: true,
                callback: () => {
                    const birdsContainer = this.add.container(0, this.getScaledValue(y));
                    const birdsPositions = [
                        { x: 0, y: 59 },
                        { x: 11, y: 25 },
                        { x: 45, y: 25 },
                        { x: 44, y: 0 },
                        { x: 68, y: 5 },
                    ]

                    for (const birdPosition of birdsPositions) {
                        const bird = this.addSprite(birdPosition.x, birdPosition.y, 'bird').setOrigin(0.5).setScale(0.1);
                        bird.play('bird_animation');
                        birdsContainer.add(bird);
                    }

                    this.birdLayer?.add(birdsContainer);

                    const y_move = this.display.width / 2;

                    this.tweens.add({
                        targets: birdsContainer,
                        x: "+=" + this.getScaledValue(this.display.width),
                        y: "-=" + this.getScaledValue(y_move),
                        duration: 12000,
                        onComplete: () => birdsContainer.destroy()
                    });
                }
            });
        }
    }

    private stopCurrentAudio() {
        if (this.currentPlayingAudio) {
            this.audioManager.stopSoundEffect(this.currentPlayingAudio);
            this.currentPlayingAudio = null;
        }

        if (this.volumeAnimationTimer) {
            this.volumeAnimationTimer.destroy();
            this.volumeAnimationTimer = null;
        }

        if (this.currentVolumeButton) {
            this.currentVolumeButton.setTexture('volume_3');
            this.currentVolumeLevel = 0;
        }
    }

    private startVolumeAnimation() {
        if (this.volumeAnimationTimer) {
            this.volumeAnimationTimer.destroy();
        }

        this.currentVolumeLevel = 1;
        this.currentVolumeButton?.setTexture('volume_1');

        this.volumeAnimationTimer = this.time.addEvent({
            delay: 400,
            loop: true,
            callback: () => {
                if (this.currentVolumeButton && this.currentVolumeButton.active && this.currentVolumeButton.scene) {
                    this.currentVolumeLevel = (this.currentVolumeLevel % 3) + 1;
                    this.currentVolumeButton.setTexture(`volume_${this.currentVolumeLevel}`);
                }
            }
        });
    }

    private handleVolumeButtonClick(islandIndex: number) {
        const audioKey = `level_${islandIndex + 1}_text`;

        // If this audio is already playing, stop it
        if (this.currentPlayingAudio === audioKey && this.audioManager) {
            this.stopCurrentAudio();
            return;
        }

        // Stop any currently playing audio
        this.stopCurrentAudio();

        // Start playing the new audio
        this.currentPlayingAudio = audioKey;
        const audio = this.audioManager.playSoundEffect(audioKey);

        // Start volume animation
        this.startVolumeAnimation();

        // Set up audio completion callback if audio was successfully created
        if (audio) {
            audio.once('complete', () => {
                if (this.currentPlayingAudio === audioKey) {
                    this.stopCurrentAudio();
                }
            });
        }
    }

    private playAchievedIslandSound() {
        const lastCompletedLevel = islandState.getLastCompletedLevel();

        if (lastCompletedLevel && lastCompletedLevel.topic === this.topic) {
            const levelIndex = lastCompletedLevel.level - 1;

            if (levelIndex >= 0 && levelIndex < this.islands.length) {
                this.audioManager.playSoundEffect('achieved_island');
                islandState.clearLastCompletedLevel();
            }
        }
    }

    private animateAchievedIsland(islandIndex: number) {
        if (islandIndex < 0 || islandIndex >= this.islands.length) return;
        this.isAnimationRunning = true;
        const island = this.islands[islandIndex];
        const islandConfig = this.getIslandConfigForIndex(islandIndex);
        if (!islandConfig) { this.isAnimationRunning = false; return; }
        const popup: Phaser.GameObjects.Container = this.popups[islandIndex];
        
        const buttonBg: Phaser.GameObjects.Image = island.getByName('buttonBg');
        const popupBg: Phaser.GameObjects.Image = popup.getByName('popupBg');

        // Set button texture to destroyed
        buttonBg.setTexture(islandConfig.NAME + '_destroyed_default');
        // Set popup banner to incomplete
        popupBg.setTexture('banner_incomplete');
        
        // 1-second pause before animation
        this.time.delayedCall(1000, () => {
            // Add stars animation
            const islandBounds = island.getBounds();
            const starsX = islandBounds.centerX / this.display.scale;
            const starsY = islandBounds.centerY / this.display.scale - 80;
            const stars = this.addImage(starsX, starsY, 'stars').setOrigin(0.5).setDepth(1000);
            stars.setAlpha(0);
            this.tweens.chain({
                targets: stars,
                tweens: [
                    {
                        alpha: 1,
                        duration: 1000,
                        ease: 'Sine.easeOut',
                    },
                    {
                        alpha: 0,
                        duration: 1000,
                        ease: 'Sine.easeIn',
                        onComplete: () => stars.destroy()
                    }
                ],
            });
            // Pulse/scaling animation
            this.tweens.chain({
                targets: island,
                tweens: [
                    {
                        scale: 1.2,
                        duration: 500,
                        ease: 'Sine.easeOut',
                        onComplete: () => {
                            this.playAchievedIslandSound();
                            buttonBg.setTexture(islandConfig.NAME + '_default');
                            popupBg.setTexture('banner_complete');
                            // When level becomes completed, remove tint from volume button if it exists
                            const audioBtn = popup.getByName('audio_btn_' + islandIndex) as Phaser.GameObjects.Container | null;
                            if (audioBtn) {
                                const img = audioBtn.getAt(0) as Phaser.GameObjects.Image | undefined;
                                if (img && (img as any).clearTint) {
                                    img.setTintFill(0x005383);
                                }
                            }
                        }
                    },
                    {
                        scale: 1,
                        duration: 500,
                        ease: 'Sine.easeIn',
                        onComplete: () => {
                            this.isAnimationRunning = false;
                        }
                    }
                ],
            });
        });
    }

    destroy() {
        // Clear all timer events
        this.time.removeAllEvents();

        // Stop current audio and clean up audio-related properties
        this.currentPlayingAudio = null;
        this.currentVolumeButton = null;
        this.volumeAnimationTimer = null;
        this.currentVolumeLevel = 0;

        // destroy islands
        for (const island of this.islands) {
            island.destroy();
        }
        this.islands = [];

        // destroy start button
        this.startButton?.destroy();
        this.startButton = null;

        // destroy ship
        this.ship?.destroy();
        this.ship = null;

        // destroy layer containers
        this.backgroundLayer?.destroy();
        this.backgroundLayer = null;
        this.waterLayer?.destroy();
        this.waterLayer = null;
        this.fishLayer?.destroy();
        this.fishLayer = null;
        this.islandLayer?.destroy();
        this.islandLayer = null;
        this.shipLayer?.destroy();
        this.shipLayer = null;
        this.popupLayer?.destroy();
        this.popupLayer = null;
        this.birdLayer?.destroy();
        this.birdLayer = null;

        // destroy scroll container
        this.scrollContainer?.destroy();
        this.scrollContainer = null;

        // reset variables
        this.scrollHeight = 0;
        // this.isScrolling = false;
        // this.lastPointerY = 0;
        this.currentShipIslandIndex = -1;
        this.isAnimationRunning = false;
        this.lastCompletedLevel = -1;
    }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || 'en';

        // images
        scene.load.setPath('assets/images/map_screen');
        scene.load.image('map_ship', 'ship.png');
        scene.load.image('map_ship_shadow', 'ship_shadow.png');
        scene.load.image('land', 'land.png');
        // scene.load.image('land_left', 'land_left.png');
        // scene.load.image('land_right', 'land_right.png');
        // scene.load.image('water_piece', 'water_piece.png');
        scene.load.image('flower', 'flower.png');
        // scene.load.image('popup_bg', 'popup_bg.png');
        scene.load.image('banner_incomplete', 'banner_incomplete.png');
        scene.load.image('banner_complete', 'banner_complete.png');
        scene.load.image('cloud', 'cloud.png');
        scene.load.image('island_water', 'island_water.png');
        scene.load.image('island_water_waves', 'island_water_waves.png');
        // scene.load.image('floating_land_1', 'floating_land_1.png');
        // scene.load.image('floating_land_2', 'floating_land_2.png');
        scene.load.image('fishes', 'fishes.png');
        scene.load.image('water_wave_left', 'water_wave_left.png');
        scene.load.image('water_wave_right', 'water_wave_right.png');
        // scene.load.image('side_water_1', 'side_water_1.png');
        // scene.load.image('side_water_2', 'side_water_2.png');
        // scene.load.image('side_water_4', 'side_water_4.png');
        scene.load.image('volume_1', 'volume_1.png');
        scene.load.image('volume_2', 'volume_2.png');
        scene.load.image('volume_3', 'volume_3.png');
        // scene.load.image('volume_off', 'volume_off.png');
        scene.load.image('stars', 'stars.png');

        const states = ['default', 'hover', 'pressed'];
        for (const state of states) {
            scene.load.image(`popup_button_${state}`, `popup_button_${state}.png`);
        }

        // islands
        scene.load.setPath('assets/images/map_screen/islands');
        for (const islandName of ISLAND_NAMES) {
            for (const state of states) {
                if (state !== 'pressed') {
                    scene.load.image(`${islandName}_${state}`, `${islandName}_${state}.png`);
                    scene.load.image(`${islandName}_destroyed_${state}`, `${islandName}_destroyed_${state}.png`);
                }
            }
            scene.load.image(`${islandName}_shadow`, `${islandName}_shadow.png`);
        }

        scene.load.setPath('assets/atlases/map_shark');
        scene.load.atlas('map_shark', 'spritesheet.png', 'spritesheet.json');

        scene.load.setPath('assets/atlases/bird');
        scene.load.atlas('bird', 'spritesheet.png', 'spritesheet.json');

        // audios
        scene.load.setPath('assets/audios/map_screen');
        scene.load.audio('ocean_waves', 'ocean_waves.mp3');
        scene.load.audio('achieved_island', 'achieved_island.mp3');
        scene.load.audio('ship_horn_arrival', 'ship_horn_arrival.mp3');
        scene.load.audio('island_entry', 'island_entry.mp3');

        const gameConfigManager = GameConfigManager.getInstance();
        const searchParams = gameConfigManager.getAll();
        const gameParams = extractGameParams(searchParams);
        const topic = gameParams?.topic;

        const levels = topics.find(t => t.name === topic)?.levels;
        if (['add_and_subtract_within_100', 'explore_numbers_to_1000', 'subtract_within_1000'].includes(topic || '')) {
            if (levels) {
                scene.load.setPath(`assets/audios/map_screen/level_texts/${topic}`);
                for (let i = 1; i <= levels.length; i++) {
                    scene.load.audio(`level_${i}_text`, `level_${i}_${language}.mp3`);
                }
            }
        }

        // island theme assets
        const islandNames = CommonConfig.ISLAND_NAMES;
        islandNames.forEach((islandName) => {
            scene.load.setPath(`assets/images/island_themes/${islandName}`);
            const themeKey = `${islandName.toUpperCase()}_THEME_ASSETS` as keyof typeof GameScreenConfig;
            const themeAssets = GameScreenConfig[themeKey] as typeof GameScreenConfig.DEFAULT_ASSETS;
            const imageKeys = themeAssets.KEYS.IMAGE;
            scene.load.image(imageKeys.BACKGROUND.BG_01, imageKeys.BACKGROUND.BG_01);
            scene.load.image(imageKeys.CLICK_MECHANICS.TOP_WOOD, imageKeys.CLICK_MECHANICS.TOP_WOOD);
            scene.load.image(imageKeys.CLICK_MECHANICS.SCREEN_CLICKING, imageKeys.CLICK_MECHANICS.SCREEN_CLICKING);
            scene.load.image(imageKeys.TYPING_MECHANICS.TYPING_MODULE, imageKeys.TYPING_MECHANICS.TYPING_MODULE);
        });
    }
}