import { NextRequest, NextResponse } from "next/server";
import { getPuntingLeaders } from "@/lib/espnSpecialTeams";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const temporada = Number(searchParams.get("temporada") ?? "2025");
    const seasonType = Number(searchParams.get("seasonType") ?? "2");

    return NextResponse.json(await getPuntingLeaders(temporada, seasonType));
  } catch (error) {
    console.error("Error ESPN STATS DESPEJES:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las estadísticas de despejes de ESPN." },
      { status: 500 },
    );
  }
}
