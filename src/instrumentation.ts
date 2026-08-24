const globalForCron = globalThis as unknown as { dailyDigestCronRegistered?: boolean }

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (globalForCron.dailyDigestCronRegistered) return
  globalForCron.dailyDigestCronRegistered = true

  const cron = await import('node-cron')
  const { runDailyDigestJob } = await import('@/lib/dailyDigest')
  const { runRecurrenceGenerationJob } = await import('@/lib/recurrenceJob')
  const { runWithLock } = await import('@/lib/lock')

  // TTL del lock de jobs: cubre el desfase de relojes entre réplicas al disparar
  // el cron. No necesita cubrir la duración del job.
  const JOB_LOCK_TTL_MS = 10 * 60 * 1000

  cron.schedule(
    '0 7 * * 1-5',
    () => {
      runWithLock('daily-digest', JOB_LOCK_TTL_MS, runDailyDigestJob).catch((err) => {
        console.error('[daily-digest] error en el job programado:', err)
      })
    },
    { timezone: 'America/Bogota' }
  )

  console.log('[daily-digest] cron registrado: lun-vie 7:00 a.m. hora Colombia')

  // Generación de ocurrencias de recurrencia: antes corría en cada GET de
  // tareas/recordatorios (escrituras en el path de lectura). Ahora es un job
  // diario. Corre a las 6:00 a.m. — antes del digest, para que el resumen ya
  // vea las ocurrencias del día.
  cron.schedule(
    '0 6 * * *',
    () => {
      runWithLock('recurrence-generation', JOB_LOCK_TTL_MS, runRecurrenceGenerationJob).catch((err) => {
        console.error('[recurrence] error en el job programado:', err)
      })
    },
    { timezone: 'America/Bogota' }
  )

  console.log('[recurrence] cron registrado: diario 6:00 a.m. hora Colombia')

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
