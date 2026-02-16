import Phaser from 'phaser';
import { CONFIG } from '../config';
import { Balloon } from '../entities/Balloon';
import { Plane } from '../entities/Plane';
import type { PlaneInput } from '../entities/Plane';
import { Hud } from '../ui/Hud';
import { clamp, lerp } from '../utils/math';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  private plane1!: Plane;
  private plane2!: Plane;
  private balloons!: Phaser.Physics.Arcade.Group;
  private bigBalloon?: Balloon;
  private hud!: Hud;

  private scores = { p1: 0, p2: 0 };
  private isGameOver = false;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private p2Keys!: { [key: string]: Phaser.Input.Keyboard.Key };
  private restartKey!: Phaser.Input.Keyboard.Key;
  private balloonTimer?: Phaser.Time.TimerEvent;
  private bigBalloonTimer?: Phaser.Time.TimerEvent;
  private debugKey!: Phaser.Input.Keyboard.Key;

  private cameraTarget!: Phaser.GameObjects.Rectangle;
  private house!: Phaser.Physics.Arcade.Image;

  preload() {
    this.load.image('plane-red-right', 'canvas/bilder/red plane right.png');
    this.load.image('plane-yellow', 'canvas/bilder/yellow plane.png');
    this.load.image('ground-grass', 'canvas/bilder/ground_grass.png');
    this.load.image('house', 'canvas/bilder/house.png');
    this.load.image('balloon-1', 'canvas/bilder/Balloon 1.png');
    this.load.image('balloon-2', 'canvas/bilder/Balloon 2.png');
    this.load.image('big-balloon', 'canvas/bilder/big balloon.png');
  }

  create() {
    this.scores = { p1: 0, p2: 0 };
    this.isGameOver = false;

    this.createTextures();
    this.createBackground();

    // P1 = red plane, starts on the left, faces right
    this.plane1 = new Plane(
      this,
      CONFIG.DESIGN_WIDTH * CONFIG.SPAWN.PLANE_P1_X_RATIO,
      CONFIG.GROUND_Y - CONFIG.PLANE.HEIGHT * 0.5,
      'plane-red-right',
      1,
      0,
      false
    );

    // P2 = yellow plane, starts on the right, faces left
    this.plane2 = new Plane(
      this,
      CONFIG.DESIGN_WIDTH * CONFIG.SPAWN.PLANE_P2_X_RATIO,
      CONFIG.GROUND_Y - CONFIG.PLANE.HEIGHT * 0.5,
      'plane-yellow',
      -1,
      180,
      false
    );

    this.balloons = this.physics.add.group();

    this.createHouse();

    this.plane1.onCrash = (x, y) => this.spawnCrashSmoke(x, y);
    this.plane2.onCrash = (x, y) => this.spawnCrashSmoke(x, y);

    this.hud = new Hud(this);
    this.hud.setScores(this.scores.p1, this.scores.p2);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.p2Keys = this.input.keyboard.addKeys('W,A,S,D') as { [key: string]: Phaser.Input.Keyboard.Key };
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.debugKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ZERO);

    // House collision via physics overlap
    this.physics.add.overlap(this.plane1, this.house, () => {
      if (this.plane1.state !== 'CRASHED') this.plane1.crash();
    });
    this.physics.add.overlap(this.plane2, this.house, () => {
      if (this.plane2.state !== 'CRASHED') this.plane2.crash();
    });

    // Plane-to-plane and plane-balloon collisions are handled manually in update()

    this.cameraTarget = this.add.rectangle(
      CONFIG.DESIGN_WIDTH / 2,
      CONFIG.DESIGN_HEIGHT / 2,
      CONFIG.CAMERA.TARGET_SIZE,
      CONFIG.CAMERA.TARGET_SIZE,
      0xffffff,
      0
    );
    this.cameras.main.setBounds(0, 0, CONFIG.DESIGN_WIDTH, CONFIG.DESIGN_HEIGHT);
    this.cameras.main.startFollow(this.cameraTarget, true, CONFIG.CAMERA.FOLLOW_LERP, CONFIG.CAMERA.FOLLOW_LERP);
    this.cameras.main.setFollowOffset(0, 0);
    this.cameras.main.fadeIn(
      CONFIG.CAMERA.FADE_IN_DURATION,
      CONFIG.CAMERA.FADE_IN_COLOR.r,
      CONFIG.CAMERA.FADE_IN_COLOR.g,
      CONFIG.CAMERA.FADE_IN_COLOR.b
    );

    this.scheduleBalloonSpawn();
    this.scheduleBigBalloonSpawn();

  }

  update(time: number, delta: number) {
    void time;
    if (this.isGameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.time.removeAllEvents();
        this.scene.restart();
      }
      return;
    }

    // Clamp delta to prevent physics overshoot on first frames after reload
    const dt = Math.min(delta / 1000, 1 / 30);

    // P1 = red plane, WASD
    const input1: PlaneInput = {
      up: Boolean(this.p2Keys.W?.isDown),
      down: Boolean(this.p2Keys.S?.isDown),
      left: Boolean(this.p2Keys.A?.isDown),
      right: Boolean(this.p2Keys.D?.isDown)
    };

    // P2 = yellow plane, Arrow keys
    const input2: PlaneInput = {
      up: Boolean(this.cursors.up?.isDown),
      down: Boolean(this.cursors.down?.isDown),
      left: Boolean(this.cursors.left?.isDown),
      right: Boolean(this.cursors.right?.isDown)
    };

    this.plane1.setInCloud(false);
    this.plane2.setInCloud(false);

    this.plane1.update(dt, input1, CONFIG.DESIGN_WIDTH, CONFIG.GROUND_Y);
    this.plane2.update(dt, input2, CONFIG.DESIGN_WIDTH, CONFIG.GROUND_Y);

    // Plane-to-plane collision
    if (
      !this.isGameOver &&
      this.plane1.state !== 'CRASHED' &&
      this.plane2.state !== 'CRASHED'
    ) {
      const p1b = this.plane1.getBounds();
      const p2b = this.plane2.getBounds();
      if (Phaser.Geom.Intersects.RectangleToRectangle(p1b, p2b)) {
        this.plane1.crash();
        this.plane2.crash();
      }
    }

    const toDestroy: Balloon[] = [];
    this.balloons.children.iterate(child => {
      if (!child) return;
      const balloon = child as Balloon;
      balloon.update(dt, CONFIG.DESIGN_WIDTH);
      if (!balloon.active || this.isGameOver) return;

      // Bulb center: top of sprite + 30% down the height
      const bulbX = balloon.x;
      const bulbY = balloon.y - balloon.displayHeight * 0.5
        + balloon.displayHeight * CONFIG.BALLOON.BULB_CENTER_Y;
      const bulbR = balloon.displayWidth * CONFIG.BALLOON.BULB_RADIUS_RATIO;
      const bulbR2 = bulbR * bulbR;

      // plane1 = red (P1), pops balloon → scores for P2
      if (this.plane1.state === 'FLYING' || this.plane1.state === 'STALLED') {
        const nose = this.plane1.getNosePosition();
        const dx = nose.x - bulbX;
        const dy = nose.y - bulbY;
        if (dx * dx + dy * dy < bulbR2) {
          this.spawnBalloonPop(nose.x, nose.y);
          toDestroy.push(balloon);
          this.scores.p2 += 1;
          this.hud.setScores(this.scores.p1, this.scores.p2);
          this.checkWin();
          return;
        }
      }

      // plane2 = yellow (P2), pops balloon → scores for P1
      if (this.plane2.state === 'FLYING' || this.plane2.state === 'STALLED') {
        const nose = this.plane2.getNosePosition();
        const dx = nose.x - bulbX;
        const dy = nose.y - bulbY;
        if (dx * dx + dy * dy < bulbR2) {
          this.spawnBalloonPop(nose.x, nose.y);
          toDestroy.push(balloon);
          this.scores.p1 += 1;
          this.hud.setScores(this.scores.p1, this.scores.p2);
          this.checkWin();
          return;
        }
      }
    });
    toDestroy.forEach(b => b.destroy());

    if (this.bigBalloon) {
      if (!this.bigBalloon.active) {
        this.bigBalloon = undefined;
        this.scheduleBigBalloonSpawn();
      } else {
        this.bigBalloon.update(dt, CONFIG.DESIGN_WIDTH);
        const p1Bounds = this.plane1.getBounds();
        const p2Bounds = this.plane2.getBounds();
        const bigBounds = this.getBalloonHitboxRect(
          this.bigBalloon,
          CONFIG.BIG_BALLOON.HITBOX_SCALE,
          CONFIG.BIG_BALLOON.HITBOX_OFFSET_X,
          CONFIG.BIG_BALLOON.HITBOX_OFFSET_Y
        );
        if (
          this.plane1.state !== 'GROUNDED' &&
          this.plane1.state !== 'CRASHED' &&
          Phaser.Geom.Intersects.RectangleToRectangle(p1Bounds, bigBounds)
        ) {
          this.plane1.crash();
        } else if (
          this.plane2.state !== 'GROUNDED' &&
          this.plane2.state !== 'CRASHED' &&
          Phaser.Geom.Intersects.RectangleToRectangle(p2Bounds, bigBounds)
        ) {
          this.plane2.crash();
        }
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      const world = this.physics.world;
      world.drawDebug = !world.drawDebug;
      if (world.drawDebug) {
        world.createDebugGraphic();
        if (world.debugGraphic) world.debugGraphic.setDepth(CONFIG.DEPTH.OVERLAY);
      } else if (world.debugGraphic) {
        world.debugGraphic.clear();
        world.debugGraphic.setVisible(false);
      }
    }

    const targetX = clamp(
      (this.plane1.x + this.plane2.x) * 0.5,
      CONFIG.DESIGN_WIDTH * CONFIG.CAMERA.TARGET_CLAMP_X_MIN,
      CONFIG.DESIGN_WIDTH * CONFIG.CAMERA.TARGET_CLAMP_X_MAX
    );
    const targetY = clamp(
      (this.plane1.y + this.plane2.y) * 0.5,
      CONFIG.DESIGN_HEIGHT * CONFIG.CAMERA.TARGET_CLAMP_Y_MIN,
      CONFIG.DESIGN_HEIGHT * CONFIG.CAMERA.TARGET_CLAMP_Y_MAX
    );

    this.cameraTarget.setPosition(
      lerp(this.cameraTarget.x, targetX, CONFIG.CAMERA.FOLLOW_LERP),
      lerp(this.cameraTarget.y, targetY, CONFIG.CAMERA.FOLLOW_LERP)
    );
  }

  private createTextures() {
    Plane.createPropellerTexture(this);

    const keys = [
      'plane-yellow',
      'plane-red-right',
      'ground-grass',
      'house',
      'balloon-1',
      'balloon-2',
      'big-balloon'
    ];
    keys.forEach(key => {
      const tex = this.textures.get(key);
      if (tex) tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    });

    if (!this.textures.exists('particle')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(6, 6, 6);
      gfx.generateTexture('particle', 12, 12);
      gfx.destroy();
    }
  }

  private createBackground() {
    const gfx = this.add.graphics();
    const skyHeight = CONFIG.DESIGN_HEIGHT * CONFIG.SKY_HEIGHT_RATIO;

    gfx.fillGradientStyle(CONFIG.COLORS.SPACE, CONFIG.COLORS.SPACE, CONFIG.COLORS.SKY_TOP, CONFIG.COLORS.SKY_TOP, 1);
    gfx.fillRect(0, 0, CONFIG.DESIGN_WIDTH, skyHeight);
    gfx.fillStyle(CONFIG.COLORS.SKY_TOP, 1);
    gfx.fillRect(0, skyHeight, CONFIG.DESIGN_WIDTH, CONFIG.GROUND_Y - skyHeight);
    gfx.fillStyle(CONFIG.COLORS.GRASS_BASE, 1);
    gfx.fillRect(0, CONFIG.GROUND_Y, CONFIG.DESIGN_WIDTH, CONFIG.GROUND_HEIGHT);

    gfx.setDepth(CONFIG.DEPTH.BACKGROUND);

    const ground = this.add.image(CONFIG.DESIGN_WIDTH / 2, CONFIG.GROUND_Y - 30, 'ground-grass');
    ground.setOrigin(0.5, 0);
    ground.setDisplaySize(CONFIG.DESIGN_WIDTH, CONFIG.GROUND_HEIGHT);
    ground.setDepth(CONFIG.DEPTH.BACKGROUND + 1);
  }

  private createHouse() {
    this.house = this.physics.add.image(CONFIG.DESIGN_WIDTH / 2, CONFIG.GROUND_Y + 40, 'house');
    this.house.setOrigin(0.5, 1);
    const scale = (CONFIG.OBSTACLES.HOUSE_WIDTH * 1.5) / this.house.width;
    this.house.setScale(scale);
    this.house.setDepth(CONFIG.DEPTH.OBSTACLE);
    this.house.setImmovable(true);

    const body = this.house.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    // Shrink physics body to only the building walls + roof (not garden/fence/grass)
    // Image is 1536x1024. Building body is ~50% width, from ~12% to ~65% height.
    const imgW = this.house.width;
    const imgH = this.house.height;
    const bodyW = imgW * 0.50;
    const bodyH = imgH * 0.53;  // from 12% to 65%
    const offsetX = (imgW - bodyW) * 0.5;
    const offsetY = imgH * 0.12;
    body.setSize(bodyW, bodyH, false);
    body.setOffset(offsetX, offsetY);
  }

  private scheduleBalloonSpawn() {
    this.balloonTimer?.remove(false);
    const delay = Phaser.Math.Between(CONFIG.BALLOON.SPAWN_MIN_MS, CONFIG.BALLOON.SPAWN_MAX_MS);

    this.balloonTimer = this.time.addEvent({
      delay,
      callback: () => {
        this.spawnBalloon();
        this.scheduleBalloonSpawn();
      }
    });
  }

  private spawnBalloon() {
    const x = Phaser.Math.Between(0, CONFIG.DESIGN_WIDTH);
    const y = CONFIG.GROUND_Y + CONFIG.GROUND_HEIGHT * 0.3;
    const textureKey = Phaser.Math.Between(1, 2) === 1 ? 'balloon-1' : 'balloon-2';

    const balloon = new Balloon(this, x, y, textureKey);
    balloon.setDepth(CONFIG.DEPTH.BACKGROUND + 0.5);
    this.balloons.add(balloon);

    const vy = -Phaser.Math.Between(CONFIG.BALLOON.SPEED_Y_MIN, CONFIG.BALLOON.SPEED_Y_MAX);
    const vxMagnitude = Phaser.Math.Between(CONFIG.BALLOON.SPEED_X_MIN, CONFIG.BALLOON.SPEED_X_MAX);
    const vx = Phaser.Math.Between(0, 1) === 0 ? -vxMagnitude : vxMagnitude;
    balloon.launch(vx, vy);
  }

  private scheduleBigBalloonSpawn() {
    this.bigBalloonTimer?.remove(false);
    const delay = Phaser.Math.Between(CONFIG.BALLOON.SPAWN_MIN_MS, CONFIG.BALLOON.SPAWN_MAX_MS);

    this.bigBalloonTimer = this.time.addEvent({
      delay,
      callback: () => {
        if (!this.bigBalloon) {
          this.spawnBigBalloon();
        } else {
          this.scheduleBigBalloonSpawn();
        }
      }
    });
  }

  private spawnBigBalloon() {
    if (this.bigBalloon) return;
    const x = Phaser.Math.Between(0, CONFIG.DESIGN_WIDTH);
    const y = CONFIG.GROUND_Y + CONFIG.GROUND_HEIGHT * 0.3;

    const bigBalloon = new Balloon(
      this,
      x,
      y,
      'big-balloon',
      CONFIG.BIG_BALLOON.SPEED_MULTIPLIER,
      CONFIG.BIG_BALLOON.SIZE_MULTIPLIER,
      CONFIG.BIG_BALLOON.HITBOX_SCALE,
      CONFIG.BIG_BALLOON.HITBOX_OFFSET_X,
      CONFIG.BIG_BALLOON.HITBOX_OFFSET_Y
    );
    bigBalloon.setDepth(CONFIG.DEPTH.BACKGROUND + 0.5);
    const vy = -Phaser.Math.Between(CONFIG.BALLOON.SPEED_Y_MIN, CONFIG.BALLOON.SPEED_Y_MAX);
    const vxMagnitude = Phaser.Math.Between(CONFIG.BALLOON.SPEED_X_MIN, CONFIG.BALLOON.SPEED_X_MAX);
    const vx = Phaser.Math.Between(0, 1) === 0 ? -vxMagnitude : vxMagnitude;
    bigBalloon.launch(vx, vy);

    this.bigBalloon = bigBalloon;
  }

  private getBalloonHitboxRect(
    sprite: Phaser.GameObjects.Sprite,
    scale: number,
    offsetXRatio: number,
    offsetYRatio: number
  ) {
    const w = sprite.displayWidth;
    const h = sprite.displayHeight;
    const diameter = Math.min(w, h) * scale;
    const offsetX = (w - diameter) * 0.5 + w * offsetXRatio;
    const offsetY = (h - diameter) * 0.5 + h * offsetYRatio;

    return new Phaser.Geom.Rectangle(
      sprite.x - w * 0.5 + offsetX,
      sprite.y - h * 0.5 + offsetY,
      diameter,
      diameter
    );
  }


  private spawnBalloonPop(x: number, y: number) {
    const emitter = this.add.particles(x, y, 'particle', {
      speed: { min: CONFIG.FX.POP_SPEED_MIN, max: CONFIG.FX.POP_SPEED_MAX },
      angle: { min: CONFIG.FX.POP_ANGLE_MIN, max: CONFIG.FX.POP_ANGLE_MAX },
      scale: { start: CONFIG.FX.POP_SCALE_START, end: CONFIG.FX.POP_SCALE_END },
      lifespan: CONFIG.FX.POP_LIFESPAN,
      quantity: CONFIG.FX.POP_COUNT,
      tint: [0xff4444, 0xffaa00, 0xffff44]
    });

    emitter.explode(CONFIG.FX.POP_COUNT, 0, 0);
    emitter.stop();
    this.time.delayedCall(CONFIG.FX.POP_LIFESPAN + CONFIG.FX.CLEAR_DELAY, () => emitter.destroy());
  }

  private spawnCrashSmoke(x: number, y: number) {
    const emitter = this.add.particles(x, y, 'particle', {
      speed: { min: CONFIG.FX.CRASH_SPEED_MIN, max: CONFIG.FX.CRASH_SPEED_MAX },
      angle: { min: CONFIG.FX.CRASH_ANGLE_MIN, max: CONFIG.FX.CRASH_ANGLE_MAX },
      scale: { start: CONFIG.FX.CRASH_SCALE_START, end: CONFIG.FX.CRASH_SCALE_END },
      lifespan: CONFIG.FX.CRASH_LIFESPAN,
      quantity: CONFIG.FX.CRASH_COUNT,
      tint: CONFIG.COLORS.SMOKE
    });

    emitter.explode(CONFIG.FX.CRASH_COUNT, 0, 0);
    emitter.stop();
    this.time.delayedCall(CONFIG.FX.CRASH_LIFESPAN + CONFIG.FX.CLEAR_DELAY, () => emitter.destroy());
  }

  private checkWin() {
    if (this.scores.p1 >= CONFIG.SCORE_TO_WIN) {
      this.endGame('P1');
    } else if (this.scores.p2 >= CONFIG.SCORE_TO_WIN) {
      this.endGame('P2');
    }
  }

  private endGame(winner: string) {
    this.isGameOver = true;

    this.physics.world.pause();
    this.plane1.body?.setVelocity(0, 0);
    this.plane2.body?.setVelocity(0, 0);

    this.hud.showWinner(winner);
  }
}
