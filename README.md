<div align="center">

# VRC Launcher

**A Rust + Tauri alternative and variant of the official VRChat Quick Launcher**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](.)
[![Tauri](https://img.shields.io/badge/tauri-2.x-24C8DB.svg)](https://tauri.app/)
[![Vue](https://img.shields.io/badge/vue-3.x-42B883.svg)](https://vuejs.org/)
[![Rust](https://img.shields.io/badge/rust-2021-000000.svg)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/license-ComfyChloe%20Non--Commercial%20Copyleft%20License%201.2-lightgrey.svg)](LICENSE)

*Native launcher flow for VRChat installs, profiles, instance startup, and window tiling.*

[About](#about) • [What It Does](#what-it-does) • [Launch Multiple Clients](#launch-multiple-clients) • [Development](#development) • [License Direction](#license-direction)

</div>

---

VRC-QL-TS is a desktop launcher for VRChat-oriented multi-instance and profile workflows, built with a Vue frontend and a Rust/Tauri backend. It is designed as an alternative and variant of the official VRChat Quick Launcher, with the goal of providing a lighter native desktop app for picking installs, managing profiles, launching instances, and arranging running VRChat windows.

## About

This project is a Tauri/Rust implementation of an alternative take on the official VRChat Quick Launcher.

It is intended for people who want a denser version of the VRChat Quick Launcher, with clearer organization for installs and profiles so it is easier to know what is what at a glance.

At a high level, the app is meant to help with:

- organizing VRChat installs
- managing launcher profiles
- starting VRChat instances with a simpler desktop flow
- launching multiple clients in a controlled queue
- arranging visible VRChat windows on screen

## What It Does

The current codebase is focused on the initial launcher foundation:

- Vue app bootstrapping and theme/config loading
- Launcher, installs, profiles, and settings pages
- Native Tauri command for launching VRChat instances
- Native Tauri command for tiling visible VRChat windows on Windows

## Launch Multiple Clients

The launcher includes a queue-based flow for starting multiple VRChat clients in one pass.

- add one or more profiles to the launch queue
- reorder the queue to control launch order
- enable or disable individual entries without removing them
- assign installs per queue entry
- reuse the same profile multiple times with different install settings
- launch the queue from top to bottom

When launching a batch, the app waits for VRChat to open between profiles before continuing to the next entry. If auto-layout is enabled and more than one profile is launched, the app can also tile visible VRChat windows afterward.

### Profile Slots

The profile slot field maps to the VRChat launch argument `--profile=N`.

- `0` is the normal default or Steam-style launch path, so the launcher does not add `--profile=0`
- `1` is the first separate profile slot
- `2` is the second separate profile slot
- higher numbers continue the same pattern

Use different profile slot values when you want launches to stay separated from each other in their local VRChat profile data. If two launch profiles use the same slot number, they are targeting the same VRChat profile slot.

## Development

Technical summary: `v0.1.0` • `Vue 3 + Vite` • `Rust + Tauri 2` • `Windows & Linux desktop`

### Requirements

- Node.js
- Rust toolchain
- Tauri 2 prerequisites for your platform (see below)

#### Windows

- Microsoft Edge WebView2 runtime (for the desktop app to run)
- Visual Studio C++ Build Tools

#### Linux (Ubuntu / Debian)

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libappindicator3-dev librsvg2-dev patchelf
```

#### Linux (Fedora)

```bash
sudo dnf install webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel
```

#### Linux (Arch)

```bash
sudo pacman -S webkit2gtk-4.1 gtk3 libappindicator-gtk3 librsvg
```

### Scripts

```bash
npm run dev
npm run build
npm run typecheck
```

### What The Scripts Do

| Command | Purpose |
| --- | --- |
| `npm run dev` | Runs the Tauri desktop app in development mode |
| `npm run build` | Builds the production desktop bundle for the current platform |
| `npm run build:linux:deb` | Builds a `.deb` package — **Linux only** |
| `npm run build:linux:rpm` | Builds an `.rpm` package — **Linux only** |
| `npm run build:linux:appimage` | Builds a universal `.AppImage` — **Linux only** |
| `npm run dev:vite` | Runs only the Vite frontend dev server |
| `npm run build:vite` | Builds only the frontend assets |
| `npm run typecheck` | Runs `vue-tsc --noEmit` |

### Building for Linux

Linux packages **cannot** be cross-compiled from Windows — they must be built on a Linux machine. The GitHub Actions workflow handles this automatically.

**To build Linux packages locally**, you need a Linux machine with the system dependencies installed (see [Requirements](#requirements)), then:

```bash
npm install
npm run build                  # all formats
npm run build:linux:appimage   # just AppImage
```

Build output is in `src-tauri/target/release/bundle/`.

### GitHub Actions (Automated Builds)

The included workflow at `.github/workflows/build.yml` builds both platforms automatically. No setup is needed — just push a tag.

**To publish a release:**

1. Push a version tag to GitHub:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
2. GitHub Actions starts automatically — Windows and Linux build in parallel.
3. When both finish, a **draft pre-release** appears in GitHub → Releases.
4. Review it, add release notes if wanted, then publish.

**To do a test build without a release:**

Go to GitHub → Actions → `Build` → click `Run workflow`. The results are downloadable from the Actions run page for 7 days.

> **Note:** Linux releases are marked as pre-release since Linux support is currently in testing.

## Developer Notes

### Repo Map

Using ARC-Client as the reference for how to document startup coverage, this is the minimal map of where this app starts and what each initial file is responsible for.

| Path | Purpose |
| --- | --- |
| `package.json` | Frontend package metadata, app version, and dev/build/typecheck scripts |
| `src/main.ts` | Frontend entry point; loads config, applies theme, mounts Vue |
| `src/App.vue` | Main app shell; handles top-level navigation between pages |
| `src/pages/` | Primary desktop views such as Launcher, Installs, Profiles, and Settings |
| `src-tauri/Cargo.toml` | Rust package metadata and native dependency definitions |
| `src-tauri/tauri.conf.json` | Tauri product name, version, window config, bundle settings |
| `src-tauri/src/main.rs` | Native executable entry point |
| `src-tauri/src/lib.rs` | Tauri builder, plugin registration, and command wiring |
| `src-tauri/src/commands/launch.rs` | Launches VRChat or `launch.exe`, with optional process handoff wait |
| `src-tauri/src/commands/proton.rs` | Linux-only Proton detection and VRChat launch wrapping |
| `src-tauri/src/commands/window_tile.rs` | Tiles visible VRChat windows across the primary display (Windows only) |

### Startup Flow

1. `npm run dev` starts the Tauri dev process.
2. Vite serves the Vue frontend.
3. Tauri loads the Rust backend from `src-tauri`.
4. `src/main.ts` loads saved config and applies the selected theme.
5. `src/App.vue` renders the shell and swaps between the core pages.
6. Frontend actions call Rust commands for native launch and window management behavior.

## Notes On Platform Behavior

- On Windows, the app runs through Tauri using Microsoft Edge WebView2 as its webview runtime.
- On Linux, the app uses WebKitGTK as the webview runtime (not WebView2).
- VRChat on Linux runs through Steam's Proton compatibility layer.
- The launcher invokes Proton directly to enable multi-instance launching (Steam's CLI forces single-instance).
- Proton is auto-detected from the Steam installation when VRChat.exe is selected.
- Window tiling is implemented for Windows and is a no-op on Linux (documented as Windows-only for now).
- The app window is currently configured as a standard resizable desktop window with a dark theme.

### Linux Pre-Release Notes

Linux support is in pre-release. Known limitations:

- Window tiling (auto-layout) is not available on Linux
- Proton auto-detection looks for VRChat's configured Proton in Steam's config.vdf, falling back to Proton - Experimental or the highest installed Proton version
- Custom Proton builds (GE-Proton) are detected in `~/.steam/root/compatibilitytools.d/`
- Flatpak Steam installations are not yet supported
- VRChat must have been launched through Steam at least once before using this launcher (to create the Proton prefix/compatdata)

## License Direction

This repository is licensed under the custom `ComfyChloe Non-Commercial Copyleft License 1.2`.

In practical terms, that means:

- people may view, share, and modify the code
- people may publish fixes, forks, and contributions
- distributed modified versions must remain under the same license
- distributed versions must include source code
- selling the code or redistributed builds is not allowed without separate written permission
- closed-source redistribution is not allowed

This is a custom license for this repository. It is not MIT, GPL, Apache, or MPL.
