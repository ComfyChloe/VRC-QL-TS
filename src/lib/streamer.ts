// ─────────────────────────────────────────────────────────
//  lib/streamer.ts — global streamer mode state + masking
//
//  Backed directly by appConfig so the state is shared by
//  every page, survives page switches, and persists to disk.
//  Pages must NOT keep local copies of this flag.
// ─────────────────────────────────────────────────────────
import { computed } from 'vue'
import { appConfig, saveConfig } from './config'

export const streamerMode = computed<boolean>({
  get: () => appConfig.value.streamerMode === true,
  set: (val) => {
    appConfig.value.streamerMode = val
    void saveConfig()
  }
})

/** Mask a display name when streamer mode is on: "Chloe Main" → "Ch*** *****". */
export function maskName(name: string): string {
  if (!streamerMode.value) return name
  return name.split(' ').map((word, i) => {
    if (i === 0) return word.length <= 2 ? word : word.slice(0, 2) + '***'
    return '*****'
  }).join(' ')
}
