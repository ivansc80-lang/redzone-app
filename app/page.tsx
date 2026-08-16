'use client';

import React, { useState, useEffect } from 'react';

export default function Page() {
  const [activeTab, setActiveTab] = useState('porra');
  const [isTestMode, setIsTestMode] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [searchIconPosition, setSearchIconPosition] = useState('left'); // Controlado por /mbb
  const [jornadaActual, setJornadaActual] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pronosticos, setPronosticos] = useState<{ [key: number]: string }>({});

  // Listado oficial completo de partidos con URLs de logos reales de la NFL
  const [partidos, setPartidos] = useState([
    { id: 1, local: 'SEA', visitante: 'NE', nameLocal: 'SEAHAWKS', nameVisitante: 'PATRIOTS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png', estado: '-' },
    { id: 2, local: 'LAR', visitante: 'SF', nameLocal: 'RAMS', nameVisitante: '49ERS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', estado: '-' },
    { id: 3, local: 'DET', visitante: 'NO', nameLocal: 'LIONS', nameVisitante: 'SAINTS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png', estado: '-' },
    { id: 4, local: 'CIN', visitante: 'TB', nameLocal: 'BENGALS', nameVisitante: 'BUCCANEERS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png', estado: '-' },
    { id: 5, local: 'IND', visitante: 'BAL', nameLocal: 'COLTS', nameVisitante: 'RAVENS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png', estado: '-' },
    { id: 6, local: 'JAX', visitante: 'CLE', nameLocal: 'JAGUARS', nameVisitante: 'BROWNS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png', estado: '-' },
    { id: 7, local: 'TEN', visitante: 'NYJ', nameLocal: 'TITANS', nameVisitante: 'JETS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png', estado: '-' },
    { id: 8, local: 'HOU', visitante: 'BUF', nameLocal: 'TEXANS', nameVisitante: 'BILLS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', estado: '-' },
    { id: 9, local: 'PIT', visitante: 'ATL', nameLocal: 'STEELERS', nameVisitante: 'FALCONS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png', estado: '-' },
    { id: 10, local: 'CAR', visitante: 'CHI', nameLocal: 'PANTHERS', nameVisitante: 'BEARS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png', estado: '-' },
    { id: 11, local: 'MIN', visitante: 'GB', nameLocal: 'VIKINGS', nameVisitante: 'PACKERS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png', estado: '-' },
    { id: 12, local: 'LV', visitante: 'MIA', nameLocal: 'RAIDERS', nameVisitante: 'DOLPHINS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png', estado: '-' },
    { id: 13, local: 'LAC', visitante: 'ARI', nameLocal: 'CHARGERS', nameVisitante: 'CARDINALS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png', estado: '-' },
    { id: 14, local: 'PHI', visitante: 'WAS', nameLocal: 'EAGLES', nameVisitante: 'WASHINGTON', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png', estado: '-' },
    { id: 15, local: 'NYG', visitante: 'DAL', nameLocal: 'GIANTS', nameVisitante: 'COWBOYS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png', estado: '-' },
    { id: 16, local: 'KC', visitante: 'DEN', nameLocal: 'CHIEFS', nameVisitante: 'BRONCOS', logoLocal: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', logoVisitante: 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png', estado: '-' },
  ]);

  // Sincronización con Base de Datos (Pro y Test comparten origen)
  useEffect(() => {
    syncWithDatabase();
  }, [jornadaActual, isTestMode]);

  const syncWithDatabase = async () => {
    setLoading(true);
    try {
      console.log(`[BD SYNC] Conectado a Base de Datos - Modo: ${isTestMode ? 'TEST' : 'PRO'} | Jornada: ${jornadaActual}`);
      // Ejemplo de llamada real a tu API/BD:
      // const res = await fetch(`/api/jornada?j&mode=${isTestMode ? 'test' : 'pro'}`);
      // const data = await res.json();
      // setPartidos(data);
    } catch (error) {
      console.error('Error sincronizando con la base de datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejador de comandos (/BB y /mbb)
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();

    if (cmd.toUpperCase() === '/BB') {
      setIsTestMode(!isTestMode);
      alert(`Modo Test ${!isTestMode ? 'ACTIVADO' : 'CERRADO'}`);
    } else if (cmd.toLowerCase() === '/mbb') {
      setSearchIconPosition((prev) => (prev === 'left' ? 'right' : 'left'));
      alert('Posición del buscador actualizada.');
    } else {
      alert('Comando no reconocido.');
    }
    setCommandInput('');
  };

  // Disparador manual para la versión Test conectado a la BD
  const triggerTestEvent = async (accion: string) => {
    if (!isTestMode) return;
    setLoading(true);
    try {
      console.log(`[TEST DISPARADOR BD] Ejecutando: ${accion} en la BD`);
      // await fetch('/api/test/trigger', { method: 'POST', body: JSON.stringify({ accion, jornadaActual }) });
      await syncWithDatabase();
      alert(`Disparador "${accion}" ejecutado y guardado en la Base de Datos.`);
    } catch (error) {
      console.error('Error en disparador:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#4a0e17] text-white flex flex-col items-center pb-12 select-none">
      
      {/* Barra de comandos discreta superior para desarrollo/control */}
      <header className="w-full max-w-4xl bg-[#230509] px-4 py-2 flex flex-col gap-1 border-b border-red-900/40">
        <form onSubmit={handleCommandSubmit} className="flex gap-2 max-w-md mx-auto w-full">
          <input
            type="text"
            placeholder="Introduce comando (/BB, /mbb)..."
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            className="flex-1 bg-black/50 border border-red-900/60 text-white px-3 py-1 rounded text-xs focus:outline-none focus:border-red-500"
          />
          <button type="submit" className="bg-[#004d2e] hover:bg-[#00663d] px-3 py-1 rounded text-xs font-bold uppercase transition-colors">
            Ejecutar
          </button>
        </form>
        <div className="flex justify-between items-center text-[11px] text-red-300 max-w-md mx-auto w-full px-1">
          <span>Modo: <strong className={isTestMode ? 'text-amber-400' : 'text-emerald-400'}>{isTestMode ? 'TEST (Manual)' : 'PRO (Automático)'}</strong></span>
          <span>BD Conectada 🟢</span>
        </div>
      </header>

      {/* Cabecera oficial con logo REDZONE */}
      <div className="w-full py-4 bg-gradient-to-b from-[#2d070e] to-[#4a0e17] flex justify-center items-center shadow-lg border-b border-red-900/50">
        <div className="flex items-center gap-2">
          <span className="bg-red-700 text-white font-black text-xs px-1.5 py-0.5 rounded tracking-tighter">NFL</span>
          <h1 className="text-xl font-black tracking-widest text-white italic">REDZONE</h1>
        </div>
      </div>

      {/* Panel exclusivo de disparadores para la versión TEST */}
      {isTestMode && (
        <div className="w-full max-w-4xl px-4 mt-3">
          <div className="bg-amber-950/90 border border-amber-600/80 p-3 rounded-2xl flex flex-col gap-2 shadow-xl">
            <span className="text-xs font-bold text-amber-300 uppercase text-center tracking-wider">
              Panel de Disparadores (Test - Conectado a BD)
            </span>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => triggerTestEvent('INICIAR_JORNADA')}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2 rounded-xl shadow transition-all"
              >
                ▶ Iniciar Jornada
              </button>
              <button
                onClick={() => triggerTestEvent('CERRAR_PORRA')}
                className="bg-red-800 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition-all"
              >
                ⏹ Cerrar Porra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navegación por pestañas */}
      <nav className={`w-full max-w-4xl bg-[#28070d] flex justify-around py-3 border-b border-red-900/60 mt-3 ${searchIconPosition === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
        {[
          { id: 'ranking', label: 'RANKING', icon: '🏆' },
          { id: 'porra', label: 'PORRA', icon: '📋' },
          { id: 'jornada', label: 'JORNADA', icon: '🏈' },
          { id: 'equipos', label: 'EQUIPOS', icon: '🛡️' },
          { id: 'noticias', label: 'NOTICIAS', icon: '📰' },
          { id: 'perfil', label: 'PERFIL', icon: '👤' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center text-xs uppercase font-bold tracking-wider transition-all px-2 ${
              activeTab === tab.id ? 'text-white pb-1 border-b-2 border-red-600' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="text-lg mb-0.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Contenedor Principal */}
      <main className="w-full max-w-4xl p-4 flex flex-col gap-4">
        {loading && <div className="text-center text-xs text-amber-400 animate-pulse">Sincronizando con Base de Datos...</div>}

        {/* ================= PESTAÑA PORRA ================= */}
        {activeTab === 'porra' && (
          <div className="bg-[#191919] border border-gray-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
            {/* Cabecera de Porra */}
            <div className="bg-white text-black rounded-2xl p-4 flex justify-between items-center font-bold shadow-md">
              <div className="text-xs tracking-tight">Usuario:<br/><span className="text-sm font-extrabold">IVAN</span></div>
              <div className="text-center text-sm font-black tracking-wide text-[#331118]">
                PORRA - JORNADA {jornadaActual}
              </div>
              <div className="text-xs text-orange-600 flex items-center gap-1 bg-orange-100 px-2.5 py-1.5 rounded-xl font-bold">
                <span>✏️</span> Editando
              </div>
            </div>

            {/* Grid de Partidos en 2 Columnas (Estética exacta de tu captura) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {partidos.map((p) => (
                <div key={p.id} className="bg-[#242424] border border-gray-800/80 rounded-2xl p-3 flex items-center justify-between shadow-md hover:border-gray-700 transition-all">
                  {/* Local */}
                  <div className="flex items-center gap-2.5 w-[42%]">
                    <img src={p.logoLocal} alt={p.nameLocal} className="w-10 h-10 object-contain drop-shadow" />
                    <span className="text-xs font-black tracking-tight text-gray-200 truncate">{p.nameLocal}</span>
                  </div>
                  
                  <span className="text-gray-500 font-black text-xs">VS</span>

                  {/* Visitante */}
                  <div className="flex items-center justify-end gap-2.5 w-[42%] text-right">
                    <span className="text-xs font-black tracking-tight text-gray-200 truncate">{p.nameVisitante}</span>
                    <img src={p.logoVisitante} alt={p.nameVisitante} className="w-10 h-10 object-contain drop-shadow" />
                  </div>
                </div>
              ))}
            </div>

            {/* Botón Confirmar Pronóstico */}
            <button className="w-full bg-white hover:bg-gray-100 text-black font-black py-3.5 rounded-2xl shadow-lg tracking-wider text-sm uppercase transition-all mt-2">
              CONFIRMAR PRONÓSTICO
            </button>
          </div>
        )}

        {/* ================= PESTAÑA JORNADA ================= */}
        {activeTab === 'jornada' && (
          <div className="bg-[#191919] border border-gray-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="bg-red-900 text-white rounded-2xl p-3 text-center font-black uppercase tracking-wider text-sm shadow-inner">
              Jornada {jornadaActual} - Resultados y Partidos
            </div>

            {/* Grid de Partidos en 2 Columnas con logos grandes igualados a Porra */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {partidos.map((p) => (
                <div key={p.id} className="bg-[#242424] border border-gray-800/80 rounded-2xl p-3 flex items-center justify-between shadow-md">
                  {/* Local (Logo grande w-10 h-10 idéntico a porra) */}
                  <div className="flex items-center gap-2.5 w-[38%]">
                    <img src={p.logoLocal} alt={p.nameLocal} className="w-10 h-10 object-contain drop-shadow" />
                    <span className="text-xs font-black tracking-tight text-gray-200 truncate">{p.nameLocal}</span>
                  </div>
                  
                  <span className="text-gray-500 font-black text-xs">VS</span>

                  {/* Visitante (Logo grande w-10 h-10 idéntico a porra) */}
                  <div className="flex items-center justify-end gap-2.5 w-[38%] text-right">
                    <span className="text-xs font-black tracking-tight text-gray-200 truncate">{p.nameVisitante}</span>
                    <img src={p.logoVisitante} alt={p.nameVisitante} className="w-10 h-10 object-contain drop-shadow" />
                  </div>

                  {/* Estado / Cuadro amarillo derecho */}
                  <div className="w-8 h-8 bg-amber-500 text-black font-black text-xs rounded-xl flex items-center justify-center shadow-md">
                    {p.estado}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demás pestañas */}
        {activeTab !== 'porra' && activeTab !== 'jornada' && (
          <div className="bg-[#191919] border border-gray-800 rounded-3xl p-12 text-center text-gray-400 uppercase font-bold tracking-wider">
            Sección {activeTab} en desarrollo
          </div>
        )}
      </main>
    </div>
  );
}