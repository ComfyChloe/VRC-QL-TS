<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import LaunchOptionsPanel from '../components/LaunchOptionsPanel.vue'
import InstanceInfoPanel from '../components/InstanceInfoPanel.vue'
import type { LaunchOptions } from '../components/LaunchOptionsPanel.vue'
import { appConfig, saveConfig } from '../lib/config'
import { useProfiles } from '../composables/useProfiles'
import { useLauncher, type LaunchQueueEntry, type LaunchRuntimeSettings } from '../composables/useLauncher'
import type { InstanceConfig, LaunchProfile } from '../lib/types'
import { defaultProfile } from '../lib/types'

const { profiles, toggleEnabled, moveProfile, updateProfile, toggleGlobalOptions, setProfileVr, setProfileInstall } = useProfiles()
const { launchProfile, launchSelected } = useLauncher()
const runtimeSettings = ref<Record<string, LaunchRuntimeSettings>>({})
const selectedId = ref<string | undefined>(undefined)
const selectedEditor = ref<LaunchProfile | null>(null)
let syncSelectedEditor = false
let saveTimer: ReturnType<typeof setTimeout> | null = null

watch(profiles, (value) => {
  const firstInstallId = appConfig.value.installs[0]?.id ?? ''
  for (const profile of value) {
    if (!runtimeSettings.value[profile.id]) {
      runtimeSettings.value[profile.id] = {
        installId: profile.installId || firstInstallId,
        vr: profile.vr
      }
    }
  }
  for (const profileId of Object.keys(runtimeSettings.value)) {
    if (!value.some(profile => profile.id === profileId)) {
      delete runtimeSettings.value[profileId]
    }
  }
  if (!selectedId.value || !value.some(profile => profile.id === selectedId.value)) {
    selectedId.value = value[0]?.id
  }
}, { immediate: true, deep: true })

const selectedProfile = computed<LaunchProfile | null>(() =>
  profiles.value.find(profile => profile.id === selectedId.value) ?? null
)

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

// Blank state shown when no profile selected
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

function effectiveProfile(profile: typeof profiles.value[number]) {
  if (!profile.useGlobalOptions) return profile
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

function runtimeFor(profile: LaunchProfile): LaunchRuntimeSettings {
  return runtimeSettings.value[profile.id] ?? {
    installId: appConfig.value.installs[0]?.id ?? '',
    vr: true
  }
}

function patchRuntime(profileId: string, patch: Partial<LaunchRuntimeSettings>) {
  runtimeSettings.value[profileId] = {
    ...(runtimeSettings.value[profileId] ?? { installId: appConfig.value.installs[0]?.id ?? '', vr: true }),
    ...patch
  }
  if (patch.installId !== undefined) {
    void setProfileInstall(profileId, patch.installId)
  }
  if (patch.vr !== undefined) {
    void setProfileVr(profileId, patch.vr)
  }
}

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

async function onLaunchSingle(profile: LaunchProfile) {
  launchError.value = ''
  launchInfo.value  = ''
  try {
    await launchProfile(effectiveProfile(profile), runtimeFor(profile), false)
    launchInfo.value = `Launched: ${profile.name}`
  } catch (e) {
    launchError.value = e instanceof Error ? e.message : String(e)
  }
}

async function onLaunchAll() {
  launchError.value = ''
  launchInfo.value  = ''
  const orderedEntries: LaunchQueueEntry[] = profiles.value.map(profile => ({
    profile: effectiveProfile(profile),
    runtime: runtimeFor(profile)
  }))
  const { launched, errors } = await launchSelected(orderedEntries, autoLayout.value)
  if (errors.length) launchError.value = errors.join(' | ')
  else launchInfo.value = `Launched ${launched} profile(s)`
}

const hasEnabledProfiles = computed(() => profiles.value.some(p => p.enabled))
const installOptions = computed(() => appConfig.value.installs)
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
          <button
            class="btn btn-primary"
            type="button"
            :disabled="!hasEnabledProfiles"
            @click="onLaunchAll"
          >
            Launch All Selected
          </button>
        </div>
      </div>

      <div v-if="launchError" class="error-banner">{{ launchError }}</div>
      <div v-else-if="launchInfo" class="info-banner">{{ launchInfo }}</div>

      <div v-if="profiles.length === 0" class="empty-state text-muted text-sm">
        No profiles yet. Create profiles first, then assign install and VR mode here when launching.
      </div>

      <div v-else class="queue-list">
        <div
          v-for="(profile, index) in profiles"
          :key="profile.id"
          class="queue-row"
          :class="{ active: selectedId === profile.id }"
          @click="selectedId = profile.id"
        >
          <label class="checkbox-row queue-check" @click.stop>
            <input :checked="profile.enabled" type="checkbox" @change="toggleEnabled(profile.id)" />
            <span></span>
          </label>
          <div class="queue-order">{{ index + 1 }}</div>
          <div class="queue-copy">
            <div class="queue-name">{{ profile.name }}</div>
            <div class="queue-meta text-xs text-secondary">Profile {{ profile.profileIndex }}<span v-if="profile.description"> · {{ profile.description }}</span></div>
          </div>
          <select
            class="input queue-install"
            :value="runtimeFor(profile).installId"
            @click.stop
            @change="patchRuntime(profile.id, { installId: ($event.target as HTMLSelectElement).value })"
          >
            <option value="">Select install</option>
            <option v-for="install in installOptions" :key="install.id" :value="install.id">{{ install.name }}</option>
          </select>
          <label class="checkbox-row queue-global" @click.stop title="Apply global launch options to this profile">
            <input
              :checked="profile.useGlobalOptions"
              type="checkbox"
              @change="toggleGlobalOptions(profile.id)"
            />
            <span>Global</span>
          </label>
          <div class="queue-actions" @click.stop>
            <button class="btn btn-ghost btn-sm" type="button" :disabled="index === 0" @click="moveProfile(profile.id, -1)">Up</button>
            <button class="btn btn-ghost btn-sm" type="button" :disabled="index === profiles.length - 1" @click="moveProfile(profile.id, 1)">Down</button>
            <button class="btn btn-primary btn-sm" type="button" :disabled="!runtimeFor(profile).installId" @click="onLaunchSingle(profile)">Launch</button>
            <label class="checkbox-row queue-vr">
              <input
                :checked="runtimeFor(profile).vr"
                type="checkbox"
                @change="patchRuntime(profile.id, { vr: ($event.target as HTMLInputElement).checked })"
              />
              <span>VR</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="card section-card">
      <p class="panel-title">Instance Info</p>
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
.section-header { display: flex; justify-content: space-between; gap: $space-3; }
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
.queue-copy { min-width: 0; }
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
