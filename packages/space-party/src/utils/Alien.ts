import { BaseScene, i18n, ImageOverlay } from "@k8-games/sdk";
import AlienConfig from "../config/AlienConfig";
import { ASSETS_PATHS } from "../config/common";

export class Alien {
    private scene: BaseScene;
    private index: number;
    public alienContainer!: Phaser.GameObjects.Container;
    private head!: Phaser.GameObjects.Sprite;
    private body!: Phaser.GameObjects.Image;
    private arms!: Phaser.GameObjects.Image;
    public holdingArms!: Phaser.GameObjects.Image | null; // not part of alien container
    public imageOverlay!: ImageOverlay;

    constructor(scene: BaseScene, index: number, x: number, y: number) {
        this.scene = scene;
        this.index = index;
        this.create(scene, index, x, y);
    }

    static preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/aliens`);
        for (const alien of AlienConfig.ALIENS) {
            // Load head
            scene.load.image(alien.HEAD.DEFAULT.KEY, `${alien.HEAD.DEFAULT.KEY}.png`);
            scene.load.image(alien.HEAD.BLINK[0].KEY, `${alien.HEAD.BLINK[0].KEY}.png`);
            scene.load.image(alien.HEAD.BLINK[1].KEY, `${alien.HEAD.BLINK[1].KEY}.png`);
            scene.load.image(alien.HEAD.BLINK[2].KEY, `${alien.HEAD.BLINK[2].KEY}.png`);
            scene.load.image(alien.HEAD.HAPPY.KEY, `${alien.HEAD.HAPPY.KEY}.png`);
            scene.load.image(alien.HEAD.SAD.KEY, `${alien.HEAD.SAD.KEY}.png`);
            if(alien.HEAD.FEED) {
                scene.load.image(alien.HEAD.FEED.KEY, `${alien.HEAD.FEED.KEY}.png`);
            }
            // Load body
            scene.load.image(alien.BODY.KEY, `${alien.BODY.KEY}.png`);
            // Load arms
            scene.load.image(alien.ARMS.DEFAULT.KEY, `${alien.ARMS.DEFAULT.KEY}.png`);
            scene.load.image(alien.ARMS.HOLD.KEY, `${alien.ARMS.HOLD.KEY}.png`);
        }
    }

    private create(scene: BaseScene, index: number, x: number, y: number) {
        // Clamp index to valid range
        index = Math.max(0, Math.min(index, AlienConfig.ALIENS.length - 1));
        const config = AlienConfig.ALIENS[index];

        this.alienContainer = scene.add.container(scene.getScaledValue(x), scene.getScaledValue(y));
        this.head = scene.addSprite(config.HEAD.DEFAULT.X, config.HEAD.DEFAULT.Y, config.HEAD.DEFAULT.KEY);
        this.body = scene.addImage(config.BODY.X, config.BODY.Y, config.BODY.KEY);
        this.arms = scene.addImage(config.ARMS.DEFAULT.X, config.ARMS.DEFAULT.Y, config.ARMS.DEFAULT.KEY);

        this.imageOverlay = new ImageOverlay(scene, this.head, {
            label: i18n.t("game.alienWithIndex", {index: index + 1}),
            style: {
                top: `${scene.getScaledValue(y + 100)}px`,
                left: `${scene.getScaledValue(x)}px`,
                width: `100px`,
                height: `100px`,
            }
        });

        const renderOrder = config.RENDER_ORDER || ["body", "arms", "head"];
        for (const element of renderOrder) {
            if (element === "head") {
                this.alienContainer.add(this.head);
            } else if (element === "body") {
                this.alienContainer.add(this.body);
            } else if (element === "arms") {
                this.alienContainer.add(this.arms);
            }
        }
    }

    startBlinking() {   

        const headConfig = AlienConfig.ALIENS[this.index].HEAD;
        const animationKey = `blink_${this.index}`;

        // Make head default
        this.head.setTexture(headConfig.DEFAULT.KEY);

        // Create blink animation once if not exists
        if (!this.scene.anims.exists(animationKey)) {
            this.scene.anims.create({
                key: animationKey,
                frames: [
                    { key: headConfig.BLINK[0].KEY },
                    { key: headConfig.BLINK[1].KEY },
                    { key: headConfig.BLINK[2].KEY },
                    { key: headConfig.BLINK[1].KEY },
                    { key: headConfig.BLINK[0].KEY },
                    { key: headConfig.DEFAULT.KEY }
                ],
                frameRate: 10,
                repeat: 0
            });
        }

        // Randomize time between 2 to 5 seconds for natural blinking
        const timeInterval = Phaser.Math.Between(3000, 6000);

        // Play animation
        const intervalId = setInterval(() => {
            this.head?.play(animationKey);
        }, timeInterval); 

        // Set intervalId to alien
        this.alienContainer.setData("intervalId", intervalId);

        // Stop blinking on destroy
        this.head.on("destroy", () => {
            clearInterval(intervalId);
        });
    }

    stopBlinking() {
        const intervalId = this.alienContainer.getData("intervalId");
        if(intervalId) {
            clearInterval(intervalId);
        }
    }

    makeHappy() {
        const headConfig = AlienConfig.ALIENS[this.index].HEAD;

        // Update head texture to happy
        this.head.setTexture(headConfig.HAPPY.KEY);

        // create a tween chain for the head rotation animation
        const tweenChain = this.scene.tweens.chain({
            targets: this.head,
            ease: "Sine.easeInOut",
            tweens: [
                {
                    angle: -8,
                    duration: 200,
                },
                {
                    angle: 8,
                    duration: 200,
                },
                {
                    angle: -8,
                    duration: 200,
                },
                {
                    angle: 0,
                    duration: 200,
                },
            ],
        });

        // play the tween chain
        tweenChain.play();

        // stop the tween chain on destroy
        this.head.on("destroy", () => {
            tweenChain.stop();
        });
    }

    makeSad() {
        const headConfig = AlienConfig.ALIENS[this.index].HEAD;

        // Update head texture to sad
        this.head.setTexture(headConfig.SAD.KEY);

        // Create a tween chain for the head down up animation
        const tweenChain = this.scene.tweens.chain({
            targets: this.head,
            ease: "Sine.easeInOut",
            tweens: [
                {
                    y: this.head.y + 10,
                    duration: 200,
                },
                {
                    y: this.head.y,
                    duration: 200,
                },
            ],
            repeat: 1
        });

        // Play the tween chain
        tweenChain.play();

        // Stop the tween chain on destroy
        this.head.on("destroy", () => {
            tweenChain.stop();
        });
    }

    setHoldingArms() {
        // Hide the arms
        this.arms.setAlpha(0);

        const armsConfig = AlienConfig.ALIENS[this.index].ARMS;

        // Create holding arms
        const holdingArmsX = this.alienContainer.x / this.scene.display.scale + armsConfig.HOLD.X;
        const holdingArmsY = this.alienContainer.y / this.scene.display.scale + armsConfig.HOLD.Y;

        // Create holding arms
        this.holdingArms = this.scene.addImage(holdingArmsX, holdingArmsY, armsConfig.HOLD.KEY);

        // Set holding arms scale
        this.holdingArms.setScale(this.alienContainer.scale);
    }

    setDefaultArms() {
        // Show the arms
        this.arms.setAlpha(1);

        // Remove the holding arms
        this.holdingArms?.destroy();
        this.holdingArms = null;
    }
}