'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getPartidosPorJornada, getResumenTemporada, PartidoTemporada } from '@/lib/queries';

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

export default function Home() {
  const [pestanaActiva, setPestanaActiva] = useState<string>('clasificacion');
  const [showSearch, setShowSearch] = useState(false);
  const [searchPosition, setSearchPosition] = useState<'top' | 'bottom'>('top');
  
  // MODO TEST
  const [modoTest, setModoTest] = useState<boolean>(true);
  const [jornadaActual, setJornadaActual] = useState<number>(1);
  const [partidosJornada, setPartidosJornada] = useState<PartidoTemporada[]>([]);
  const [cargandoPartidos, setCargandoPartidos] = useState<boolean>(false);
  const [resumenTemporada, setResumenTemporada] = useState<any[]>([]);

  // Pronósticos locales en memoria para Modo Test / Producción
  const [pronosticos, setPronosticos] = useState<Record<string, '1' | 'X' | '2'>>({});
  const [jornadaConfirmada, setJornadaConfirmada] = useState<boolean>(false);

  // Perfil de usuario logueado
  const [usuarioLogueado, setUsuarioLogueado] = useState<any>(null);
  const [nombrePerfil, setNombrePerfil] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  // Usuarios base de la liga
  const [usuarios] = useState<Usuario[]>([
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
      puntos: 40,
      efectividad: '74%',
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
      puntos: 36,
      efectividad: '68%',
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
      puntos: 29,
      efectividad: '55%',
      posicion: '3º',
      esLider: false,
    },
  ]);

  // Atajos de teclado (/BB y /mbb)
  useEffect(() => {
    let buffer = '';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace') return;
      buffer = (buffer + e.key).slice(-4);

      if (buffer.endsWith('/BB') || buffer.endsWith('/bb')) {
        setShowSearch(prev => !prev);
        buffer = '';
      } else if (buffer.endsWith('/mbb') || buffer.endsWith('/MBB')) {
        setSearchPosition(prev => (prev === 'top' ? 'bottom' : 'top'));
        buffer = '';
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cargar sesión y resumen de temporada
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUsuarioLogueado(session.user);
        cargarPerfil(session.user.id);
      }
      const resumen = await getResumenTemporada();
      setResumenTemporada(resumen);
    };
    init();
  }, []);

  const cargarPerfil = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setNombrePerfil(data.nombre || '');
      setNombreEquipo(data.nombre_equipo || '');
      setAvatarUrlInput(data.avatar_url || '');
    }
  };

  const guardarCambiosPerfil = async () => {
    if (!usuarioLogueado) return;
    setGuardandoPerfil(true);
    await supabase.from('profiles').upsert({
      id: usuarioLogueado.id,
      nombre: nombrePerfil,
      nombre_equipo: nombreEquipo,
      avatar_url: avatarUrlInput,
      updated_at: new Date().toISOString(),
    });
    setGuardandoPerfil(false);
    alert('Perfil guardado con éxito');
  };

  // Cargar partidos al cambiar jornada o modo test
  useEffect(() => {
    const cargarPartidos = async () => {
      setCargandoPartidos(true);
      if (modoTest && jornadaActual === 1) {
        // Datos mock de prueba si estamos en test jornada 1
        setPartidosJornada([
          { id: 't1', jornada: 1, equipo_local: 'SEA', equipo_visitante: 'NE', fecha_partido: new Date().toISOString(), inicio_porra: '', inicio_jornada: '', puntos_local: null, puntos_visitante: null, resultado_oficial: null, espn_event_id: 'e1' },
          { id: 't2', jornada: 1, equipo_local: 'LAR', equipo_visitante: 'SF', fecha_partido: new Date().toISOString(), inicio_porra: '', inicio_jornada: '', puntos_local: null, puntos_visitante: null, resultado_oficial: null, espn_event_id: 'e2' },
        ]);
      } else {
        const datos = await getPartidosPorJornada(jornadaActual);
        setPartidosJornada(datos);
      }
      setCargandoPartidos(false);
    };
    cargarPartidos();
  }, [jornadaActual, modoTest]);

  // Funciones de control de Modo Test
  const avanzarSiguienteJornada = () => {
    if (jornadaActual < 18) {
      setJornadaActual(prev => prev + 1);
      setJornadaConfirmada(false);
      setPronosticos({});
    }
  };

  const votacionAleatoriaTest = () => {
    const eleccionesPosibles: ('1' | 'X' | '2')[] = ['1', '2']; // Sin empates en test
    const nuevasElecciones: Record<string, '1' | 'X' | '2'> = {};
    partidosJornada.forEach(p => {
      const aleatorio = eleccionesPosibles[Math.floor(Math.random() * eleccionesPosibles.length)];
      nuevasElecciones[p.id] = aleatorio;
    });
    setPronosticos(nuevasElecciones);
    setJornadaConfirmada(true);
  };

  const navItems = [
    { id: 'clasificacion', label: 'RANKING', icon: <img src="/logo.clasificacion.png" alt="Ranking" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'pronosticos', label: 'PORRA', icon: <img src="/logo.porra.png" alt="Porra" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'jornada', label: 'JORNADA', icon: <img src="/logo.jornada.png" alt="Jornada" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'equipos', label: 'EQUIPOS', icon: <img src="/logo.equipos.png" alt="Equipos" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'noticias', label: 'NOTICIAS', icon: <img src="/logo.noticias.png" alt="Noticias" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'perfil', label: 'PERFIL', icon: <img src="/logo.perfil.png" alt="Perfil" className="w-[35px] h-[35px] object-contain" /> },
  ];

  return (
    <main className="min-h-screen bg-[#8B0000] text-white flex flex-col font-sans select-none">
      {/* Barra superior de Modo Test / Controles rápidos */}
      <div className="bg-black/40 px-4 py-2 flex justify-between items-center text-xs border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-bold text-yellow-400">NFL REDZONE</span>
          {showSearch && <span className="bg-red-600 px-2 py-0.5 rounded text-[10px]">Menú BB Activo ({searchPosition})</span>}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setModoTest(!modoTest)}
            className={`px-3 py-1 rounded font-bold transition ${modoTest ? 'bg-yellow-500 text-black' : 'bg-white/20 text-white'}`}
          >
            Modo Test: {modoTest ? 'ON' : 'OFF'}
          </button>
          {modoTest && (
            <>
              <button onClick={avanzarSiguienteJornada} className="bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded">
                Siguiente Jornada (J.{jornadaActual})
              </button>
              <button onClick={votacionAleatoriaTest} className="bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded">
                Votación Aleatoria
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cabecera / Navegación */}
      <header className="bg-white shadow-md py-3 px-6 flex flex-col items-center">
        <div className="mb-3">
          <h1 className="text-xl font-black tracking-widest text-[#8B0000]">REDZONE</h1>
        </div>
        <nav className="flex gap-8 md:gap-12">
          {navItems.map((item) => {
            const isActive = pestanaActiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPestanaActiva(item.id)}
                className={`flex flex-col items-center group transition pb-1 relative ${isActive ? 'text-[#8B0000]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {item.icon}
                <span className="text-[10px] font-bold mt-1 tracking-wider">{item.label}</span>
                {isActive && <div className="absolute bottom-0 w-full h-[3px] bg-[#8B0000] rounded-full"></div>}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Contenido Principal según Pestaña */}
      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        
        {/* PESTAÑA: RANKING */}
        {pestanaActiva === 'clasificacion' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-wider mb-4 uppercase">TABLA GENERAL DE POSICIONES</h2>
            {usuarios.map((usr) => (
              <div key={usr.id} className={`${usr.colorBg} border-2 ${usr.colorBorder} rounded-xl p-4 flex items-center justify-between shadow-lg`}>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-black w-8">{usr.posicion}</span>
                  <img src={usr.avatar} alt={usr.nombre} className="w-14 h-14 rounded-full object-cover border-2 border-white/20" />
                  <div>
                    <h3 className="text-xl font-bold">{usr.nombre}</h3>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-black uppercase ${usr.colorBadge}`}>
                      {usr.nombreEquipo}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black">{usr.puntos}</span>
                  <span className="text-xs block opacity-80">Puntos ({usr.efectividad})</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PESTAÑA: PORRA */}
        {pestanaActiva === 'pronosticos' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold tracking-wider uppercase">PARTIDOS DE LA JORNADA {jornadaActual}</h2>
              {jornadaConfirmada && <span className="bg-emerald-600 text-xs px-3 py-1 rounded-full font-bold">Pronósticos Confirmados / Congelados</span>}
            </div>

            {cargandoPartidos ? (
              <div className="text-center py-10">Cargando partidos...</div>
            ) : partidosJornada.length === 0 ? (
              <div className="text-center py-10 bg-black/20 rounded-xl">No hay partidos programados para esta jornada.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partidosJornada.map((partido) => (
                  <div key={partido.id} className="bg-black/30 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 w-1/3">
                      <span className="font-bold text-sm">{partido.equipo_local}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={jornadaConfirmada}
                        onClick={() => setPronosticos({ ...pronosticos, [partido.id]: '1' })}
                        className={`px-4 py-2 rounded font-bold transition ${pronosticos[partido.id] === '1' ? 'bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                      >
                        1
                      </button>
                      <button
                        disabled={jornadaConfirmada}
                        onClick={() => setPronosticos({ ...pronosticos, [partido.id]: '2' })}
                        className={`px-4 py-2 rounded font-bold transition ${pronosticos[partido.id] === '2' ? 'bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                      >
                        2
                      </button>
                    </div>
                    <div className="flex items-center gap-3 w-1/3 justify-end">
                      <span className="font-bold text-sm">{partido.equipo_visitante}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!jornadaConfirmada && partidosJornada.length > 0 && (
              <div className="text-center mt-6">
                <button
                  onClick={() => setJornadaConfirmada(true)}
                  className="bg-white text-[#8B0000] font-black px-6 py-3 rounded-xl shadow-lg hover:bg-gray-100 transition"
                >
                  Confirmar Pronóstico de la Jornada
                </button>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: JORNADA / RESULTADOS */}
        {pestanaActiva === 'jornada' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-wider mb-4 uppercase">RESULTADOS Y VALIDACIÓN - JORNADA {jornadaActual}</h2>
            <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
              <p className="text-gray-300">Los resultados oficiales se actualizarán una vez finalizada o validada la jornada actual.</p>
            </div>
          </div>
        )}

        {/* PESTAÑA: EQUIPOS */}
        {pestanaActiva === 'equipos' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-wider mb-4 uppercase">CLASIFICACIÓN DE FRANQUICIAS Y EQUIPOS</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {usuarios.map(u => (
                <div key={u.id} className="bg-black/30 border border-white/10 rounded-xl p-4 flex flex-col items-center text-center">
                  <img src={u.logoEquipo} alt={u.nombreEquipo} className="w-16 h-16 object-contain mb-3" />
                  <h3 className="font-bold text-lg">{u.nombreEquipo}</h3>
                  <span className="text-xs text-gray-300">Manager: {u.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑA: NOTICIAS */}
        {pestanaActiva === 'noticias' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-wider mb-4 uppercase">ACTUALIDAD NFL</h2>
            <div className="bg-black/30 border border-white/10 rounded-xl p-6">
              <h3 className="font-bold text-xl mb-2">Arranca la Temporada Regular 2026</h3>
              <p className="text-sm text-gray-200">Todo listo en los emparrillados para vivir una temporada apasionante llena de emoción y sorpresas en cada jornada.</p>
            </div>
          </div>
        )}

        {/* PESTAÑA: PERFIL */}
        {pestanaActiva === 'perfil' && (
          <div className="space-y-4 max-w-md mx-auto bg-black/30 border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-bold tracking-wider mb-4 uppercase text-center">CONFIGURAR PERFIL</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={nombrePerfil} 
                  onChange={e => setNombrePerfil(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Nombre de Equipo</label>
                <input 
                  type="text" 
                  value={nombreEquipo} 
                  onChange={e => setNombreEquipo(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">URL Avatar</label>
                <input 
                  type="text" 
                  value={avatarUrlInput} 
                  onChange={e => setAvatarUrlInput(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded p-2 text-white"
                />
              </div>
              <button 
                onClick={guardarCambiosPerfil}
                disabled={guardandoPerfil}
                className="w-full bg-white text-[#8B0000] font-black py-2.5 rounded mt-4 hover:bg-gray-100 transition"
              >
                {guardandoPerfil ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}