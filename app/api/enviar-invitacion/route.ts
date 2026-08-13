import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { secret } = await req.json();

    if (secret !== 'athos15') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await resend.emails.send({
      from: 'REDZONE <onboarding@resend.dev>', // O tu dominio verificado en Resend
      to: ['tu-email@correo.com'], // Cambia esto por tu correo para probar
      subject: '¡Bienvenido a REDZONE NFL Pick\'em!',
      html: '<strong>¡Tu invitación a REDZONE está lista!</strong>',
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}