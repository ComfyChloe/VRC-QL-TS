import { computed } from 'vue'
import { appConfig, saveConfig } from '../lib/config'
import type { LaunchProfile, SavedQueueItem } from '../lib/types'
import type { LaunchRuntimeSettings } from './useLauncher'

export interface QueueItem {
  queueId: string
  profileId: string
  runtime: LaunchRuntimeSettings
  enabled: boolean
  useGlobalOptions: boolean
}

function toQueueItem(s: SavedQueueItem): QueueItem {
  return {
    queueId: s.queueId,
    profileId: s.profileId,
    runtime: { installId: s.installId, vr: s.vr },
    enabled: s.enabled,
    useGlobalOptions: s.useGlobalOptions
  }
}

function fromQueueItem(q: QueueItem): SavedQueueItem {
  return {
    queueId: q.queueId,
    profileId: q.profileId,
    installId: q.runtime.installId,
    vr: q.runtime.vr,
    enabled: q.enabled,
    useGlobalOptions: q.useGlobalOptions
  }
}

// Computed view over persisted appConfig.queue
const queue = computed<QueueItem[]>({
  get: () => appConfig.value.queue.map(toQueueItem),
  set: (items) => {
    appConfig.value.queue = items.map(fromQueueItem)
    void saveConfig()
  }
})

export function useLaunchQueue() {
  function addToQueue(profiles: LaunchProfile[]) {
    const first = profiles[0]
    const installId = (first?.installId) || (appConfig.value.installs[0]?.id ?? '')
    queue.value = [
      ...queue.value,
      {
        queueId: crypto.randomUUID(),
        profileId: first?.id ?? '',
        runtime: { installId, vr: first?.vr ?? false },
        enabled: true,
        useGlobalOptions: first?.useGlobalOptions ?? false
      }
    ]
  }

  function setQueueProfile(queueId: string, profileId: string, profiles: LaunchProfile[]) {
    const profile = profiles.find(p => p.id === profileId)
    queue.value = queue.value.map(item =>
      item.queueId !== queueId ? item : {
        ...item,
        profileId,
        runtime: {
          installId: profile?.installId || (appConfig.value.installs[0]?.id ?? ''),
          vr: profile?.vr ?? item.runtime.vr
        },
        useGlobalOptions: profile?.useGlobalOptions ?? false
      }
    )
  }

  function removeFromQueue(queueId: string) {
    queue.value = queue.value.filter(item => item.queueId !== queueId)
  }

  function moveInQueue(queueId: string, delta: number) {
    const items = [...queue.value]
    const idx = items.findIndex(item => item.queueId === queueId)
    if (idx < 0) return
    const newIdx = idx + delta
    if (newIdx < 0 || newIdx >= items.length) return
    ;[items[idx], items[newIdx]] = [items[newIdx], items[idx]]
    queue.value = items
  }

  function toggleQueueEnabled(queueId: string) {
    queue.value = queue.value.map(item =>
      item.queueId === queueId ? { ...item, enabled: !item.enabled } : item
    )
  }

  function toggleQueueGlobal(queueId: string) {
    queue.value = queue.value.map(item =>
      item.queueId === queueId ? { ...item, useGlobalOptions: !item.useGlobalOptions } : item
    )
  }

  function patchQueueRuntime(queueId: string, patch: Partial<LaunchRuntimeSettings>) {
    if (patch.vr) {
      queue.value = queue.value.map(item => ({
        ...item,
        runtime: { ...item.runtime, vr: item.queueId === queueId }
      }))
    } else {
      queue.value = queue.value.map(item =>
        item.queueId === queueId
          ? { ...item, runtime: { ...item.runtime, ...patch } }
          : item
      )
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

