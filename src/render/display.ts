/**
 * The "VDP": everything renders into a 640x360 sRGB render target (nearest filtered), which is then
 * blitted to the canvas at the largest integer scale that fits, letterboxed black. The canvas
 * backing store is sized in device pixels (ResizeObserver device-pixel-content-box where supported,
 * so there's no compositor resample), so game code never sees DPR.
 *
 * The blit shader also implements the SMS-style palette fade: each channel is stepped through the
 * four SMS levels (FF -> AA -> 55 -> 00) rather than blended, which is how PS fades screens.
 */
import * as THREE from 'three';
import { clientToLogical, computeViewport, H, W, type Point, type Viewport } from './layout.ts';

const blitVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// The RT is SRGB8_ALPHA8, so sampling returns linear values; re-encode to sRGB bytes and write them
// straight to the (sRGB) canvas. With uFade = 0 the bytes pass through unchanged.
const blitFragment = /* glsl */ `
uniform sampler2D tSrc;
uniform float uFade;   // -3..3 whole SMS levels; negative = toward black, positive = toward white
varying vec2 vUv;
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
void main() {
  vec3 s = toSRGB(texture2D(tSrc, vUv).rgb);
  if (uFade != 0.0) {
    vec3 lv = floor(s * 3.0 + 0.5);
    s = clamp(lv + uFade, 0.0, 3.0) / 3.0;
  }
  gl_FragColor = vec4(s, 1.0);
}`;

export class Display {
  readonly renderer: THREE.WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  readonly rt: THREE.WebGLRenderTarget;
  readonly scene = new THREE.Scene();
  /** Logical-pixel ortho camera: x right, y DOWN, origin top-left. */
  readonly camera = new THREE.OrthographicCamera(0, W, 0, H, -1000, 1000);
  private readonly blitScene = new THREE.Scene();
  private readonly blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly blitMaterial: THREE.ShaderMaterial;
  private backingW = 1;
  private backingH = 1;
  view: Viewport = { scale: 1, left: 0, top: 0, bottom: 0 };
  /** Called after every resize with the new viewport (e.g. for debug overlays). */
  onResize: ((v: Viewport) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1); // backing store is sized in device px by resize()
    this.renderer.setClearColor(0x000000, 1);
    this.canvas = this.renderer.domElement;
    this.canvas.id = 'screen';
    this.canvas.setAttribute('aria-label', 'Vibespire game screen');
    parent.appendChild(this.canvas);

    this.rt = new THREE.WebGLRenderTarget(W, H, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      depthBuffer: false, // 2D: layering is renderOrder, not depth
      colorSpace: THREE.SRGBColorSpace, // SRGB8_ALPHA8: palette bytes round-trip exactly
    });
    this.camera.position.z = 10;
    this.scene.background = new THREE.Color(0x000000);

    this.blitMaterial = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: this.rt.texture }, uFade: { value: 0 } },
      vertexShader: blitVertex,
      fragmentShader: blitFragment,
      depthTest: false,
      depthWrite: false,
    });
    this.blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blitMaterial));

    this.observeSize();
  }

  private observeSize(): void {
    const apply = (bw: number, bh: number) => {
      if (bw <= 0 || bh <= 0) return; // hidden / zero-size layout pass: keep the last good size
      this.backingW = bw;
      this.backingH = bh;
      this.renderer.setSize(bw, bh, false);
      this.view = computeViewport(bw, bh);
      this.onResize?.(this.view);
    };
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const dp = e.devicePixelContentBoxSize?.[0];
        if (dp) apply(dp.inlineSize, dp.blockSize);
        else {
          const dpr = window.devicePixelRatio;
          apply(Math.round(e.contentRect.width * dpr), Math.round(e.contentRect.height * dpr));
        }
      }
    });
    try {
      ro.observe(this.canvas, { box: 'device-pixel-content-box' });
    } catch (e) {
      // Safari < 15.4 throws on the unsupported box option: observe the CSS box instead.
      if (!(e instanceof TypeError) && !(e instanceof DOMException)) throw e;
      ro.observe(this.canvas);
      // DPR changes (browser zoom, moving monitors) don't resize the CSS box: re-measure on resize too.
      window.addEventListener('resize', () => {
        const r = this.canvas.getBoundingClientRect();
        apply(Math.round(r.width * window.devicePixelRatio), Math.round(r.height * window.devicePixelRatio));
      });
    }
    const r = this.canvas.getBoundingClientRect();
    apply(Math.round(r.width * window.devicePixelRatio), Math.round(r.height * window.devicePixelRatio));
  }

  /** Palette fade level in whole SMS steps: 0 = normal, -3 = black, +3 = white. */
  setFade(level: number): void {
    if (!Number.isInteger(level) || level < -3 || level > 3) throw new Error(`Display.setFade: level must be an integer in -3..3, got ${level}`);
    (this.blitMaterial.uniforms['tSrc'] as THREE.IUniform).value = this.rt.texture;
    (this.blitMaterial.uniforms['uFade'] as THREE.IUniform<number>).value = level;
  }

  render(): void {
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    const v = this.view;
    this.renderer.setViewport(v.left, v.bottom, W * v.scale, H * v.scale);
    this.renderer.render(this.blitScene, this.blitCamera); // autoClear blacks the letterbox
  }

  /** Browser client coords -> logical pixel. */
  toLogical(clientX: number, clientY: number): Point & { inside: boolean } {
    return clientToLogical(clientX, clientY, this.canvas.getBoundingClientRect(), this.backingW, this.backingH, this.view);
  }

  /** Debug: the stored sRGB bytes of logical pixel (x, y) in the render target. */
  readPixel(x: number, y: number): [number, number, number, number] {
    const out = new Uint8Array(4);
    // render target rows are bottom-up
    this.renderer.readRenderTargetPixels(this.rt, x, H - 1 - y, 1, 1, out);
    return [out[0] as number, out[1] as number, out[2] as number, out[3] as number];
  }

  get backing(): { w: number; h: number } { return { w: this.backingW, h: this.backingH }; }
}
