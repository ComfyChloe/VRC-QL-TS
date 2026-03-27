import { createApp } from 'vue'
import App from './App.vue'
import './assets/global.scss'
import { loadConfig, appConfig, applyTheme } from './lib/config'

async function boot() {
  await loadConfig()
  await applyTheme(appConfig.value.theme)
  createApp(App).mount('#app')
}

boot().catch(console.error)
