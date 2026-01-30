import { BaseScene } from "@k8-games/sdk";
import BackgroundConfig from "../config/BackgroundConfig";
import { ASSETS_PATHS } from "../config/common";

export class BackgroundHelper {
    static preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/background`);
        scene.load.image(BackgroundConfig.BACKGROUND.KEY, `${BackgroundConfig.BACKGROUND.KEY}.png`);
        scene.load.image(BackgroundConfig.SPACESHIP_COCKPIT.KEY, `${BackgroundConfig.SPACESHIP_COCKPIT.KEY}.png`);
        scene.load.image(BackgroundConfig.PLANETS[0].KEY, `${BackgroundConfig.PLANETS[0].KEY}.png`);
        scene.load.image(BackgroundConfig.PLANETS[1].KEY, `${BackgroundConfig.PLANETS[1].KEY}.png`);
    }

    static createBackground(scene: BaseScene) {
        // Create background
        scene.addImage(
            BackgroundConfig.BACKGROUND.POSITION.X,
            BackgroundConfig.BACKGROUND.POSITION.Y,
            BackgroundConfig.BACKGROUND.KEY
        );

        // Create planets
        BackgroundConfig.PLANETS.map((planet) => {
            const newPlanet = scene.addImage(
                planet.POSITION.X,
                planet.POSITION.Y,
                planet.KEY
            );

            // Rotate planet
            const handleRotation = () => {
                newPlanet.rotation = Phaser.Math.Angle.Wrap(
                    newPlanet.rotation + planet.ROTATION
                );
            };
            // Add event listener to update planet rotation
            scene.events.on("update", handleRotation);
            // Remove event listener when planet is destroyed
            newPlanet.on("destroy", () => {
                scene.events.off("update", handleRotation);
            });
        });

        // Create spaceship cockpit
        scene.addImage(
            BackgroundConfig.SPACESHIP_COCKPIT.POSITION.X,
            BackgroundConfig.SPACESHIP_COCKPIT.POSITION.Y,
            BackgroundConfig.SPACESHIP_COCKPIT.KEY
        );
    }
}
