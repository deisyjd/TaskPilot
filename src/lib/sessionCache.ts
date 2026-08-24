import { getRedis } from '@/lib/redis'
import type { SessionPayload } from '@/lib/auth'

// Caché de la resolución token→sesión sobre Redis. Cada request autenticado por
// bearer (todo el tráfico MCP) revalida el token; sin caché son 2-3 queries a
// Postgres por request, y un solo tool call dispara varias revalidaciones
// (request externo + cada self-fetch interno). Con caché es un GET a Redis.
//
// TTL corto a propósito: un cambio de rol o una baja de miembro deben propagar
// en segundos sin invalidación explícita. La revocación de un token SÍ se
// invalida al instante (invalidateSessionCache), porque es sensible a seguridad.
// Fail-safe: si Redis no está, resuelve siempre contra la BD.
const TTL_SECONDS = 30
const keyOf = (hash: string) => `session:tok:${hash}`

export async function getCachedSession(
  hash: string,
  resolve: () => Promise<SessionPayload | null>,
): Promise<SessionPayload | null> {
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(keyOf(hash))
      if (cached !== null) return JSON.parse(cached) as SessionPayload | null
    } catch {
      // Redis caído: cae a resolver contra la BD.
    }
  }
  const session = await resolve()
  if (redis) {
    try {
      // Se cachea también el resultado nulo (token inválido): frena floods de
      // tokens basura contra Postgres durante el TTL.
      await redis.set(keyOf(hash), JSON.stringify(session), 'EX', TTL_SECONDS)
    } catch {
      // No cachear no es un error.
    }
  }
  return session
}

export async function invalidateSessionCache(hash: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.del(keyOf(hash))
  } catch {
    // Ignora: en el peor caso la sesión revocada vive hasta el TTL (30s).
  }
}
