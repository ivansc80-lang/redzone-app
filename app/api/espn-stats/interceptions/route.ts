import { NextResponse } from "next/server";
import { getInterceptionsLeaders } from "@/lib/espnStats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jugadores = await getInterceptionsLeaders(2025, 2);

    return NextResponse.json(jugadores);
  } catch (error) {
    console.error("Error ESPN STATS INTERCEPCIONES:", error);

    return NextResponse.json(
      {
        error: "No se pudieron cargar las estadísticas de ESPN.",
      },
      { status: 500 },
    );
  }
}
