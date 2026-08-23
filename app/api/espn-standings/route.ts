import { NextRequest, NextResponse } from "next/server";
import { getEspnStandings } from "@/lib/espnStandings";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const season = Number(searchParams.get("season") ?? "2025");
    const seasonType = Number(searchParams.get("seasontype") ?? "2");

    if (!Number.isFinite(season) || !Number.isFinite(seasonType)) {
      return NextResponse.json(
        { error: "Parámetros season/seasontype no válidos" },
        { status: 400 },
      );
    }

    const standings = await getEspnStandings(season, seasonType);

    return NextResponse.json(standings, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error cargando standings ESPN:", error);

    return NextResponse.json(
      {
        error: "No se pudieron cargar los standings de ESPN",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
