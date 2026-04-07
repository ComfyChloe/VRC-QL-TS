import { computed, ref } from 'vue'
import { appConfig } from '../lib/config'
import type { LaunchProfile } from '../lib/types'
import type { LaunchRuntimeSettings } from './useLauncher'

export interface QueueItem {
  queueId: string
  profileId: string
  runtime: LaunchRuntimeSettings
  enabled: boolean
  useGlobalOptions: boolean
}

const queue = ref<QueueItem[]>([])

export function useLaunchQueue() {
  function addToQueue(profiles: LaunchProfile[]) {
    const first = profiles[0]
    const installId = (first?.installId) || (appConfig.value.installs[0]?.id ?? '')
    queue.value.push({
      queueId: crypto.randomUUID(),
      profileId: first?.id ?? '',
      runtime: { installId, vr: first?.vr ?? false },
      enabled: true,
      useGlobalOptions: first?.useGlobalOptions ?? false
    })
  }

  function setQueueProfile(queueId: string, profileId: string, profiles: LaunchProfile[]) {
    const item = queue.value.find(i => i.queueId === queueId)
    if (!item) return
    const profile = profiles.find(p => p.id === profileId)
    item.profileId = profileId
    item.runtime = {
      installId: profile?.installId || (appConfig.value.installs[0]?.id ?? ''),
      vr: profile?.vr ?? item.runtime.vr
    }
    item.useGlobalOptions = profile?.useGlobalOptions ?? false
  }

  function removeFromQueue(queueId: string) {
    queue.value = queue.value.filter(item => item.queueId !== queueId)
  }

  function moveInQueue(queueId: string, delta: number) {
    const idx = queue.value.findIndex(item => item.queueId === queueId)
    if (idx < 0) return
    const newIdx = idx + delta
    if (newIdx < 0 || newIdx >= queue.value.length) return
    const items = [...queue.value]
    ;[items[idx], items[newIdx]] = [items[newIdx], items[idx]]
    queue.value = items
  }

  function toggleQueueEnabled(queueId: string) {
    const item = queue.value.find(i => i.queueId === queueId)
    if (item) item.enabled = !item.enabled
  }

  function toggleQueueGlobal(queueId: string) {
    const item = queue.value.find(i => i.queueId === queueId)
    if (item) item.useGlobalOptions = !item.useGlobalOptions
  }

  function patchQueueRuntime(queueId: string, patch: Partial<LaunchRuntimeSettings>) {
    const item = queue.value.find(i => i.queueId === queueId)
    if (!item) return
    if (patch.vr) {
      for (const i of queue.value) {
        i.runtime = { ...i.runtime, vr: i.queueId === queueId }
      }
    } else {
      item.runtime = { ...item.runtime, ...patch }
    }
  }

  const hasEnabledItems = computed(() => queue.value.some(i => i.enabled))

  return {
    queue,
    addToQueue,
    setQueueProfile,
    removeFromQueue,
    moveInQueue,
    toggleQueueEnabled,
    toggleQueueGlobal,
    patchQueueRuntime,
    hasEnabledItems
  }
}
