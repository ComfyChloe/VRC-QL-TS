<script setup lang="ts">
import { ref, watch } from 'vue'
import { streamerMode } from '../lib/streamer'
import type { LaunchProfile } from '../lib/types'

const props = defineProps<{
  profile: LaunchProfile
}>()

const emit = defineEmits<{
  save: [profile: LaunchProfile]
  duplicate: [id: string]
  delete: [id: string]
}>()

const local = ref<LaunchProfile>(JSON.parse(JSON.stringify(props.profile)))

watch(() => props.profile.id, () => {
  local.value = JSON.parse(JSON.stringify(props.profile))
})

const tagInput = ref('')

function addTag(raw: string) {
  const tag = raw.trim()
  if (tag && !local.value.tags.includes(tag)) {
    local.value.tags.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  local.value.tags = local.value.tags.filter(t => t !== tag)
}

function onTagKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addTag(tagInput.value)
  }
}

function save() {
  emit('save', { ...local.value })
}
</script>

<template>
  <div class="profile-detail">
    <div class="detail-header card">
      <div class="header-top">
        <div class="field-stack header-name">
          <label class="field-label">Name</label>
          <input
            v-model="local.name"
            class="input"
            :class="{ 'streamer-blur': streamerMode }"
            type="text"
            placeholder="Profile name"
          />
        </div>
        <div class="field-stack header-slot">
          <label class="field-label">Profile Slot (--profile=N)</label>
          <input v-model.number="local.profileIndex" class="input" type="number" min="0" max="99" />
        </div>
      </div>
      <div class="field-stack">
        <label class="field-label">Description</label>
        <input v-model="local.description" class="input" type="text" placeholder="Optional description" />
      </div>
      <div class="field-stack">
        <label class="field-label">Tags</label>
        <div class="tag-row">
          <span v-for="tag in local.tags" :key="tag" class="badge">
            {{ tag }}
            <button class="tag-remove" type="button" @click="removeTag(tag)">×</button>
          </span>
          <input
            v-model="tagInput"
            class="tag-input"
            type="text"
            placeholder="Add tag…"
            @keydown="onTagKeydown"
            @blur="addTag(tagInput)"
          />
        </div>
      </div>
      <p class="profile-note text-xs text-secondary">
        Sign into this VRChat profile slot at least once before using it here.
      </p>
    </div>

    <div class="panel-actions">
      <button class="btn btn-primary" type="button" @click="save">Save Changes</button>
      <button class="btn btn-ghost" type="button" @click="emit('duplicate', profile.id)">Duplicate</button>
      <button class="btn btn-danger" type="button" @click="emit('delete', profile.id)">Delete</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.profile-detail {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}
.detail-header {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}
.header-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: $space-3;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}
.header-name { min-width: 0; }
// Editable field: masking the value would save the mask into the profile,
// so blur it instead and reveal only while focused.
.streamer-blur:not(:focus) {
  filter: blur(4px);
}
.header-slot { min-width: 0; }
.profile-note {
  padding: $space-2 $space-3;
  border: 1px solid var(--color-border);
  background: var(--color-bg-base);
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: $space-1;
  align-items: center;
  min-height: 32px;
  padding: $space-1;
  background: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  &:focus-within { border-color: var(--color-accent); }
}
.badge { gap: $space-1; }
.tag-remove {
  background: none;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 1px;
  &:hover { color: var(--color-danger); }
}
.tag-input {
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: $font-size-sm;
  outline: none;
  flex: 1;
  min-width: 80px;
  &::placeholder { color: var(--color-text-muted); }
}
</style>
