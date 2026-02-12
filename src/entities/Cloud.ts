import Phaser from 'phaser';
import { CONFIG } from '../config';

export class Cloud extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'cloud');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(CONFIG.DEPTH.CLOUD);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
  }

  update(dt: number, worldWidth: number) {
    this.x += CONFIG.CLOUD.SPEED * dt;
    if (this.x - this.displayWidth * CONFIG.CLOUD.CULL_MARGIN_X > worldWidth) {
      this.destroy();
    }
  }

  static createTexture(scene: Phaser.Scene) {
    if (scene.textures.exists('cloud')) return;

    const gfx = scene.add.graphics();
    const width = 140;
    const height = 80;

    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(40, 45, 30);
    gfx.fillCircle(70, 30, 35);
    gfx.fillCircle(100, 45, 28);
    gfx.fillRoundedRect(25, 40, 95, 35, 16);

    gfx.generateTexture('cloud', width, height);
    gfx.destroy();
  }
}
