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
      installId: updated.installId,
      vr: updated.vr,
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
      installId: source.installId,
      vr: source.vr,
      enabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    appConfig.value.profiles.push(copy)
    await saveConfig()
    return copy
  }

  async function toggleEnabled(id: string): Promise<void> {
    const index = appConfig.value.profiles.findIndex(p => p.id === id)
    if (index === -1) return
    const profile = appConfig.value.profiles[index]
    appConfig.value.profiles[index] = {
      ...profile,
      enabled: !profile.enabled,
      updatedAt: new Date().toISOString()
    }
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

  async function toggleGlobalOptions(id: string): Promise<void> {
    const index = appConfig.value.profiles.findIndex(p => p.id === id)
    if (index === -1) return
    const profile = appConfig.value.profiles[index]
    appConfig.value.profiles[index] = {
      ...profile,
      useGlobalOptions: !profile.useGlobalOptions,
      updatedAt: new Date().toISOString()
    }
    await saveConfig()
  }

  async function setProfileVr(id: string, vr: boolean): Promise<void> {
    const index = appConfig.value.profiles.findIndex(p => p.id === id)
    if (index === -1) return
    if (vr) {
      appConfig.value.profiles = appConfig.value.profiles.map(profile => ({
        ...profile,
        vr: profile.id === id,
        updatedAt: profile.id === id || profile.vr ? new Date().toISOString() : profile.updatedAt
      }))
    } else {
      const profile = appConfig.value.profiles[index]
      appConfig.value.profiles[index] = {
        ...profile,
        vr: false,
        updatedAt: new Date().toISOString()
      }
    }
    await saveConfig()
  }

  async function setProfileInstall(id: string, installId: string): Promise<void> {
    const index = appConfig.value.profiles.findIndex(p => p.id === id)
    if (index === -1) return
    const profile = appConfig.value.profiles[index]
    appConfig.value.profiles[index] = {
      ...profile,
      installId,
      updatedAt: new Date().toISOString()
    }
    await saveConfig()
  }

  return { profiles, addProfile, updateProfile, removeProfile, duplicateProfile, toggleEnabled, moveProfile, toggleGlobalOptions, setProfileVr, setProfileInstall }
}
