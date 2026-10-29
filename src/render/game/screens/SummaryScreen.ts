/**
 * Victory / defeat summary (the save is already deleted by RunSession): class, seed, how far,
 * cause of death, turns, damage, Shards, deck with Bloom values, relics. NEW RUN / TITLE.
 */
import { getCardDef, getClassDef, getEncounterDef, getRelicDef } from '../../../content/index.ts';
import type { App } from '../../app.ts';
import { actBackdrop } from '../../assets.ts';
import { fonts } from '../../fonts.ts';
import { rect, W } from '../../layout.ts';
import { C } from '../../palette.ts';
import { Screen } from '../../screens/Screen.ts';
import { Backdrop } from '../../ui/Backdrop.ts';
import { Button } from '../../ui/Button.ts';
import { Label } from '../../ui/Label.ts';
import { Panel } from '../../ui/Panel.ts';
import { Z } from '../../ui/Widget.ts';
import type { RunSession } from '../session.ts';
import { summarizeRun } from '../summary.ts';
import { ClassSelectScreen } from './ClassSelectScreen.ts';

export class SummaryScreen extends Screen {
  constructor(app: App, session: RunSession) {
    super(app, 'summary');
    const s = session.state;
    if (s.phase !== 'victory' && s.phase !== 'defeat') throw new Error(`SummaryScreen in phase ${s.phase}`);
    this.add(new Backdrop(app.assets.backdrops, s.phase === 'victory' ? 'title_spire' : actBackdrop(s.act))).setDim(s.phase === 'victory' ? 0 : 2);
    const sum = summarizeRun({
      phase: s.phase, classId: s.classId, seed: s.seed, act: s.act, floor: s.floor, hp: s.player.hp, maxHp: s.player.maxHp,
      gold: s.player.gold, deck: s.player.deck, relics: s.player.relics, floors: s.history.floors,
    }, {
      className: (id) => getClassDef(id).name.toUpperCase(),
      cardName: (id, up) => getCardDef(id, up).name,
      relicName: (id) => getRelicDef(id).name,
      encounterName: (id) => getEncounterDef(id).name.toUpperCase(),
      damageDealt: session.damageDealt,
    });
    const panel = this.add(new Panel(rect(20, 14, W - 40, 332), { title: sum.title }));
    panel.setZ(Z.PANEL);
    sum.rows.forEach(([k, v], i) => {
      panel.addChild(new Label(36, 40 + i * 12, k, { color: C.textMuted }), 2);
      panel.addChild(new Label(160, 40 + i * 12, v, { color: k === 'FELL TO' ? C.pink : C.text, maxWidth: 160, overflow: 'ellipsis', maxLines: 1 }), 2);
    });
    panel.addChild(new Label(336, 40, 'DECK', { color: C.textHi }), 2);
    panel.addChild(new Label(336, 52, sum.deck.join('\n'), { font: fonts.small, lineHeight: 7, maxWidth: 260, overflow: 'ellipsis', maxLines: 30 }), 2);
    panel.addChild(new Label(36, 162, 'RELICS', { color: C.textHi }), 2);
    panel.addChild(new Label(36, 174, sum.relics.length ? sum.relics.join(', ') : 'NONE', { font: fonts.small, maxWidth: 280, lineHeight: 8 }), 2);
    panel.addChild(new Button(rect(W / 2 - 110, 318, 100, 0), 'NEW RUN', { onActivate: () => { void this.app.screens.replace(new ClassSelectScreen(this.app)); } }), 2);
    panel.addChild(new Button(rect(W / 2 + 10, 318, 100, 0), 'TITLE', { onActivate: () => { void this.app.screens.pop(); } }), 2);
    this.focus.pushScope('summary', () => { void this.app.screens.pop(); }).add(panel);
    this.app.sfx.play(s.phase === 'victory' ? 'win' : 'lose');
  }
  override enter(): void { this.focus.ensureFocus(); }
}
