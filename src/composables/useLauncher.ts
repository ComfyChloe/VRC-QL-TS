import { invoke } from '@tauri-apps/api/core'
import { appConfig, saveConfig } from '../lib/config'
import { buildArgs } from '../lib/argBuilder'
import type { LaunchProfile } from '../lib/types'

export interface LaunchRuntimeSettings {
  installId: string
  vr: boolean
}

export interface LaunchQueueEntry {
  profile: LaunchProfile
  runtime: LaunchRuntimeSettings
}

export function useLauncher() {
  async function launchProfile(
    profile: LaunchProfile,
    runtime?: LaunchRuntimeSettings,
    waitForVrchat = false
  ): Promise<void> {
    const installId = runtime?.installId ?? profile.installId
    const install = appConfig.value.installs.find(i => i.id === installId)
    if (!install) {
      throw new Error(`No installation selected for profile "${profile.name}".`)
    }
    const args = buildArgs(profile, { vr: runtime?.vr })
    await invoke<number>('launch_instance', { exePath: install.exePath, args, waitForVrchat })
    install.lastUsed = new Date().toISOString()
    await saveConfig()
  }

  async function launchSelected(
    entries: LaunchQueueEntry[],
    autoLayout: boolean
  ): Promise<{ launched: number; errors: string[] }> {
    const errors: string[] = []
    for (const entry of entries) {
      try {
        await launchProfile(entry.profile, entry.runtime, true)
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e))
      }
    }
    if (autoLayout && entries.length > 1) {
      await invoke('tile_vrchat_windows', { columns: appConfig.value.window.autoLayoutColumns })
    }
    return { launched: entries.length - errors.length, errors }
  }

  return { launchProfile, launchSelected }
}
