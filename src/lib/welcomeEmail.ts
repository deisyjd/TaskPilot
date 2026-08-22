import { sendMail } from '@/lib/mailer'
import { renderWelcomeEmail } from '@/lib/emailTemplates/welcomeUser'
import { isGoogleLoginEnabled } from '@/lib/googleOAuth'

interface WelcomeEmailParams {
  toEmail: string
  recipientName: string
  invitedByName: string
  companyName: string
  // Contraseña temporal (solo para usuarios recién creados). null si el usuario
  // ya existía y solo se le dio acceso a otra empresa.
  tempPassword: string | null
}

// Envía el correo de bienvenida / invitación al crear (o dar acceso a) un
// usuario. No lanza: si SMTP no está configurado o el envío falla, solo lo
// registra — la creación del usuario nunca debe romperse por el correo.
export async function sendWelcomeEmail({
  toEmail,
  recipientName,
  invitedByName,
  companyName,
  tempPassword,
}: WelcomeEmailParams) {
  if (!process.env.SMTP_HOST) return // correo no configurado → no-op silencioso

  const appUrl = process.env.APP_URL || 'https://wipli.adminainoa.com'
  const html = renderWelcomeEmail({
    recipientName,
    invitedByName,
    companyName,
    email: toEmail,
    tempPassword,
    loginUrl: `${appUrl}/login`,
    googleEnabled: isGoogleLoginEnabled(),
  })

  try {
    await sendMail({
      to: toEmail,
      subject: tempPassword ? '¡Bienvenido a Wipli! · Tu acceso' : `Wipli · Ahora tienes acceso a ${companyName}`,
      html,
    })
  } catch (err) {
    console.error(`[welcome-email] error enviando a ${toEmail}:`, err)
  }
}
