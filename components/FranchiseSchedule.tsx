"use client";

import { useLayoutEffect, useRef, useState } from "react";
import FranchiseScheduleBase from "@/components/FranchiseScheduleBase";
import FranchisePlayoffCalendarLoader from "@/components/FranchisePlayoffCalendarLoader";

type Props = {
  teamId: string;
  temporada: number;
};

export default function FranchiseSchedule({ teamId, temporada }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [desplazamientoPlayoffs, setDesplazamientoPlayoffs] = useState(0);

  useLayoutEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    let observer: ResizeObserver | null = null;

    const medir = () => {
      if (!window.matchMedia("(min-width: 1024px)").matches) {
        setDesplazamientoPlayoffs(0);
        return;
      }

      const raizBase = base.firstElementChild as HTMLElement | null;
      const gridPrincipal = raizBase?.firstElementChild as HTMLElement | null;
      const columnaCalendario = gridPrincipal?.children?.[0] as HTMLElement | undefined;
      const columnaProximoPartido = gridPrincipal?.children?.[1] as HTMLElement | undefined;

      if (!columnaCalendario || !columnaProximoPartido) {
        setDesplazamientoPlayoffs(0);
        return;
      }

      const diferencia = Math.max(
        0,
        columnaProximoPartido.getBoundingClientRect().height -
          columnaCalendario.getBoundingClientRect().height,
      );

      setDesplazamientoPlayoffs(Math.round(diferencia));
    };

    medir();

    const raizBase = base.firstElementChild as HTMLElement | null;
    const gridPrincipal = raizBase?.firstElementChild as HTMLElement | null;
    const columnaCalendario = gridPrincipal?.children?.[0] as HTMLElement | undefined;
    const columnaProximoPartido = gridPrincipal?.children?.[1] as HTMLElement | undefined;

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(medir);
      if (columnaCalendario) observer.observe(columnaCalendario);
      if (columnaProximoPartido) observer.observe(columnaProximoPartido);
    }

    window.addEventListener("resize", medir);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [teamId, temporada]);

  return (
    <>
      <div ref={baseRef}>
        <FranchiseScheduleBase teamId={teamId} temporada={temporada} />
      </div>

      {/*
        En escritorio, PRÓXIMO PARTIDO puede ser mucho más alto que el
        calendario regular. Medimos ambas columnas y compensamos únicamente
        esa diferencia para que PLAYOFFS continúe justo debajo de J18, sin
        alterar ni el calendario existente ni la columna derecha.
      */}
      <div
        className="grid gap-8 lg:grid-cols-2"
        style={
          desplazamientoPlayoffs > 0
            ? { marginTop: `-${desplazamientoPlayoffs}px` }
            : undefined
        }
      >
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <FranchisePlayoffCalendarLoader teamId={teamId} temporada={temporada} />
        </div>
        <div aria-hidden="true" />
      </div>
    </>
  );
}
