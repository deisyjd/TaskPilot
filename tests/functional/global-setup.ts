import { spawn, type ChildProcess } from 'node:child_process'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

async function serverUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/auth/me`)
    return res.status === 401 || res.ok
  } catch {
    return false
  }
}

// Levanta `npm start` si no hay un servidor escuchando. Requiere haber
// corrido antes `npm run build` y tener la base de datos con el seed
// de desarrollo (`npm run seed`).
export default async function setup() {
  if (await serverUp()) return

  let child: ChildProcess | null = spawn('npm', ['start'], {
    cwd: process.cwd(),
    stdio: 'ignore',
    detached: true,
  })

  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (await serverUp()) break
    await new Promise((r) => setTimeout(r, 500))
  }

  if (!(await serverUp())) {
    if (child.pid) process.kill(-child.pid)
    throw new Error(
      `No hay servidor en ${BASE}. Corre \`npm run build\` (y verifica que PostgreSQL esté arriba) antes de las pruebas funcionales.`
    )
  }

  return () => {
    if (child?.pid) {
      try {
        process.kill(-child.pid)
      } catch {
        // ya terminó
      }
    }
    child = null
  }
}
