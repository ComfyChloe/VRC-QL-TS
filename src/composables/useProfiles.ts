import { computed } from 'vue'
import { appConfig, saveConfig } from '../lib/config'
import { defaultProfile, type LaunchProfile } from '../lib/types'

export function useProfiles() {
  const profiles = computed(() => appConfig.value.profiles)

  async function addProfile(): Promise<LaunchProfile> {
    const profile = defaultProfile(crypto.randomUUID())
    appConfig.value.profiles.push(profile)
    await saveConfig()
    return profile
  }

  async function updateProfile(updated: LaunchProfile): Promise<void> {
    const idx = appConfig.value.profiles.findIndex(p => p.id === updated.id)
    if (idx === -1) return
    appConfig.value.profiles[idx] = {
      ...updated,
      installId: '',
      vr: true,
      updatedAt: new Date().toISOString()
    }
    await saveConfig()
  }

  async function removeProfile(id: string): Promise<void> {
    appConfig.value.profiles = appConfig.value.profiles.filter(p => p.id !== id)
    await saveConfig()
  }

  async function duplicateProfile(id: string): Promise<LaunchProfile | null> {
    const source = appConfig.value.profiles.find(p => p.id === id)
    if (!source) return null
    const copy: LaunchProfile = {
      ...JSON.parse(JSON.stringify(source)) as LaunchProfile,
      id: crypto.randomUUID(),
      name: `${source.name} (copy)`,
      installId: '',
      vr: true,
      enabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    appConfig.value.profiles.push(copy)
    await saveConfig()
    return copy
  }

  async function toggleEnabled(id: string): Promise<void> {
    const profile = appConfig.value.profiles.find(p => p.id === id)
    if (!profile) return
    profile.enabled = !profile.enabled
    await saveConfig()
  }

  async function moveProfile(id: string, direction: -1 | 1): Promise<void> {
    const index = appConfig.value.profiles.findIndex(profile => profile.id === id)
    if (index === -1) return
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= appConfig.value.profiles.length) return
    const copy = [...appConfig.value.profiles]
    const [item] = copy.splice(index, 1)
    copy.splice(targetIndex, 0, item)
    appConfig.value.profiles = copy
    await saveConfig()
  }

  return { profiles, addProfile, updateProfile, removeProfile, duplicateProfile, toggleEnabled, moveProfile }
}
