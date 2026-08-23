import { NextResponse } from "next/server";
import { getPuntingLeaders } from "@/lib/espnSpecialTeams";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getPuntingLeaders(2025, 2));
  } catch (error) {
    console.error("Error ESPN STATS DESPEJES:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las estadísticas de despejes de ESPN." },
      { status: 500 },
    );
  }
}
