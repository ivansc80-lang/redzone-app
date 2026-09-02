"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { PartidoTemporada } from "@/lib/queries";
import { FranchisePlayoffCalendar } from "@/components/FranchisePlayoffExtension";

type Props = {
  teamId: string;
  temporada: number;
};

export default function FranchisePlayoffCalendarLoader({ teamId, temporada }: Props) {
  const [partidos, setPartidos] = useState<PartidoTemporada[]>([]);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      // Usamos la misma autoridad de temporada que el resto de REDZONE.
      // En esta rama TEST, app_config se redirige automáticamente a app_config_test.
      const { data: config, error: configError } = await supabase
        .from("app_config")
        .select("temporada")
        .eq("id", 1)
        .maybeSingle();

      if (configError) {
        console.error(
          "Error cargando temporada activa para calendario playoff:",
          configError.message,
        );
      }

      const temporadaActiva = Number(config?.temporada);
      const temporadaConsulta =
        Number.isFinite(temporadaActiva) && temporadaActiva > 0
          ? temporadaActiva
          : temporada;

      const { data, error } = await supabase
        .from("partidos")
        .select(
          `
          *,
          info_local:equipos!partidos_equipo_local_fkey (
            id,
            nombre,
            logo_url
          ),
          info_visitante:equipos!partidos_equipo_visitante_fkey (
            id,
            nombre,
            logo_url
          )
        `,
        )
        .eq("temporada", temporadaConsulta)
        .gte("jornada", 19)
        .lte("jornada", 22)
        .order("jornada", { ascending: true })
        .order("fecha_partido", { ascending: true });

      if (error) {
        console.error("Error cargando calendario playoff de franquicia:", error.message);
        if (!cancelado) setPartidos([]);
        return;
      }

      const equipo = teamId.toUpperCase();
      const delEquipo = (data ?? []).filter(
        (p: PartidoTemporada) =>
          p.equipo_local.toUpperCase() === equipo ||
          p.equipo_visitante.toUpperCase() === equipo,
      );

      if (!cancelado) setPartidos(delEquipo);
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [teamId, temporada]);

  return <FranchisePlayoffCalendar partidos={partidos} />;
}
