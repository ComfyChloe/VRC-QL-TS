<script setup lang="ts">
import type { LaunchProfile, VRCInstall } from '../lib/types'

const props = defineProps<{
  profiles: LaunchProfile[]
  installs: VRCInstall[]
  selectedId?: string
}>()

const emit = defineEmits<{
  launch: [profile: LaunchProfile]
  preview: [profile: LaunchProfile]
  toggleEnabled: [id: string]
}>()

function installName(id: string): string {
  return props.installs.find(i => i.id === id)?.name ?? '—'
}

</script>

<template>
  <div class="profiles-table-wrap">
    <div v-if="profiles.length === 0" class="empty-state">
      <span class="text-secondary text-sm">No profiles yet. Add one in the Profiles page.</span>
    </div>
    <table v-else class="profiles-table">
      <thead>
        <tr>
          <th class="col-check"></th>
          <th class="col-launch"></th>
          <th class="col-name">Name</th>
          <th class="col-desc">Description</th>
          <th class="col-install">Installation</th>
          <th class="col-slot">Slot</th>
          <th class="col-vr">VR</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="profile in profiles"
          :key="profile.id"
          class="profile-row"
          :class="{ 'is-selected': selectedId === profile.id }"
          @click="emit('preview', profile)"
        >
          <td class="col-check" @click.stop>
            <input
              type="checkbox"
              :checked="profile.enabled"
              @change="emit('toggleEnabled', profile.id)"
            />
          </td>
          <td class="col-launch" @click.stop>
            <button
              class="btn btn-primary btn-sm"
              type="button"
              :disabled="!profile.installId"
              @click="emit('launch', profile)"
            >
              Launch
            </button>
          </td>
          <td class="col-name">{{ profile.name }}</td>
          <td class="col-desc text-secondary">{{ profile.description || '—' }}</td>
          <td class="col-install">
            <span v-if="profile.installId" class="badge">{{ installName(profile.installId) }}</span>
            <span v-else class="text-muted text-xs">Not set</span>
          </td>
          <td class="col-slot text-secondary">{{ profile.profileIndex }}</td>
          <td class="col-vr">
            <span v-if="profile.vr" class="badge badge-success">VR</span>
            <span v-else class="badge badge-neutral">Flat</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
.profiles-table-wrap {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-8;
}
.profiles-table {
  width: 100%;
  border-collapse: collapse;
  font-size: $font-size-sm;
  th {
    text-align: left;
    font-size: $font-size-xs;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    padding: $space-2 $space-3;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }
  .profile-row {
    cursor: pointer;
    transition: background 0.1s;
    td {
      padding: $space-2 $space-3;
      border-bottom: 1px solid var(--color-border);
      vertical-align: middle;
    }
    &:hover { background: var(--color-bg-elevated); }
    &.is-selected { background: var(--color-accent-subtle); }
  }
}
.col-check  { width: 32px;  text-align: center; }
.col-launch { width: 72px; }
.col-name   { min-width: 100px; font-weight: 500; }
.col-desc   { min-width: 120px; }
.col-install{ min-width: 100px; }
.col-slot   { width: 48px;  text-align: center; }
.col-vr     { width: 56px;  text-align: center; }

input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
  appearance: none;
  border: 1.5px solid var(--color-border);
  border-radius: $radius-sm;
  background: var(--color-bg-base);
  transition: background 0.15s, border-color 0.15s;
  &:checked {
    background: var(--color-accent);
    border-color: var(--color-accent);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='8' viewBox='0 0 10 8'%3E%3Cpath d='M1 4l3 3 5-6' stroke='%230f0f1a' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
  }
}
</style>
