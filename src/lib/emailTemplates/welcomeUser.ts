const FONT = "Poppins, Arial, Helvetica, sans-serif"

export interface WelcomeUserData {
  recipientName: string
  invitedByName: string
  companyName: string
  email: string
  tempPassword: string | null // null si el usuario ya existía (solo se le dio acceso a otra empresa)
  loginUrl: string
  googleEnabled: boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function detailRowHtml(label: string, valueHtml: string, isLast: boolean): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${isLast ? '' : 'border-bottom:1px solid #E3E8DF;'}font-family:${FONT};">
      <tr>
        <td style="padding:10px 0;color:#6B7280;font-size:13px;">${escapeHtml(label)}</td>
        <td align="right" style="padding:10px 0;color:#11161C;font-size:13px;font-weight:700;">${valueHtml}</td>
      </tr>
    </table>`
}

export function renderWelcomeEmail(data: WelcomeUserData): string {
  const isNew = data.tempPassword !== null
  const badge = isNew ? 'Bienvenido' : 'Nuevo acceso'
  const intro = isNew
    ? `${escapeHtml(data.invitedByName)} te invitó a Wipli`
    : `${escapeHtml(data.invitedByName)} te dio acceso a una empresa`
  const heading = isNew ? `¡Hola, ${escapeHtml(data.recipientName)}!` : `Nuevo acceso en Wipli`

  const howTo = data.googleEnabled
    ? `La forma más fácil de entrar es con el botón <strong>Continuar con Google</strong> usando este mismo correo.${isNew ? ' También puedes ingresar con tu correo y la contraseña temporal de abajo.' : ''}`
    : `Ingresa con tu correo${isNew ? ' y la contraseña temporal de abajo' : ' y tu contraseña'}.`

  const passwordRow = data.tempPassword
    ? detailRowHtml(
        'Contraseña temporal',
        `<span style="font-family:monospace;font-size:14px;letter-spacing:0.5px;">${escapeHtml(data.tempPassword)}</span>`,
        true
      )
    : ''

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Wipli · Bienvenido</title>
</head>
<body style="margin:0;padding:0;background:#E9EEE6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E9EEE6;">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#F4F7F2;border-radius:32px;overflow:hidden;">

          <!-- Topbar -->
          <tr>
            <td style="background:#11161C;padding:26px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td width="40" height="40" align="center" valign="middle" style="background:#DFFF45;border-radius:50%;font-family:${FONT};font-weight:900;font-size:20px;color:#11161C;">w</td>
                      <td style="padding-left:12px;font-family:${FONT};font-size:22px;font-weight:800;color:#ffffff;">Wip<span style="color:#DFFF45;">li</span></td>
                    </tr></table>
                  </td>
                  <td align="right" valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#D4D7D1;padding:10px 15px;border-radius:999px;font-family:${FONT};font-size:12px;font-weight:600;white-space:nowrap;">${badge}</td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:28px 28px 20px;">
              <p style="margin:0 0 8px;font-family:${FONT};font-size:13px;color:#6B7280;font-weight:500;">${intro}</p>
              <p style="margin:0 0 12px;font-family:${FONT};font-size:24px;line-height:1.2;font-weight:800;color:#11161C;">${heading}</p>
              <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:#374151;">
                Ya tienes acceso a <strong>${escapeHtml(data.companyName)}</strong> en Wipli, el espacio donde tu equipo gestiona proyectos, tareas y entregas. ${howTo}
              </p>
            </td>
          </tr>

          <!-- Credenciales -->
          <tr>
            <td style="padding:0 28px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;border:1px solid rgba(17,22,28,.06);">
                <tr>
                  <td style="padding:6px 20px;">
                    ${detailRowHtml('Empresa', escapeHtml(data.companyName), false)}
                    ${detailRowHtml('Tu usuario', escapeHtml(data.email), !passwordRow)}
                    ${passwordRow}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 28px 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="background:#11161C;border-radius:999px;">
                  <a href="${escapeHtml(data.loginUrl)}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:14px;font-weight:700;text-decoration:none;white-space:nowrap;"><span style="color:#ffffff;">Ingresar a Wipli</span></a>
                </td>
              </tr></table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 22px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#11161C;border-radius:22px;">
                <tr>
                  <td align="center" style="padding:22px;font-family:${FONT};color:#AEB5AF;font-size:12px;line-height:1.6;">
                    <span style="color:#ffffff;font-weight:700;">Wip<span style="color:#DFFF45;">li</span></span><br />
                    ${isNew ? 'Si no esperabas esta invitación, puedes ignorar este correo.' : 'Recibiste este correo porque te dieron acceso a una empresa en Wipli.'}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
