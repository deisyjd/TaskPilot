import { getRedis } from '@/lib/redis'

// Lock distribuido best-effort sobre Redis (SET NX PX). Sirve para que un job
// programado corra UNA sola vez aunque haya varias réplicas del server: todas
// tienen el mismo cron in-process y disparan a la misma hora, pero solo la que
// gana el lock ejecuta.
//
// Si no hay Redis (una sola instancia), corre siempre — no hay contra quién
// competir. Si Redis falla al pedir el lock, también corre (preferimos duplicar
// un envío que saltarnos el job).
//
// El lock NO se libera al terminar: se deja expirar por TTL. Así, si una réplica
// tiene el reloj un poco adelantado y dispara segundos después, encuentra el
// lock tomado y se salta. El TTL solo necesita cubrir el desfase de relojes
// entre réplicas (segundos), no la duración del job.
export async function runWithLock(
  name: string,
  ttlMs: number,
  fn: () => Promise<void>,
): Promise<boolean> {
  const redis = getRedis()
  if (!redis) {
    await fn()
    return true
  }

  let acquired = false
  try {
    acquired = (await redis.set(`lock:job:${name}`, '1', 'PX', ttlMs, 'NX')) === 'OK'
  } catch {
    // Redis falló: corre igual (mejor duplicar que no ejecutar).
    await fn()
    return true
  }

  if (!acquired) {
    console.log(`[lock] job '${name}': otra réplica lo tomó — se omite en esta instancia`)
    return false
  }

  await fn()
  return true
}
