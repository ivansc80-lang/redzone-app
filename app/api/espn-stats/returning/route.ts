import { NextResponse } from "next/server";
import { getReturningLeaders } from "@/lib/espnSpecialTeams";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getReturningLeaders(2025, 2));
  } catch (error) {
    console.error("Error ESPN STATS DEVOLUCIONES:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las estadísticas de devoluciones de ESPN." },
      { status: 500 },
    );
  }
}
