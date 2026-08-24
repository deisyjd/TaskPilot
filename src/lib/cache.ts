import { getRedis } from '@/lib/redis'

// Caché de lectura sobre Redis. Todo va envuelto en try/catch: si Redis está
// caído o no configurado, cae limpio a la función original (Postgres).
//
// Convención de claves: usa prefijos namespaced por empresa, p. ej.
// `report:monthly:{companyId}:{year}-{month}` o `history:{companyId}`, para
// poder invalidar por prefijo cuando cambian los datos.

// Protección anti-estampida (single-flight): al expirar una clave caliente, en
// vez de que N requests recalculen a la vez contra Postgres, solo uno toma un
// lock corto y recomputa; el resto espera brevemente y relee la caché.
const SINGLEFLIGHT_LOCK_MS = 5000
const SINGLEFLIGHT_WAIT_MS = 80
const SINGLEFLIGHT_MAX_WAITS = 6

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
  const redis = getRedis()
  if (!redis) return fetchFn()

  try {
    const cached = await redis.get(key)
    if (cached !== null) return JSON.parse(cached) as T
  } catch {
    // Redis caído: consulta la fuente directamente.
  }

  // Single-flight: intenta tomar el lock de recomputación.
  const lockKey = `lock:${key}`
  let haveLock = false
  try {
    haveLock = (await redis.set(lockKey, '1', 'PX', SINGLEFLIGHT_LOCK_MS, 'NX')) === 'OK'
  } catch {
    // Si el lock falla, seguimos y computamos igual (peor caso: recomputa de más).
  }

  if (!haveLock) {
    // Otro request está recomputando: espera un poco y relee la caché.
    for (let i = 0; i < SINGLEFLIGHT_MAX_WAITS; i++) {
      await sleep(SINGLEFLIGHT_WAIT_MS)
      try {
        const cached = await redis.get(key)
        if (cached !== null) return JSON.parse(cached) as T
      } catch {
        break
      }
    }
    // Fallback: el que tenía el lock no terminó a tiempo → computamos nosotros.
  }

  const value = await fetchFn()
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch {
    // ignora: no cachear no es un error
  }
  if (haveLock) {
    try {
      await redis.del(lockKey)
    } catch {
      // el lock expira solo por PX
    }
  }
  return value
}

// Borra claves exactas.
export async function invalidate(...keys: string[]): Promise<void> {
  const redis = getRedis()
  if (!redis || keys.length === 0) return
  try {
    await redis.del(...keys)
  } catch {
    // ignora
  }
}

// Borra todas las claves que empiecen con `prefix` (SCAN + DEL, no bloqueante).
export async function invalidatePrefix(prefix: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    const stream = redis.scanStream({ match: `${prefix}*`, count: 100 })
    for await (const keys of stream) {
      const batch = keys as string[]
      if (batch.length > 0) await redis.del(...batch)
    }
  } catch {
    // ignora
  }
}
