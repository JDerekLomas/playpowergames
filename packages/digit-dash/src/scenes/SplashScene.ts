import { AnalyticsHelper, BaseScene, ButtonHelper, GameConfigManager, i18n, ImageOverlay, setSceneBackground } from '@k8-games/sdk';

export class SplashScene extends BaseScene {
  constructor() {
    super('SplashScene');
  }

  // setup visuals
  init() {
    setSceneBackground('assets/images/splash_screen/splashscreen_bg.png');

    this.addImage(this.display.width / 2, this.display.height / 2, 'splashscreen_bg').setOrigin(0.5);

    const gameConfigManager = GameConfigManager.getInstance();
    const lang = gameConfigManager.get('lang') || 'en';
    const titleKey = `splashscreen_gametitle_${lang}`;

    const title = this.addImage(this.display.width / 2, this.display.height / 2 - 165, titleKey)
      .setOrigin(0.5)
      .setDepth(2);
    new ImageOverlay(this, title, { label: i18n.t('common.title') });

    const playButton = ButtonHelper.createButton({
      scene: this,
      imageKeys: {
        default: 'btn_default',
        hover: 'btn_hover',
        pressed: 'btn_pressed',
      },
      text: i18n.t('common.play'),
      label: i18n.t('common.play'),
      textStyle: { font: '700 32px Exo', color: '#ffffff' },
      imageScale: 0.9,
      raisedOffset: 3.5,
      x: this.display.width / 2,
      y: this.display.height - 180,
      onClick: () => {
        this.scene.start('MainMenu');
      },
    });

    ButtonHelper.startBreathingAnimation(playButton, { scale: 1.08, duration: 1000, ease: 'Sine.easeInOut' });

    this.audioManager.initialize(this);
  }

  // preload splash assets
  static _preload(scene: BaseScene) {
    scene.load.setPath('assets/images/splash_screen');
    scene.load.image('splashscreen_bg', 'splashscreen_bg.png');

    const gameConfigManager = GameConfigManager.getInstance();
    const lang = gameConfigManager.get('lang') || 'en';
    scene.load.image(`splashscreen_gametitle_${lang}`, `splashscreen_gametitle_${lang}.png`);

    scene.load.setPath('assets/components/button/images/purple');
    scene.load.image('btn_default', 'btn_default.png');
    scene.load.image('btn_hover', 'btn_hover.png');
    scene.load.image('btn_pressed', 'btn_pressed.png');

    // Audio needed on splash interactions
    scene.load.setPath('assets/components/button/audios');
    scene.load.audio('button_click', 'button_click.mp3');

    scene.load.setPath('assets/audios');
    scene.load.audio('bg-music', 'bg-music.mp3');
  }

  create() {
    const gameConfigManager = GameConfigManager.getInstance();
    const topic = gameConfigManager.get('topic') || '';

    if (topic === 'grade4_topic6') {
      AnalyticsHelper.createInstance('dino_muncher', topic);
    } else {
      AnalyticsHelper.createInstance('multiverse', topic, { isMultiverse: true });
    }
  }
}
