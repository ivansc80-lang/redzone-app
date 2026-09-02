"use client";

import FranchiseScheduleBase from "@/components/FranchiseScheduleBase";
import FranchisePlayoffCalendarLoader from "@/components/FranchisePlayoffCalendarLoader";

type Props = {
  teamId: string;
  temporada: number;
};

export default function FranchiseSchedule({ teamId, temporada }: Props) {
  return (
    <>
      {/*
        El bloque original se conserva íntegro en FranchiseScheduleBase.
        Así J1-J18 y PRÓXIMO PARTIDO no sufren ninguna modificación.
      */}
      <FranchiseScheduleBase teamId={teamId} temporada={temporada} />

      {/*
        Extensión independiente de postemporada. Se alinea únicamente con
        la columna CALENDARIO y aparece solo si REDZONE ya tiene partidos
        J19-J22 para esta franquicia.
      */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <FranchisePlayoffCalendarLoader teamId={teamId} temporada={temporada} />
        </div>
        <div aria-hidden="true" />
      </div>
    </>
  );
}
