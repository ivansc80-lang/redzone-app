import { NextRequest, NextResponse } from "next/server";
import {
  EspnTeamOffenseCategory,
  getTeamOffenseLeaders,
} from "@/lib/espnTeamOffense";

export const dynamic = "force-dynamic";

const categoriasValidas = new Set<EspnTeamOffenseCategory>([
  "yardas_totales",
  "pasando",
  "corriendo",
]);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoria = (searchParams.get("categoria") ??
      "yardas_totales") as EspnTeamOffenseCategory;
    const temporada = Number(searchParams.get("temporada") ?? "2025");
    const seasonType = Number(searchParams.get("seasonType") ?? "2");

    if (!categoriasValidas.has(categoria)) {
      return NextResponse.json(
        { error: "Categoría ofensiva de equipo no válida" },
        { status: 400 },
      );
    }

    const leaders = await getTeamOffenseLeaders(
      categoria,
      temporada,
      seasonType,
    );

    return NextResponse.json(leaders);
  } catch (error) {
    console.error("Error cargando STATS ofensivas ESPN por equipo:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las estadísticas ofensivas de equipo" },
      { status: 500 },
    );
  }
}
