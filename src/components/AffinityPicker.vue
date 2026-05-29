<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const coreCount = navigator.hardwareConcurrency || 16
const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const selected = reactive(new Set<number>())

const computedHex = computed(() => {
  if (selected.size === 0) return ''
  let mask = 0n
  for (const i of selected) mask |= (1n << BigInt(i))
  return mask.toString(16).toUpperCase()
})

function hexToSet(hex: string): Set<number> {
  const trimmed = hex.trim()
  if (!trimmed) return new Set()
  try {
    const mask = BigInt('0x' + trimmed)
    const result = new Set<number>()
    for (let i = 0; i < coreCount; i++) {
      if ((mask >> BigInt(i)) & 1n) result.add(i)
    }
    return result
  } catch {
    return new Set()
  }
}

function openPicker() {
  if (props.disabled) return
  const init = hexToSet(props.modelValue)
  selected.clear()
  for (const i of init) selected.add(i)
  isOpen.value = true
}

function togglePicker() {
  if (isOpen.value) {
    isOpen.value = false
  } else {
    openPicker()
  }
}

function toggleCore(idx: number, checked: boolean) {
  if (checked) selected.add(idx)
  else selected.delete(idx)
  emit('update:modelValue', computedHex.value)
}

function selectAll() {
  selected.clear()
  for (let i = 0; i < coreCount; i++) selected.add(i)
  emit('update:modelValue', computedHex.value)
}

function selectNone() {
  selected.clear()
  emit('update:modelValue', '')
}

function selectEven() {
  selected.clear()
  for (let i = 0; i < coreCount; i += 2) selected.add(i)
  emit('update:modelValue', computedHex.value)
}

function selectOdd() {
  selected.clear()
  for (let i = 1; i < coreCount; i += 2) selected.add(i)
  emit('update:modelValue', computedHex.value)
}

function onRawInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  emit('update:modelValue', val)
  if (isOpen.value) {
    const updated = hexToSet(val)
    selected.clear()
    for (const i of updated) selected.add(i)
  }
}

function onDocMousedown(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onDocMousedown))
onUnmounted(() => document.removeEventListener('mousedown', onDocMousedown))

// CCD (Core Complex Die) grouping heuristic:
// 16-logical-core groups when coreCount ≥ 32 and divisible by 16 (AMD with SMT),
// 8-logical-core groups when coreCount ≥ 16 and divisible by 8 (AMD no-SMT / Intel).
const ccdSize = (() => {
  if (coreCount >= 32 && coreCount % 16 === 0) return 16
  if (coreCount >= 16 && coreCount % 8 === 0) return 8
  return 0
})()
const ccdGroups = ccdSize === 0 ? [] : Array.from(
  { length: Math.floor(coreCount / ccdSize) },
  (_, i) => ({ id: i, from: i * ccdSize, to: i * ccdSize + ccdSize - 1 })
)
function ccdIsFullySelected(from: number, to: number): boolean {
  for (let i = from; i <= to; i++) if (!selected.has(i)) return false
  return true
}
function toggleCCD(from: number, to: number) {
  const allSelected = ccdIsFullySelected(from, to)
  if (allSelected) for (let i = from; i <= to; i++) selected.delete(i)
  else for (let i = from; i <= to; i++) selected.add(i)
  emit('update:modelValue', computedHex.value)
}
</script>

<template>
  <div ref="rootRef" class="affinity-picker">
    <span class="field-label">Affinity (hex)</span>
    <div class="affinity-input-row">
      <input
        class="input"
        type="text"
        placeholder="e.g. FFFF"
        :value="modelValue"
        :disabled="disabled"
        @input="onRawInput"
      />
      <button
        class="btn btn-ghost btn-sm picker-btn"
        :disabled="disabled"
        title="Select cores"
        @click="togglePicker"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" aria-hidden="true">
          <rect x="0" y="0" width="5" height="5"/>
          <rect x="8" y="0" width="5" height="5"/>
          <rect x="0" y="8" width="5" height="5"/>
          <rect x="8" y="8" width="5" height="5"/>
        </svg>
      </button>
    </div>
    <div v-if="isOpen" class="affinity-popup">
      <div class="popup-header">{{ coreCount }} logical cores detected</div>
      <div class="quick-actions">
        <button class="btn btn-ghost btn-sm" @click="selectAll">All</button>
        <button class="btn btn-ghost btn-sm" @click="selectNone">None</button>
        <button class="btn btn-ghost btn-sm" @click="selectEven">Even</button>
        <button class="btn btn-ghost btn-sm" @click="selectOdd">Odd</button>
      </div>
      <div v-if="ccdGroups.length > 0" class="ccd-section">
        <span class="popup-subheader">CCDs <span class="ccd-hint">({{ ccdSize }}-core groups)</span></span>
        <div class="quick-actions">
          <button
            v-for="group in ccdGroups"
            :key="group.id"
            class="btn btn-ghost btn-sm ccd-btn"
            :class="{ 'is-active': ccdIsFullySelected(group.from, group.to) }"
            @click="toggleCCD(group.from, group.to)"
          >
            CCD {{ group.id }}
            <span class="ccd-range">C{{ group.from }}–C{{ group.to }}</span>
          </button>
        </div>
      </div>
      <div class="core-grid">
        <label v-for="ci in coreCount" :key="ci - 1" class="core-chip" :class="{ 'is-checked': selected.has(ci - 1) }">
          <input
            type="checkbox"
            :checked="selected.has(ci - 1)"
            @change="toggleCore(ci - 1, ($event.target as HTMLInputElement).checked)"
          />
          <span>C{{ ci - 1 }}</span>
        </label>
      </div>
      <div class="popup-footer">
        <span class="footer-label">Hex:</span>
        <code class="hex-preview">{{ computedHex || '—' }}</code>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.affinity-picker {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  flex: 1;
  min-width: 80px;
}
.affinity-input-row {
  display: flex;
  gap: $space-1;
  align-items: center;
  .input { flex: 1; min-width: 0; }
}
.picker-btn {
  flex-shrink: 0;
  padding: $space-2;
  height: 32px;
  width: 32px;
}
.affinity-popup {
  position: absolute;
  top: calc(100% + #{$space-1});
  right: 0;
  z-index: 200;
  background: var(--color-bg-overlay);
  border: 1px solid var(--color-border);
  padding: $space-3;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: $space-3;
}
.popup-header {
  font-size: $font-size-xs;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.quick-actions {
  display: flex;
  gap: $space-1;
  flex-wrap: wrap;
}
.core-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
  gap: $space-1;
}
.core-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  user-select: none;
  padding: $space-1;
  border: 1px solid var(--color-border);
  background: var(--color-bg-base);
  transition: border-color 0.12s, background 0.12s;
  &:hover {
    border-color: var(--color-border-hover);
  }
  &.is-checked {
    border-color: var(--color-accent);
    background: var(--color-accent-subtle);
    span { color: var(--color-accent); }
  }
  input[type="checkbox"] {
    display: none;
  }
  span {
    font-size: $font-size-xs;
    color: var(--color-text-secondary);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
}
.popup-footer {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding-top: $space-2;
  border-top: 1px solid var(--color-border);
}
.footer-label {
  font-size: $font-size-xs;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.hex-preview {
  font-size: $font-size-sm;
  font-family: 'Consolas', 'Courier New', monospace;
  color: var(--color-accent);
  letter-spacing: 0.05em;
}
.ccd-section {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding-top: $space-2;
  border-top: 1px solid var(--color-border);
}
.popup-subheader {
  font-size: $font-size-xs;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ccd-hint {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  opacity: 0.7;
}
.ccd-btn {
  gap: $space-2;
  &.is-active {
    color: var(--color-accent);
    border-color: var(--color-accent);
    background: var(--color-accent-subtle);
  }
}
.ccd-range {
  font-size: 10px;
  opacity: 0.6;
}
</style>
