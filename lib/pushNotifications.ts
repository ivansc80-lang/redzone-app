import webpush from "web-push";
import { supabaseServer as supabase } from "@/lib/supabaseServer";

// ============================================================
// CATÁLOGO DE EVENTOS PUSH REDZONE
// ============================================================

export const PUSH_EVENTOS = {
  INICIO_TEMPORADA: "INICIO_TEMPORADA",
  CIERRE_PORRA: "CIERRE_PORRA",
  RESULTADOS_APERTURA: "RESULTADOS_APERTURA",
  SUPERBOWL_FIN_TEMPORADA: "SUPERBOWL_FIN_TEMPORADA",

  ON_FIRE: "ON_FIRE",
  MADRE_MIA: "MADRE_MIA",

  PLENO_REDZONE: "PLENO_REDZONE",
  MENUDO_BANO: "MENUDO_BANO",
  SE_ESCAPA: "SE_ESCAPA",

  PLENO_MAGICO: "PLENO_MAGICO",
  NO_TE_COMES_EL_TURRON: "NO_TE_COMES_EL_TURRON",

  LIDER_SOLIDO: "LIDER_SOLIDO",
  RECORDATORIO_PRONOSTICOS: "RECORDATORIO_PRONOSTICOS",
} as const;

export type TipoPushEvento =
  (typeof PUSH_EVENTOS)[keyof typeof PUSH_EVENTOS];

type EnviarPushArgs = {
  claveEvento: string;
  tipoEvento: TipoPushEvento;
  titulo: string;
  mensaje: string;
  temporada?: number | null;
  jornada?: number | null;
  userId?: string | null;
  url?: string;
  metadata?: Record<string, unknown>;
};

const configurarWebPush = () => {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error("Faltan claves VAPID para enviar PUSH.");
  }

  webpush.setVapidDetails(
    "mailto:redzone@redzone.app",
    publicKey,
    privateKey,
  );
};

export const eventoPushYaEnviado = async (claveEvento: string) => {
  const { data, error } = await supabase
    .from("push_eventos_enviados")
    .select("id")
    .eq("clave_evento", claveEvento)
    .maybeSingle();

  if (error) {
    throw new Error(`Error comprobando PUSH enviado: ${error.message}`);
  }

  return Boolean(data);
};

export const enviarPushRedzone = async ({
  claveEvento,
  tipoEvento,
  titulo,
  mensaje,
  temporada = null,
  jornada = null,
  userId = null,
  url = "/",
  metadata = {},
}: EnviarPushArgs) => {
  configurarWebPush();

  if (await eventoPushYaEnviado(claveEvento)) {
    return { enviado: false, duplicado: true, enviados: 0 };
  }

  let query = supabase
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,user_agent")
    .eq("activo", true);

  if (userId) query = query.eq("user_id", userId);

  const { data: suscripciones, error: suscripcionesError } = await query;

  if (suscripcionesError) {
    throw new Error(`Error leyendo suscripciones PUSH: ${suscripcionesError.message}`);
  }

  if (!suscripciones?.length) {
    return { enviado: false, duplicado: false, enviados: 0 };
  }

  const payload = JSON.stringify({ title: titulo, body: mensaje, url });
  let enviados = 0;

  for (const suscripcion of suscripciones) {
    try {
      await webpush.sendNotification(
        {
          endpoint: suscripcion.endpoint,
          keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
        },
        payload,
      );
      enviados += 1;
    } catch (error: any) {
      const status = Number(error?.statusCode || 0);
      if (status === 404 || status === 410) {
        await supabase
          .from("push_subscriptions")
          .update({ activo: false, updated_at: new Date().toISOString() })
          .eq("id", suscripcion.id);
        continue;
      }
      console.error("❌ Error enviando PUSH REDZONE:", error);
    }
  }

  if (enviados > 0) {
    const { error: logError } = await supabase
      .from("push_eventos_enviados")
      .insert({
        clave_evento: claveEvento,
        tipo_evento: tipoEvento,
        temporada,
        jornada,
        user_id: userId,
        titulo,
        mensaje,
        metadata,
      });

    if (logError) {
      throw new Error(`PUSH enviado pero no se pudo registrar: ${logError.message}`);
    }
  }

  return { enviado: enviados > 0, duplicado: false, enviados };
};

export const guardarLogro = async ({
  userId,
  temporada,
  jornada,
  tipoCompeticion = "regular",
  tipoLogro,
  detalle,
  metadata = {},
}: {
  userId: string;
  temporada: number;
  jornada: number;
  tipoCompeticion?: string;
  tipoLogro: "PLENO_MAGICO" | "PLENO_REDZONE";
  detalle?: string;
  metadata?: Record<string, unknown>;
}) => {
  const { error } = await supabase
    .from("logros")
    .upsert(
      {
        user_id: userId,
        temporada,
        jornada,
        tipo_competicion: tipoCompeticion,
        tipo_logro: tipoLogro,
        detalle,
        metadata,
      },
      {
        onConflict: "user_id,temporada,jornada,tipo_competicion,tipo_logro",
      },
    );

  if (error) {
    throw new Error(`Error guardando logro: ${error.message}`);
  }
};
