/**
 * CardFrame: the card face, 64x88. Frame art per kind is rasterised once and shared. Layout
 * constants are `CARD` in art.ts. Name and body use the 4x6 font; the cost uses the 8x8 font in the
 * PS-blue bubble.
 *
 * Long text: the name gets 2 lines and the body 5; past that the face shows … and `truncated` is
 * set, and the owner shows the full text in a detail panel (CardDetail). Every number on the face
 * comes from the engine's text helpers (see game/view.ts).
 *
 * Extras (GDD §2.4, §2.7): Bloom leaf counter "✿4" (gold when capped), a gold border when the card
 * would be on the beat, dimming when it can't be played, cost colouring.
 *
 * Focus lifts the card LIFT px in whole-pixel steps and raises it above its neighbours; the hit rect
 * grows upward with the lift so hovering the bottom edge doesn't flicker.
 */
import * as THREE from 'three';
import { fonts } from '../fonts.ts';
import { quadGeometry, solidRect, spriteMaterial, textureFromPixels, type Atlas, type SpriteMaterial } from '../gfx.ts';
import { rect, type Rect } from '../layout.ts';
import { C } from '../palette.ts';
import { Sprite } from '../sprite.ts';
import { Text } from '../text.ts';
import { CARD, CARD_COLORS, rasterizeCardFrame, rasterizePlaceholderArt, type CardKind } from './art.ts';
import { Widget, Z } from './Widget.ts';

export type CostState = 'normal' | 'reduced' | 'raised' | 'unaffordable';

export interface CardFace {
  name: string;
  /** null = unplayable (no bubble digit), 'X' for X-cost. */
  cost: number | 'X' | null;
  kind: CardKind;
  /** e.g. "ATTACK", "SKILL". Default: the kind in capitals. */
  typeLine?: string;
  /** Rules text, markup allowed: "Deal [yellow]6[/] damage." */
  body: string;
  /** Art for the 32x24 slot; default a dithered placeholder. */
  art?: { atlas: Atlas; frame: string };
  upgraded?: boolean;
  /** Bloom value of this copy (null/absent = not a Bloom card). */
  bloom?: number | null;
  bloomCapped?: boolean;
  costState?: CostState;
}

const frameTextures = new Map<CardKind, THREE.DataTexture>();
function frameTexture(kind: CardKind): THREE.DataTexture {
  let t = frameTextures.get(kind);
  if (!t) { t = textureFromPixels(rasterizeCardFrame(kind)); frameTextures.set(kind, t); }
  return t;
}

export const LIFT = 8;
/** z raise of a focused card over its neighbours. */
export const RAISE = 80;

const COST_COLORS: Readonly<Record<CostState, number>> = { normal: C.text, reduced: C.lime, raised: C.pink, unaffordable: C.red };

export class CardFrame extends Widget {
  private face: CardFace;
  private readonly frameMesh: THREE.Mesh<THREE.BufferGeometry, SpriteMaterial>;
  private readonly nameText: Text;
  private readonly costText: Text;
  private readonly typeText: Text;
  private readonly bodyText: Text;
  private readonly leafText: Text;
  private readonly beatBorder = new THREE.Object3D();
  private artPart: THREE.Object3D | null = null;
  private artTex: THREE.DataTexture | null = null;
  private lift = 0;
  private liftTarget = 0;
  private liftClock = 0;
  private dimmed = false;
  /**
   * Resting z (hand order sets it); null = whatever z the card has when first focused. Focus raises
   * the card RAISE above it, so it works inside modals as well as in the hand.
   */
  restZ: number | null = null;
  /** Lift on focus (hand cards); grids set it to false. */
  liftOnFocus = true;

  constructor(x: number, y: number, face: CardFace, seed = 0) {
    super(rect(x, y, CARD.W, CARD.H), 'card');
    this.focusable = true;
    this.face = face;
    this.frameMesh = this.addPart(new THREE.Mesh(quadGeometry(CARD.W, CARD.H), spriteMaterial(frameTexture(face.kind))), 0);
    this.nameText = this.addPart(new Text(fonts.small, '', {
      color: C.text, maxWidth: CARD.name.w, align: 'center', maxLines: CARD.name.lines, lineHeight: CARD.name.lineHeight, overflow: 'ellipsis',
    }), 2);
    this.costText = this.addPart(new Text(fonts.ui, '', { color: C.text, shadow: C.navy }), 3);
    this.typeText = this.addPart(new Text(fonts.small, '', { maxWidth: CARD.W - 8, align: 'center', overflow: 'ellipsis', maxLines: 1 }), 2);
    this.bodyText = this.addPart(new Text(fonts.small, '', {
      color: C.text, maxWidth: CARD.body.w, align: 'center', markup: true, maxLines: CARD.body.lines, lineHeight: CARD.body.lineHeight, overflow: 'ellipsis',
    }), 2);
    this.leafText = this.addPart(new Text(fonts.small, '', { color: C.lime, outline: C.black }), 4);
    for (const [x0, y0, w, h] of [[0, 0, CARD.W, 1], [0, CARD.H - 1, CARD.W, 1], [0, 0, 1, CARD.H], [CARD.W - 1, 0, 1, CARD.H],
      [1, 1, CARD.W - 2, 1], [1, CARD.H - 2, CARD.W - 2, 1], [1, 1, 1, CARD.H - 2], [CARD.W - 2, 1, 1, CARD.H - 2]] as const) {
      const m = solidRect(w, h, C.yellow);
      m.position.set(x0, y0, 0);
      this.beatBorder.add(m);
    }
    this.addPart(this.beatBorder, 5);
    this.beatBorder.visible = false;
    this.setFace(face, seed);
  }

  get cardFace(): CardFace { return this.face; }
  /** Name or body didn't fit: show the full text in a CardDetail. */
  get truncated(): boolean { return this.nameText.layout.truncated || this.bodyText.layout.truncated; }

  setFace(face: CardFace, seed = 0): void {
    this.face = face;
    this.frameMesh.material.uniforms.map.value = frameTexture(face.kind);
    const name = face.name.toUpperCase();
    this.nameText.setText(name).setColor(face.upgraded ? C.lime : C.text);
    this.nameText.place(CARD.name.x, CARD.name.y + Math.floor((CARD.name.h - this.nameText.height) / 2));
    const cost = face.cost === null ? '' : String(face.cost);
    if (cost.length > 1) throw new Error(`CardFrame: cost "${cost}" does not fit the bubble (one glyph)`);
    this.costText.setText(cost).setColor(COST_COLORS[face.costState ?? 'normal']);
    this.costText.place(CARD.cost.x + Math.floor((CARD.cost.size - 7) / 2), CARD.cost.y + Math.floor((CARD.cost.size - 7) / 2));
    this.typeText.setText((face.typeLine ?? face.kind).toUpperCase()).setColor(CARD_COLORS[face.kind].trim);
    this.typeText.place(4, CARD.type.y);
    this.bodyText.setText(face.body);
    const bodyY = CARD.body.y + Math.max(0, Math.floor((CARD.body.h - this.bodyText.height) / 2));
    this.bodyText.place(CARD.body.x, bodyY);
    if (face.bloom !== null && face.bloom !== undefined) {
      this.leafText.setText(`✿${face.bloom}`).setColor(face.bloomCapped ? C.yellow : C.lime);
      this.leafText.place(CARD.art.x + CARD.art.w - this.leafText.width, CARD.art.y + CARD.art.h - 6);
      this.leafText.visible = true;
    } else this.leafText.visible = false;
    const plain = face.body.replace(/\[[^\]]*\]/g, '');
    this.label = `${name}${face.upgraded ? ' upgraded' : ''}, cost ${cost || 'none'}, ${face.kind}.${face.bloom ? ` Bloom ${face.bloom}.` : ''} ${plain}`;

    if (this.artPart) { this.removePart(this.artPart); this.artPart = null; }
    this.artTex?.dispose();
    this.artTex = null;
    if (face.art) {
      const s = new Sprite(face.art.atlas, face.art.frame);
      if (s.w !== CARD.art.w || s.h !== CARD.art.h) throw new Error(`CardFrame: art frame "${face.art.frame}" is ${s.w}x${s.h}, want ${CARD.art.w}x${CARD.art.h}`);
      if (this.dimmed) s.setDim(1);
      this.artPart = this.addPart(s.place(CARD.art.x, CARD.art.y), 1);
    } else {
      this.artTex = textureFromPixels(rasterizePlaceholderArt(face.kind, seed));
      const m = new THREE.Mesh(quadGeometry(CARD.art.w, CARD.art.h), spriteMaterial(this.artTex));
      m.material.uniforms.uDim.value = this.dimmed ? 1 : 0;
      m.position.set(CARD.art.x, CARD.art.y, 0);
      this.artPart = this.addPart(m, 1);
    }
  }

  /** Gold border: this card would be on the beat if played next (GDD §2.7). */
  setBeat(on: boolean): void { this.beatBorder.visible = on; }

  /** Dim the frame and art one SMS level (unplayable now). */
  setDimmed(on: boolean): void {
    if (on === this.dimmed) return;
    this.dimmed = on;
    this.frameMesh.material.uniforms.uDim.value = on ? 1 : 0;
    this.artPart?.traverse((o) => {
      if (o instanceof THREE.Mesh) (o.material as SpriteMaterial).uniforms.uDim.value = on ? 1 : 0;
    });
  }

  override hitRect(): Rect {
    return rect(this.rect.x, this.rect.y - this.lift, this.rect.w, this.rect.h + this.lift);
  }
  override ringRect(): Rect {
    return rect(this.rect.x, this.rect.y - this.lift, this.rect.w, this.rect.h);
  }

  protected override renderFocus(on: boolean): void {
    this.liftTarget = on && this.liftOnFocus ? LIFT : 0;
    if (this.restZ === null) this.restZ = this.z;
    this.setZ(on ? this.restZ + RAISE : this.restZ);
  }

  /** Whole-pixel lift animation: 2 px per 16 ms (8-bit "chunky" motion, no tween needed). */
  override update(dtMs: number): void {
    if (this.lift === this.liftTarget) { this.liftClock = 0; return; }
    this.liftClock += dtMs;
    while (this.liftClock >= 16 && this.lift !== this.liftTarget) {
      this.liftClock -= 16;
      this.lift += this.lift < this.liftTarget ? 2 : -2;
      this.lift = Math.max(0, Math.min(LIFT, this.lift));
    }
    this.syncNode();
  }

  protected override syncNode(): void {
    super.syncNode();
    this.node.position.y -= this.lift ?? 0; // lift is undefined only during the base constructor
  }

  override dispose(): void {
    super.dispose();
    this.artTex?.dispose();
  }
}
