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
}
