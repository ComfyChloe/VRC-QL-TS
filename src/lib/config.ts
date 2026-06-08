// ─────────────────────────────────────────────────────────
//  lib/config.ts — global reactive config store
//
//  Loads from / saves to AppData/vrc-launcher/config.json
//  via the Tauri fs plugin.
//
//  Also owns theme application for CSS variables and the
//  native Tauri window theme/background.
// ─────────────────────────────────────────────────────────
import { ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { type AppConfig, type AppTheme, defaultConfig } from './types'

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
      queue:     parsed.queue     ?? defaults.queue,
      theme:     { ...defaults.theme,  ...(parsed.theme  ?? {}) },
      window:    { ...defaults.window, ...(parsed.window ?? {}) },
      globalOptions: { ...defaults.globalOptions, ...(parsed.globalOptions ?? {}) },
      streamerMode: parsed.streamerMode ?? defaults.streamerMode
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

export async function applyTheme(theme: AppTheme): Promise<void> {
  const el = document.documentElement
  el.style.setProperty('--color-bg-base', theme.backgroundColor)
  el.style.setProperty('--color-bg-surface', theme.surfaceColor)
  el.style.setProperty('--color-bg-elevated', lightenHex(theme.backgroundColor, 6))
  el.style.setProperty('--color-bg-overlay', lightenHex(theme.surfaceColor, 8))
  el.style.setProperty('--color-border', mixHex(theme.backgroundColor, theme.surfaceColor, 0.62))
  el.style.setProperty('--color-border-hover', mixHex(theme.backgroundColor, theme.surfaceColor, 0.78))
  el.style.setProperty('--color-accent', theme.accentColor)
  el.style.setProperty('--color-accent-hover', lightenHex(theme.accentColor, 28))
  el.style.setProperty('--color-accent-active', darkenHex(theme.accentColor, 20))
  el.style.setProperty('--color-accent-subtle', hexToRgba(theme.accentColor, 0.12))

  try {
    const appWindow = getCurrentWindow()
    await appWindow.setTheme(isDarkColor(theme.backgroundColor) ? 'dark' : 'light')
    await appWindow.setBackgroundColor(theme.backgroundColor)
  } catch (e) {
    console.error('Failed to apply native window theme:', e)
  }
}

export async function applyAccentColor(hex: string): Promise<void> {
  appConfig.value.theme.accentColor = hex
  await applyTheme(appConfig.value.theme)
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

function mixHex(baseHex: string, targetHex: string, weight: number): string {
  const [r1, g1, b1] = hexToRgb(baseHex)
  const [r2, g2, b2] = hexToRgb(targetHex)
  return `#${toHex(r1 + (r2 - r1) * weight)}${toHex(g1 + (g2 - g1) * weight)}${toHex(b1 + (b2 - b1) * weight)}`
}

function isDarkColor(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance < 0.55
}

function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
