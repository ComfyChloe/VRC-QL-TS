<script setup lang="ts">
import { computed, ref } from 'vue'
import ProfileDetailPanel from '../components/ProfileDetailPanel.vue'
import { useProfiles } from '../composables/useProfiles'
import type { LaunchProfile } from '../lib/types'

const { profiles, addProfile, updateProfile, removeProfile, duplicateProfile, moveProfile } = useProfiles()

const selectedId = ref<string | undefined>(undefined)

const selectedProfile = computed<LaunchProfile | null>(() =>
  profiles.value.find(profile => profile.id === selectedId.value) ?? null
)

function onSelect(profile: LaunchProfile) {
  selectedId.value = profile.id
}

async function onAdd() {
  const profile = await addProfile()
  selectedId.value = profile.id
}

async function onSave(updated: LaunchProfile) {
  await updateProfile(updated)
}

async function onDuplicate(id: string) {
  const copy = await duplicateProfile(id)
  if (copy) selectedId.value = copy.id
}

async function onDelete(id: string) {
  await removeProfile(id)
  if (selectedId.value === id) {
    selectedId.value = profiles.value[0]?.id ?? undefined
  }
}
</script>

<template>
  <div class="profiles-page">
    <div class="page-header">
      <h1 class="page-title">Profiles</h1>
      <button class="btn btn-primary btn-sm" type="button" @click="onAdd">+ New</button>
    </div>

    <div class="detail-panel-top">
      <div v-if="!selectedProfile" class="no-selection card">
        <p class="text-muted text-sm">Select a profile below to edit it.</p>
      </div>
      <ProfileDetailPanel
        v-else
        :key="selectedProfile.id"
        :profile="selectedProfile"
        @save="onSave"
        @duplicate="(id) => onDuplicate(id)"
        @delete="(id) => onDelete(id)"
      />
    </div>

    <div v-if="profiles.length === 0" class="empty-state text-muted text-sm card">
      No profiles yet. Click <strong>+ New</strong> to create one.
    </div>

    <div v-else class="profile-list">
      <div
        v-for="(profile, index) in profiles"
        :key="profile.id"
        class="profile-list-item"
        :class="{ active: selectedId === profile.id }"
        @click="onSelect(profile)"
      >
        <span class="order-number">{{ index + 1 }}</span>
        <span class="profile-copy">
          <span class="profile-name">{{ profile.name }}</span>
          <span class="profile-desc">{{ profile.description || 'No description' }}</span>
        </span>
        <span class="move-buttons" @click.stop>
          <button class="btn btn-ghost btn-sm" type="button" :disabled="index === 0" @click="moveProfile(profile.id, -1)">Up</button>
          <button class="btn btn-ghost btn-sm" type="button" :disabled="index === profiles.length - 1" @click="moveProfile(profile.id, 1)">Down</button>
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.profiles-page {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  height: 100%;
  overflow-y: auto;
  padding: $space-5;
}
.detail-panel-top {
  flex-shrink: 0;
}
.profile-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}
.profile-list-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: $space-2;
  min-height: 48px;
  padding: $space-2;
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  &:hover { border-color: var(--color-accent); }
  &.active {
    border-color: var(--color-accent);
    background: var(--color-accent-subtle);
  }
}
.order-number {
  font-size: $font-size-xs;
  color: var(--color-text-muted);
  text-align: center;
}
.profile-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.profile-name { font-weight: 600; }
.profile-desc {
  font-size: $font-size-xs;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.move-buttons {
  display: flex;
  gap: $space-1;
}
.page-title {
  font-size: $font-size-xl;
  font-weight: 700;
  color: var(--color-text-primary);
}
.empty-state {
  padding: $space-4;
}
.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}
</style>
