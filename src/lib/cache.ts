import { getRedis } from '@/lib/redis'

// Caché de lectura sobre Redis. Todo va envuelto en try/catch: si Redis está
// caído o no configurado, cae limpio a la función original (Postgres).
//
// Convención de claves: usa prefijos namespaced por empresa, p. ej.
// `report:monthly:{companyId}:{year}-{month}` o `history:{companyId}`, para
// poder invalidar por prefijo cuando cambian los datos.

export async function getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(key)
      if (cached !== null) return JSON.parse(cached) as T
    } catch {
      // ignora y consulta la fuente
    }
  }
  const value = await fetchFn()
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch {
      // ignora: no cachear no es un error
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
