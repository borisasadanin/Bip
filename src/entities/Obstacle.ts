import Phaser from 'phaser';
import { CONFIG } from '../config';

export class Obstacle extends Phaser.GameObjects.Rectangle {
  public readonly isHouse: boolean;
  public body: Phaser.Physics.Arcade.StaticBody;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    isHouse = false
  ) {
    super(scene, x, y, width, height, color);
    this.isHouse = isHouse;

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setDepth(CONFIG.DEPTH.OBSTACLE);
    this.body = this.body as Phaser.Physics.Arcade.StaticBody;
  }
}
