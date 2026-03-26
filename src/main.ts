import { createApp } from 'vue'
import App from './App.vue'
import './assets/global.scss'
import { loadConfig, appConfig, applyAccentColor } from './lib/config'

async function boot() {
  await loadConfig()
  applyAccentColor(appConfig.value.theme.accentColor)
  createApp(App).mount('#app')
}

boot().catch(console.error)
