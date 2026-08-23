import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { completeLogin } from '@/lib/loginSuccess'
import { isGoogleConfigured, verifyGoogleIdToken } from '@/lib/googleOAuth'

// Login con Google para el cliente móvil (Google Sign-In nativo).
// El SDK del dispositivo obtiene un id_token (pidiéndolo con serverClientId =
// GOOGLE_CLIENT_ID) y lo manda aquí. Reutilizamos exactamente la misma sesión y
// la regla invitación-solo que /api/auth/login y el callback web.
export async function POST(req: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: 'Google no está configurado' }, { status: 503 })
  }

  const { idToken } = await req.json()
  if (!idToken || typeof idToken !== 'string') {
    return NextResponse.json({ error: 'idToken requerido' }, { status: 400 })
  }

  const identity = await verifyGoogleIdToken(idToken)
  if (!identity || !identity.emailVerified) {
    return NextResponse.json({ error: 'Token de Google inválido' }, { status: 401 })
  }

  // Invitación-solo: solo usuarios ya existentes y activos (igual que la web).
  const user = await prisma.user.findUnique({ where: { email: identity.email } })
  if (!user || user.status !== 'active') {
    return NextResponse.json({ error: 'No tienes acceso. Pide una invitación.' }, { status: 403 })
  }

  const result = await completeLogin(user.id)
  if (!result) {
    return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 })
  }

  return NextResponse.json(result)
}
