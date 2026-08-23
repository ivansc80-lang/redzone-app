import { NextRequest, NextResponse } from "next/server";
import {
  getTeamTurnoversLeaders,
  type EspnTeamTurnoversCategory,
} from "@/lib/espnTeamTurnovers";

export const dynamic = "force-dynamic";

const categoriasValidas = new Set<EspnTeamTurnoversCategory>([
  "perdidos",
  "recuperados",
  "diferencial",
]);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = (searchParams.get("categoria") ??
      "diferencial") as EspnTeamTurnoversCategory;

    if (!categoriasValidas.has(categoria)) {
      return NextResponse.json(
        { error: "Categoría de entregas no válida" },
        { status: 400 },
      );
    }

    const temporada = Number(searchParams.get("season") ?? "2025");
    const leaders = await getTeamTurnoversLeaders(categoria, temporada, 2);

    return NextResponse.json(leaders);
  } catch (error) {
    console.error("Error cargando entregas ESPN por equipo:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las entregas ESPN por equipo" },
      { status: 500 },
    );
  }
}
