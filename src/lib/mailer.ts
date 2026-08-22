import nodemailer from 'nodemailer'

const globalForMailer = globalThis as unknown as { mailTransporter?: nodemailer.Transporter }

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

const transporter = globalForMailer.mailTransporter ?? buildTransporter()

if (process.env.NODE_ENV !== 'production') globalForMailer.mailTransporter = transporter

interface MailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

interface SendMailInput {
  to: string | string[]
  subject: string
  html: string
  attachments?: MailAttachment[]
}

export async function sendMail({ to, subject, html, attachments }: SendMailInput) {
  if (!process.env.SMTP_HOST) {
    throw new Error('SMTP_HOST no está configurado — revisa las variables de entorno SMTP_*')
  }
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    attachments,
  })
}
