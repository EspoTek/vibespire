/**
 * Combat choreography: the big multi-part moments, each a Cue timeline (fx/cue.ts) so its sounds
 * hang off its keyframes. The combat screen calls these from its event animator; they only touch
 * the widgets handed to them.
 */
import * as THREE from 'three';
import { fonts } from '../fonts.ts';
import { solidRect } from '../gfx.ts';
import { W } from '../layout.ts';
import { C } from '../palette.ts';
import { Text } from '../text.ts';
import type { EnemyView } from '../ui/EnemyView.ts';
import { Z } from '../ui/Widget.ts';
import { Cue } from './cue.ts';
import type { Juice } from './juice.ts';

/** PS palette flash: the sprite silhouette cycles through these before it goes. */
const DEATH_FLASH = [C.white, C.red, C.yellow, C.white, C.red, C.yellow, C.white, C.red];

/**
 * SMS enemy death: impact (sound, debris, white flash) -> palette flash (white / red / yellow
 * silhouette) -> ordered-dither dissolve in whole art pixels -> gone. Bosses take twice as long,
 * flash the screen and shake it, with a second debris wave.
 */
export function enemyDeath(j: Juice, view: EnemyView, boss: boolean): Promise<void> {
  const app = j.app;
  const s = view.sprite;
  const cx = view.rect.x + Math.floor(view.rect.w / 2), cy = view.rect.y + Math.floor(view.rect.h / 2);
  const flashStep = boss ? 60 : 40;
  const flashes = boss ? DEATH_FLASH.length : 6;
  const dissolveAt = flashStep * flashes;
  const steps = boss ? 8 : 4;
  const dissolveStep = boss ? 80 : 55;
  const c = new Cue(app.tweens, boss ? 'boss-death' : 'enemy-death');
  c.at(0, 'impact', () => {
    app.sfx.play(boss ? 'bossDeath' : 'death');
    j.particles.burst(cx, cy, { n: boss ? 40 : 18, colors: [C.white, C.yellow, C.grey, C.darkGrey], shapes: ['px2', 'px3', 'px1'], speed: [60, boss ? 220 : 150], gravity: 260, life: [400, 800], jitter: Math.floor(view.rect.w / 4) });
    if (boss) { j.hitStop(160); void j.screenFlash(3); void j.shake(j.root, 6, 600); }
  });
  for (let i = 0; i < flashes; i++) {
    c.at(i * flashStep, `flash${i}`, () => { s.setFlashColor(DEATH_FLASH[i % DEATH_FLASH.length] as number); s.setFlash(i % 2 === 0 || i >= flashes - 2); });
  }
  c.at(dissolveAt, 'dissolve', () => { s.setFlash(false); s.setFlashColor(C.white); });
  for (let k = 1; k <= steps; k++) {
    c.at(dissolveAt + k * dissolveStep, `dissolve${k}`, () => {
      s.setDissolve(k / steps);
      if (boss && k === Math.floor(steps / 2)) {
        j.particles.burst(cx, cy, { n: 30, colors: [C.red, C.orange, C.yellow], shapes: ['px2', 'plus'], speed: [40, 160], gravity: 120, life: [500, 900], jitter: Math.floor(view.rect.w / 3) });
      }
    });
  }
  c.at(dissolveAt + steps * dissolveStep + 30, 'settle');
  return c.play();
}

/**
 * Boss intro: the music drops out, a white palette flash, the boss blinks in, then a name band
 * slams in BELOW the boss (so the sprite stays fully visible) on the sting's last hit.
 * `hide` = the boss's plate / intent, hidden while the band covers them.
 */
export async function bossIntro(j: Juice, view: EnemyView, name: string, hide: readonly { visible: boolean }[]): Promise<void> {
  const app = j.app;
  const now = app.sfx.nowOrNull();
  if (now !== null) app.music.cutFor(now, 2.2); // the boss theme starts from the top after the sting
  for (const h of hide) h.visible = false;
  const band = new THREE.Group();
  const bandY = 203, bandH = 32;
  const bg = solidRect(W, bandH, C.black);
  const lineT = solidRect(W, 1, C.red), lineB = solidRect(W, 1, C.red);
  lineB.position.set(0, bandH - 1, 0);
  const sub = new Text(fonts.small, 'BOSS', { color: C.pink, align: 'center' });
  sub.place(W / 2, 3);
  const title = new Text(fonts.ui, name.toUpperCase(), { color: C.yellow, outline: C.darkRed, align: 'center', scale: 2 });
  title.place(W / 2, 12);
  for (const m of [bg, lineT, lineB, sub, title]) { m.renderOrder = Z.TOAST - 30; band.add(m); }
  band.position.set(0, bandY, 0);
  band.visible = false;
  j.root.add(band);
  const c = new Cue(app.tweens, 'boss-intro')
    .at(0, 'windup', () => { app.sfx.play('bossIntro'); view.visible = false; void j.screenFlash(3); })
    .at(240, 'reveal0', () => { view.visible = true; })
    .at(300, 'reveal1', () => { view.visible = false; })
    .at(360, 'reveal2', () => { view.visible = true; })
    .at(410, 'reveal3', () => { view.visible = false; })
    .at(460, 'reveal4', () => { view.visible = true; view.sprite.setFlash(true); })
    .at(500, 'impact', () => {
      // the sting's third hit (frame 30): the name lands
      view.sprite.setFlash(false);
      band.visible = true;
      band.scale.set(1, 0.25, 1);
      void j.shake(j.root, 4, 300);
      j.particles.burst(W / 2, bandY + 14, { n: 26, colors: [C.red, C.yellow, C.white], shapes: ['px2', 'plus'], speed: [80, 200], angle: 0, spread: Math.PI * 2, gravity: 140, life: [300, 600], jitter: 60 });
    })
    .at(534, 'band1', () => { band.scale.set(1, 0.5, 1); band.position.y = bandY + 8; })
    .at(568, 'band2', () => { band.scale.set(1, 1, 1); band.position.y = bandY; })
    .at(1700, 'settle', () => { band.visible = false; });
  await c.play();
  band.removeFromParent();
  for (const m of [bg, lineT, lineB]) m.material.dispose();
  sub.dispose(); title.dispose();
  for (const h of hide) h.visible = true;
}

/** Elite intro: a short sting and a red "ELITE" band over the top of the arena. */
export async function eliteIntro(j: Juice): Promise<void> {
  const app = j.app;
  const t = new Text(fonts.ui, 'ELITE', { color: C.red, outline: C.black, align: 'center', scale: 2 });
  t.renderOrder = Z.TOAST - 30;
  t.place(W / 2, 22);
  t.visible = false;
  j.root.add(t);
  const c = new Cue(app.tweens, 'elite-intro')
    .at(0, 'windup', () => app.sfx.play('eliteIntro'))
    .at(120, 'impact', () => { t.visible = true; void j.shake(j.root, 3, 200); j.particles.ring(W / 2, 30, 16, 140, [C.red, C.orange]); })
    .at(260, 'blink0', () => { t.visible = false; })
    .at(300, 'blink1', () => { t.visible = true; })
    .at(900, 'settle', () => { t.visible = false; });
  await c.play();
  t.removeFromParent();
  t.dispose();
}

/** The parry: white star burst + clang + hit-stop + a quick flash at the point of contact. */
export function parryImpact(j: Juice, x: number, y: number): void {
  j.app.sfx.play('parry');
  j.particles.burst(x, y, { n: 14, colors: [C.white, C.iceBlue, C.yellow], shapes: ['star', 'plus', 'px2'], speed: [80, 200], life: [220, 420], jitter: 2 });
  j.particles.ring(x, y, 12, 160, [C.white, C.iceBlue], 'px1', 260);
  j.hitStop(110);
  void j.screenFlash(2, C.iceBlue);
}

/** Bloom grows: a leaf burst over the card. */
export function leafBurst(j: Juice, x: number, y: number, n: number): void {
  j.particles.burst(x, y, { n, colors: [C.lime, C.leaf, C.green, C.mint], shapes: ['leaf', 'px2', 'leaf'], speed: [40, 110], angle: -Math.PI / 2, spread: Math.PI * 1.3, gravity: 90, drag: 0.4, life: [500, 900], wobble: 2 });
  j.particles.burst(x, y, { n: 4, colors: [C.white, C.lime], shapes: ['plus'], speed: [10, 30], life: [300, 500], flicker: true });
}

/** Rot ticks: bubbles that rise off the target, more with more stacks. */
export function rotBubbles(j: Juice, x: number, y: number, stacks: number): void {
  j.particles.burst(x, y, { n: Math.min(24, 4 + stacks * 2), colors: [C.lilac, C.purple, C.violet], shapes: ['px2', 'px3', 'ring'], speed: [15, 50 + stacks * 4], angle: -Math.PI / 2, spread: Math.PI * 0.9, gravity: -40, life: [400, 800], jitter: 10, wobble: 1 });
}
