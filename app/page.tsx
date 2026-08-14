'use client';

import { useState } from 'react';
import Image from 'next/image';

// Mapeo de pestañas con sus rutas de imagen correspondientes y nombres
const tabs = [
  {
    id: 'ranking',
    label: 'RANKING',
    icon: '/assets/logo.clasificacion_3.png',
  },
  {
    id: 'porra',
    label: 'PORRA',
    icon: '/assets/logo_porra_3.png',
  },
  {
    id: 'jornada',
    label: 'JORNADA',
    icon: '/assets/logo_jornada_4.jpg',
  },
  {
    id: 'equipos',
    label: 'EQUIPOS',
    icon: '/assets/logo_equipo_3.png',
  },
  {
    id: 'noticias',
    label: 'NOTICIAS',
    icon: '/assets/logo_noticias_3.png',
  },
  {
    id: 'perfil',
    label: 'PERFIL',
    icon: '/assets/logo_perfil_3.png',
  },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState('jornada');

  return (
    <main className="min-h-screen bg-[#8B0000] text-white flex flex-col justify-between">
      {/* Cabecera Principal */}
      <header className="bg-[#8B0000] p-4 text-center border-b border-red-900/40 shadow-sm">
        <h1 className="text-xl font-bold tracking-wider uppercase">
          Mi PWA de Fútbol Americano
        </h1>
      </header>

      {/* Contenido Dinámico según la pestaña activa */}
      <section className="flex-1 p-4 flex flex-col items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-md text-center border border-white/10">
          <h2 className="text-2xl font-bold mb-2 uppercase tracking-wide">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h2>
          <p className="text-sm text-red-100">
            Contenido de la sección {activeTab}.
          </p>
        </div>
      </section>

      {/* Menú de Navegación Inferior (Barra Blanca con Iconos) */}
      <nav className="sticky bottom-0 w-full bg-white border-t border-gray-200 shadow-lg px-2 py-2">
        <div className="max-w-md mx-auto flex justify-between items-center">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all duration-200 rounded-lg ${
                  isActive ? 'bg-red-50 scale-105' : 'hover:bg-gray-50 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Icono de la Pestaña */}
                <div className="relative w-7 h-7 mb-1 flex items-center justify-center">
                  <Image
                    src={tab.icon}
                    alt={tab.label}
                    width={28}
                    height={28}
                    className="object-contain"
                    priority
                  />
                </div>

                {/* Texto en Mayúsculas con Rojo Base */}
                <span
                  className={`text-[10px] font-extrabold tracking-tight text-[#8B0000] ${
                    isActive ? 'underline decoration-2 underline-offset-2' : ''
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}