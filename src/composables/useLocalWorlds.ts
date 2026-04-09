import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface LocalWorld {
  name: string
  path: string
}

export function useLocalWorlds() {
  const worlds = ref<LocalWorld[]>([])
  const loading = ref(false)
  const error = ref('')

  async function refresh() {
    loading.value = true
    error.value = ''
    try {
      worlds.value = await invoke<LocalWorld[]>('list_local_worlds')
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  return { worlds, loading, error, refresh }
}
