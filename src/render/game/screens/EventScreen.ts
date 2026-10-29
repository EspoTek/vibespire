/**
 * Event (GDD §6) on event_generic.png: the event name, a PS text box with the flavour text typed
 * out at 1 char / 15 ms (confirm or click skips), the options with disabled reasons (gamble odds
 * are part of the engine's option labels), outcome text from the engine's `text` events, then
 * PROCEED. An option that starts a combat moves the run to the combat phase and the router follows.
 */
import { getEventDef } from '../../../content/index.ts';
import { getEventOptions, renderEventText, type GameEvent } from '../../../engine/index.ts';
import type { App } from '../../app.ts';
import { rect, W } from '../../layout.ts';
import { C } from '../../palette.ts';
import { Button } from '../../ui/Button.ts';
import { Label } from '../../ui/Label.ts';
import { Panel } from '../../ui/Panel.ts';
import { Z, type Widget } from '../../ui/Widget.ts';
import { RunScreen } from '../RunScreen.ts';
import type { RunSession } from '../session.ts';
import { ChoiceRow } from '../widgets.ts';

const CHAR_MS = 15;

export class EventScreen extends RunScreen {
  private content: Widget[] = [];
  private textBox!: Label;
  private fullText = '';
  private shown = 0;
  private typeClock = 0;
  private outcome: string[] = [];

  constructor(app: App, session: RunSession) { super(app, session, 'event', 'event_generic'); }

  /** Main text, or the current page's text. */
  private pageText(): string {
    const ev = this.state.event;
    if (!ev) throw new Error('EventScreen: no event state');
    return renderEventText(ev.id, ev.page);
  }

  protected build(): void { this.draw(); }

  private draw(): void {
    for (const w of this.content) { this.scope.remove(w); this.removeWidget(w); }
    this.content = [];
    const ev = this.state.event;
    if (!ev) throw new Error('EventScreen: no event state');
    const def = getEventDef(ev.id);
    const title = this.add(new Panel(rect(W / 2 - 110, 42, 220, 20)));
    title.setZ(Z.PANEL);
    title.addChild(new Label(W / 2, 48, def.name.toUpperCase(), { align: 'center', color: C.textHi }), 2);
    this.content.push(title);
    const box = this.add(new Panel(rect(20, 196, W - 40, 150)));
    box.setZ(Z.PANEL);
    this.content.push(box);
    this.fullText = [this.pageText(), ...this.outcome].join('\n\n');
    this.shown = 0;
    this.typeClock = 0;
    const choosing = !ev.done && ev.chosen === null;
    const opts = choosing ? getEventOptions(this.state) : [];
    const need = opts.reduce((a, o, i) => a + 2 + ChoiceRow.heightFor(o.label, W - 68, { small: true, reason: !o.enabled || this.session.findOrNull('event_choice', (x) => x.index === i) === null }), 0);
    let y = choosing ? Math.min(270, 342 - need) : 316;
    // the text gets every line above the options (the full text is also announced and on the box label)
    const lines = Math.max(2, Math.floor((y - 210) / 10));
    this.textBox = box.addChild(new Label(34, 206, '', { maxWidth: W - 68, lineHeight: 10, markup: false, maxLines: lines, overflow: 'ellipsis' }), 2);
    this.textBox.label = this.fullText;
    this.app.announce(this.fullText);
    if (choosing) {
      opts.forEach((o, i) => {
        const a = this.session.findOrNull('event_choice', (x) => x.index === i);
        const reason = o.enabled && a ? null : (o.reason ?? 'Not available.');
        const h = ChoiceRow.heightFor(o.label, W - 68, { small: true, reason: reason !== null });
        const row = box.addChild(new ChoiceRow(rect(34, y, W - 68, h), { text: o.label, font: 'small', reason }), 3);
        row.list = { key: 'event-options', index: i, axis: 'y', wrap: true };
        row.onActivate = () => {
          if (!a) { this.app.sfx.play('cancel'); return; }
          if (this.shown < this.fullText.length) { this.finishTyping(); return; }
          this.outcome = [];
          this.act(a);
        };
        y += row.rect.h + 2;
      });
    } else {
      const proceed = this.session.findOrNull('proceed');
      box.addChild(new Button(rect(W / 2 - 50, 322, 100, 0), 'PROCEED', { onActivate: () => { if (proceed) this.act(proceed); } }), 3).setEnabled(proceed !== null);
    }
    this.scope.add(box);
  }

  private finishTyping(): void {
    this.shown = this.fullText.length;
    this.textBox.setText(this.fullText);
  }

  override update(): void {
    super.update();
    if (this.shown < this.fullText.length) {
      this.typeClock += 16 * this.app.tweens.speed;
      const n = Math.min(this.fullText.length, Math.floor(this.typeClock / CHAR_MS));
      if (n !== this.shown) { this.shown = n; this.textBox.setText(this.fullText.slice(0, n)); }
      const inp = this.app.input;
      if (this.focus.depth === 1 && inp.pointer.pressed) this.finishTyping();
    }
  }

  protected refresh(events: readonly GameEvent[]): void {
    this.outcome = events.filter((e): e is Extract<GameEvent, { t: 'text' }> => e.t === 'text').map((e) => e.text);
    this.draw();
  }

  /** Outcome text is shown in the box, not as toasts. */
  protected override toastEvents(events: readonly GameEvent[]): void {
    super.toastEvents(events.filter((e) => e.t !== 'text'));
  }
}
