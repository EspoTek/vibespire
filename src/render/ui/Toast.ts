/**
 * Toasts: short PS-box messages at the top centre of the screen, shown one at a time from a
 * queue, above every screen (they live on the app overlay, not in a Screen). Each message is also
 * announced to screen readers.
 */
import * as THREE from 'three';
import { fonts } from '../fonts.ts';
import { rect, W } from '../layout.ts';
import { C } from '../palette.ts';
import { Text } from '../text.ts';
import { Panel } from './Panel.ts';
import { Widget, Z } from './Widget.ts';

export class Toast extends Widget {
  constructor(text: string, y = 6) {
    const t = new Text(fonts.ui, text, { color: C.text, maxWidth: 360, align: 'center' });
    const w = Math.min(380, t.layout.width + 20);
    const h = t.height + 12;
    super(rect(Math.floor((W - w) / 2), y, w, h), 'toast');
    this.addChild(new Panel(rect(this.rect.x, y, w, h)), 0);
    t.setStyle({ maxWidth: w - 20 });
    this.addPart(t, 2).place(10, 6);
    this.label = text;
    this.setZ(Z.TOAST);
  }
}

export class ToastManager {
  readonly root = new THREE.Group();
  private readonly queue: { text: string; ms: number }[] = [];
  private current: { toast: Toast; left: number } | null = null;
  private readonly announce: (s: string) => void;

  constructor(announce: (s: string) => void) {
    this.announce = announce;
    this.root.renderOrder = 1_000_000; // above every screen
  }

  show(text: string, ms = 1800): void {
    this.queue.push({ text, ms });
  }

  update(dtMs: number): void {
    if (this.current) {
      this.current.left -= dtMs;
      if (this.current.left > 0) return;
      this.current.toast.dispose();
      this.current = null;
    }
    const next = this.queue.shift();
    if (!next) return;
    const toast = new Toast(next.text);
    this.root.add(toast.node);
    this.current = { toast, left: next.ms };
    this.announce(next.text);
  }
}
