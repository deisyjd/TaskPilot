const globalForCron = globalThis as unknown as { dailyDigestCronRegistered?: boolean }

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (globalForCron.dailyDigestCronRegistered) return
  globalForCron.dailyDigestCronRegistered = true

  const cron = await import('node-cron')
  const { runDailyDigestJob } = await import('@/lib/dailyDigest')

  cron.schedule(
    '0 7 * * 1-5',
    () => {
      runDailyDigestJob().catch((err) => {
        console.error('[daily-digest] error en el job programado:', err)
      })
    },
    { timezone: 'America/Bogota' }
  )

  console.log('[daily-digest] cron registrado: lun-vie 7:00 a.m. hora Colombia')

  // Chequeo de Redis al arranque: deja claro en los logs si quedó conectado o
  // si la app está degradando (sondeo del chat + sin caché). No bloquea el
  // arranque: el PING se resuelve en segundo plano.
  const { getRedis } = await import('@/lib/redis')
  const redis = getRedis()
  if (!redis) {
    console.log('[redis] REDIS_URL no definida — degradando: chat por sondeo y sin caché')
  } else {
    redis
      .ping()
      .then(() => console.log('[redis] ✓ conectado'))
      .catch((err) =>
        console.error('[redis] ⚠ no disponible — degradando (sondeo + sin caché):', err?.message ?? err)
      )
  }
}
