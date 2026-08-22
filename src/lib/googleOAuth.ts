import { decodeJwt } from 'jose'

// Flujo OAuth 2.0 (authorization code) contra Google, integrado con la sesión
// JWT propia de la app (ver src/lib/auth.ts). No usamos ninguna librería de
// terceros: solo dos endpoints de Google y el id_token que devuelven.

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALLBACK_PATH = '/api/auth/google/callback'

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

// El login con Google solo se habilita en producción — en desarrollo local se
// entra únicamente con usuario y contraseña. Además requiere las credenciales.
export function isGoogleLoginEnabled(): boolean {
  return process.env.NODE_ENV === 'production' && isGoogleConfigured()
}

// Base pública de la app. En producción usamos APP_URL (debe coincidir con el
// host donde Google devuelve al usuario); en desarrollo caemos al origen de la
// petición (p. ej. http://localhost:3000).
export function getAppBaseUrl(req: Request): string {
  return process.env.APP_URL?.replace(/\/+$/, '') ?? new URL(req.url).origin
}

// El redirect_uri tiene que ser idéntico en la petición de autorización y en el
// intercambio del código, y coincidir EXACTAMENTE con uno registrado en Google
// Cloud Console ({APP_URL}/api/auth/google/callback).
export function getRedirectUri(req: Request): string {
  return `${getAppBaseUrl(req)}${CALLBACK_PATH}`
}

export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export interface GoogleIdentity {
  email: string
  emailVerified: boolean
}

// Intercambia el código de autorización por tokens y extrae la identidad
// (correo) del id_token. El id_token llega por un canal servidor-a-servidor
// sobre TLS, autenticado con nuestro client_secret, así que basta con decodificar
// su payload — no hace falta verificar la firma.
export async function fetchGoogleIdentity(code: string, redirectUri: string): Promise<GoogleIdentity | null> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) return null

  const data = (await res.json()) as { id_token?: string }
  if (!data.id_token) return null

  const claims = decodeJwt(data.id_token) as { email?: string; email_verified?: boolean | string }
  if (!claims.email) return null

  return {
    email: claims.email.toLowerCase(),
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
  }
}
