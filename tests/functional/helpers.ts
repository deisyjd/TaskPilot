export const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

// Credenciales del seed de desarrollo (prisma/seed.ts)
export const ADMIN = { email: 'deisy@wipli.app', password: 'wipli2024' }
export const MEMBER = { email: 'julian@wipli.app', password: 'wipli2024' }

type RequestOptions = { method?: string; body?: unknown }

// Cliente HTTP con manejo de la cookie de sesión (wipli-session).
// Cada suite crea el suyo; la cookie se actualiza con cada Set-Cookie
// (login, crear empresa y cambiar de empresa reemplazan la sesión).
export class Client {
  private cookie = ''

  async request(path: string, { method = 'GET', body }: RequestOptions = {}) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const setCookie = res.headers.get('set-cookie')
    if (setCookie) this.cookie = setCookie.split(';')[0]
    return res
  }

  async login(credentials: { email: string; password: string }) {
    const res = await this.request('/api/auth/login', { method: 'POST', body: credentials })
    if (res.status !== 200) {
      throw new Error(
        `Login falló (${res.status}) para ${credentials.email} — ¿corriste \`npm run seed\`?`
      )
    }
    return res.json()
  }
}

export function uniqueName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}
