/**
 * App: the renderer's composition root. Owns the display, input, audio, tweens, scheduler, screen
 * stack, toasts and startup-generated assets (fonts, backdrops, UI icons), and runs the frame loop:
 *   input.update -> tweens.update -> screens.update (focus, then screen) -> toasts -> render.
 * Phase-2 screens receive the App and use these services.
 */
import * as THREE from 'three';
import { announce } from './a11y.ts';
import { ENEMY_SPRITES, loadGameAssets, type GameAssets, type SpriteEntry } from './assets.ts';
import { audioClock, Music, Sfx } from './audio.ts';
import { BACKDROP_IDS, drawBackdrop, type BackdropId } from './backdrops.ts';
import { Display } from './display.ts';
import { initFonts } from './fonts.ts';
import { atlasFromPixels, loadImageAtlas, textureFromPixels, type Atlas } from './gfx.ts';
import { InputManager } from './input.ts';
import { ScreenManager } from './screens/Screen.ts';
import { DEFAULT_SETTINGS, KeyValueStorage, SETTINGS_KEY, settingsCodec, Stored, type Settings } from './storage.ts';
import { Scheduler, Tweener } from './tween.ts';
import { rasterizeIconSheet } from './ui/art.ts';
import { ToastManager } from './ui/Toast.ts';

/** Longest frame step fed to the simulation (tab-switch / breakpoint protection). */
const MAX_DT_MS = 1000 / 15;

export class App {
  readonly display: Display;
  readonly input: InputManager;
  readonly sfx: Sfx;
  readonly music: Music;
  readonly tweens = new Tweener();
  readonly scheduler: Scheduler;
  readonly screens: ScreenManager;
  readonly toasts: ToastManager;
  readonly storage = new KeyValueStorage();
  readonly settingsStore: Stored<Settings>;
  settings: Settings;
  /** The procedural backdrops (dev gallery page only; the game uses assets.backdrops). */
  readonly devBackdrops: Readonly<Record<BackdropId, THREE.DataTexture>>;
  private _assets: GameAssets | null = null;
  readonly icons: Atlas;
  readonly enemySprites: readonly SpriteEntry[] = ENEMY_SPRITES;
  readonly announce: (text: string) => void = announce;
  private readonly timer = new THREE.Timer();
  private readonly spriteCache = new Map<string, Promise<Atlas>>();
  /** Frames rendered, and a rolling fps estimate for the debug HUD. */
  frames = 0;
  fps = 0;

  private constructor(parent: HTMLElement) {
    const t0 = performance.now();
    this.display = new Display(parent);
    initFonts();
    this.toasts = new ToastManager(announce);
    this.display.scene.add(this.toasts.root);
    this.storage.onProblem = (kind) => {
      this.toasts.show(kind === 'quota' ? 'SAVE FAILED: STORAGE FULL' : 'SAVES DISABLED IN THIS BROWSER');
    };
    this.settingsStore = new Stored(this.storage, SETTINGS_KEY, settingsCodec);
    this.settings = this.settingsStore.getOrNull() ?? { ...DEFAULT_SETTINGS }; // null = first run
    this.input = new InputManager(this.display.canvas, (x, y) => this.display.toLogical(x, y));
    this.sfx = new Sfx(this.settings.volume);
    this.music = new Music(this.sfx, this.settings.musicVolume);
    this.tweens.speed = this.settings.animSpeed;
    this.scheduler = new Scheduler(this.tweens, (e) => {
      // an animation step failing is a bug: surface it on the crash screen (main.ts's window handlers),
      // never as a toast that lets the run carry on with the screen half-updated
      console.error('[scheduler] animation step failed', e);
      setTimeout(() => { throw e; }, 0);
    });
    this.screens = new ScreenManager(this);

    const b0 = performance.now();
    const bd = {} as Record<BackdropId, THREE.DataTexture>;
    for (const id of BACKDROP_IDS) bd[id] = textureFromPixels(drawBackdrop(id));
    this.devBackdrops = bd;
    const sheet = rasterizeIconSheet();
    this.icons = atlasFromPixels(sheet.pixels, sheet.frames, 'ui-icons');
    console.info(`[app] startup: display+fonts ${(b0 - t0).toFixed(0)} ms, backdrops+icons ${(performance.now() - b0).toFixed(0)} ms`);

    // Audio unlock: any later key/click unlocks too (covers players who passed the gate with a pad).
    const unlock = () => { if (!this.sfx.unlocked) this.sfx.unlock(); };
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
    this.timer.connect(document);
  }

  /** Construct and preload every asset the screens draw synchronously. */
  static async create(parent: HTMLElement): Promise<App> {
    const app = new App(parent);
    app._assets = await loadGameAssets();
    return app;
  }

  /** Preloaded game assets (throws if used before App.create finished). */
  get assets(): GameAssets {
    if (!this._assets) throw new Error('app.assets used before App.create() finished loading');
    return this._assets;
  }

  /** Load (once) an enemy sprite PNG as a single-frame atlas named after the file. */
  enemySprite(name: string): Promise<Atlas> {
    let p = this.spriteCache.get(name);
    if (!p) {
      const entry = this.enemySprites.find((e) => e.name === name);
      if (!entry) throw new Error(`enemySprite: no sprite "${name}" in public/assets/sprites/enemies (have: ${this.enemySprites.map((e) => e.name).join(', ')})`);
      p = loadImageAtlas(entry.url, name);
      this.spriteCache.set(name, p);
    }
    return p;
  }

  saveSettings(patch: Partial<Omit<Settings, 'version'>>): void {
    this.settings = { ...this.settings, ...patch };
    if (patch.volume !== undefined) this.sfx.volume = patch.volume;
    if (patch.musicVolume !== undefined) this.music.volume = patch.musicVolume;
    if (patch.animSpeed !== undefined) this.tweens.speed = patch.animSpeed;
    this.settingsStore.set(this.settings);
  }

  /** One simulation step (everything but the render): input, tweens, screens, music, toasts. */
  tick(dt: number): void {
    audioClock.frame = this.frames; // SFX / cue logs name the frame they fired on
    this.input.update(dt);
    this.tweens.update(dt);
    this.screens.update(dt);
    const song = this.screens.top?.music;
    if (song !== undefined) this.music.want(song);
    this.music.update();
    this.toasts.update(dt);
  }

  /**
   * Real-time frame loop: one tick per animation frame. The e2e hook (src/render/debug, ?e2e=1 only)
   * replaces this loop with a fixed-step one that runs N ticks per frame.
   */
  start(): void {
    let fpsAcc = 0, fpsFrames = 0;
    this.display.renderer.setAnimationLoop((t: number) => {
      this.timer.update(t);
      const raw = this.timer.getDelta() * 1000;
      const dt = Math.min(raw, MAX_DT_MS);
      fpsAcc += raw; fpsFrames++;
      if (fpsAcc >= 500) { this.fps = Math.round((fpsFrames * 1000) / fpsAcc); fpsAcc = 0; fpsFrames = 0; }
      this.tick(dt);
      this.display.render();
      this.frames++;
    });
  }
}
