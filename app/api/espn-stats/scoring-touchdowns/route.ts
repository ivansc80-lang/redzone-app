import { NextRequest, NextResponse } from "next/server";
import { getScoringTouchdownsLeaders } from "@/lib/espnStats";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const temporada = Number(searchParams.get("temporada") ?? "2025");
    const seasonType = Number(searchParams.get("seasonType") ?? "2");

    const jugadores = await getScoringTouchdownsLeaders(temporada, seasonType);
    return NextResponse.json(jugadores);
  } catch (error) {
    console.error("Error ESPN STATS TOUCHDOWNS:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las estadísticas de ESPN." },
      { status: 500 },
    );
  }
}
