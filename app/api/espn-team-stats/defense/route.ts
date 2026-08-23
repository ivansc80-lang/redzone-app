import { NextRequest, NextResponse } from "next/server";
import {
  EspnTeamDefenseCategory,
  getTeamDefenseLeaders,
} from "@/lib/espnTeamDefense";

const CATEGORIAS: EspnTeamDefenseCategory[] = [
  "yardas_permitidas",
  "capturas",
  "entregas_def",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = (searchParams.get("categoria") ??
      "yardas_permitidas") as EspnTeamDefenseCategory;
    const temporada = Number(searchParams.get("temporada") ?? "2025");
    const seasonType = Number(searchParams.get("seasontype") ?? "2");

    if (!CATEGORIAS.includes(categoria)) {
      return NextResponse.json(
        {
          error: "Categoría defensiva no válida",
          categorias: CATEGORIAS,
        },
        { status: 400 },
      );
    }

    const leaders = await getTeamDefenseLeaders(
      categoria,
      temporada,
      seasonType,
    );

    return NextResponse.json(leaders);
  } catch (error) {
    console.error("Error cargando estadísticas defensivas ESPN:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las estadísticas defensivas ESPN" },
      { status: 500 },
    );
  }
}
