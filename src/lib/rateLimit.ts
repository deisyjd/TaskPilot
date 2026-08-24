import { getRedis } from '@/lib/redis'

// Rate limiter de ventana fija sobre Redis. Fail-open: si Redis no está
// configurado o falla, NO limita — no queremos tumbar la API por no tener
// caché. Pensado para proteger endpoints como /api/mcp de que un solo conector
// (o un retry loco) sature el pool de conexiones a Postgres.
export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetSeconds: number
}

/**
 * Cuenta `cost` peticiones contra la ventana de `id`. Devuelve ok=false si se
 * pasó del `limit` dentro de `windowSeconds`.
 */
export async function checkRateLimit(
  id: string,
  limit: number,
  windowSeconds: number,
  cost = 1,
): Promise<RateLimitResult> {
  const redis = getRedis()
  if (!redis) return { ok: true, remaining: limit, resetSeconds: windowSeconds }

  const key = `ratelimit:${id}`
  try {
    const count = await redis.incrby(key, cost)
    // Primera petición de la ventana: fija el TTL. (Si la clave existiera sin
    // TTL por un corte raro, el EXPIRE aquí igual la sanea al siguiente arranque
    // de ventana.)
    if (count === cost) {
      await redis.expire(key, windowSeconds)
      return { ok: count <= limit, remaining: Math.max(0, limit - count), resetSeconds: windowSeconds }
    }
    const ttl = await redis.ttl(key)
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      resetSeconds: ttl > 0 ? ttl : windowSeconds,
    }
  } catch {
    return { ok: true, remaining: limit, resetSeconds: windowSeconds }
  }
}
