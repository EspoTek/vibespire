/**
 * GateScreen: "PRESS ANY KEY / CLICK". Browsers only allow audio after a user activation
 * (keydown / pointerdown), and gamepad input does not count, so the game starts behind this gate.
 * The visuals are bitmap text in WebGL; a transparent full-screen DOM <button> sits on top so the
 * gesture is captured and screen-reader users get a real, labelled control. On key/click it
 * unlocks audio, removes itself and replaces itself with the title. A gamepad press also passes the
 * gate (sound stays off until the first key/click; a toast says so).
 */
import type { App } from '../app.ts';
import { H, W } from '../layout.ts';
import { C } from '../palette.ts';
import { Backdrop } from '../ui/Backdrop.ts';
import { Label } from '../ui/Label.ts';
import { Screen } from './Screen.ts';
import { TitleScreen } from './TitleScreen.ts';

export class GateScreen extends Screen {
  private button: HTMLButtonElement | null = null;
  private prompt: Label;
  private t = 0;
  private done = false;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // let browser shortcuts through
    this.pass(true);
  };

  constructor(app: App) {
    super(app, 'gate');
    this.add(new Backdrop(app.assets.backdrops, 'title_spire'));
    this.add(new Label(W / 2, 140, 'VIBESPIRE', { align: 'center', scale: 2, color: C.white, effects: [{ dx: 1, dy: 1, color: C.psBlue }] }));
    this.prompt = this.add(new Label(0, 190, 'PRESS ANY KEY / CLICK', { maxWidth: W, align: 'center', color: C.textHi }));
    this.add(new Label(0, H - 14, 'KEYBOARD  MOUSE  GAMEPAD', { maxWidth: W, align: 'center', color: C.textMuted }));
  }

  override enter(): void {
    const b = document.createElement('button');
    b.id = 'gate';
    b.type = 'button';
    b.textContent = 'Press any key or click to start Vibespire';
    b.setAttribute('aria-label', 'Start Vibespire: press any key or click');
    b.addEventListener('pointerdown', () => this.pass(true));
    document.body.appendChild(b);
    b.focus();
    this.button = b;
    window.addEventListener('keydown', this.onKey);
  }

  private pass(withAudio: boolean): void {
    if (this.done) return;
    this.done = true;
    if (withAudio) {
      this.app.sfx.unlock(); // inside the gesture handler: required by autoplay policy
    }
    this.removeGate();
    void this.app.screens.replace(new TitleScreen(this.app)).then(() => {
      if (withAudio) this.app.sfx.play('confirm');
      else this.app.toasts.show('SOUND OFF: PRESS A KEY OR CLICK ONCE TO ENABLE', 3500);
    });
  }

  private removeGate(): void {
    window.removeEventListener('keydown', this.onKey);
    this.button?.remove();
    this.button = null;
  }

  override update(dtMs: number): void {
    this.t += dtMs;
    this.prompt.visible = Math.floor(this.t / 500) % 2 === 0; // PS-style blink
    if (this.app.input.lastDevice === 'gamepad' && this.app.input.anyInput) this.pass(false);
  }

  override exit(): void { this.removeGate(); }
}
