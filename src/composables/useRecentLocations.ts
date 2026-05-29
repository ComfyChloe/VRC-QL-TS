import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface RecentLocation {
  world_id: string
  world_name: string
  instance_id: string
  instance_type: string
  region: string | null
  group_name: string | null
  joined_at: string
  raw_location: string
}

export function useRecentLocations() {
  const locations = ref<RecentLocation[]>([])
  const loading = ref(false)
  const error = ref('')

  async function refresh() {
    loading.value = true
    error.value = ''
    try {
      locations.value = await invoke<RecentLocation[]>('get_recent_locations')
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  refresh()

  return { locations, loading, error, refresh }
}
