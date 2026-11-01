// Test environment: our own vite dev server on a free port (never 4173 / the user's servers) and a
// Playwright Chromium (never the user's Chrome).

import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';

export const REPO = path.resolve(import.meta.dirname, '../../..');
const FORBIDDEN_PORTS = new Set([4173, 5173]);

async function freePort(): Promise<number> {
  for (let i = 0; i < 20; i++) {
    const port = await new Promise<number>((resolve, reject) => {
      const srv = net.createServer();
      srv.once('error', reject);
      srv.listen(0, '127.0.0.1', () => {
        const a = srv.address();
        if (a === null || typeof a === 'string') { srv.close(); reject(new Error('freePort: no TCP address')); return; }
        srv.close(() => resolve(a.port));
      });
    });
    if (!FORBIDDEN_PORTS.has(port)) return port;
  }
  throw new Error('freePort: no free port found');
}

export interface Server { url: string; close(): Promise<void> }

/**
 * Vite dev server for the repo, on 127.0.0.1:<free port>. HMR and the file watcher are off: other
 * agents edit the repo while tests run, and a reload mid-run would look like a game bug. The socket
 * stays on (vite 8's client forwards logs over it and errors without it); when a network change drops
 * it, the client reloads every page, which run.ts treats as an environment failure and retries.
 */
export async function startServer(): Promise<Server> {
  const port = await freePort();
  const server: ViteDevServer = await createServer({
    root: REPO,
    configFile: path.join(REPO, 'vite.config.ts'),
    logLevel: 'silent', // page errors reach the harness through Playwright; vite would echo them again
    clearScreen: false,
    server: { host: '127.0.0.1', port, strictPort: true, hmr: false, watch: null },
  });
  await server.listen();
  const url = `http://127.0.0.1:${port}`;
  return { url, close: () => server.close() };
}

/** Playwright's own Chromium; falls back to an older downloaded build, then $VIBE_CHROME. */
export function chromePath(): string {
  const candidates = [
    process.env.VIBE_CHROME,
    chromium.executablePath(),
    path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  ].filter((p): p is string => typeof p === 'string' && p !== '');
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error(`no Chromium for Playwright (tried ${candidates.join(', ')}). Run: npx playwright install chromium`);
  return found;
}

export async function launchBrowser(headed = false): Promise<Browser> {
  return chromium.launch({
    executablePath: chromePath(),
    headless: !headed,
    // run.ts closes the browser and the vite server itself on SIGINT / SIGTERM / SIGHUP (in that order)
    handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false,
    args: [
      '--enable-unsafe-swiftshader', // WebGL in headless without a GPU
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  });
}
