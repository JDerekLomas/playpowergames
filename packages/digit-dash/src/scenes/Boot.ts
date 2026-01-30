import { BaseScene } from '@k8-games/sdk';
import { LoadingScene } from './LoadingScene';

export class Boot extends BaseScene {
  constructor() {
    super('Boot');
  }

  // preload common assets
  preload() {
    this.load.setPath('assets/images/loading_screen');
    this.load.image('loading_bar_bg', 'loading_bar_bg.png');
    this.load.image('loading_bar_base', 'loading_bar_base.png');
    this.load.image('loading_bar_progress', 'loading_bar_progress.png');

    this.load.setPath('assets/components/button/audios');
    this.load.audio('button_click', 'button_click.mp3');
    
    LoadingScene._preload(this);
  }

  // start loading scene
  create() {
    this.scene.start('LoadingScene');
  }
}
