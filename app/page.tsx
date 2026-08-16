'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getPartidosPorJornada, getResumenTemporada } from '@/lib/queries';

interface PronosticoPartido {
  id: number;
  local: string;
  localLogo: string;
  visitante: string;
  visitanteLogo: string;
  eleccion: '1' | 'X' | '2' | null;
  resultadoReal?: '1' | 'X' | '2';
}

interface Usuario {
  id: string;
  nombre: string;
  nombreEquipo: string;
  logoEquipo: string;
  email: string;
  avatar: string;
  avatarJornada: string;
  colorBg: string;
  colorBorder: string;
  colorBadge: string;
  puntos: number;
  efectividad: string;
  posicion: string;
  esLider: boolean;
}

interface Noticia {
  id: string;
  titulo: string;
  descripcion: string;
  enlace: string;
  imagen: string;
  fecha: string;
}

interface EquipoPosicion {
  id: string;
  nombre: string;
  abrev: string;
  logo: string;
  victorias: string | number;
  derrotas: string | number;
  empates: string | number;
  pct: string;
}

interface Division {
  nombre: string;
  conferencia: 'AFC' | 'NFC';
  equipos: EquipoPosicion[];
}

const DIVISIONES_BASE: Division[] = [
  {
    nombre: 'AFC Este',
    conferencia: 'AFC',
    equipos: [
      { id: '1', nombre: 'Buffalo Bills', abrev: 'BUF', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '2', nombre: 'Miami Dolphins', abrev: 'MIA', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '3', nombre: 'New England Patriots', abrev: 'NE', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '4', nombre: 'New York Jets', abrev: 'NYJ', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
    ],
  },
];

export default function Home() {
  const [pestanaActiva, setPestanaActiva] = useState<string>('pronosticos');
  const [showSearch, setShowSearch] = useState(false);
  const [searchPosition, setSearchPosition] = useState<'top' | 'bottom'>('top');
  
  // MODO TEST: Activador rápido para alternar datos locales de prueba o Supabase
  const [modoTest, setModoTest] = useState<boolean>(false);
  
  const [jornadaActual, setJornadaActual] = useState<number>(1);
  const [partidosJornada, setPartidosJornada] = useState<any[]>([]);
  const [cargandoPartidos, setCargandoPartidos] = useState<boolean>(false);
  const [resumenTemporada, setResumenTemporada] = useState<any[]>([]);

  const [nombrePerfil, setNombrePerfil] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');

  // Atajos de teclado (/BB y /mbb)
  useEffect(() => {
    let buffer = '';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace') return;
      buffer = (buffer + e.key).slice(-4);

      if (buffer.endsWith('/BB')) {
        setShowSearch(prev => !prev);
        buffer = '';
      } else if (buffer.endsWith('/mbb')) {
        setSearchPosition(prev => (prev === 'top' ? 'bottom' : 'top'));
        buffer = '';
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cargar resumen de temporada al iniciar
  useEffect(() => {
    const cargarResumen = async () => {
      const resumen = await getResumenTemporada();
      setResumenTemporada(resumen);
    };
    cargarResumen();
  }, []);

  // Cargar partidos de la jornada desde Supabase o Modo Test
  useEffect(() => {
    const cargarPartidos = async () => {
      setCargandoPartidos(true);
      if (modoTest) {
        // Datos de prueba locales si el Modo Test está activo
        setPartidosJornada([
          { id: 1, local: 'Seahawks', local_logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png', visitante: 'Patriots', visitante_logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png' },
          { id: 2, local: 'Rams', local_logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png', visitante: '49ers', visitante_logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png' }
        ]);
      } else {
        // Llamada a tu función de lib/queries.ts
        const datosPartidos = await getPartidosPorJornada(jornadaActual);
        setPartidosJornada(datosPartidos);
      }
      setCargandoPartidos(false);
    };

    cargarPartidos();
  }, [jornadaActual, modoTest]);

  const [usuarios, setUsuarios] = useState<Usuario[]>([
    {
      id: 'cace',
      nombre: 'Cace',
      nombreEquipo: 'PATRIOTS',
      logoEquipo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png',
      email: 'Cace230514@gmail.com',
      avatar: '/kc.png',
      avatarJornada: '/kc_jornada.png',
      colorBg: 'bg-[#002244]',
      colorBorder: 'border-[#C60C30]',
      colorBadge: 'bg-[#C60C30] text-white',
      puntos: 0,
      efectividad: '0%',
      posicion: '1º',
      esLider: true,
    },
    {
      id: 'juanjo',
      nombre: 'Juanjo',
      nombreEquipo: '49ERS',
      logoEquipo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png',
      email: 'jjgodprimi1978@gmail.com',
      avatar: '/Primi.png',
      avatarJornada: '/primi_jornada.png',
      colorBg: 'bg-[#B3995D]',
      colorBorder: 'border-[#AA0000]',
      colorBadge: 'bg-[#AA0000] text-white',
      puntos: 0,
      efectividad: '0%',
      posicion: '2º',
      esLider: false,
    },
    {
      id: 'ivan',
      nombre: 'Iván',
      nombreEquipo: 'CHIEFS',
      logoEquipo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
      email: 'ivansc80@gmail.com',
      avatar: '/Ivi.png',
      avatarJornada: '/ivi_jornada.png',
      colorBg: 'bg-[#E31837]',
      colorBorder: 'border-[#FFB81C]',
      colorBadge: 'bg-[#FFB81C] text-black',
      puntos: 0,
      efectividad: '0%',
      posicion: '3º',
      esLider: false,
    },
  ]);

  const [usuarioActivoId, setUsuarioActivoId] = useState<string>('cace');
  const [pronosticosPorUsuario, setPronosticosPorUsuario] = useState<Record<number, Record<string, { pronosticos: any[]; confirmado: boolean }>>>({});
  
  const [usuarioLogueado, setUsuarioLogueado] = useState<any>(null);

  const cargarPerfil = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setNombrePerfil(data.nombre || '');
      setNombreEquipo(data.nombre_equipo || '');
      setAvatarUrlInput(data.avatar_url || '');
    }
  };

  useEffect(() => {
    const comprobarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUsuarioLogueado(session.user);
        cargarPerfil(session.user.id);
      }
    };
    comprobarSesion();
  }, []);

  const navItems = [
    { id: 'clasificacion', label: 'RANKING', icon: <img src="/logo.clasificacion.png" alt="Ranking" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'pronosticos', label: 'PORRA', icon: <img src="/logo_porra.png" alt="Porra" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'jornada', label: 'JORNADA', icon: <img src="/logo_jornada.jpg" alt="Jornada" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'equipos', label: 'EQUIPOS', icon: <img src="/logo_equipo.png" alt="Equipos" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'noticias', label: 'NOTICIAS', icon: <img src="/logo_noticias.png" alt="Noticias" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'perfil', label: 'PERFIL', icon: <img src="/logo_perfil.png" alt="Perfil" className="w-[35px] h-[35px] object-contain" /> },
  ];

  return (
    <div className="min-h-screen bg-[#8b0000] text-white w-full font-sans">
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:ital,wght@0,700;0,900;1,700;1,900&display=swap" rel="stylesheet" />
      <main className="w-full pb-12">
        {/* ENCABEZADO Y MODO TEST */}
        <header className="w-full bg-[#8b0000] py-3 px-4 flex justify-between items-center border-b border-red-900/60">
          <div className="w-1/3"></div>
          <picture className="flex justify-center w-1/3">
            <source media="(max-width: 768px)" srcSet="/redzone2_logo.png" />
            <img src="/redzone1_logo.png" alt="NFL REDZONE" className="h-10 md:h-12 object-contain" />
          </picture>
          <div className="w-1/3 flex justify-end">
            <button 
              onClick={() => setModoTest(!modoTest)}
              className={`text-[10px] md:text-xs font-['Orbitron'] font-bold px-3 py-1.5 rounded-full border transition-all ${
                modoTest ? 'bg-amber-400 text-black border-amber-500 shadow-lg animate-pulse' : 'bg-black/40 text-zinc-300 border-zinc-700'
              }`}
            >
              {modoTest ? '⚡ MODO TEST: ACTIVO' : '🛠️ Modo Test: OFF'}
            </button>
          </div>
        </header>

        {showSearch && (
          <div className={`fixed z-50 p-4 transition-all duration-500 ${searchPosition === 'top' ? 'top-20' : 'bottom-4'} right-4 bg-white text-black rounded-full shadow-xl font-bold font-['Orbitron']`}>
              🔍
          </div>
        )}

        {/* MENÚ DE NAVEGACIÓN */}
        <nav className="w-full bg-white border-b py-2 flex justify-center">
          <div className="w-full md:max-w-xl flex justify-around items-center px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setPestanaActiva(item.id)}
                className="flex flex-col items-center gap-1 px-1 py-1 transition-all relative"
              >
                <div className="w-[35px] h-[35px] flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="text-[9px] font-bold text-red-700 tracking-tight leading-none">
                  {item.label}
                </span>
                <div className={`h-1 w-7 rounded-full transition-all duration-300 mt-0.5 ${
                  pestanaActiva === item.id ? 'bg-red-700 opacity-100 scale-100' : 'bg-transparent opacity-0 scale-0'
                }`} />
              </button>
            ))}
          </div>
        </nav>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto">
          {pestanaActiva === 'clasificacion' && (
            <section className="space-y-4">
              <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-red-200 border-b border-red-900/50 pb-2 font-['Orbitron'] italic">
                Tabla General de Posiciones {modoTest && '(Modo Test Habilitado)'}
              </h2>
              <div className="space-y-4">
                {usuarios.map((usr) => (
                  <div key={usr.id} className={`${usr.colorBg} border-2 ${usr.colorBorder} rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl transition-all relative overflow-hidden`}>
                    <img src={usr.logoEquipo} alt={usr.nombreEquipo} className="md:hidden absolute top-2 right-2 w-20 h-20 object-contain opacity-90 drop-shadow-md" />
                    <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-start">
                      <div className="flex items-center gap-3 md:gap-5">
                        <span className="font-black text-white text-2xl md:text-4xl min-w-[35px] font-['Orbitron'] italic">{usr.posicion}</span>
                        <img src={usr.avatar} alt={usr.nombre} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 border-white object-cover shadow-lg flex-shrink-0" />
                      </div>
                      <div>
                        <h3 className="font-black text-xl md:text-3xl text-white font-['Orbitron'] tracking-wide">{usr.nombre}</h3>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs md:text-sm font-bold font-['Orbitron'] mt-1 ${usr.colorBadge}`}>
                          {usr.nombreEquipo}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {pestanaActiva === 'pronosticos' && (
            <section className="space-y-4">
              <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-red-200 border-b border-red-900/50 pb-2 font-['Orbitron'] italic">
                Partidos de la Jornada {jornadaActual} {modoTest && '(Modo Test)'}
              </h2>

              {cargandoPartidos ? (
                <div className="text-center py-12 font-['Orbitron'] text-amber-300">Cargando partidos desde Supabase...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {partidosJornada.length === 0 ? (
                    <p className="text-zinc-300 font-['Orbitron']">No hay partidos registrados para esta jornada.</p>
                  ) : (
                    partidosJornada.map((partido) => (
                      <div key={partido.id || partido.id_partido} className="bg-black/60 border border-zinc-800 p-4 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 w-[40%] justify-end">
                          <span className="text-xs font-bold text-right truncate">{partido.local}</span>
                          {partido.local_logo && <img src={partido.local_logo} alt={partido.local} className="w-8 h-8 object-contain" />}
                        </div>
                        <div className="text-xs font-bold font-['Orbitron'] px-2 py-1 bg-red-900/40 rounded">VS</div>
                        <div className="flex items-center gap-2 w-[40%]">
                          {partido.visitante_logo && <img src={partido.visitante_logo} alt={partido.visitante} className="w-8 h-8 object-contain" />}
                          <span className="text-xs font-bold truncate">{partido.visitante}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}