import Redis from 'ioredis'

// Cliente Redis singleton. Si REDIS_URL no está definido, devuelve null y todo
// lo que dependa de Redis (caché, pub/sub) degrada de forma silenciosa: la app
// sigue funcionando contra Postgres como siempre.
const globalForRedis = globalThis as unknown as { redisClient?: Redis | null }

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null
  if (globalForRedis.redisClient === undefined) {
    try {
      const client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: false,
      })
      // Sin listener de 'error', ioredis puede lanzar y tumbar el proceso.
      client.on('error', (err) => {
        console.error('[redis] error:', err.message)
      })
      globalForRedis.redisClient = client
    } catch (err) {
      console.error('[redis] no se pudo inicializar:', err)
      globalForRedis.redisClient = null
    }
  }
  return globalForRedis.redisClient ?? null
}
