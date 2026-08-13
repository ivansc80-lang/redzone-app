interface PickBoxProps {
  eleccion: '1' | 'X' | '2';
  resultadoOficial: '1' | 'X' | '2' | null;
  estadoPartido: string;
}

export function PickBox({ eleccion, resultadoOficial, estadoPartido }: PickBoxProps) {
  const isFinal = estadoPartido === 'STATUS_FINAL';
  const isHit = isFinal && eleccion === resultadoOficial;

  let textColor = 'text-[#D4AF37]';
  if (isFinal) {
    textColor = isHit ? 'text-[#00FF66]' : 'text-[#FF4D4D]';
  }

  return (
    <div className="bg-black border border-zinc-800 rounded px-3 py-1.5 flex items-center justify-center font-bold">
      <span className={`text-base ${textColor}`}>
        {eleccion}
      </span>
    </div>
  );
}