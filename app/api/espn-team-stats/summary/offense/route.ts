import { NextRequest, NextResponse } from "next/server";
import { getTeamOffenseSummary } from "@/lib/espnTeamSummary";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const temporada = Number(searchParams.get("temporada") ?? "2025");
    const seasonType = Number(searchParams.get("seasonType") ?? "2");

    const summary = await getTeamOffenseSummary(temporada, seasonType);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error cargando resumen ofensivo ESPN por equipo:", error);

    return NextResponse.json(
      { error: "No se pudo cargar el resumen ofensivo de equipo" },
      { status: 500 },
    );
  }
}
