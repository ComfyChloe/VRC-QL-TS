<script setup lang="ts">
import { ref } from 'vue'
import { appConfig } from '../lib/config'
import { isLinux } from '../lib/platform'
import { useInstalls } from '../composables/useInstalls'
import type { VRCInstall } from '../lib/types'

const { addInstall, removeInstall, renameInstall } = useInstalls()

// Inline-edit state
const editingId  = ref<string | null>(null)
const editingName = ref('')

function startEdit(install: VRCInstall) {
  editingId.value   = install.id
  editingName.value = install.name
}

async function commitEdit(install: VRCInstall) {
  const trimmed = editingName.value.trim()
  if (trimmed && trimmed !== install.name) await renameInstall(install.id, trimmed)
  editingId.value = null
}

function cancelEdit() { editingId.value = null }

function formatDate(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="installs-page">
    <div class="page-header">
      <h1 class="page-title">Installations</h1>
      <button class="btn btn-primary" type="button" @click="addInstall">+ Add Installation</button>
    </div>

    <div v-if="appConfig.installs.length === 0" class="empty-state card">
      <p class="text-secondary">No VRChat installations added yet.</p>
      <p class="text-muted text-sm">Click <strong>Add Installation</strong> to browse for VRChat.exe<template v-if="isLinux"> in your Steam library</template>.</p>
    </div>

    <div class="installs-list">
      <div v-for="install in appConfig.installs" :key="install.id" class="install-card card">
        <div class="install-header">
          <div class="install-name-row">
            <template v-if="editingId === install.id">
              <input
                v-model="editingName"
                class="input name-input"
                type="text"
                @keydown.enter="commitEdit(install)"
                @keydown.esc="cancelEdit"
                @blur="commitEdit(install)"
              />
              <button class="btn btn-ghost btn-sm" type="button" @click="cancelEdit">Cancel</button>
            </template>
            <template v-else>
              <span class="install-name">{{ install.name }}</span>
              <button class="btn btn-ghost btn-sm" type="button" @click="startEdit(install)">Rename</button>
            </template>
          </div>
          <button class="btn btn-danger btn-sm" type="button" @click="removeInstall(install.id)">Remove</button>
        </div>
        <div class="install-meta">
          <div class="field-stack">
            <span class="field-label">Path</span>
            <span class="install-path text-sm text-muted" :title="install.exePath">{{ install.exePath }}</span>
          </div>
          <div class="meta-row">
            <div class="field-stack">
              <span class="field-label">Added</span>
              <span class="text-sm text-secondary">{{ formatDate(install.addedAt) }}</span>
            </div>
            <div class="field-stack">
              <span class="field-label">Last Used</span>
              <span class="text-sm text-secondary">{{ formatDate(install.lastUsed) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.installs-page {
  padding: $space-5;
  display: flex;
  flex-direction: column;
  gap: $space-5;
  height: 100%;
  overflow-y: auto;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.page-title {
  font-size: $font-size-xl;
  font-weight: 700;
  color: var(--color-text-primary);
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
  text-align: center;
  padding: $space-8;
}
.installs-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}
.install-card {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding: $space-3;
}
.install-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
}
.install-name-row {
  display: flex;
  align-items: center;
  gap: $space-2;
  flex: 1;
  min-width: 0;
}
.install-name {
  font-weight: 600;
  font-size: $font-size-base;
  color: var(--color-text-primary);
}
.name-input { max-width: 280px; }
.install-meta {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}
.install-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Courier New', monospace;
  font-size: $font-size-xs;
}
.meta-row {
  display: flex;
  gap: $space-4;
}
</style>
