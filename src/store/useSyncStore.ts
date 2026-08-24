import { create } from 'zustand'

// Detección de "cambios sin sincronizar" en la web. Los datos de proyectos y
// tareas se cargan al entrar y NO se re-traen en el sondeo (a propósito: el
// usuario recarga cuando quiere). Este store compara la versión del servidor
// (/api/sync/version) con la que tenía cargada y, si difiere, marca que hay
// cambios para que el header muestre el aviso.

interface SyncStore {
  baseline: string | null
  hasChanges: boolean
  // Consulta la versión del servidor. Primera vez → fija el baseline sin avisar.
  // Después → si difiere del baseline, marca hasChanges.
  checkVersion: () => Promise<void>
  // Fija el baseline a la versión actual y limpia el aviso. Se llama tras cargar
  // o recargar datos, y tras una mutación propia (para no auto-avisar por el
  // cambio que uno mismo acaba de hacer).
  refreshBaseline: () => Promise<void>
}

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch('/api/sync/version')
    if (!res.ok) return null
    const data = await res.json()
    return typeof data?.v === 'string' ? data.v : null
  } catch {
    return null
  }
}

export const useSyncStore = create<SyncStore>()((set, get) => ({
  baseline: null,
  hasChanges: false,

  checkVersion: async () => {
    const v = await fetchVersion()
    if (v === null) return
    const { baseline } = get()
    if (baseline === null) {
      set({ baseline: v })
    } else if (v !== baseline) {
      set({ hasChanges: true })
    }
  },

  refreshBaseline: async () => {
    const v = await fetchVersion()
    if (v === null) return
    set({ baseline: v, hasChanges: false })
  },
}))
