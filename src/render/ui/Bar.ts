/**
 * Bar: horizontal HP / energy / block bar, optionally segmented, rasterised into one small texture
 * that is re-uploaded only when the value changes. Optional value text ("42/60") to the right or
 * centred over it.
 */
import * as THREE from 'three';
import { fonts } from '../fonts.ts';
import { quadGeometry, spriteMaterial, textureFromPixels, updateTexturePixels } from '../gfx.ts';
import type { Rect } from '../layout.ts';
import { C } from '../palette.ts';
import { Text } from '../text.ts';
import { rasterizeBar, type BarArt } from './art.ts';
import { Widget } from './Widget.ts';

export interface BarOptions extends BarArt {
  value: number;
  max: number;
  /** Show "value/max" in the small font: 'right' of the bar or 'over' it. */
  showValue?: 'right' | 'over';
  /** Focusable bars act as sliders: left/right change the value by `step`. */
  step?: number;
  onChange?: (value: number) => void;
  /** Spoken name ("HP", "Volume"). */
  name?: string;
}

export class Bar extends Widget {
  private readonly art: BarArt;
  private readonly tex: THREE.DataTexture;
  private _value: number;
  private _max: number;
  private readonly valueText: Text | null;
  private readonly opts: BarOptions;

  constructor(r: Rect, opts: BarOptions) {
    super(r, 'bar');
    this.opts = opts;
    this.art = { fill: opts.fill, ...(opts.back !== undefined ? { back: opts.back } : {}), ...(opts.border !== undefined ? { border: opts.border } : {}), ...(opts.hi !== undefined ? { hi: opts.hi } : {}), ...(opts.segment !== undefined ? { segment: opts.segment } : {}) };
    this._value = opts.value;
    this._max = opts.max;
    this.tex = textureFromPixels(rasterizeBar(r.w, r.h, opts.value, opts.max, this.art));
    this.addPart(new THREE.Mesh(quadGeometry(r.w, r.h), spriteMaterial(this.tex)), 0);
    this.valueText = opts.showValue ? this.addPart(new Text(fonts.small, '', { color: C.text, outline: C.black }), 2) : null;
    if (opts.step !== undefined) this.focusable = true;
    this.refreshText();
  }

  get value(): number { return this._value; }
  get max(): number { return this._max; }

  set(value: number, max: number = this._max): void {
    if (value === this._value && max === this._max) return;
    this._value = value;
    this._max = max;
    updateTexturePixels(this.tex, rasterizeBar(this.rect.w, this.rect.h, value, max, this.art));
    this.refreshText();
  }

  private refreshText(): void {
    this.label = `${this.opts.name ?? 'Bar'}: ${Math.round(this._value)} of ${this._max}`;
    if (!this.valueText) return;
    this.valueText.setText(`${Math.round(this._value)}/${this._max}`);
    if (this.opts.showValue === 'right') this.valueText.place(this.rect.w + 3, Math.floor((this.rect.h - 5) / 2));
    else this.valueText.place(Math.floor((this.rect.w - this.valueText.width) / 2), Math.floor((this.rect.h - 5) / 2));
  }

  override handleNav(dir: 'up' | 'down' | 'left' | 'right'): boolean {
    const step = this.opts.step;
    if (step === undefined || (dir !== 'left' && dir !== 'right')) return false;
    const v = Math.max(0, Math.min(this._max, this._value + (dir === 'right' ? step : -step)));
    this.set(Math.round(v * 1000) / 1000);
    this.opts.onChange?.(this._value);
    return true;
  }

  override handleWheel(n: number): boolean {
    if (this.opts.step === undefined || !this.focused) return false;
    return this.handleNav(n < 0 ? 'right' : 'left');
  }

  override dispose(): void {
    super.dispose();
    this.tex.dispose();
  }
}
