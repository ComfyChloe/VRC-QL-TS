<script setup lang="ts">
import { ref, watch } from 'vue'
import { appConfig, saveConfig, applyAccentColor } from '../lib/config'

const DEFAULT_ACCENT = '#7c6aef'

// Keep a local copy so input is responsive; persist on change
const accentColor = ref(appConfig.value.theme.accentColor)

watch(accentColor, async (hex) => {
  appConfig.value.theme.accentColor = hex
  applyAccentColor(hex)
  await saveConfig()
})

async function resetAccent() {
  accentColor.value = DEFAULT_ACCENT
}

const rememberSize    = ref(appConfig.value.window.rememberSize)
const layoutColumns   = ref(appConfig.value.window.autoLayoutColumns)

watch([rememberSize, layoutColumns], async ([rs, lc]) => {
  appConfig.value.window.rememberSize       = rs
  appConfig.value.window.autoLayoutColumns  = lc
  await saveConfig()
})
</script>

<template>
  <div class="settings-page">
    <h1 class="page-title">Settings</h1>

    <!-- Theme -->
    <section class="card settings-section">
      <h2 class="section-title">Theme</h2>
      <div class="setting-row">
        <div class="field-stack">
          <span class="field-label">Accent Colour</span>
          <span class="text-xs text-muted">Applies to buttons, highlights, and selected items</span>
        </div>
        <div class="colour-controls">
          <input class="colour-swatch" type="color" v-model="accentColor" />
          <span class="colour-hex text-sm text-secondary">{{ accentColor }}</span>
          <button class="btn btn-ghost btn-sm" type="button" @click="resetAccent">Reset</button>
        </div>
      </div>
    </section>

    <!-- Window -->
    <section class="card settings-section">
      <h2 class="section-title">Window</h2>
      <div class="setting-row">
        <div class="field-stack">
          <span class="field-label">Remember Window Size</span>
          <span class="text-xs text-muted">Restores window dimensions on next launch</span>
        </div>
        <label class="checkbox-row">
          <input v-model="rememberSize" type="checkbox" />
          <span>Enabled</span>
        </label>
      </div>
      <hr class="divider" />
      <div class="setting-row">
        <div class="field-stack">
          <span class="field-label">Auto-Layout Columns</span>
          <span class="text-xs text-muted">Number of columns when tiling VRChat windows</span>
        </div>
        <input
          v-model.number="layoutColumns"
          class="input num-input"
          type="number"
          min="1"
          max="6"
          step="1"
        />
      </div>
    </section>

    <!-- About -->
    <section class="card settings-section">
      <h2 class="section-title">About</h2>
      <div class="about-row">
        <p class="text-secondary">VRC Launcher</p>
        <p class="text-muted text-sm">A quick-launch tool for multiple VRChat profiles</p>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.settings-page {
  padding: $space-5;
  display: flex;
  flex-direction: column;
  gap: $space-5;
  height: 100%;
  overflow-y: auto;
}
.page-title {
  font-size: $font-size-xl;
  font-weight: 700;
  color: var(--color-text-primary);
  flex-shrink: 0;
}
.settings-section {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}
.section-title {
  font-size: $font-size-base;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: $font-size-xs;
  padding-bottom: $space-2;
  border-bottom: 1px solid var(--color-border);
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-4;
}
.colour-controls {
  display: flex;
  align-items: center;
  gap: $space-2;
  flex-shrink: 0;
}
.colour-swatch {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 2px;
  background: var(--color-bg-base);
  cursor: pointer;
}
.colour-hex {
  font-family: 'Courier New', monospace;
  min-width: 64px;
}
.num-input {
  width: 80px;
  text-align: center;
}
.about-row {
  display: flex;
  flex-direction: column;
  gap: $space-1;
}
</style>
