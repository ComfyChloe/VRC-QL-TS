import { computed } from 'vue'
import { open } from '@tauri-apps/plugin-dialog'
import { appConfig, saveConfig } from '../lib/config'
import type { VRCInstall } from '../lib/types'

export function useInstalls() {
  const installs = computed(() => appConfig.value.installs)

  async function addInstall(): Promise<void> {
    const result = await open({
      title: 'Select VRChat.exe',
      filters: [{ name: 'Executable', extensions: ['exe'] }],
      multiple: false
    })
    if (!result || typeof result !== 'string') return
    const normalized = result.replace(/\\/g, '/')
    const parts = normalized.split('/')
    const name = parts.at(-2) ?? parts.at(-1)?.replace('.exe', '') ?? 'VRChat'
    const install: VRCInstall = {
      id: crypto.randomUUID(),
      name,
      exePath: result,
      lastUsed: null,
      addedAt: new Date().toISOString()
    }
    appConfig.value.installs.push(install)
    await saveConfig()
  }

  async function removeInstall(id: string): Promise<void> {
    appConfig.value.installs = appConfig.value.installs.filter(i => i.id !== id)
    await saveConfig()
  }

  async function renameInstall(id: string, name: string): Promise<void> {
    const install = appConfig.value.installs.find(i => i.id === id)
    if (!install) return
    install.name = name.trim() || install.name
    await saveConfig()
  }

  function getInstall(id: string): VRCInstall | undefined {
    return appConfig.value.installs.find(i => i.id === id)
  }

  return { installs, addInstall, removeInstall, renameInstall, getInstall }
}
