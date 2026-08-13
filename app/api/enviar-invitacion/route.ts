import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    // 1. Extraemos también usuario y password
    const { secret, nombre = 'Participante', emailDestino, usuario, password } = await req.json();

    if (secret !== 'athos15') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await resend.emails.send({
      from: 'REDZONE <onboarding@resend.dev>',
      to: ['ivansc80@gmail.com'],
      subject: `¡Invitación y Credenciales de REDZONE para ${nombre}!`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 24px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
          <h1 style="color: #ef4444; margin-bottom: 8px; font-size: 24px; text-align: center;">🏈 REDZONE NFL PICK'EM</h1>
          <p style="font-size: 16px; margin-top: 20px;">¡Hola, <strong>${nombre}</strong>!</p>
          <p style="color: #cbd5e1; line-height: 1.5;">Has sido invitado a competir en la liga privada de REDZONE. Aquí tienes tus credenciales de acceso:</p>
          
          <div style="background-color: #1e293b; border: 1px solid #334155; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">Usuario / Email: <strong style="color: #ffffff; font-size: 16px;">${usuario || emailDestino || 'Tu correo'}</strong></p>
            <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">Contraseña temporal: <strong style="color: #38bdf8; font-size: 16px;">${password || 'Consultar con el administrador'}</strong></p>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="https://redzone-app-rho.vercel.app" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acceder a la App</a>
          </div>

          ${emailDestino ? `<p style="font-size: 11px; color: #64748b; margin-top: 30px; text-align: center;">Destinatario final: ${emailDestino}</p>` : ''}
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}