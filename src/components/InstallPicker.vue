<script setup lang="ts">
import { computed } from 'vue'
import { appConfig } from '../lib/config'
import { useInstalls } from '../composables/useInstalls'
import type { VRCInstall } from '../lib/types'

const props = defineProps<{
  modelValue: string   // selected install id
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
  'browse': []
}>()

const { installs, addInstall } = useInstalls()

const selected = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const selectedInstall = computed<VRCInstall | undefined>(
  () => installs.value.find(i => i.id === props.modelValue)
)

async function browse() {
  await addInstall()
  // After adding, pre-select the newly added install
  const newest = appConfig.value.installs.at(-1)
  if (newest) emit('update:modelValue', newest.id)
}
</script>

<template>
  <div class="install-picker">
    <div class="picker-label field-label">VRChat Installation</div>
    <div class="picker-row">
      <select
        v-model="selected"
        class="input picker-select"
      >
        <option value="" disabled>— Select an installation —</option>
        <option v-for="install in installs" :key="install.id" :value="install.id">
          {{ install.name }}
        </option>
      </select>
      <button class="btn btn-ghost" type="button" @click="browse">Browse</button>
    </div>
    <p v-if="selectedInstall" class="picker-path text-xs text-muted">
      {{ selectedInstall.exePath }}
    </p>
    <p v-else-if="installs.length === 0" class="picker-path text-xs text-warning">
      No installations added yet. Click Browse to add VRChat.exe.
    </p>
  </div>
</template>

<style lang="scss" scoped>
.install-picker {
  display: flex;
  flex-direction: column;
  gap: $space-1;
}
.picker-row {
  display: flex;
  gap: $space-2;
  align-items: center;
}
.picker-select {
  flex: 1;
  background: var(--color-bg-base);
  cursor: pointer;
  option { background: var(--color-bg-elevated); }
}
.picker-path {
  padding-left: $space-1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
