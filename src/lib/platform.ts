// ─────────────────────────────────────────────────────────
//  lib/platform.ts — runtime OS detection using
//  navigator.platform (no extra Tauri plugin needed)
// ─────────────────────────────────────────────────────────

const platform = navigator.platform?.toLowerCase() ?? ''

export const isWindows = platform.startsWith('win')
export const isLinux = platform.startsWith('linux')
export const isMac = platform.startsWith('mac')
