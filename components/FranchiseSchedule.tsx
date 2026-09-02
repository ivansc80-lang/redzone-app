"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FranchiseScheduleBase from "@/components/FranchiseScheduleBase";
import FranchisePlayoffCalendarLoader from "@/components/FranchisePlayoffCalendarLoader";

type Props = {
  teamId: string;
  temporada: number;
};

export default function FranchiseSchedule({ teamId, temporada }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [portalPlayoffs, setPortalPlayoffs] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    const raizBase = base.firstElementChild as HTMLElement | null;
    const gridPrincipal = raizBase?.firstElementChild as HTMLElement | null;
    const columnaCalendario = gridPrincipal?.children?.[0] as HTMLElement | undefined;

    if (!columnaCalendario) return;

    // El grid original usa items-stretch y hacía que la columna CALENDARIO
    // adoptase la altura completa de PRÓXIMO PARTIDO. Eso generaba el gran
    // espacio vacío debajo de J18. La dejamos crecer únicamente por contenido.
    const alignSelfAnterior = columnaCalendario.style.alignSelf;
    const heightAnterior = columnaCalendario.style.height;
    columnaCalendario.style.alignSelf = "start";
    columnaCalendario.style.height = "auto";

    const mount = document.createElement("div");
    mount.dataset.franchisePlayoffs = "true";
    mount.className = "mt-0 overflow-hidden rounded-xl border border-zinc-200";
    columnaCalendario.appendChild(mount);
    setPortalPlayoffs(mount);

    return () => {
      setPortalPlayoffs(null);
      mount.remove();
      columnaCalendario.style.alignSelf = alignSelfAnterior;
      columnaCalendario.style.height = heightAnterior;
    };
  }, [teamId, temporada]);

  return (
    <div ref={baseRef}>
      <FranchiseScheduleBase teamId={teamId} temporada={temporada} />

      {portalPlayoffs &&
        createPortal(
          <FranchisePlayoffCalendarLoader teamId={teamId} temporada={temporada} />,
          portalPlayoffs,
        )}
    </div>
  );
}
