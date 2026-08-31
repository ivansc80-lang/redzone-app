import { NextRequest, NextResponse } from "next/server";
import { getReceivingLeaders } from "@/lib/espnStats";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const temporada = Number(searchParams.get("temporada") ?? "2025");
    const seasonType = Number(searchParams.get("seasonType") ?? "2");

    const jugadores = await getReceivingLeaders(temporada, seasonType);

    return NextResponse.json(jugadores);
  } catch (error) {
    if (error instanceof Error && error.message.includes("ESPN API error 404")) {
      return NextResponse.json([]);
    }

    console.error("Error ESPN STATS RECIBIENDO:", error);

    return NextResponse.json(
      {
        error: "No se pudieron cargar las estadísticas de ESPN.",
      },
      { status: 500 },
    );
  }
}
