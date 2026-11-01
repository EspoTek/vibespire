/**
 * EnemyView: an enemy sprite drawn at an integer scale (2x by default: 64 px art -> 128 px),
 * anchored by its feet: bottom-centre at (centerX, baselineY). Focusable (targeting in phase 2).
 * `hit()` plays the SMS-style white flash + whole-pixel shake; the sprite is placed inside a
 * container node so shaking never disturbs layout.
 */
import * as THREE from 'three';
import type { Atlas } from '../gfx.ts';
import { rect } from '../layout.ts';
import { Sprite } from '../sprite.ts';
import { flash, shake, type Tweener } from '../tween.ts';
import { Widget, Z } from './Widget.ts';

/** Idle bob: 1 px, two frames, ~0.45 s each (SMS-style two-frame idle). */
const BOB_MS = 450;

export class EnemyView extends Widget {
  readonly sprite: Sprite;
  private readonly shaker = new THREE.Object3D();
  /** Bob clock; seeded per enemy so a row of them doesn't bob in lock-step. */
  private bobClock: number;
  /** Extra offset while lunging (px toward the player, i.e. down the screen). */
  private lungeY = 0;

  constructor(atlas: Atlas, frame: string, centerX: number, baselineY: number, scale = 2) {
    const s = new Sprite(atlas, frame, scale);
    super(rect(Math.round(centerX - s.w / 2), Math.round(baselineY - s.h), s.w, s.h), 'enemy');
    this.sprite = s;
    this.focusable = true;
    this.label = frame;
    this.shaker.add(s);
    this.addPart(this.shaker, 0);
    this.setZ(Z.WORLD);
    this.bobClock = (frame.length * 137) % BOB_MS;
  }

  override update(dtMs: number): void {
    this.bobClock += dtMs;
    const bob = Math.floor(this.bobClock / BOB_MS) % 2;
    this.sprite.position.y = bob + this.lungeY;
  }

  /** Attack lunge: step 4 px toward the player in whole pixels, flash, step back. */
  async lunge(tw: Tweener): Promise<void> {
    for (const y of [2, 4]) { this.lungeY = y; await tw.delay(30); }
    await flash(tw, this.sprite, 120);
    for (const y of [2, 0]) { this.lungeY = y; await tw.delay(30); }
  }

  /** Attack-pose offset in whole px (negative = rear back, positive = toward the player); fx timelines drive it. */
  setLunge(y: number): void { this.lungeY = Math.round(y); }

  /** Change the integer magnification, keeping the feet (bottom-centre) where they were. */
  setScale(scale: number): void {
    if (scale === this.sprite.pixelScale) return;
    const cx = this.rect.x + this.rect.w / 2, bottom = this.rect.y + this.rect.h;
    this.sprite.setScale(scale);
    this.rect = rect(Math.round(cx - this.sprite.w / 2), bottom - this.sprite.h, this.sprite.w, this.sprite.h);
    this.syncNode();
  }

  /** Flash white and shake; resolves when both finish. */
  hit(tw: Tweener, px = 3, ms = 240, startOff = false): Promise<void> {
    return Promise.all([flash(tw, this.sprite, ms, 15, startOff), shake(tw, this.shaker, px, ms)]).then(() => undefined);
  }
}
