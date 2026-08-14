'use client';

import React, { useState } from 'react';

export default function Page() {
  // Estado para controlar la pestaña activa (PORRA por defecto)
  const [activeTab, setActiveTab] = useState('porra');

  // Datos de los partidos con logos originales
  const matches = [
    { id: 1, home: 'Seahawks', homeLogo: '/logos/seahawks.png', away: 'Patriots', awayLogo: '/logos/patriots.png' },
    { id: 2, home: 'Rams', homeLogo: '/logos/rams.png', away: '49ers', awayLogo: '/logos/49ers.png' },
    { id: 3, home: 'Lions', homeLogo: '/logos/lions.png', away: 'Saints', awayLogo: '/logos/saints.png' },
    { id: 4, home: 'Bengals', homeLogo: '/logos/bengals.png', away: 'Buccaneers', awayLogo: '/logos/buccaneers.png' },
    { id: 5, home: 'Colts', homeLogo: '/logos/colts.png', away: 'Ravens', awayLogo: '/logos/ravens.png' },
    { id: 6, home: 'Jaguars', homeLogo: '/logos/jaguars.png', away: 'Browns', awayLogo: '/logos/browns.png' },
    { id: 7, home: 'Titans', homeLogo: '/logos/titans.png', away: 'Jets', awayLogo: '/logos/jets.png' },
    { id: 8, home: 'Texans', homeLogo: '/logos/texans.png', away: 'Bills', awayLogo: '/logos/bills.png' },
    { id: 9, home: 'Steelers', homeLogo: '/logos/steelers.png', away: 'Falcons', awayLogo: '/logos/falcons.png' },
    { id: 10, home: 'Panthers', homeLogo: '/logos/panthers.png', away: 'Bears', awayLogo: '/logos/bears.png' },
    { id: 11, home: 'Vikings', homeLogo: '/logos/vikings.png', away: 'Packers', awayLogo: '/logos/packers.png' },
  ];

  return (
    <div className="min-h-screen bg-[#8b0000] text-white flex flex-col items-center font-sans">
      
      {/* 1. HEADER / LOGO APP */}
      <header className="w-full bg-[#8b0000] py-3 flex justify-center items-center">
        <picture className="flex justify-center">
          <source media="(max-width: 768px)" srcSet="/redzone2_logo.png" />
          <img
            src="/redzone1_logo.png"
            alt="NFL REDZONE"
            className="h-10 md:h-12 object-contain"
          />
        </picture>
      </header>

      {/* 2. NAVEGACIÓN PESTAÑAS (Móvil: 2 filas | Desktop: 1 fila) */}
      <nav className="w-full bg-[#5c0000] py-2 px-2 shadow-lg">
        {/* Vista Móvil (< md): 2 filas */}
        <div className="flex flex-col gap-2 md:hidden">
          <div className="flex justify-evenly items-center">
            {['ranking', 'porra', 'jornada'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${
                  activeTab === tab
                    ? 'bg-white text-[#d32f2f] shadow'
                    : 'text-white hover:bg-[#7a0000]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex justify-evenly items-center">
            {['equipos', 'noticias', 'perfil'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${
                  activeTab === tab
                    ? 'bg-white text-[#d32f2f] shadow'
                    : 'text-white hover:bg-[#7a0000]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Vista Escritorio (>= md): 1 fila */}
        <div className="hidden md:flex justify-center items-center gap-2 max-w-5xl mx-auto">
          {['ranking', 'porra', 'jornada', 'equipos', 'noticias', 'perfil'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${
                activeTab === tab
                  ? 'bg-white text-[#d32f2f] shadow'
                  : 'text-white hover:bg-[#7a0000]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* 3. CONTENIDO DINÁMICO SEGÚN PESTAÑA */}
      <main className="w-full max-w-xl px-2 py-6">
        
        {/* PESTAÑA PORRA / JORNADA */}
        {(activeTab === 'porra' || activeTab === 'jornada') && (
          <div className="bg-[#0d0d0d] rounded-2xl overflow-hidden border border-[#222] shadow-2xl p-3">
            
            {/* CABECERA (Blanco con texto rojo sin el nombre) */}
            <div className="bg-white py-3 px-4 rounded-t-xl text-center mb-3">
              <h1 className="text-lg md:text-xl font-black text-[#d32f2f] tracking-wide uppercase">
                PORRA - JORNADA 1
              </h1>
            </div>

            {/* LISTA DE PARTIDOS (LAYOUT Y TAMAÑO ORIGINAL) */}
            <div className="space-y-2">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] rounded-xl p-2 flex items-center justify-between transition-colors"
                >
                  {/* Botón Equipo Local: Logo A LA IZQUIERDA + Nombre */}
                  <button className="flex-1 flex items-center justify-start gap-2 bg-[#121212] hover:bg-[#252525] border border-[#333] px-3 py-2 rounded-lg transition-all">
                    <img
                      src={match.homeLogo}
                      alt={match.home}
                      className="w-5 h-5 object-contain"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <span className="font-bold text-xs text-gray-200">{match.home}</span>
                  </button>

                  {/* Etiqueta VS Central */}
                  <div className="px-2">
                    <span className="text-[10px] font-bold text-gray-400 bg-[#121212] border border-[#333] px-2 py-1 rounded">
                      VS
                    </span>
                  </div>

                  {/* Botón Equipo Visitante: Nombre + Logo A LA DERECHA */}
                  <button className="flex-1 flex items-center justify-end gap-2 bg-[#121212] hover:bg-[#252525] border border-[#333] px-3 py-2 rounded-lg transition-all">
                    <span className="font-bold text-xs text-gray-200">{match.away}</span>
                    <img
                      src={match.awayLogo}
                      alt={match.away}
                      className="w-5 h-5 object-contain"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* BOTÓN CONFIRMAR */}
            <div className="mt-3 pt-2 text-center">
              <button className="w-full bg-white text-[#d32f2f] font-black text-sm py-3 rounded-xl shadow-lg hover:bg-gray-100 transition-colors uppercase tracking-wider">
                CONFIRMAR PRONÓSTICO
              </button>
            </div>

          </div>
        )}

        {/* CONTENIDO RESTO DE PESTAÑAS */}
        {activeTab === 'ranking' && (
          <div className="bg-[#0d0d0d] p-6 rounded-2xl text-center border border-[#222]">
            <h2 className="text-xl font-bold uppercase text-white">RANKING</h2>
            <p className="text-gray-400 mt-2">Clasificación general en desarrollo...</p>
          </div>
        )}

        {activeTab === 'equipos' && (
          <div className="bg-[#0d0d0d] p-6 rounded-2xl text-center border border-[#222]">
            <h2 className="text-xl font-bold uppercase text-white">EQUIPOS</h2>
            <p className="text-gray-400 mt-2">Sección de equipos en desarrollo...</p>
          </div>
        )}

        {activeTab === 'noticias' && (
          <div className="bg-[#0d0d0d] p-6 rounded-2xl text-center border border-[#222]">
            <h2 className="text-xl font-bold uppercase text-white">NOTICIAS</h2>
            <p className="text-gray-400 mt-2">Últimas noticias de la NFL...</p>
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="bg-[#0d0d0d] p-6 rounded-2xl text-center border border-[#222]">
            <h2 className="text-xl font-bold uppercase text-white">PERFIL</h2>
            <p className="text-gray-400 mt-2">Ajustes y datos de usuario...</p>
          </div>
        )}

      </main>
    </div>
  );
}