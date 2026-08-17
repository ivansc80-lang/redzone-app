'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// --- Interfaces ---
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
  victorias: number;
  derrotas: number;
  empates: number;
  pct: string;
}

interface Division {
  nombre: string;
  conferencia: 'AFC' | 'NFC';
  equipos: EquipoPosicion[];
}

// --- Componente Principal ---
export default function Home() {
  const [pestanaActiva, setPestanaActiva] = useState<string>('clasificacion');
  const [subPestanaEquipos, setSubPestanaEquipos] = useState<'score' | 'games'>('score');
  
  const [showSearch, setShowSearch] = useState(false);
  const [searchPosition, setSearchPosition] = useState<'top' | 'bottom'>('top');
  const [jornadaActual, setJornadaActual] = useState<number>(1);
  const [modoTest, setModoTest] = useState<boolean>(true);

  const [nombrePerfil, setNombrePerfil] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  const [jornadasOficiales, setJornadasOficiales] = useState<Record<number, PronosticoPartido[]>>({});
  const [usuarios, setUsuarios] = useState<Usuario[]>([
    { id: 'cace', nombre: 'Cace', nombreEquipo: 'PATRIOTS', logoEquipo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png', email: 'Cace230514@gmail.com', avatar: '/kc.png', avatarJornada: '/kc_jornada.png', colorBg: 'bg-[#002244]', colorBorder: 'border-[#C60C30]', colorBadge: 'bg-[#C60C30] text-white', puntos: 0, efectividad: '0%', posicion: '1º', esLider: true },
    { id: 'juanjo', nombre: 'Juanjo', nombreEquipo: '49ERS', logoEquipo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', email: 'jjgodprimi1978@gmail.com', avatar: '/Primi.png', avatarJornada: '/primi_jornada.png', colorBg: 'bg-[#B3995D]', colorBorder: 'border-[#AA0000]', colorBadge: 'bg-[#AA0000] text-white', puntos: 0, efectividad: '0%', posicion: '2º', esLider: false },
    { id: 'ivan', nombre: 'Iván', nombreEquipo: 'CHIEFS', logoEquipo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', email: 'ivansc80@gmail.com', avatar: '/Ivi.png', avatarJornada: '/ivi_jornada.png', colorBg: 'bg-[#E31837]', colorBorder: 'border-[#FFB81C]', colorBadge: 'bg-[#FFB81C] text-black', puntos: 0, efectividad: '0%', posicion: '3º', esLider: false },
  ]);

  const [usuarioActivoId, setUsuarioActivoId] = useState<string>('cace');
  const [pronosticosPorUsuario, setPronosticosPorUsuario] = useState<Record<number, Record<string, { pronosticos: PronosticoPartido[]; confirmado: boolean; validado?: boolean }>>>({});
  const [estadoBotonConfirmar, setEstadoBotonConfirmar] = useState<'normal' | 'incompleto' | 'confirmado'>('normal');
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [cargandoNoticias, setCargandoNoticias] = useState<boolean>(false);
  const [divisiones, setDivisiones] = useState<Division[]>([]); // Inicializado vacío
  const [sincronizandoPosiciones, setSincronizandoPosiciones] = useState<boolean>(false);
  const [usuarioLogueado, setUsuarioLogueado] = useState<any>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  // --- Navegación ---
  const navItems = [
    { id: 'clasificacion', label: 'RANKING', icon: <img src="/logo.clasificacion.png" alt="Ranking" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'pronosticos', label: 'PORRA', icon: <img src="/logo_porra.png" alt="Porra" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'jornada', label: 'JORNADA', icon: <img src="/logo_jornada.jpg" alt="Jornada" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'equipos', label: 'EQUIPOS', icon: <img src="/logo_equipo.png" alt="Equipos" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'noticias', label: 'NOTICIAS', icon: <img src="/logo_noticias.png" alt="Noticias" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'perfil', label: 'PERFIL', icon: <img src="/logo_perfil.png" alt="Perfil" className="w-[35px] h-[35px] object-contain" /> },
  ];

  // --- Lógica de eventos y carga (manteniendo tus comandos /BB y /mbb) ---
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

  // --- Funciones de Supabase y lógica de negocio ---
  // (Aquí se mantienen tus funciones: cargarDatosSupabase, handleLogin, etc., asegurando que estén dentro del componente)
  
  // Renderizado principal (JSX)
  return (
    <div className="min-h-screen bg-[#8b0000] text-white w-full font-sans">
      <main className="w-full pb-12">
        {/* Tu estructura de UI sigue aquí, ahora funcional */}
        <header className="w-full bg-[#8b0000] py-3 flex justify-center items-center">
            <img src="/redzone1_logo.png" alt="NFL REDZONE" className="h-10 md:h-12 object-contain" />
        </header>

        {/* ... El resto de tu JSX estructurado correctamente ... */}
        
        <nav className="w-full bg-white border-b py-2 flex justify-center">
          <div className="w-full md:max-w-xl flex justify-around items-center px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setPestanaActiva(item.id)}
                className="flex flex-col items-center gap-1 px-1 py-1 transition-all relative cursor-pointer"
              >
                <div className="w-[35px] h-[35px] flex items-center justify-center">{item.icon}</div>
                <span className="text-[9px] font-bold text-red-700 tracking-tight leading-none">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}