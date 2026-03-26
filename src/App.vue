<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'

const LauncherPage  = defineAsyncComponent(() => import('./pages/LauncherPage.vue'))
const InstallsPage  = defineAsyncComponent(() => import('./pages/InstallsPage.vue'))
const ProfilesPage  = defineAsyncComponent(() => import('./pages/ProfilesPage.vue'))
const SettingsPage  = defineAsyncComponent(() => import('./pages/SettingsPage.vue'))

type NavId = 'launcher' | 'installs' | 'profiles' | 'settings'

const navItems: { id: NavId; label: string }[] = [
  { id: 'launcher', label: 'Launcher' },
  { id: 'installs', label: 'Installs' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'settings', label: 'Settings' },
]

const activeNav = ref<NavId>('launcher')

const currentPage = computed(() => {
  switch (activeNav.value) {
    case 'launcher': return LauncherPage
    case 'installs': return InstallsPage
    case 'profiles': return ProfilesPage
    case 'settings': return SettingsPage
  }
})
</script>

<template>
  <div class="app-shell">
    <nav class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">VRC Launcher</span>
      </div>
      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.id">
          <button
            class="nav-item"
            :class="{ active: activeNav === item.id }"
            type="button"
            @click="activeNav = item.id"
          >
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </li>
      </ul>
    </nav>
    <main class="page-area">
      <Suspense>
        <component :is="currentPage" />
        <template #fallback><div class="loading text-muted text-sm">Loading…</div></template>
      </Suspense>
    </main>
  </div>
</template>

<style lang="scss">
// Global layout — not scoped so :root token overrides applied by applyAccentColor work
.app-shell {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg-base);
}

.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--color-bg-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0;
  flex-shrink: 0;
}

.sidebar-brand {
  display: block;
  padding: $space-4 $space-3;
  border-bottom: 1px solid var(--color-border);
}
.brand-text {
  font-size: $font-size-sm;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.nav-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: $space-2;
  flex: 1;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-3;
  border: 1px solid var(--color-border);
  background: none;
  color: var(--color-text-secondary);
  font-size: $font-size-sm;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.13s, color 0.13s, border-color 0.13s;
  text-align: left;
  user-select: none;
  margin-top: -1px;
  &:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-base);
  }
  &.active {
    background: var(--color-accent-subtle);
    color: var(--color-text-primary);
    border-color: var(--color-accent);
  }
}
.nav-label { flex: 1; }

.page-area {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}
</style>
