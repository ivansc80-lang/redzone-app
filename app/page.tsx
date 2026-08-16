'use client';

import React, { useState, useEffect } from 'react';

export default function Page() {
  // Estados principales de la aplicación
  const [activeTab, setActiveTab] = useState('porra');
  const [isTestMode, setIsTestMode] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [searchIconPosition, setSearchIconPosition] = useState('left'); // Controlado por /mbb
  const [jornadaActual, setJornadaActual] = useState(1);
  const [loading, setLoading] = useState(false);

  // Datos compartidos con la Base de Datos (Simulados / Conectados)
  const [partidos, setPartidos] = useState([
    { id: 1, local: 'Seahawks', visitante: 'Patriots', logoLocal: '🔵', logoVisitante: '🔴', pronostico: '-', resultado: null },
    { id: 2, local: 'Rams', visitante: '49ers', logoLocal: '🟡', logoVisitante: '🔴', pronostico: '-', resultado: null },
    { id: 3, local: 'Lions', visitante: 'Saints', logoLocal: '🦁', logoVisitante: '⚜️', pronostico: '-', resultado: null },
    { id: 4, local: 'Bengals', visitante: 'Buccaneers', logoLocal: '🐅', logoVisitante: '🏴‍☠️', pronostico: '-', resultado: null },
  ]);

  // Sincronización inicial con la Base de Datos
  useEffect(() => {
    fetchDataFromDB();
  }, [jornadaActual, isTestMode]);

  const fetchDataFromDB = async () => {
    setLoading(true);
    try {
      // AQUí CONECTAS TU LLAMADA A LA BASE DE DATOS (Ej: Supabase, API Routes, Prisma)
      // Tanto PRO como TEST consultan la misma tabla/base de datos.
      console.log(`Cargando datos (${isTestMode ? 'TEST' : 'PRO'}) para la jornada ${jornadaActual}...`);
      // Simulación de respuesta de BD:
      // const res = await fetch(`/api/jornadas?jornada=${jornadaActual}&mode=${isTestMode ? 'test' : 'pro'}`);
      // const data = await res.json();
      // setPartidos(data);
    } catch (error) {
      console.error('Error al conectar con la base de datos:', error);
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
      alert('Posición del icono del buscador de grupos movida.');
    } else {
      alert('Comando no reconocido.');
    }
    setCommandInput('');
  };

  // Disparador manual exclusivo del modo TEST conectado a la BD
  const triggerManualEvent = async (accion: string) => {
    if (!isTestMode) return;
    setLoading(true);
    try {
      // Envía la orden a la Base de Datos para forzar el evento en test
      console.log(`[TEST DISPARADOR] Ejecutando: ${accion} en la BD`);
      // await fetch('/api/test/trigger', { method: 'POST', body: JSON.stringify({ accion, jornadaActual }) });
      await fetchDataFromDB();
      alert(`Disparador "${accion}" ejecutado y guardado en la Base de Datos con éxito.`);
    } catch (error) {
      console.error('Error en disparador test:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#4a0e17] text-white flex flex-col items-center pb-12">
      {/* Barra superior de comandos y estado */}
      <header className="w-full max-w-md bg-[#2d070e] p-3 flex flex-col gap-2 shadow-md">
        <form onSubmit={handleCommandSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Introduce comando (/BB, /mbb)..."
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            className="flex-1 bg-black/40 border border-red-900 text-white px-3 py-1 rounded text-sm focus:outline-none"
          />
          <button type="submit" className="bg-red-700 px-3 py-1 rounded text-xs font-bold uppercase">
            Ejecutar
          </button>
        </form>
        <div className="flex justify-between items-center text-xs text-red-300 px-1">
          <span>Modo actual: <strong>{isTestMode ? 'TEST (Manual)' : 'PRO (Automático)'}</strong></span>
          <span>BD: Conectada 🟢</span>
        </div>
      </header>

      {/* Panel exclusivo de Disparadores para la versión TEST */}
      {isTestMode && (
        <div className="w-full max-w-md bg-amber-950/80 border border-amber-600 p-3 my-2 rounded-lg flex flex-col gap-2">
          <span className="text-xs font-bold text-amber-300 uppercase text-center">Panel de Disparadores (Test - BD)</span>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => triggerManualEvent('INICIAR_JORNADA')}
              className="bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs px-3 py-2 rounded shadow"
            >
              ▶ Iniciar Jornada
            </button>
            <button
              onClick={() => triggerManualEvent('CERRAR_PORRA')}
              className="bg-red-800 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 rounded shadow"
            >
              ⏹ Cerrar Porra
            </button>
          </div>
        </div>
      )}

      {/* Navegación Principal de Pestañas */}
      <nav className="w-full max-w-md bg-[#1a0408] flex justify-around py-3 border-b border-red-900">
        {['ranking', 'porra', 'jornada', 'equipos', 'noticias', 'perfil'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center text-xs uppercase font-semibold transition-colors ${
              activeTab === tab ? 'text-white border-b-2 border-red-500 pb-1' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Contenido Dinámico según la Pestaña */}
      <main className="w-full max-w-md p-4 flex flex-col gap-4">
        {loading && <div className="text-center text-xs text-gray-400">Sincronizando con Base de Datos...</div>}

        {/* VISTA PORRA */}
        {activeTab === 'porra' && (
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="bg-white text-black rounded-xl p-3 flex justify-between items-center font-bold">
              <span>Usuario: IVAN</span>
              <span>PORRA - JORNADA {jornadaActual}</span>
              <span className="text-xs text-orange-600 flex items-center gap-1">✏️ Editando</span>
            </div>

            {partidos.map((p) => (
              <div key={p.id} className="bg-[#262626] border border-gray-800 rounded-xl p-3 flex items-center justify-between shadow">
                {/* Logo Local Grande */}
                <div className="w-12 h-12 flex items-center justify-center text-2xl bg-black/30 rounded-lg">
                  {p.logoLocal}
                </div>
                <span className="text-gray-400 font-bold text-sm">VS</span>
                {/* Logo Visitante Grande */}
                <div className="w-12 h-12 flex items-center justify-center text-2xl bg-black/30 rounded-lg">
                  {p.logoVisitante}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VISTA JORNADA (Logos igualados al tamaño grande de Porra) */}
        {activeTab === 'jornada' && (
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="bg-red-900 text-white rounded-xl p-3 text-center font-bold uppercase tracking-wider">
              Jornada {jornadaActual} - Partidos y Resultados
            </div>

            {partidos.map((p) => (
              <div key={p.id} className="bg-[#262626] border border-gray-800 rounded-xl p-3 flex items-center justify-between shadow">
                {/* Logo Local (Tamaño grande w-12 h-12 igualado a Porra) */}
                <div className="w-12 h-12 flex items-center justify-center text-2xl bg-black/30 rounded-lg">
                  {p.logoLocal}
                </div>
                <span className="text-gray-400 font-bold text-sm">VS</span>
                {/* Logo Visitante (Tamaño grande w-12 h-12 igualado a Porra) */}
                <div className="w-12 h-12 flex items-center justify-center text-2xl bg-black/30 rounded-lg">
                  {p.logoVisitante}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Otras pestañas estandarizadas */}
        {activeTab !== 'porra' && activeTab !== 'jornada' && (
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl p-6 text-center text-gray-400 uppercase font-semibold">
            Sección {activeTab} en construcción
          </div>
        )}
      </main>
    </div>
  );
}