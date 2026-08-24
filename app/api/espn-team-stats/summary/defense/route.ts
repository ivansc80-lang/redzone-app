import { NextRequest, NextResponse } from "next/server";
import { getTeamDefenseSummary } from "@/lib/espnTeamSummary";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params=request.nextUrl.searchParams;
    const temporada=Number(params.get("temporada") ?? "2025");
    const seasonType=Number(params.get("seasonType") ?? "2");
    return NextResponse.json(await getTeamDefenseSummary(temporada,seasonType));
  } catch(error) {
    console.error("Error cargando resumen defensivo ESPN por equipo:",error);
    return NextResponse.json({error:"No se pudo cargar el resumen defensivo"},{status:500});
  }
}
