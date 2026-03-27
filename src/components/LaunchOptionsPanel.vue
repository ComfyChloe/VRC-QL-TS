<script setup lang="ts">
import type {
  DebugOptions, CreatorOptions, PerformanceOptions,
  IkOptions, SystemOptions, DisplayOptions
} from '../lib/types'

export interface LaunchOptions {
  debug: DebugOptions
  creator: CreatorOptions
  performance: PerformanceOptions
  ik: IkOptions
  system: SystemOptions
  display: DisplayOptions
}

const props = defineProps<{
  modelValue: LaunchOptions
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: LaunchOptions]
}>()

function patch<K extends keyof LaunchOptions>(key: K, value: LaunchOptions[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function patchDebug(field: keyof DebugOptions, value: boolean) {
  patch('debug', { ...props.modelValue.debug, [field]: value })
}
function patchCreator<K extends keyof CreatorOptions>(field: K, value: CreatorOptions[K]) {
  patch('creator', { ...props.modelValue.creator, [field]: value })
}
function patchOsc<K extends keyof CreatorOptions['osc']>(field: K, value: CreatorOptions['osc'][K]) {
  patchCreator('osc', { ...props.modelValue.creator.osc, [field]: value })
}
function patchPerf<K extends keyof PerformanceOptions>(field: K, value: PerformanceOptions[K]) {
  patch('performance', { ...props.modelValue.performance, [field]: value })
}
function patchIk<K extends keyof IkOptions>(field: K, value: IkOptions[K]) {
  patch('ik', { ...props.modelValue.ik, [field]: value })
}
function patchSystem<K extends keyof SystemOptions>(field: K, value: SystemOptions[K]) {
  patch('system', { ...props.modelValue.system, [field]: value })
}
function patchDisplay<K extends keyof DisplayOptions>(field: K, value: DisplayOptions[K]) {
  patch('display', { ...props.modelValue.display, [field]: value })
}

function numOrNull(v: string): number | null {
  const n = parseInt(v)
  return isNaN(n) ? null : n
}
</script>

<template>
  <div class="launch-options-grid">
    <section class="option-section">
      <p class="section-title">Debug</p>
      <div class="section-body">
      <label class="checkbox-row">
        <input type="checkbox" :checked="modelValue.debug.gui" :disabled="readonly"
          @change="patchDebug('gui', ($event.target as HTMLInputElement).checked)" />
        <span>Debug GUI</span>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" :checked="modelValue.debug.sdkLog" :disabled="readonly"
          @change="patchDebug('sdkLog', ($event.target as HTMLInputElement).checked)" />
        <span>SDK Log</span>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" :checked="modelValue.debug.udonLog" :disabled="readonly"
          @change="patchDebug('udonLog', ($event.target as HTMLInputElement).checked)" />
        <span>UDON Log</span>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" :checked="modelValue.debug.verboseLog" :disabled="readonly"
          @change="patchDebug('verboseLog', ($event.target as HTMLInputElement).checked)" />
        <span>Verbose Log</span>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" :checked="modelValue.debug.watchWorlds" :disabled="readonly"
          @change="patchDebug('watchWorlds', ($event.target as HTMLInputElement).checked)" />
        <span>Watch Worlds</span>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" :checked="modelValue.debug.watchAvatars" :disabled="readonly"
          @change="patchDebug('watchAvatars', ($event.target as HTMLInputElement).checked)" />
        <span>Watch Avatars</span>
      </label>
      </div>
    </section>

    <section class="option-section">
      <p class="section-title">Creator</p>
      <div class="section-body">
      <label class="checkbox-row">
        <input type="checkbox" :checked="modelValue.creator.osc.enabled" :disabled="readonly"
          @change="patchOsc('enabled', ($event.target as HTMLInputElement).checked)" />
        <span>OSC</span>
      </label>
      <div v-if="modelValue.creator.osc.enabled" class="inline-fields">
        <div class="field-stack">
          <label class="field-label">In Port</label>
          <input class="input" type="number" min="1" max="65535"
            :value="modelValue.creator.osc.inPort" :disabled="readonly"
            @blur="patchOsc('inPort', numOrNull(($event.target as HTMLInputElement).value) ?? 9001)" />
        </div>
        <div class="field-stack" style="flex: 2">
          <label class="field-label">Sender IP</label>
          <input class="input" type="text" placeholder="127.0.0.1"
            :value="modelValue.creator.osc.senderIp" :disabled="readonly"
            @input="patchOsc('senderIp', ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="field-stack">
          <label class="field-label">Out Port</label>
          <input class="input" type="number" min="1" max="65535"
            :value="modelValue.creator.osc.outPort" :disabled="readonly"
            @blur="patchOsc('outPort', numOrNull(($event.target as HTMLInputElement).value) ?? 9000)" />
        </div>
      </div>
      <div class="field-stack">
        <label class="field-label">MIDI Device</label>
        <input class="input" type="text" placeholder="Device name (partial match)"
          :value="modelValue.creator.midi" :disabled="readonly"
          @input="patchCreator('midi', ($event.target as HTMLInputElement).value)" />
      </div>
      </div>
    </section>

    <section class="option-section">
      <p class="section-title">Performance</p>
      <div class="section-body">
      <div class="inline-fields">
        <div class="field-stack">
          <label class="field-label">Max FPS</label>
          <input class="input" type="number" min="1" max="999" placeholder="Default"
            :value="modelValue.performance.maxFps ?? ''" :disabled="readonly"
            @blur="patchPerf('maxFps', numOrNull(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="field-stack">
          <label class="field-label">Affinity (hex)</label>
          <input class="input" type="text" placeholder="e.g. FFFF"
            :value="modelValue.performance.affinity" :disabled="readonly"
            @input="patchPerf('affinity', ($event.target as HTMLInputElement).value)" />
        </div>
      </div>
      <div class="inline-fields">
        <div class="field-stack">
          <label class="field-label">Process Priority (0–5)</label>
          <input class="input" type="number" min="0" max="5" placeholder="Default"
            :value="modelValue.performance.processPriority ?? ''" :disabled="readonly"
            @blur="patchPerf('processPriority', numOrNull(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="field-stack">
          <label class="field-label">Main Thread Priority (0–5)</label>
          <input class="input" type="number" min="0" max="5" placeholder="Default"
            :value="modelValue.performance.mainThreadPriority ?? ''" :disabled="readonly"
            @blur="patchPerf('mainThreadPriority', numOrNull(($event.target as HTMLInputElement).value))" />
        </div>
      </div>
      </div>
    </section>

    <section class="option-section">
      <p class="section-title">IK</p>
      <div class="section-body">
      <label class="checkbox-row">
        <input type="checkbox" :checked="modelValue.ik.legacyFbtCalibrate" :disabled="readonly"
          @change="patchIk('legacyFbtCalibrate', ($event.target as HTMLInputElement).checked)" />
        <span>Legacy FBT Calibrate</span>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" :checked="modelValue.ik.disableShoulderTracking" :disabled="readonly"
          @change="patchIk('disableShoulderTracking', ($event.target as HTMLInputElement).checked)" />
        <span>Disable Shoulder Tracking</span>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" :checked="modelValue.ik.freezeTrackingOnDisconnect" :disabled="readonly"
          @change="patchIk('freezeTrackingOnDisconnect', ($event.target as HTMLInputElement).checked)" />
        <span>Freeze Tracking on Disconnect</span>
      </label>
      <div class="field-stack">
        <label class="field-label">Custom Arm Ratio</label>
        <input class="input" type="text" placeholder="Default: 0.4537"
          :value="modelValue.ik.customArmRatio" :disabled="readonly"
          @input="patchIk('customArmRatio', ($event.target as HTMLInputElement).value)" />
      </div>
      </div>
    </section>

    <section class="option-section">
      <p class="section-title">System</p>
      <div class="section-body">
      <label class="checkbox-row">
        <input type="checkbox" :checked="modelValue.system.skipRegistryInstall" :disabled="readonly"
          @change="patchSystem('skipRegistryInstall', ($event.target as HTMLInputElement).checked)" />
        <span>Skip Registry Install</span>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" :checked="modelValue.system.disableAmdStutterWorkaround" :disabled="readonly"
          @change="patchSystem('disableAmdStutterWorkaround', ($event.target as HTMLInputElement).checked)" />
        <span>Disable AMD Stutter Workaround</span>
      </label>
      <div class="field-stack">
        <label class="field-label">Hardware Video Decode</label>
        <select class="input"
          :value="modelValue.system.hwVideoDecode" :disabled="readonly"
          @change="patchSystem('hwVideoDecode', ($event.target as HTMLSelectElement).value as 'default' | 'on' | 'off')">
          <option value="default">Default</option>
          <option value="on">Force On</option>
          <option value="off">Force Off</option>
        </select>
      </div>
      </div>
    </section>

    <section class="option-section">
      <p class="section-title">Display</p>
      <div class="section-body">
      <div class="inline-fields">
        <div class="field-stack">
          <label class="field-label">Width</label>
          <input class="input" type="number" min="640" placeholder="Default"
            :value="modelValue.display.screenWidth ?? ''" :disabled="readonly"
            @blur="patchDisplay('screenWidth', numOrNull(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="field-stack">
          <label class="field-label">Height</label>
          <input class="input" type="number" min="480" placeholder="Default"
            :value="modelValue.display.screenHeight ?? ''" :disabled="readonly"
            @blur="patchDisplay('screenHeight', numOrNull(($event.target as HTMLInputElement).value))" />
        </div>
      </div>
      <div class="inline-fields">
        <div class="field-stack">
          <label class="field-label">Fullscreen</label>
          <select class="input"
            :value="modelValue.display.fullscreen === null ? '' : String(modelValue.display.fullscreen)"
            :disabled="readonly"
            @change="patchDisplay('fullscreen', ($event.target as HTMLSelectElement).value === '' ? null : ($event.target as HTMLSelectElement).value === 'true')">
            <option value="">Default</option>
            <option value="true">Fullscreen</option>
            <option value="false">Windowed</option>
          </select>
        </div>
        <div class="field-stack">
          <label class="field-label">Monitor</label>
          <input class="input" type="number" min="1" placeholder="Default"
            :value="modelValue.display.monitor ?? ''" :disabled="readonly"
            @blur="patchDisplay('monitor', numOrNull(($event.target as HTMLInputElement).value))" />
        </div>
      </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.launch-options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $space-3;
  align-items: start;
  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
}
.option-section {
  border: 1px solid var(--color-border);
  background: var(--color-bg-base);
  padding: $space-3;
  flex-shrink: 0;
}
.section-title {
  margin-bottom: $space-3;
  font-size: $font-size-xs;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}
.section-body {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}
</style>
