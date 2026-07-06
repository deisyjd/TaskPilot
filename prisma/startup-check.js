/* eslint-disable @typescript-eslint/no-require-imports */
// CommonJS a propósito: corre via `node` en el entrypoint del contenedor,
// sin paso de build (igual que prisma/seed-production.js).
//
// Uso: node prisma/startup-check.js env   → valida variables de entorno
//      node prisma/startup-check.js db    → verifica conexión a la base
//
// Nunca imprime secretos completos: solo host/base de la URL, longitudes
// y avisos de comillas/espacios accidentales.

const mode = process.argv[2] || 'env'

function describeSecret(name) {
  const value = process.env[name]
  if (!value) {
    console.log(`  ✗ ${name}: NO definida`)
    return
  }
  const warnings = []
  if (value !== value.trim()) warnings.push('tiene espacios al inicio/final')
  if (/^["']|["']$/.test(value)) warnings.push('tiene comillas incluidas en el valor')
  const suffix = warnings.length ? ` ⚠ ${warnings.join(' y ')}` : ''
  console.log(`  ✓ ${name}: definida (${value.length} caracteres)${suffix}`)
}

function checkEnv() {
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || '(no definida)'}`)

  const url = process.env.DATABASE_URL
  if (!url) {
    console.log('  ✗ DATABASE_URL: NO definida — la app no puede conectarse a la base de datos')
  } else {
    try {
      const parsed = new URL(url)
      const masked = `${parsed.protocol}//${parsed.username || '(sin usuario)'}:****@${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`
      console.log(`  ✓ DATABASE_URL: ${masked}`)
      if (!/^postgres/.test(parsed.protocol)) {
        console.log(`  ⚠ DATABASE_URL no es de PostgreSQL (protocolo "${parsed.protocol}") — el schema espera postgresql://`)
      }
    } catch {
      console.log('  ⚠ DATABASE_URL: definida pero no se pudo parsear como URL — revisen comillas o espacios')
    }
  }

  describeSecret('JWT_SECRET')
  describeSecret('SEED_USER_PASSWORD')
}

async function checkDb() {
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  try {
    await prisma.$queryRaw`SELECT 1`
    const [users, companies] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
    ])
    console.log(`  ✓ Conexión a la base de datos OK — ${users} usuarios, ${companies} empresas`)
    if (users === 0) {
      console.log('  ⚠ La base no tiene usuarios: el login devolverá 401 hasta que corra el seed (requiere SEED_USER_PASSWORD)')
    }
  } catch (err) {
    console.log(`  ✗ No se pudo verificar la base de datos: ${err.message}`)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

if (mode === 'db') {
  checkDb()
} else {
  checkEnv()
}
