import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

// Cachea el cliente en el objeto global SIEMPRE, también en producción. El
// deploy es un servidor Node de larga vida (output: standalone): sin este
// cache, cada re-evaluación del módulo podía instanciar un PrismaClient nuevo
// y abrir otro pool de conexiones, agotando `max_connections` de Postgres bajo
// concurrencia. El tamaño del pool se controla con `?connection_limit=N` en
// DATABASE_URL (ver .env.example).
globalForPrisma.prisma = prisma
