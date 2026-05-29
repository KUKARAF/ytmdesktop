# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn start          # Run in development mode (Electron + Vite)
yarn lint           # Run ESLint on .ts, .tsx, .vue files
yarn lint:fix       # Run ESLint with auto-fix
yarn prettier       # Check formatting
yarn prettier:fix   # Apply Prettier formatting
yarn package        # Package the application
yarn make           # Build platform installers (Windows Squirrel, macOS ZIP, Linux DEB/RPM)
```

Pre-commit hooks run `lint-staged` automatically (Prettier + ESLint with `--fix`).

There is no test suite.

## Architecture

YouTube Music Desktop App — an Electron + Vue 3 application that wraps YouTube Music in a webview and adds integrations (Discord Presence, Last.FM, companion server, notifications, custom CSS, volume ratio).

### Process structure

**Main process** (`src/main/index.ts`) — manages three `BrowserWindow` instances, registers global keybinds, runs the Fastify+Socket.io companion server, handles all IPC, and orchestrates integrations. This file is large (~2000 lines); most feature logic lives in `src/main/integrations/`.

**Renderer processes** — three separate Vue 3 apps, one per window:
- `src/renderer/windows/main/` — the main app window (hosts the webview)
- `src/renderer/windows/settings/` — settings UI
- `src/renderer/windows/authorize-companion/` — companion server OAuth flow

Each renderer has its own `renderer.ts` entry and `preload.ts` preload script. Use **Composition API only** (no Options API).

**Webview** (`src/renderer/ytmview/preload.ts`) — a preload script injected into the YouTube Music webpage. It hooks into the YTM player API, relays player state to the main process via IPC, and exposes controls. Scripts injected into the page live in `src/renderer/ytmview/scripts/`.

### State flow

```
YouTube Music page
  → ytmview/preload.ts (intercepts player events)
  → IPC → main process
  → src/main/player-state-store/ (current track/playback state)
  → src/main/memory-store/ (ephemeral runtime state)
  → Conf (src/shared/store/schema.ts) (persistent user config)
  → IPC → renderers via src/renderer/store-ipc/
```

### Path aliases (tsconfig)

| Alias | Resolves to |
|-------|-------------|
| `~shared/*` | `src/shared/*` |
| `~assets/*` | `src/assets/*` |

### Build

Vite configs live in `viteconfig/` (one per process: `main.ts`, `renderer.ts`, plus five preload configs). Electron Forge orchestrates everything via `forge.config.ts`. Output goes to `.vite/`.

### Code style

- Prettier line width: 160 characters, no trailing commas.
- ESLint enforces Vue 3 + TypeScript rules; import order is enforced.
- All Vue components must use Composition API (`<script setup>` or `setup()`).
