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

export class EnemyView extends Widget {
  readonly sprite: Sprite;
  private readonly shaker = new THREE.Object3D();

  constructor(atlas: Atlas, frame: string, centerX: number, baselineY: number, scale = 2) {
    const s = new Sprite(atlas, frame, scale);
    super(rect(Math.round(centerX - s.w / 2), Math.round(baselineY - s.h), s.w, s.h), 'enemy');
    this.sprite = s;
    this.focusable = true;
    this.label = frame;
    this.shaker.add(s);
    this.addPart(this.shaker, 0);
    this.setZ(Z.WORLD);
  }

  /** Change the integer magnification, keeping the feet (bottom-centre) where they were. */
  setScale(scale: number): void {
    if (scale === this.sprite.pixelScale) return;
    const cx = this.rect.x + this.rect.w / 2, bottom = this.rect.y + this.rect.h;
    this.sprite.setScale(scale);
    this.rect = rect(Math.round(cx - this.sprite.w / 2), bottom - this.sprite.h, this.sprite.w, this.sprite.h);
    this.syncNode();
  }

  /** Flash white and shake; resolves when both finish. */
  hit(tw: Tweener, px = 3, ms = 240): Promise<void> {
    return Promise.all([flash(tw, this.sprite, ms), shake(tw, this.shaker, px, ms)]).then(() => undefined);
  }
}
