/**
 * Map: the whole act (rows 0-14 + boss) in a scrolling column. PS-style 12x12 node icons, edges as
 * 1px palette lines (travelled path yellow, next steps lime), the current-position marker, the act
 * banner and boss name, and the legend on hold-info. Only the reachable next nodes are focusable
 * (left/right among them, confirm travels; mouse click). Wheel / focus scroll the column.
 */
import { getEncounterDef } from '../../../content/index.ts';
import type { GameEvent, MapNode, MapPos } from '../../../engine/index.ts';
import * as THREE from 'three';
import type { App } from '../../app.ts';
import { actBackdrop } from '../../assets.ts';
import { fonts } from '../../fonts.ts';
import { quadGeometry, setFrameUv, spriteMaterial, textureFromPixels, type SpriteMaterial } from '../../gfx.ts';
import { rect, type Rect } from '../../layout.ts';
import { C } from '../../palette.ts';
import { bayer, PixelBuffer, TRANSPARENT } from '../../pixels.ts';
import { Icon } from '../../ui/Icon.ts';
import { Label } from '../../ui/Label.ts';
import { Panel } from '../../ui/Panel.ts';
import { Tooltip } from '../../ui/Tooltip.ts';
import { Widget, Z } from '../../ui/Widget.ts';
import { layoutMap, scrollToShow, type MapLayout } from '../mapLayout.ts';
import { RunScreen } from '../RunScreen.ts';
import type { RunSession } from '../session.ts';
import { ACT_NAMES } from './ActTransitionScreen.ts';

const VIEW: Readonly<Rect> = { x: 176, y: 42, w: 300, h: 310 };
const NODE_NAMES: Readonly<Record<MapNode['type'], string>> = {
  monster: 'MONSTER', elite: 'ELITE', rest: 'REST SITE', shop: 'SHOP', event: 'UNKNOWN (?)', treasure: 'TREASURE', boss: 'BOSS',
};
const NODE_HINTS: Readonly<Record<MapNode['type'], string>> = {
  monster: 'A fight. Card reward, gold, maybe a potion.',
  elite: 'A hard fight. Also drops a relic.',
  rest: 'Rest, Smith, Purge or Transmute.',
  shop: 'Buy cards, relics, potions; remove a card.',
  event: 'An event, sometimes a fight, shop or treasure.',
  treasure: 'A chest with a relic and gold.',
  boss: 'The act boss.',
};

class MapNodeWidget extends Widget {
  readonly mapNode: MapNode;
  readonly cx: number;
  readonly cy: number;
  private readonly icon: Icon;
  private t = 0;
  reachable = false;
  current = false;
  past = false;

  constructor(app: App, node: MapNode, cx: number, cy: number) {
    super(rect(0, 0, 16, 16), 'mapnode');
    this.mapNode = node;
    this.cx = cx;
    this.cy = cy;
    const scale = node.type === 'boss' ? 2 : 1;
    this.icon = this.addChild(new Icon(0, 0, app.icons, `node_${node.type}`, scale), 1);
    const sz = 12 * scale;
    this.rect = { ...this.rect, w: sz + 4, h: sz + 4 };
    this.icon.moveTo(2, 2);
    this.label = `${NODE_NAMES[node.type]}, floor row ${node.row + 1}`;
  }

  /** Reachable nodes pulse (whole SMS levels, 2 steps); travelled-past rows are dimmed. */
  override update(dtMs: number): void {
    this.t += dtMs;
    const dim = this.reachable && !this.focused ? (Math.floor(this.t / 320) % 2) : this.past ? 1 : 0;
    this.icon.sprite.setDim(dim);
  }
}

export class MapScreen extends RunScreen {
  private layout!: MapLayout;
  private scroll = 0;
  private nodes: MapNodeWidget[] = [];
  private edgeMesh: THREE.Mesh<THREE.BufferGeometry, SpriteMaterial> | null = null;
  private edgeTex: THREE.DataTexture | null = null;
  private edgeH = 0;
  private legend: Tooltip | null = null;
  private info!: Label;
  private cursor!: Label;
  private blink = 0;

  constructor(app: App, session: RunSession) { super(app, session, 'map', actBackdrop(session.state.act)); }

  protected build(): void {
    this.bg.setDim(1); // readable: the column gets its own dithered veil (drawEdges)
    const s = this.state;
    const frame = this.add(new Panel(rect(VIEW.x - 8, VIEW.y - 4, VIEW.w + 16, VIEW.h + 8), { fill: TRANSPARENT }));
    frame.setZ(Z.PANEL - 10);
    const side = this.add(new Panel(rect(6, 42, 162, 120), { title: `ACT ${s.act}` }));
    side.setZ(Z.PANEL);
    side.addChild(new Label(14, 62, ACT_NAMES[s.act], { font: fonts.small, color: C.textHi }), 2);
    side.addChild(new Label(14, 74, `BOSS: ${getEncounterDef(s.map.bossEncounter).name.toUpperCase()}`, { font: fonts.small, maxWidth: 146, color: C.pink }), 2);
    this.info = side.addChild(new Label(14, 90, '', { font: fonts.small, maxWidth: 146, markup: true, lineHeight: 8 }), 2);
    side.addChild(new Label(14, 148, 'HOLD I / Y: LEGEND', { font: fonts.small, color: C.textMuted }), 2);
    this.layout = layoutMap(s.map.rows);
    this.drawEdges();
    this.nodes = [];
    for (const row of s.map.rows) for (const n of row) {
      const p = this.layout.at(n.row, n.col);
      const w = this.add(new MapNodeWidget(this.app, n, p.x, p.y));
      w.setZ(Z.PANEL + 10);
      this.nodes.push(w);
    }
    this.cursor = this.add(new Label(0, 0, '▶', { color: C.yellow, outline: C.black }));
    this.cursor.setZ(Z.PANEL + 20);
    this.syncReachable();
    const cur = s.mapPos;
    const focusY = cur ? this.layout.at(cur.row, cur.col).y : this.layout.height;
    this.scroll = scrollToShow(Math.max(0, this.layout.height - VIEW.h), focusY, VIEW.h, this.layout.height, 80);
    this.applyScroll();
  }

  private drawEdges(): void {
    const s = this.state;
    const h = this.layout.height + 8;
    this.edgeH = h;
    // a dithered black veil (~70% coverage): the act backdrop shows through, nodes and edges stay legible
    const buf = new PixelBuffer(VIEW.w, h, TRANSPARENT);
    for (let y = 0; y < h; y++) for (let x = 0; x < VIEW.w; x++) if (bayer(x, y, 11)) buf.set(x, y, C.black);
    // faint row stripes so the column reads as a tower
    for (let y = 0; y < h; y++) if (y % 24 === 2) buf.hline(0, y, VIEW.w, C.navy);
    const visited = s.mapPath;
    const stepEdge = (a: MapPos, b: MapPos) => visited.some((v, i) => i > 0 && v.row === b.row && v.col === b.col && visited[i - 1]?.row === a.row && visited[i - 1]?.col === a.col);
    const next = new Set(this.session.legalOf('travel').map((t) => `${t.to.row}:${t.to.col}`));
    const here = s.mapPos;
    for (const row of s.map.rows) for (const n of row) {
      const a = this.layout.at(n.row, n.col);
      for (const col of n.edges) {
        const b = this.layout.at(n.row + 1, col);
        const travelled = stepEdge({ row: n.row, col: n.col }, { row: n.row + 1, col });
        const isNext = here !== null && here.row === n.row && here.col === n.col && next.has(`${n.row + 1}:${col}`);
        const color = travelled ? C.yellow : isNext ? C.lime : C.steel;
        // dotted for untravelled edges (every other pixel), solid for the path
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.max(Math.abs(dx), Math.abs(dy));
        for (let i = 6; i <= len - 6; i++) {
          if (!travelled && !isNext && i % 3 !== 0) continue;
          buf.set(Math.round(a.x + (dx * i) / len), Math.round(a.y + (dy * i) / len), color);
        }
      }
    }
    if (this.edgeMesh) this.root.remove(this.edgeMesh);
    this.edgeTex?.dispose();
    this.edgeTex = textureFromPixels(buf);
    this.edgeMesh = new THREE.Mesh(quadGeometry(VIEW.w, VIEW.h), spriteMaterial(this.edgeTex));
    this.edgeMesh.position.set(VIEW.x, VIEW.y, 0);
    this.edgeMesh.renderOrder = Z.PANEL + 5;
    this.root.add(this.edgeMesh);
  }

  private syncReachable(): void {
    const s = this.state;
    const travels = this.session.legalOf('travel');
    const reachable = travels.map((t) => t.to);
    const sorted = [...reachable].sort((a, b) => a.col - b.col);
    for (const w of this.nodes) {
      const r = sorted.findIndex((p) => p.row === w.mapNode.row && p.col === w.mapNode.col);
      w.reachable = r >= 0;
      w.current = s.mapPos !== null && s.mapPos.row === w.mapNode.row && s.mapPos.col === w.mapNode.col;
      w.past = s.mapPos !== null && w.mapNode.row <= s.mapPos.row && !w.current;
      w.focusable = w.reachable;
      w.list = w.reachable ? { key: 'map-next', index: r, axis: 'x', wrap: true } : undefined;
      w.onFocus = () => { this.showInfo(w); this.ensureVisible(w); };
      // left/right stay on the path even when there is only one next node (no drift into the HUD)
      w.handleNav = (dir) => w.reachable && (dir === 'left' || dir === 'right') && sorted.length <= 1;
      w.onActivate = () => {
        const a = travels.find((t) => t.to.row === w.mapNode.row && t.to.col === w.mapNode.col);
        if (!a) throw new Error('map: travel vanished');
        this.act(a);
      };
      if (w.reachable) this.scope.add(w);
      else this.scope.remove(w);
    }
    const first = this.nodes.find((w) => w.reachable && w.mapNode.col === sorted[0]?.col);
    if (first) this.focus.focus(first);
  }

  private showInfo(w: MapNodeWidget): void {
    const t = w.mapNode.type;
    this.info.setText(`[yellow]${NODE_NAMES[t]}[/]\nROW ${w.mapNode.row + 1}${t === 'boss' ? '' : ' OF 15'}\n${NODE_HINTS[t]}`);
  }

  private ensureVisible(w: MapNodeWidget): void {
    const s = scrollToShow(this.scroll, w.cy, VIEW.h, this.layout.height, 50);
    if (s !== this.scroll) { this.scroll = s; this.applyScroll(); }
  }

  private applyScroll(): void {
    if (this.edgeMesh) setFrameUv(this.edgeMesh.material, { x: 0, y: this.scroll, w: VIEW.w, h: VIEW.h }, VIEW.w, this.edgeH);
    for (const w of this.nodes) {
      const y = VIEW.y + w.cy - this.scroll;
      const half = Math.floor(w.rect.w / 2);
      w.moveTo(VIEW.x + w.cx - half, y - half);
      w.visible = y - half >= VIEW.y && y + half <= VIEW.y + VIEW.h;
    }
    this.placeCursor();
  }

  private placeCursor(): void {
    const s = this.state;
    const cur = s.mapPos;
    if (!cur) { this.cursor.visible = false; return; }
    const w = this.nodes.find((n) => n.current);
    if (!w) throw new Error('map: current node widget missing');
    this.cursor.moveTo(w.rect.x - 9, w.rect.y + Math.floor(w.rect.h / 2) - 4);
    this.cursor.visible = w.visible && Math.floor(this.blink / 400) % 2 === 0;
  }

  override update(dtMs: number = 16): void {
    super.update(dtMs);
    if (this.leaving) return;
    this.blink += 16;
    this.placeCursor();
    const inp = this.app.input;
    if (this.focus.depth === 1 && inp.wheel !== 0) {
      const max = Math.max(0, this.layout.height - VIEW.h);
      this.scroll = Math.max(0, Math.min(max, this.scroll + inp.wheel * 24));
      this.applyScroll();
    }
    const info = inp.held('info') && this.focus.depth === 1;
    if (info && !this.legend) {
      this.legend = this.add(new Tooltip({ maxWidth: 200 }));
      const lines = (Object.keys(NODE_NAMES) as MapNode['type'][]).map((t) => `${NODE_NAMES[t]}: ${NODE_HINTS[t]}`);
      this.legend.show(rect(6, 166, 162, 10), `[yellow]LEGEND[/]\n${lines.join('\n')}`, 'below');
    } else if (!info && this.legend) {
      this.removeWidget(this.legend);
      this.legend = null;
    }
  }

  protected refresh(_e: readonly GameEvent[]): void { /* travel always changes phase */ }
}
