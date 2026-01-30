import { BaseScene, LoadingScene as LoadingSceneSdk } from '@k8-games/sdk';
import { SplashScene } from './SplashScene';
import { Game } from './Game';
import { MainMenu } from './MainMenu';
import { TutorialScene } from './TutorialScene';

export class LoadingScene extends BaseScene {
  private loadingScene: LoadingSceneSdk;

  constructor() {
    super('LoadingScene');
    this.loadingScene = LoadingSceneSdk.getInstance();
  }

  // initialize loader
  init() {
    // Initialize SDK loader: it will render background/logo/progress and then go to Splash
    this.loadingScene.init(this, 'SplashScene');
  }

  // queue scene assets
  preload() {
    // Queue downstream scene assets
    SplashScene._preload(this);
    MainMenu._preload(this);
    Game._preload(this);
    TutorialScene._preload(this);
  }

  // preload sdk visuals
  static _preload(scene: BaseScene) {
    // Ask SDK to queue its visuals too (safe if already loaded in Boot)
    LoadingSceneSdk.preload(scene);
  }

  create() {}
}
