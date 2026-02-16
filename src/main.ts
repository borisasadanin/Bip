import Phaser from 'phaser';
import './style.css';
import { StartScene } from './scenes/StartScene';
import { GameScene } from './scenes/GameScene';
import { CONFIG } from './config';

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: CONFIG.DESIGN_WIDTH,
  height: CONFIG.DESIGN_HEIGHT,
  parent: 'app',
  backgroundColor: CONFIG.COLORS.SPACE,
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    antialiasGL: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [StartScene, GameScene]
};

new Phaser.Game(gameConfig);
