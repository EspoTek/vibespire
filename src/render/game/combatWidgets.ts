/**
 * Combat screen widgets. They display view data handed to them (`set*` methods); the combat
 * screen computes that data from game.state (sync) or from its live animation model.
 */
import * as THREE from 'three';
import { getEnemyDef, getStatusDef } from '../../content/index.ts';
import type { App } from '../app.ts';
import { fonts } from '../fonts.ts';
import { quadGeometry, spriteMaterial, textureFromPixels, updateTexturePixels } from '../gfx.ts';
import { rect, W } from '../layout.ts';
import { C } from '../palette.ts';
import { Text } from '../text.ts';
import { rasterizeEnergyOrb, rasterizeHpBar } from '../ui/art.ts';
import { Icon } from '../ui/Icon.ts';
import { Sprite } from '../sprite.ts';
import { Label } from '../ui/Label.ts';
import { Panel } from '../ui/Panel.ts';
import { Widget, Z } from '../ui/Widget.ts';
import type { Tweener } from '../tween.ts';
import { HintIcon } from './hud.ts';
import { formatIntent, type IntentLike } from './intents.ts';
import { PixelBuffer } from '../pixels.ts';
import { statusIcon, statusVisible } from './view.ts';
import { PLATE_W } from './handLayout.ts';

// ------------------------------------------------------------------ HP bar with defence overlay

export class HpBar extends Widget {
  private readonly tex: THREE.DataTexture;
  private last = '';
  constructor(x: number, y: number, w: number, h: number) {
    super(rect(x, y, w, h), 'hpbar');
    this.tex = textureFromPixels(rasterizeHpBar(w, h, 1, 1, 0, 0));
    this.addPart(new THREE.Mesh(quadGeometry(w, h), spriteMaterial(this.tex)), 0);
  }
  set(hp: number, maxHp: number, block: number, guard: number): void {
    const key = `${hp}/${maxHp}/${block}/${guard}`;
    if (key === this.last) return;
    this.last = key;
    updateTexturePixels(this.tex, rasterizeHpBar(this.rect.w, this.rect.h, hp, maxHp, block, guard));
  }
  override dispose(): void { super.dispose(); this.tex.dispose(); }
}

// ------------------------------------------------------------------ status row

export interface StatusView { id: string; stacks: number; text: string }

/** 12x12 status icons with their stack number; each icon has a tooltip hint (statusText). */
export class StatusRow extends Widget {
  private readonly app: App;
  private icons: { icon: HintIcon; num: Label }[] = [];
  private key = '';
  onIconsChanged: (() => void) | null = null;

  constructor(app: App, x: number, y: number, w: number) {
    super(rect(x, y, w, 14), 'statusrow');
    this.app = app;
  }

  set(list: readonly StatusView[]): void {
    const shown = list.filter((s) => statusVisible(s.id));
    const key = shown.map((s) => `${s.id}:${s.stacks}`).join(',');
    if (key === this.key) {
      shown.forEach((s, i) => { const ic = this.icons[i]; if (ic) ic.icon.hint = s.text; });
      return;
    }
    this.key = key;
    for (const { icon, num } of this.icons) { icon.dispose(); num.dispose(); }
    this.icons = [];
    const perRow = Math.max(1, Math.floor(this.rect.w / 22));
    shown.forEach((s, i) => {
      const x = this.rect.x + (i % perRow) * 22, y = this.rect.y + Math.floor(i / perRow) * 14;
      const icon = this.addChild(new HintIcon(x, y, this.app, statusIcon(s.id)), 1);
      const def = getStatusDef(s.id);
      icon.hint = s.text;
      icon.label = `${def.name} ${s.stacks}: ${s.text.replace(/\[[^\]]*\]/g, '')}`;
      const num = this.addChild(new Label(x + 12, y + 6, def.stacks === 'flag' ? '' : String(s.stacks), {
        font: fonts.small, color: def.isDebuff ? C.pink : C.lime, outline: C.black,
      }), 2);
      this.icons.push({ icon, num });
    });
    this.onIconsChanged?.();
  }

  focusables(): Widget[] { return this.icons.map((i) => i.icon); }
  iconRectOrNull(id: string): { x: number; y: number } | null {
    const i = this.key.split(',').findIndex((k) => k.startsWith(`${id}:`));
    const ic = i >= 0 ? this.icons[i] : undefined;
    return ic ? { x: ic.icon.rect.x, y: ic.icon.rect.y } : null;
  }
}

// ------------------------------------------------------------------ intents

/** Intent box above an enemy: icon(s) + exact numbers; the forecast ("NEXT") beside it; parry marker. */
export class IntentBox extends Widget {
  private readonly app: App;
  private items: Widget[] = [];
  private key = '';
  private flickerT = 0;

  constructor(app: App) {
    super(rect(0, 0, 10, 16), 'intent');
    this.app = app;
  }

  set(intent: IntentLike, base: number | null, forecast: readonly { intent: IntentLike; base: number | null }[], parry: boolean): void {
    const key = JSON.stringify([intent, base, forecast, parry]);
    if (key === this.key) return;
    const forecastChanged = this.key !== '' && JSON.stringify(JSON.parse(this.key)[2]) !== JSON.stringify(forecast);
    this.key = key;
    for (const p of this.items) p.dispose();
    this.items = [];
    const v = formatIntent(intent, base);
    let x = this.rect.x;
    const y = this.rect.y;
    if (parry) { this.items.push(this.addChild(new Icon(x, y + 2, this.app.icons, 'parry'), 3)); x += 13; }
    const boxW = 18 + (v.icon2 ? 13 : 0) + (v.label ? v.label.length * 4 + 2 : 0);
    const box = this.addChild(new Panel(rect(x, y, boxW, 16)), 0);
    this.items.push(box);
    this.items.push(box.addChild(new Icon(x + 3, y + 2, this.app.icons, v.icon), 2));
    let ix = x + 15;
    if (v.icon2) { this.items.push(box.addChild(new Icon(ix, y + 2, this.app.icons, v.icon2), 2)); ix += 13; }
    if (v.label) this.items.push(box.addChild(new Label(ix, y + 6, v.label, { font: fonts.small, color: v.adjusted ? C.yellow : v.isAttack ? C.pink : C.text }), 3));
    x += boxW + 2;
    // forecast: smaller and dimmer (pixel art cannot scale to 60% or blend: dim palette instead)
    for (const f of forecast) {
      const fv = formatIntent(f.intent, f.base);
      const label = fv.label;
      const fw = 30 + (label ? label.length * 4 : 0);
      const fb = this.addChild(new Panel(rect(x, y + 3, fw, 13), { fill: C.navy, border: C.steel }), 0);
      this.items.push(fb);
      this.items.push(fb.addChild(new Label(x + 3, y + 7, 'NEXT', { font: fonts.small, color: C.textMuted }), 2));
      const fi = fb.addChild(new Icon(x + 19, y + 3, this.app.icons, fv.icon), 2);
      fi.sprite.setDim(1);
      this.items.push(fi);
      if (label) this.items.push(fb.addChild(new Label(x + 31, y + 7, label, { font: fonts.small, color: C.textMuted }), 3));
      x += fw + 2;
    }
    this.rect = { ...this.rect, w: x - this.rect.x, h: 16 };
    this.setZ(this.z);
    if (forecastChanged) this.flickerT = 240;
  }

  override update(dtMs: number): void {
    if (this.flickerT <= 0) return;
    this.flickerT -= dtMs;
    this.node.visible = this.flickerT <= 0 || Math.floor(this.flickerT / 60) % 2 === 0;
  }
}

// ------------------------------------------------------------------ enemy plate (name, HP, defence, statuses, Rot line)

export class EnemyPlate extends Widget {
  readonly hp: HpBar;
  readonly statuses: StatusRow;
  private readonly hpText: Label;
  private readonly def: Label;
  private readonly rot: Label;
  private readonly name: Label;

  constructor(app: App, cx: number, y: number, enemyId: string) {
    const w = PLATE_W;
    super(rect(Math.round(cx - w / 2), y, w, 50), 'plate');
    const x = this.rect.x;
    this.addChild(new Panel(rect(x, y, w, 28), { fill: C.black }), 0);
    this.name = this.addChild(new Label(cx, y + 4, getEnemyDef(enemyId).name.toUpperCase(), { font: fonts.small, align: 'center', maxWidth: undefined }), 2);
    this.hp = this.addChild(new HpBar(x + 4, y + 11, w - 8, 6), 2);
    this.hpText = this.addChild(new Label(x + 4, y + 18, '', { font: fonts.small, color: C.text }), 2);
    this.def = this.addChild(new Label(x + w - 4, y + 18, '', { font: fonts.small, align: 'right', markup: true }), 2);
    this.rot = this.addChild(new Label(cx, y + 44, '', { font: fonts.small, align: 'center', color: C.lilac, outline: C.black }), 2);
    this.statuses = this.addChild(new StatusRow(app, x, y + 30, w), 3);
  }

  set(hp: number, maxHp: number, block: number, guard: number, rot: number): void {
    this.hp.set(hp, maxHp, block, guard);
    this.hpText.setText(`${hp}/${maxHp}`);
    this.def.setText(`${block > 0 ? `[skyBlue]◆${block}[/]` : ''}${guard > 0 ? ` [amber]◆${guard}[/]` : ''}`);
    this.rot.setText(rot > 0 ? `-${rot} AT END OF TURN` : '');
  }
}

// ------------------------------------------------------------------ energy orb + Cadence metronome

export class EnergyOrb extends Widget {
  private readonly tex: THREE.DataTexture;
  private readonly num: Label;
  private lit = true;
  constructor(x: number, y: number) {
    super(rect(x, y, 26, 26), 'energy');
    this.tex = textureFromPixels(rasterizeEnergyOrb(true));
    this.addPart(new THREE.Mesh(quadGeometry(26, 26), spriteMaterial(this.tex)), 0);
    this.num = this.addChild(new Label(x + 13, y + 6, '', { align: 'center', color: C.black, scale: 2, maxWidth: undefined }), 2);
    this.focusable = true;
    this.activateSound = false;
  }
  set(energy: number, max: number): void {
    this.num.setText(String(energy)).setColor(energy > 0 ? C.black : C.textDim);
    const lit = energy > 0;
    if (lit !== this.lit) { this.lit = lit; updateTexturePixels(this.tex, rasterizeEnergyOrb(lit)); }
    this.label = `Energy ${energy} of ${max}`;
  }
  override dispose(): void { super.dispose(); this.tex.dispose(); }
}

/** 3-pip Cadence metronome (GDD §2.7): pips light per counted play; flashes on the beat. */
export class Metronome extends Widget {
  private readonly pips: THREE.Mesh[] = [];
  private flashT = 0;
  constructor(x: number, y: number) {
    super(rect(x, y, 34, 8), 'metronome');
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(quadGeometry(8, 6), spriteMaterial(textureFromPixels(pip(false))));
      m.position.set(i * 11, 1, 0);
      this.addPart(m, 1);
      this.pips.push(m);
    }
  }
  /** `lit` = position in the bar (0..2 played since the last beat); `flash` on a beat. */
  set(lit: number, flash: boolean): void {
    this.pips.forEach((m, i) => {
      const mat = m.material as THREE.ShaderMaterial;
      const tex = (mat.uniforms['map'] as THREE.IUniform<THREE.DataTexture>).value;
      updateTexturePixels(tex, pip(i < lit));
    });
    if (flash) this.flashT = 360;
    this.label = `Cadence: ${lit} of 3 toward the next beat`;
  }
  override update(dtMs: number): void {
    if (this.flashT <= 0) return;
    this.flashT -= dtMs;
    const on = Math.floor(this.flashT / 60) % 2 === 0 && this.flashT > 0;
    this.pips.forEach((m) => { ((m.material as THREE.ShaderMaterial).uniforms['uFlash'] as THREE.IUniform<number>).value = on ? 1 : 0; });
  }
}

function pip(on: boolean): PixelBuffer {
  const b = new PixelBuffer(8, 6, C.black);
  b.rect(1, 1, 6, 4, on ? C.yellow : C.darkGrey);
  if (on) b.hline(1, 1, 6, C.white);
  return b;
}

// ------------------------------------------------------------------ mini cards (primed rack, Timeline)

/** A 50x12 chip naming a card; gold rim when stamped on the beat. */
export class MiniCard extends Widget {
  private readonly box: Panel;
  private readonly text: Label;
  readonly uid: number;
  constructor(x: number, y: number, uid: number, name: string, opts: { gold?: boolean; value?: string; w?: number } = {}) {
    const w = opts.w ?? 50;
    super(rect(x, y, w, 12), 'mini');
    this.uid = uid;
    this.box = this.addChild(new Panel(rect(x, y, w, 12), { fill: C.navy, border: opts.gold ? C.yellow : C.skyBlue, thickness: 1 }), 0);
    this.text = this.addChild(new Label(x + 3, y + 3, `${name}${opts.value ? ` ${opts.value}` : ''}`.toUpperCase(), { font: fonts.small, maxWidth: w - 5, overflow: 'ellipsis', maxLines: 1 }), 2);
    this.label = name;
    this.focusable = true;
    this.activateSound = false;
  }
}

// ------------------------------------------------------------------ floating numbers and banners

/** Floating text that rises and blinks out (damage, block, status pops). */
export function floatText(app: App, root: THREE.Object3D, x: number, y: number, text: string, color: number, opts: { big?: boolean; ms?: number } = {}): Promise<void> {
  const t = new Text(opts.big ? fonts.ui : fonts.small, text, { color, outline: C.black, align: 'center' });
  t.renderOrder = Z.TOAST - 10;
  root.add(t);
  const o = { y: 0 };
  const ms = opts.ms ?? 600;
  t.place(x, y);
  app.tweens.every(() => { t.place(x, y - Math.round(o.y)); return t.parent !== null; });
  return app.tweens.to(o, { y: 14 }, ms).then(() => { t.removeFromParent(); t.dispose(); });
}

/** A PS name box at the top centre (enemy move names) or a centred turn banner. */
export function banner(app: App, root: THREE.Object3D, text: string, ms: number, where: 'top' | 'center' = 'center'): Promise<void> {
  const w = Math.max(120, text.length * 8 + 24);
  const y = where === 'top' ? 48 : 150;
  const panel = new Panel(rect(Math.floor((W - w) / 2), y, w, 22));
  panel.setZ(Z.TOAST - 20);
  panel.addChild(new Label(W / 2, y + 7, text, { align: 'center', color: where === 'top' ? C.text : C.textHi }), 2);
  root.add(panel.node);
  return app.tweens.delay(ms).then(() => panel.dispose());
}

export function blinkOut(tw: Tweener, target: { setDim(n: number): void }, ms = 240): Promise<void> {
  let t = 0;
  return new Promise((done) => {
    tw.every((dt) => {
      t += dt;
      const step = Math.min(3, Math.floor((t / ms) * 4));
      target.setDim(step);
      if (t >= ms) { done(); return false; }
      return true;
    });
  });
}

/** A status icon that pops up over a target (Rot / Exposed / Stagger applied): rises 8 px in whole pixels, then blinks out. */
export function iconPop(app: App, root: THREE.Object3D, x: number, y: number, frame: string): Promise<void> {
  const s = new Sprite(app.icons, frame, 2);
  s.renderOrder = Z.TOAST - 12;
  root.add(s);
  let t = 0;
  const ms = 520;
  return new Promise((done) => {
    app.tweens.every((dt) => {
      t += dt;
      const k = Math.min(1, t / ms);
      s.place(x - s.w / 2, y - Math.round(Math.min(1, k * 2) * 8));
      s.setDim(k > 0.6 ? Math.min(3, Math.floor((k - 0.6) * 10)) : 0);
      if (t >= ms) { root.remove(s); s.dispose(); done(); return false; }
      return true;
    });
  });
}
