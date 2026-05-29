<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import LaunchOptionsPanel from '../components/LaunchOptionsPanel.vue'
import InstanceInfoPanel from '../components/InstanceInfoPanel.vue'
import type { LaunchOptions } from '../components/LaunchOptionsPanel.vue'
import { appConfig, saveConfig } from '../lib/config'
import { useProfiles } from '../composables/useProfiles'
import { useLauncher, type LaunchQueueEntry } from '../composables/useLauncher'
import { useLaunchQueue, type QueueItem } from '../composables/useLaunchQueue'
import { useRecentLocations, type RecentLocation } from '../composables/useRecentLocations'
import type { InstanceConfig, LaunchProfile } from '../lib/types'
import { defaultProfile } from '../lib/types'

const { profiles, updateProfile } = useProfiles()
const { launchProfile, launchSelected } = useLauncher()
const {
  queue, addToQueue, setQueueProfile, removeFromQueue,
  moveInQueue, toggleQueueEnabled, toggleQueueGlobal, patchQueueRuntime, hasEnabledItems
} = useLaunchQueue()
const selectedQueueId = ref<string | undefined>(undefined)
const selectedEditor = ref<LaunchProfile | null>(null)
let syncSelectedEditor = false
let saveTimer: ReturnType<typeof setTimeout> | null = null

function resolveProfile(item: QueueItem): LaunchProfile | null {
  return profiles.value.find(p => p.id === item.profileId) ?? null
}

const selectedItem = computed(() => queue.value.find(i => i.queueId === selectedQueueId.value) ?? null)

const selectedProfile = computed<LaunchProfile | null>(() => {
  const item = selectedItem.value
  return item ? resolveProfile(item) : null
})

watch(() => ({
  id: selectedProfile.value?.id,
  updatedAt: selectedProfile.value?.updatedAt
}), () => {
  const profile = selectedProfile.value
  syncSelectedEditor = true
  selectedEditor.value = profile ? JSON.parse(JSON.stringify(profile)) as LaunchProfile : null
  syncSelectedEditor = false
}, { immediate: true })

watch(selectedEditor, (profile) => {
  if (syncSelectedEditor || !profile) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    await updateProfile(profile)
  }, 150)
}, { deep: true })

const blankOptions = computed<LaunchOptions>(() => {
  const p = defaultProfile('__blank__')
  return {
    debug: p.debug, creator: p.creator, performance: p.performance,
    ik: p.ik, system: p.system, display: p.display
  }
})

const autoLayout = ref(false)
const editingGlobal = ref(false)
const launchError = ref('')
const launchInfo  = ref('')
const launchStatus = ref('')

let unlistenStatus: UnlistenFn | null = null

onMounted(async () => {
  unlistenStatus = await listen<{ message: string }>('launch-status', (event) => {
    launchStatus.value = event.payload.message
  })
})

onBeforeUnmount(() => {
  unlistenStatus?.()
})

const globalOptions = computed<LaunchOptions>(() => {
  const g = appConfig.value.globalOptions
  return {
    debug: g.debug, creator: g.creator, performance: g.performance,
    ik: g.ik, system: g.system, display: g.display
  }
})

async function updateGlobalOptions(value: LaunchOptions) {
  appConfig.value.globalOptions = { ...appConfig.value.globalOptions, ...value }
  await saveConfig()
}

function effectiveProfile(profile: LaunchProfile, useGlobalOptions: boolean) {
  if (!useGlobalOptions) return profile
  const g = appConfig.value.globalOptions
  return {
    ...profile,
    debug: g.debug, creator: g.creator, performance: g.performance,
    ik: g.ik, system: g.system, display: g.display
  }
}

const selectedLaunchOptions = computed<LaunchOptions>(() => {
  if (!selectedEditor.value) return blankOptions.value
  return {
    debug: selectedEditor.value.debug,
    creator: selectedEditor.value.creator,
    performance: selectedEditor.value.performance,
    ik: selectedEditor.value.ik,
    system: selectedEditor.value.system,
    display: selectedEditor.value.display
  }
})

function updateSelectedLaunchOptions(value: LaunchOptions) {
  if (!selectedEditor.value) return
  selectedEditor.value = {
    ...selectedEditor.value,
    debug: value.debug,
    creator: value.creator,
    performance: value.performance,
    ik: value.ik,
    system: value.system,
    display: value.display
  }
}

function updateSelectedInstance(value: InstanceConfig) {
  if (!selectedEditor.value) return
  selectedEditor.value = { ...selectedEditor.value, instance: value }
}

async function onLaunchSingle(item: QueueItem) {
  const profile = resolveProfile(item)
  if (!profile) return
  launchError.value = ''
  launchInfo.value  = ''
  launchStatus.value = ''
  try {
    await launchProfile(effectiveProfile(profile, item.useGlobalOptions), item.runtime, false)
    launchInfo.value = `Launched: ${profile.name}`
  } catch (e) {
    launchError.value = e instanceof Error ? e.message : String(e)
  } finally {
    launchStatus.value = ''
  }
}

async function onLaunchAll() {
  launchError.value = ''
  launchInfo.value  = ''
  launchStatus.value = ''
  const orderedEntries: LaunchQueueEntry[] = queue.value
    .filter(item => item.enabled)
    .map(item => {
      const profile = resolveProfile(item)
      if (!profile) return null
      return { profile: effectiveProfile(profile, item.useGlobalOptions), runtime: item.runtime }
    })
    .filter((e): e is LaunchQueueEntry => e !== null)
  const { launched, errors } = await launchSelected(orderedEntries, autoLayout.value)
  launchStatus.value = ''
  if (errors.length) launchError.value = errors.join(' | ')
  else launchInfo.value = `Launched ${launched} profile(s)`
}

function onAddItem() {
  addToQueue(profiles.value)
  selectedQueueId.value = queue.value[queue.value.length - 1]?.queueId
}

function onRemoveSelected() {
  const id = selectedQueueId.value
  if (!id) return
  const idx = queue.value.findIndex(i => i.queueId === id)
  const next = queue.value[idx + 1] ?? queue.value[idx - 1]
  selectedQueueId.value = next?.queueId
  removeFromQueue(id)
}

const installOptions = computed(() => appConfig.value.installs)
const { locations: recentLocations, loading: recentLoading } = useRecentLocations()
const selectedRecentLocation = ref('')
watch(selectedQueueId, () => { selectedRecentLocation.value = '' })

function formatRecentLocation(loc: RecentLocation): string {
  const maxLen = 28
  const name = loc.world_name.length > maxLen
    ? loc.world_name.slice(0, maxLen) + '…'
    : loc.world_name
  if (loc.instance_type.startsWith('group')) {
    const grp = loc.group_name ?? loc.instance_type
    return `${name} (#${loc.instance_id}) · ${grp}`
  }
  const parts = [name, `#${loc.instance_id}`, loc.instance_type]
  if (loc.region) parts.push(loc.region)
  return parts.join(' · ')
}

function onRecentLocationPicked(rawLocation: string) {
  if (!selectedEditor.value || !rawLocation) return
  selectedRecentLocation.value = rawLocation
  const blank = defaultProfile('__blank__').instance
  selectedEditor.value.instance = { ...blank, mode: 'join', joinLink: rawLocation }
}
</script>

<template>
  <div class="launcher-page">

    <div class="card section-card">
      <div class="section-header">
        <div>
          <p class="panel-title">Launch Queue</p>
          <p class="text-sm text-secondary">Batch launch follows this top-to-bottom order and waits for VRChat to open between profiles.</p>
        </div>
        <div class="queue-toolbar">
          <label class="checkbox-row">
            <input v-model="autoLayout" type="checkbox" />
            <span>Auto-layout</span>
          </label>
          <button class="btn btn-ghost" type="button" :disabled="profiles.length === 0" @click="onAddItem">+ Add</button>
          <button class="btn btn-ghost" type="button" :disabled="!selectedQueueId" @click="onRemoveSelected">- Remove</button>
          <button
            class="btn btn-primary"
            type="button"
            :disabled="!hasEnabledItems"
            @click="onLaunchAll"
          >
            Launch All Selected
          </button>
        </div>
      </div>

      <div v-if="launchError" class="error-banner">{{ launchError }}</div>
      <div v-else-if="launchStatus" class="info-banner">{{ launchStatus }}</div>
      <div v-else-if="launchInfo" class="info-banner">{{ launchInfo }}</div>

      <div v-if="queue.length === 0" class="empty-state text-muted text-sm">
        Click "+ Add Profile" to add profiles to the launch queue. The same profile can be added multiple times with different install settings.
      </div>

      <div v-else class="queue-list">
        <div
          v-for="(item, index) in queue"
          :key="item.queueId"
          class="queue-row"
          :class="{ active: selectedQueueId === item.queueId }"
          @click="selectedQueueId = item.queueId"
        >
          <label class="checkbox-row queue-check" @click.stop>
            <input :checked="item.enabled" type="checkbox" @change="toggleQueueEnabled(item.queueId)" />
            <span></span>
          </label>
          <div class="queue-order">{{ index + 1 }}</div>
          <div class="queue-copy" @click.stop>
            <select
              class="input queue-profile-select"
              :value="item.profileId"
              @change="setQueueProfile(item.queueId, ($event.target as HTMLSelectElement).value, profiles)"
            >
              <option value="">— No profile —</option>
              <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <div v-if="resolveProfile(item)?.description" class="queue-meta text-xs text-secondary">{{ resolveProfile(item)?.description }}</div>
          </div>
          <select
            class="input queue-install"
            :value="item.runtime.installId"
            @click.stop
            @change="patchQueueRuntime(item.queueId, { installId: ($event.target as HTMLSelectElement).value })"
          >
            <option value="">Select install</option>
            <option v-for="install in installOptions" :key="install.id" :value="install.id">{{ install.name }}</option>
          </select>
          <label class="checkbox-row queue-global" @click.stop title="Apply global launch options to this profile">
            <input
              :checked="item.useGlobalOptions"
              type="checkbox"
              @change="toggleQueueGlobal(item.queueId)"
            />
            <span>Global</span>
          </label>
          <div class="queue-actions" @click.stop>
            <button class="btn btn-ghost btn-sm" type="button" :disabled="index === 0" @click="moveInQueue(item.queueId, -1)">Up</button>
            <button class="btn btn-ghost btn-sm" type="button" :disabled="index === queue.length - 1" @click="moveInQueue(item.queueId, 1)">Down</button>
            <button class="btn btn-primary btn-sm" type="button" :disabled="!item.runtime.installId" @click="onLaunchSingle(item)">Launch</button>
            <label class="checkbox-row queue-vr">
              <input
                :checked="item.runtime.vr"
                type="checkbox"
                @change="patchQueueRuntime(item.queueId, { vr: ($event.target as HTMLInputElement).checked })"
              />
              <span>VR</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="card section-card">
      <div class="section-header">
        <p class="panel-title">Instance Info</p>
        <div class="recent-instance-control">
          <select
            class="input queue-install recent-instance-select"
            :disabled="!selectedEditor || recentLoading"
            :value="selectedRecentLocation"
            @change="onRecentLocationPicked(($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>{{ recentLoading ? 'Loading…' : '— Recent Instances —' }}</option>
            <option v-for="loc in recentLocations" :key="loc.raw_location" :value="loc.raw_location">
              {{ formatRecentLocation(loc) }}
            </option>
          </select>
          <span class="text-xs text-secondary recent-order-hint">newest at top ↓</span>
        </div>
      </div>
      <InstanceInfoPanel
        :model-value="selectedEditor?.instance ?? defaultProfile('__blank__').instance"
        :readonly="!selectedEditor"
        @update:model-value="updateSelectedInstance"
      />
    </div>

    <div class="card section-card options-section">
      <div class="section-header">
        <p class="panel-title">Launch Options</p>
        <label class="checkbox-row global-toggle">
          <input type="checkbox" v-model="editingGlobal" />
          <span>Modify Global Options</span>
        </label>
      </div>
      <p v-if="editingGlobal" class="text-xs text-secondary">Global options apply when a profile has "Global" checked in the launch queue.</p>
      <LaunchOptionsPanel
        :model-value="editingGlobal ? globalOptions : selectedLaunchOptions"
        :readonly="!editingGlobal && !selectedEditor"
        @update:model-value="editingGlobal ? updateGlobalOptions($event) : updateSelectedLaunchOptions($event)"
      />
    </div>

    <div class="card section-card">
      <p class="panel-title">Custom Parameters</p>
      <textarea
        :value="selectedEditor?.customParams ?? ''"
        class="input custom-params"
        :disabled="!selectedEditor"
        placeholder="--example-flag --another=value"
        @input="selectedEditor && (selectedEditor.customParams = ($event.target as HTMLTextAreaElement).value)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.launcher-page {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  height: 100%;
  overflow-y: auto;
  padding: $space-5;
}
.section-card {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  flex-shrink: 0;
}
.section-header { display: flex; justify-content: space-between; align-items: center; gap: $space-3; }
.recent-instance-control { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.recent-instance-select { max-width: 280px; }
.recent-order-hint { color: var(--color-text-muted); }
.queue-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: $space-3;
  flex-wrap: wrap;
}
.queue-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}
.queue-row {
  display: grid;
  grid-template-columns: 28px 28px minmax(0, 1fr) minmax(150px, 220px) auto auto;
  align-items: center;
  gap: $space-2;
  padding: $space-2;
  border: 1px solid var(--color-border);
  background: var(--color-bg-base);
  cursor: pointer;
  @media (max-width: 900px) {
    grid-template-columns: 28px 28px minmax(0, 1fr);
  }
}
.queue-row.active {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
}
.queue-check { justify-content: center; }
.queue-order { text-align: center; color: var(--color-text-muted); font-size: $font-size-xs; }
.queue-copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.queue-profile-select { width: 100%; }
.queue-name { font-weight: 600; }
.queue-install { width: 100%; }
.queue-global { justify-self: start; white-space: nowrap; }
.queue-vr { white-space: nowrap; }
.queue-actions {
  display: flex;
  align-items: center;
  gap: $space-1;
  justify-self: end;
}
.global-toggle {
  font-size: $font-size-xs;
  color: var(--color-text-secondary);
}
.custom-params {
  min-height: 84px;
  resize: vertical;
}
.empty-state {
  padding: $space-4;
  border: 1px dashed var(--color-border);
  background: var(--color-bg-base);
}
</style>
