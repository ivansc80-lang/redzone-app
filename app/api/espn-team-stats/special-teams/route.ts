import { NextRequest, NextResponse } from "next/server";
import {
  EspnTeamSpecialTeamsCategory,
  getTeamSpecialTeamsLeaders,
} from "@/lib/espnTeamSpecialTeams";

export const dynamic = "force-dynamic";

const CATEGORIAS = new Set<EspnTeamSpecialTeamsCategory>([
  "devoluciones",
  "pateando",
  "despejes",
]);

export async function GET(request: NextRequest) {
  try {
    const categoriaRaw =
      request.nextUrl.searchParams.get("categoria") ?? "devoluciones";
    const temporadaRaw = request.nextUrl.searchParams.get("temporada") ?? "2025";
    const seasonTypeRaw =
      request.nextUrl.searchParams.get("seasontype") ?? "2";

    if (!CATEGORIAS.has(categoriaRaw as EspnTeamSpecialTeamsCategory)) {
      return NextResponse.json(
        { error: `Categoría no válida: ${categoriaRaw}` },
        { status: 400 },
      );
    }

    const temporada = Number(temporadaRaw);
    const seasonType = Number(seasonTypeRaw);

    if (!Number.isInteger(temporada) || !Number.isInteger(seasonType)) {
      return NextResponse.json(
        { error: "temporada y seasontype deben ser números enteros" },
        { status: 400 },
      );
    }

    const data = await getTeamSpecialTeamsLeaders(
      categoriaRaw as EspnTeamSpecialTeamsCategory,
      temporada,
      seasonType,
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error cargando ESPN team special teams:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las estadísticas de equipos especiales" },
      { status: 500 },
    );
  }
}
