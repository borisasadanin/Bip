import Phaser from 'phaser';
import { CONFIG } from '../config';

export class Balloon extends Phaser.Physics.Arcade.Sprite {
  private vx = 0;
  private vy = 0;
  private speedMultiplier = 1;
  private sizeMultiplier = 1;
  private hitboxScale?: number;
  private hitboxOffsetX?: number;
  private hitboxOffsetY?: number;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    speedMultiplier = 1,
    sizeMultiplier = 1,
    hitboxScale?: number,
    hitboxOffsetX?: number,
    hitboxOffsetY?: number
  ) {
    super(scene, x, y, textureKey);
    this.speedMultiplier = speedMultiplier;
    this.sizeMultiplier = sizeMultiplier;
    this.hitboxScale = hitboxScale;
    this.hitboxOffsetX = hitboxOffsetX;
    this.hitboxOffsetY = hitboxOffsetY;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(CONFIG.DEPTH.BALLOON);
    this.setOrigin(0.5, 0.5);
    this.body.setAllowGravity(false);
    const baseMaxHeight = CONFIG.PLANE.HEIGHT * 0.9;
    const baseScale = Math.min(1, baseMaxHeight / this.height);
    this.setScale(baseScale * 2 * this.sizeMultiplier);
    this.applyBalloonHitbox();
    this.body.setAllowGravity(false);
  }

  launch(vx: number, vy: number) {
    this.vx = vx * this.speedMultiplier;
    this.vy = vy * this.speedMultiplier;
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(this.vx, this.vy);
    }
  }

  update(_dt: number, worldWidth: number) {
    if (!this.active) return;
    const minX = -CONFIG.BALLOON.CULL_MARGIN_X;
    const maxX = worldWidth + CONFIG.BALLOON.CULL_MARGIN_X;
    if (this.x < minX) this.x = maxX;
    if (this.x > maxX) this.x = minX;
    if (this.y < -CONFIG.BALLOON.CULL_MARGIN_Y) {
      this.destroy();
    }
  }

  private applyBalloonHitbox() {
    const scale = this.hitboxScale ?? CONFIG.BALLOON.HITBOX_SCALE;
    const offsetXRatio = this.hitboxOffsetX ?? CONFIG.BALLOON.HITBOX_OFFSET_X;
    const offsetYRatio = this.hitboxOffsetY ?? CONFIG.BALLOON.HITBOX_OFFSET_Y;
    const radius = Math.min(this.displayWidth, this.displayHeight) * 0.5 * scale;
    const diameter = radius * 2;
    const offsetX = (this.displayWidth - diameter) * 0.5 + this.displayWidth * offsetXRatio;
    const offsetY = (this.displayHeight - diameter) * 0.5 + this.displayHeight * offsetYRatio;
    this.body.setCircle(radius);
    this.body.setOffset(offsetX, offsetY);
  }
}
