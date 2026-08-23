import { NextResponse } from "next/server";
import { getTacklesLeaders } from "@/lib/espnStats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jugadores = await getTacklesLeaders(2025, 2);

    return NextResponse.json(jugadores);
  } catch (error) {
    console.error("Error ESPN STATS TACLEADAS:", error);

    return NextResponse.json(
      {
        error: "No se pudieron cargar las estadísticas de ESPN.",
      },
      { status: 500 },
    );
  }
}
