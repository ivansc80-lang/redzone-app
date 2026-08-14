'use client';

import React, { useState } from 'react';

export default function PorraPage() {
  const [activeTab, setActiveTab] = useState('porra');

  // Datos de ejemplo para los partidos
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
    <div className="min-h-screen bg-[#8b0000] text-white flex flex-col items-center">
      {/* 1. HEADER CON LOGOS (redzone1_logo en Desktop, redzone2_logo en Móvil) */}
      <header className="w-full bg-[#8b0000] py-4 flex justify-center items-center border-b border-red-900">
        <picture className="flex justify-center">
          <source media="(max-width: 768px)" srcset="/redzone2_logo.png" />
          <img
            src="/redzone1_logo.png"
            alt="NFL REDZONE"
            className="h-10 md:h-12 object-contain"
          />
        </picture>
      </header>

      {/* 2. MENÚ DE PESTAÑAS (En 2 filas para móvil, 1 fila para ordenador) */}
      <nav className="w-full bg-[#660000] py-2 px-4 shadow-md">
        {/* Vista Móvil (< md): 2 filas de 3 elementos */}
        <div className="flex flex-col gap-2 md:hidden">
          <div className="flex justify-around items-center">
            {['ranking', 'porra', 'jornada'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                  activeTab === tab
                    ? 'bg-white text-[#d32f2f] shadow'
                    : 'text-white hover:bg-red-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex justify-around items-center">
            {['equipos', 'noticias', 'perfil'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                  activeTab === tab
                    ? 'bg-white text-[#d32f2f] shadow'
                    : 'text-white hover:bg-red-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Vista Escritorio (>= md): 1 fila con las 6 pestañas */}
        <div className="hidden md:flex justify-center items-center gap-4 max-w-4xl mx-auto">
          {['ranking', 'porra', 'jornada', 'equipos', 'noticias', 'perfil'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 text-sm font-bold uppercase tracking-wider rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-white text-[#d32f2f] shadow'
                  : 'text-white hover:bg-red-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="w-full max-w-2xl px-4 py-6">
        <div className="bg-[#0a0a0a] rounded-2xl overflow-hidden border border-red-950 shadow-2xl">
          
          {/* 3. CABECERA DE LA PORRA (Fondo blanco, texto rojo sin paréntesis) */}
          <div className="bg-white py-4 px-6 text-center border-b border-gray-200">
            <h1 className="text-xl md:text-2xl font-black text-[#d32f2f] tracking-wide uppercase">
              PORRA - JORNADA 1
            </h1>
          </div>

          {/* 4. LISTADO DE PARTIDOS CON EL ASPECTO MÓVIL EN TODAS LAS PANTALLAS */}
          <div className="p-4 space-y-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-[#1e1e1e] hover:bg-[#282828] border border-[#333333] rounded-xl p-3 flex items-center justify-between transition-colors duration-200 shadow-md"
              >
                {/* Equipo Local */}
                <button className="flex-1 flex items-center justify-start gap-3 bg-[#121212] hover:bg-[#222222] border border-gray-800 p-2.5 rounded-lg transition-all">
                  <span className="font-semibold text-sm text-gray-200 truncate">{match.home}</span>
                </button>

                {/* VS */}
                <div className="px-3">
                  <span className="text-xs font-bold text-gray-400 bg-[#121212] border border-gray-800 px-2.5 py-1 rounded-md">
                    VS
                  </span>
                </div>

                {/* Equipo Visitante */}
                <button className="flex-1 flex items-center justify-end gap-3 bg-[#121212] hover:bg-[#222222] border border-gray-800 p-2.5 rounded-lg transition-all">
                  <span className="font-semibold text-sm text-gray-200 truncate">{match.away}</span>
                </button>
              </div>
            ))}
          </div>

          {/* BOTÓN CONFIRMAR */}
          <div className="p-4 bg-[#0a0a0a] border-t border-gray-900 text-center">
            <button className="w-full bg-white text-[#d32f2f] font-black text-lg py-3 rounded-xl shadow-lg hover:bg-gray-100 transition-colors uppercase tracking-wider">
              Confirmar Pronóstico
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}