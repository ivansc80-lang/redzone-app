'use client';

import React, { useState } from 'react';

// ==========================================
// MOCK DE DATOS Y JORNADAS OFICIALES (1 a 18)
// ==========================================
const JORNADAS_OFICIALES: Record<number, Array<{ id: number; local: string; localLogo: string; visitante: string; visitanteLogo: string }>> = {
  1: [
    { id: 101, local: 'Rams', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/50/lar.png', visitante: '49ers', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/50/sf.png' },
    { id: 102, local: 'Lions', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/50/det.png', visitante: 'Saints', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/50/no.png' },
    { id: 103, local: 'Bengals', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/50/cin.png', visitante: 'Buccaneers', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/50/tb.png' },
    { id: 104, local: 'Colts', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/50/ind.png', visitante: 'Ravens', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/50/bal.png' },
    { id: 105, local: 'Jaguars', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/50/jax.png', visitante: 'Browns', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/50/cle.png' },
    { id: 106, local: 'Titans', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/50/ten.png', visitante: 'Jets', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/50/nyj.png' },
  ],
  // Se pueden añadir el resto de jornadas (2 al 18) siguiendo la misma estructura
};

export default function Page() {
  // ==========================================
  // ESTADOS PRINCIPALES DE LA PWA
  // ==========================================
  const [subPestanaEquipos, setSubPestanaEquipos] = useState<'score' | 'games'>('games');
  const [sincronizandoPosiciones] = useState(false);
  const [divisiones] = useState<any[]>([]);

  // ==========================================
  // ESTADOS DEL MODO TEST
  // ==========================================
  const [modoTestActivo] = useState(true);
  const [jornadaTestActual, setJornadaTestActual] = useState(1);
  const [pronosticosUsuario, setPronosticosUsuario] = useState<Record<string, { local: number; visitante: number }>>({});
  const [partidosSimulados, setPartidosSimulados] = useState<Record<number, any[]>>({});
  const [votosRegistrados, setVotosRegistrados] = useState(false);

  // Función auxiliar para enviar el reporte HTML por correo en el 1.º y último partido
  const enviarCorreoResumenTest = (numJornada: number, esPrimerPartido: boolean, htmlContent: string) => {
    console.log(`[MODO TEST] Simulando envío de correo HTML para la Jornada ${numJornada} (${esPrimerPartido ? 'Primer partido' : 'Último partido'})...`);
    // Integración opcional de fetch('/api/send-email', { method: 'POST', body: JSON.stringify({ html: htmlContent }) });
  };

  // Avanzar jornada en el Modo Test
  const avanzarJornadaTest = () => {
    if (jornadaTestActual < 18) {
      setJornadaTestActual(prev => prev + 1);
      setVotosRegistrados(false);
      setPronosticosUsuario({});
    }
  };

  // Simulación de Votación Aleatoria (Juanjo y Cace) + Tus Pronósticos Manuales
  const confirmarYVotarTest = (partidosDeLaJornada: any[]) => {
    const partidosConResultados = partidosDeLaJornada.map((partido, index) => {
      const resLocal = Math.floor(Math.random() * 35);
      const resVisitante = Math.floor(Math.random() * 35);
      
      if (jornadaTestActual === 1 && index === 0) {
        const htmlBody = `<h1>Reporte Jornada ${jornadaTestActual} - Inicio</h1><p>Resultado simulado: ${partido.local} ${resLocal} - ${resVisitante} ${partido.visitante}</p>`;
        enviarCorreoResumenTest(jornadaTestActual, true, htmlBody);
      } else if (jornadaTestActual === 18 && index === partidosDeLaJornada.length - 1) {
        const htmlBody = `<h1>Reporte Jornada ${jornadaTestActual} - Cierre</h1><p>Resultado simulado: ${partido.local} ${resLocal} - ${resVisitante} ${partido.visitante}</p>`;
        enviarCorreoResumenTest(jornadaTestActual, false, htmlBody);
      }

      return {
        ...partido,
        golesLocal: resLocal,
        golesVisitante: resVisitante,
        simulado: true
      };
    });

    setPartidosSimulados(prev => ({
      ...prev,
      [jornadaTestActual]: partidosConResultados
    }));
    setVotosRegistrados(true);
  };

  const renderTablaDivision = (div: any, idx: number) => {
    return <div key={idx} className="text-white text-xs">Tabla División Mock</div>;
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 md:p-8">
      {/* Selector de Subpestañas simulado para Equipos -> Games */}
      <div className="flex gap-4 mb-6 border-b border-neutral-800 pb-3">
        <button 
          onClick={() => setSubPestanaEquipos('score')}
          className={`text-xs font-bold uppercase px-3 py-1.5 rounded font-['Orbitron'] ${subPestanaEquipos === 'score' ? 'bg-red-600 text-white' : 'text-neutral-400 bg-neutral-900'}`}
        >
          Score / Posiciones
        </button>
        <button 
          onClick={() => setSubPestanaEquipos('games')}
          className={`text-xs font-bold uppercase px-3 py-1.5 rounded font-['Orbitron'] ${subPestanaEquipos === 'games' ? 'bg-red-600 text-white' : 'text-neutral-400 bg-neutral-900'}`}
        >
          Games (Partidos & Pronósticos)
        </button>
      </div>

      {subPestanaEquipos === 'score' ? (
        <div className="space-y-8">
          {sincronizandoPosiciones && (
            <div className="flex justify-end">
              <span className="text-[10px] text-red-200 font-mono animate-pulse">Actualizando datos desde ESPN...</span>
            </div>
          )}

          {/* SECCIÓN AFC */}
          <div className="space-y-4">
            <div className="border border-white bg-white p-4 rounded-xl space-y-4 shadow-xl text-black">
              <div className="flex items-center gap-3 border-b-2 border-red-600 pb-2">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                <h3 className="text-base md:text-xl font-black uppercase tracking-wider text-red-600 font-['Orbitron'] italic underline decoration-red-600 underline-offset-4">
                  Conferencia Americana (AFC)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {divisiones.filter((d) => d.conferencia === 'AFC' || d.nombre?.toUpperCase().includes('AFC')).map((div, idx) => renderTablaDivision(div, idx))}
              </div>
            </div>
          </div>

          {/* SECCIÓN NFC */}
          <div className="space-y-4 pt-4">
            <div className="border border-white bg-white p-4 rounded-xl space-y-4 shadow-xl text-black">
              <div className="flex items-center gap-3 border-b-2 border-blue-500 pb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                <h3 className="text-base md:text-xl font-black uppercase tracking-wider text-blue-600 font-['Orbitron'] italic underline decoration-blue-600 underline-offset-4">
                  Conferencia Nacional (NFC)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {divisiones.filter((d) => d.conferencia === 'NFC' || d.nombre?.toUpperCase().includes('NFC')).map((div, idx) => renderTablaDivision(div, idx))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Controles de barra de herramientas para el Modo Test */}
          {modoTestActivo && (
            <div className="bg-neutral-900 border border-neutral-700 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded font-['Orbitron'] uppercase tracking-wider">MODO TEST</span>
                <span className="text-white text-sm font-semibold">Jornada Activa: <strong className="text-red-500 font-mono text-base">{jornadaTestActual}</strong> / 18</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => confirmarYVotarTest(JORNADAS_OFICIALES[jornadaTestActual] || [])}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded transition-all font-['Orbitron'] uppercase shadow-md cursor-pointer"
                >
                  Votación Aleatoria (Juanjo & Cace) + Simular
                </button>
                <button 
                  onClick={avanzarJornadaTest}
                  disabled={jornadaTestActual >= 18}
                  className="bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded transition-all font-['Orbitron'] uppercase shadow-md cursor-pointer"
                >
                  Siguiente Jornada &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Iteramos de la jornada 1 a la 18 de manera consecutiva */}
          {Object.entries(JORNADAS_OFICIALES).map(([numJornadaStr, partidosOriginales]) => {
            const numJornada = Number(numJornadaStr);
            const partidos = partidosSimulados[numJornada] || partidosOriginales;
            
            return (
              <div key={numJornada} className="space-y-4">
                {/* Cabecera de la Jornada */}
                <div className="flex items-center gap-2 border-l-4 border-red-600 pl-3">
                  <h3 className="text-white text-base md:text-lg font-bold tracking-wider uppercase italic font-['Orbitron']">
                    Jornada {numJornada} de 18 {numJornada === jornadaTestActual && modoTestActivo ? '(En Curso / Test)' : ''}
                  </h3>
                </div>

                {/* Rejilla Responsive: 1 columna en móvil, 3 columnas en escritorio */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {partidos.map((partido, pIdx) => (
                    <div 
                      key={partido.id || pIdx} 
                      className="bg-neutral-900/90 border border-neutral-800 rounded-md p-3 flex items-center justify-between shadow-lg"
                    >
                      {/* Lado izquierdo: Equipos y Marcadores / Resultados */}
                      <div className="flex flex-col gap-2.5 w-36">
                        {/* Equipo Local */}
                        <div className="flex items-center gap-2">
                          <img 
                            src={partido.localLogo} 
                            alt={partido.local} 
                            className={`object-contain flex-shrink-0 ${partido.local === 'Jets' ? 'w-6 h-6 scale-125 filter brightness-200' : 'w-5 h-5'}`} 
                          />
                          <span className="text-white text-xs font-semibold truncate font-['Orbitron'] uppercase">{partido.local}</span>
                          <span className="text-white text-xs font-bold ml-auto font-mono">
                            {partido.simulado !== undefined ? partido.golesLocal : '21'}
                          </span>
                        </div>
                        {/* Equipo Visitante */}
                        <div className="flex items-center gap-2">
                          <img 
                            src={partido.visitanteLogo} 
                            alt={partido.visitante} 
                            className={`object-contain flex-shrink-0 ${partido.visitante === 'Jets' ? 'w-6 h-6 scale-125 filter brightness-200' : 'w-5 h-5'}`} 
                          />
                          <span className="text-white text-xs font-semibold truncate font-['Orbitron'] uppercase">{partido.visitante}</span>
                          <span className="text-white text-xs font-bold ml-auto font-mono">
                            {partido.simulado !== undefined ? partido.golesVisitante : '14'}
                          </span>
                        </div>
                      </div>

                      {/* Línea separadora vertical */}
                      <div className="h-14 w-[1px] bg-neutral-800 mx-2"></div>

                      {/* Lado derecho: Racha y Pronósticos de los participantes */}
                      <div className="flex flex-col text-[11px] gap-1 flex-1 pl-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-neutral-500 font-bold tracking-wider text-[9px] font-['Orbitron']">RACHA</span>
                          <span className="text-neutral-400 font-medium text-[10px] font-mono">1 V - 0 D</span>
                        </div>
                        
                        {/* Pronóstico CACE */}
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-300 font-medium font-['Orbitron'] text-[10px]">CACE</span>
                          <span className="bg-emerald-600/90 text-white px-1.5 py-0.5 rounded text-[10px] font-bold w-4 text-center font-mono">1</span>
                        </div>
                        {/* Pronóstico JUANJO */}
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-300 font-medium font-['Orbitron'] text-[10px]">JUANJO</span>
                          <span className="bg-emerald-600/90 text-white px-1.5 py-0.5 rounded text-[10px] font-bold w-4 text-center font-mono">1</span>
                        </div>
                        {/* Pronóstico IVAN */}
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-300 font-medium font-['Orbitron'] text-[10px]">IVAN</span>
                          <span className="bg-rose-600/90 text-white px-1.5 py-0.5 rounded text-[10px] font-bold w-4 text-center font-mono">2</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}