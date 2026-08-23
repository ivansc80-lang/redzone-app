import { NextResponse } from "next/server";
import { getKickingLeaders } from "@/lib/espnSpecialTeams";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getKickingLeaders(2025, 2));
  } catch (error) {
    console.error("Error ESPN STATS PATEANDO:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las estadísticas de pateo de ESPN." },
      { status: 500 },
    );
  }
}
