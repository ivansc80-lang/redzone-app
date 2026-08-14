'use client';

import { useState } from 'react';

// Si usas Lucide React o similar para los iconos, impórtalos aquí.
// Usamos SVG inline como respaldo para asegurar que funcione sin dependencias extra.

type TabType = 'noticias' | 'clasificacion' | 'partidos' | 'equipos' | 'estadisticas' | 'favoritos';

interface NavItem {
  id: TabType;
  label: string;
  icon: JSX.Element;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('noticias');

  const navItems: NavItem[] = [
    {
      id: 'noticias',
      label: 'NOTICIAS',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      id: 'clasificacion',
      label: 'TABLA',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'partidos',
      label: 'PARTIDOS',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'equipos',
      label: 'EQUIPOS',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'estadisticas',
      label: 'STATS',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'favoritos',
      label: 'FAVORITOS',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-gray-100 pb-20">
      {/* MENÚ DE NAVEGACIÓN HORIZONTAL */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex overflow-x-auto no-scrollbar md:justify-center px-2 py-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center min-w-[72px] px-3 py-2 text-red-600 transition-colors focus:outline-none ${
                  isActive ? 'font-bold' : 'font-normal opacity-75 hover:opacity-100'
                }`}
              >
                {/* Icono siempre rojo */}
                <div className="text-red-600 mb-1">{item.icon}</div>

                {/* Texto rojo en mayúsculas */}
                <span className="text-[10px] tracking-wider uppercase whitespace-nowrap">
                  {item.label}
                </span>

                {/* Barra inferior roja para la pestaña activa */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-red-600 rounded-t-md" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* CONTENIDO DE LAS SECCIONES */}
      <section className="p-4 max-w-4xl mx-auto">
        {activeTab === 'noticias' && <div>Sección de Noticias</div>}
        {activeTab === 'clasificacion' && <div>Sección de Clasificación</div>}
        {activeTab === 'partidos' && <div>Sección de Partidos</div>}
        {activeTab === 'equipos' && <div>Sección de Equipos</div>}
        {activeTab === 'estadisticas' && <div>Sección de Estadísticas</div>}
        {activeTab === 'favoritos' && <div>Sección de Favoritos</div>}
      </section>
    </main>
  );
}