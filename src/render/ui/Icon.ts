/**
 * Icon: one atlas frame (intent icons, relics, card art) at an integer scale.
 */
import type { Atlas } from '../gfx.ts';
import { rect } from '../layout.ts';
import { Sprite } from '../sprite.ts';
import { Widget } from './Widget.ts';

export class Icon extends Widget {
  readonly sprite: Sprite;

  constructor(x: number, y: number, atlas: Atlas, frame: string, scale = 1) {
    const s = new Sprite(atlas, frame, scale);
    super(rect(x, y, s.w, s.h), 'icon');
    this.sprite = this.addPart(s, 0);
    this.label = frame;
  }

  setFrame(name: string): void {
    this.sprite.setFrame(name);
    this.rect = { ...this.rect, w: this.sprite.w, h: this.sprite.h };
    this.label = name;
  }
}
