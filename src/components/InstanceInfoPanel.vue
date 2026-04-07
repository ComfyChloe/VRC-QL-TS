<script setup lang="ts">
import type { InstanceConfig, InstanceMode, InstanceType, InstanceRegion } from '../lib/types'

const props = defineProps<{
  modelValue: InstanceConfig
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: InstanceConfig]
}>()

function patch<K extends keyof InstanceConfig>(field: K, value: InstanceConfig[K]) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

const MODE_LABELS: { id: InstanceMode; label: string }[] = [
  { id: 'create', label: 'Create' },
  { id: 'join',   label: 'Join' },
  { id: 'local',  label: 'Local' },
  { id: 'none',   label: 'None' }
]

const TYPE_LABELS: { id: InstanceType; label: string }[] = [
  { id: 'public',      label: 'Public' },
  { id: 'friends+',    label: 'Friends+' },
  { id: 'friends',     label: 'Friends' },
  { id: 'invite+',     label: 'Invite+' },
  { id: 'invite',      label: 'Invite Only' }
]

const REGION_LABELS: { id: InstanceRegion; label: string }[] = [
  { id: 'us-w', label: 'US (W)' },
  { id: 'us-e', label: 'US (E)' },
  { id: 'eu',   label: 'EU' },
  { id: 'jp',   label: 'JP' }
]
</script>

<template>
  <div class="instance-info-panel">
    <div class="panel-title-row">
      <span class="section-label">Instance Info</span>
    </div>

    <!-- Mode selector -->
    <div class="mode-row">
      <label
        v-for="m in MODE_LABELS"
        :key="m.id"
        class="radio-row"
      >
        <input
          type="radio"
          :value="m.id"
          :checked="modelValue.mode === m.id"
          :disabled="readonly"
          @change="patch('mode', m.id)"
        />
        <span>{{ m.label }}</span>
      </label>
    </div>

    <!-- Create mode fields -->
    <template v-if="modelValue.mode === 'create'">
      <div class="field-stack">
        <label class="field-label">World ID</label>
        <input class="input" type="text" placeholder="wrld_... (empty = home)"
          :value="modelValue.worldId" :disabled="readonly"
          @input="patch('worldId', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="inline-fields">
        <div class="field-stack">
          <label class="field-label">Instance ID</label>
          <input class="input" type="text" placeholder="135"
            :value="modelValue.instanceId" :disabled="readonly"
            @input="patch('instanceId', ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="field-stack">
          <label class="field-label">Nonce</label>
          <input class="input" type="text" placeholder="Auto-generated"
            :value="modelValue.nonce" :disabled="readonly"
            @input="patch('nonce', ($event.target as HTMLInputElement).value)" />
        </div>
      </div>
      <div class="field-stack">
        <label class="field-label">Owner User ID</label>
        <input class="input" type="text" placeholder="usr_..."
          :value="modelValue.ownerId" :disabled="readonly"
          @input="patch('ownerId', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="field-stack">
        <label class="field-label">Instance Type</label>
        <div class="chip-row">
          <label v-for="t in TYPE_LABELS" :key="t.id" class="radio-row">
            <input type="radio" :value="t.id" :checked="modelValue.type === t.id"
              :disabled="readonly"
              @change="patch('type', t.id as InstanceType)" />
            <span>{{ t.label }}</span>
          </label>
        </div>
      </div>
      <div class="field-stack">
        <label class="field-label">Region</label>
        <div class="chip-row">
          <label v-for="r in REGION_LABELS" :key="r.id" class="radio-row">
            <input type="radio" :value="r.id" :checked="modelValue.region === r.id"
              :disabled="readonly"
              @change="patch('region', r.id as InstanceRegion)" />
            <span>{{ r.label }}</span>
          </label>
        </div>
      </div>
      <div class="warn-banner" style="margin-top: 8px">
        ⚠ All accounts must be friends with the Owner User ID to join the created instance.
      </div>
    </template>

    <!-- Join mode fields -->
    <template v-else-if="modelValue.mode === 'join'">
      <div class="field-stack">
        <label class="field-label">Instance Link</label>
        <input class="input" type="text" placeholder="wrld_... or full vrchat://launch?worldId=..."
          :value="modelValue.joinLink" :disabled="readonly"
          @input="patch('joinLink', ($event.target as HTMLInputElement).value)" />
      </div>
      <p class="text-xs text-secondary">
        Paste either the full VRChat launch link or just the world/instance portion. The launcher adds the prefix automatically.
      </p>
    </template>

    <!-- Local mode info -->
    <template v-else-if="modelValue.mode === 'local'">
      <p class="text-sm text-secondary" style="margin-top: 8px">
        Launches in offline local testing mode. EAC is disabled. Cannot join online instances.
      </p>
    </template>

    <!-- None mode info -->
    <template v-else>
      <p class="text-sm text-secondary" style="margin-top: 8px">
        Opens to your home world using your default home instance type.
      </p>
    </template>

  </div>
</template>

<style lang="scss" scoped>
.instance-info-panel {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}
.panel-title-row {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: $space-2;
}
.section-label {
  font-size: $font-size-xs;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}
.mode-row {
  display: flex;
  gap: $space-4;
  flex-wrap: wrap;
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: $space-3;
}
</style>
