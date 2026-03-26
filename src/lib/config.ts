// ─────────────────────────────────────────────────────────
//  lib/config.ts — global reactive config store
//
//  Loads from / saves to AppData/vrc-launcher/config.json
//  via the Tauri fs plugin.
//
//  Also owns applyAccentColor which sets all three CSS
//  custom properties derived from the user's chosen hex.
// ─────────────────────────────────────────────────────────
import { ref } from 'vue'
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { type AppConfig, defaultConfig } from './types'

const CONFIG_DIR  = 'vrc-launcher'
const CONFIG_FILE = 'vrc-launcher/config.json'

export const appConfig = ref<AppConfig>(defaultConfig())

export async function loadConfig(): Promise<void> {
  try {
    const fileExists = await exists(CONFIG_FILE, { baseDir: BaseDirectory.AppData })
    if (!fileExists) return
    const raw = await readTextFile(CONFIG_FILE, { baseDir: BaseDirectory.AppData })
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    const defaults = defaultConfig()
    appConfig.value = {
      installs:  parsed.installs  ?? defaults.installs,
      profiles:  parsed.profiles  ?? defaults.profiles,
      theme:     { ...defaults.theme,  ...(parsed.theme  ?? {}) },
      window:    { ...defaults.window, ...(parsed.window ?? {}) }
    }
  } catch (e) {
    console.error('Failed to load config:', e)
  }
}

export async function saveConfig(): Promise<void> {
  try {
    const dirExists = await exists(CONFIG_DIR, { baseDir: BaseDirectory.AppData })
    if (!dirExists) {
      await mkdir(CONFIG_DIR, { baseDir: BaseDirectory.AppData, recursive: true })
    }
    await writeTextFile(
      CONFIG_FILE,
      JSON.stringify(appConfig.value, null, 2),
      { baseDir: BaseDirectory.AppData }
    )
  } catch (e) {
    console.error('Failed to save config:', e)
  }
}

// Applies all three accent CSS vars derived from a single hex colour.
// Called on startup (from saved theme) and on every colour picker change.
export function applyAccentColor(hex: string): void {
  const el = document.documentElement
  el.style.setProperty('--color-accent',        hex)
  el.style.setProperty('--color-accent-hover',  lightenHex(hex, 28))
  el.style.setProperty('--color-accent-active', darkenHex(hex, 20))
  el.style.setProperty('--color-accent-subtle', hexToRgba(hex, 0.12))
}

// ── Colour helpers ────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ]
}

function toHex(v: number): string {
  return Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')
}

function lightenHex(hex: string, pct: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `#${toHex(r + (255 - r) * pct / 100)}${toHex(g + (255 - g) * pct / 100)}${toHex(b + (255 - b) * pct / 100)}`
}

function darkenHex(hex: string, pct: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `#${toHex(r * (1 - pct / 100))}${toHex(g * (1 - pct / 100))}${toHex(b * (1 - pct / 100))}`
}

function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
