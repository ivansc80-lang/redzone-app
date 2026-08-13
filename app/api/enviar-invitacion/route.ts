import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    // 1. Extraemos las variables del cuerpo de la petición
    const { secret, nombre = 'Participante', emailDestino } = await req.json();

    // 2. Validamos la clave secreta
    if (secret !== 'athos15') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 3. Enviamos el e-mail a tu Gmail registrado
    const data = await resend.emails.send({
      from: 'REDZONE <onboarding@resend.dev>',
      to: ['ivansc80@gmail.com'],
      subject: `¡Invitación a REDZONE para ${nombre}!`,
      html: `
        <div style="font-family: sans-serif; background-color: #0f172a; color: #ffffff; padding: 20px; border-radius: 8px;">
          <h1 style="color: #ef4444; margin-bottom: 8px;">🏈 REDZONE NFL PICK'EM</h1>
          <p style="font-size: 16px;">¡Hola, <strong>${nombre}</strong>!</p>
          <p>Has sido invitado a competir en la liga privada de REDZONE.</p>
          ${emailDestino ? `<p style="font-size: 12px; color: #94a3b8;">Destinatario final: ${emailDestino}</p>` : ''}
          <div style="margin-top: 20px;">
            <a href="https://redzone-app-rho.vercel.app" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Entrar a la App</a>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}