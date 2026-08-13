'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface PronosticoPartido {
  id: number;
  local: string;
  localLogo: string;
  visitante: string;
  visitanteLogo: string;
  eleccion: '1' | 'X' | '2' | null;
}

interface Usuario {
  id: string;
  nombre: string;
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

interface PartidoJornada {
  id: number;
  local: string;
  localLogo: string;
  visitante: string;
  visitanteLogo: string;
}

const PARTIDOS_JORNADA_1: PartidoJornada[] = [
  { id: 1, local: 'Chiefs', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', visitante: 'Ravens', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png' },
  { id: 2, local: 'Eagles', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', visitante: 'Packers', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png' },
  { id: 3, local: 'Falcons', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png', visitante: 'Steelers', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png' },
  { id: 4, local: 'Bills', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', visitante: 'Cardinals', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png' },
  { id: 5, local: 'Bears', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png', visitante: 'Titans', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png' },
  { id: 6, local: 'Bengals', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png', visitante: 'Patriots', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png' },
  { id: 7, local: 'Colts', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png', visitante: 'Texans', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png' },
  { id: 8, local: 'Dolphins', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png', visitante: 'Jaguars', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png' },
  { id: 9, local: 'Giants', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', visitante: 'Vikings', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png' },
  { id: 10, local: 'Saints', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png', visitante: 'Panthers', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png' },
  { id: 11, local: 'Chargers', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png', visitante: 'Raiders', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png' },
  { id: 12, local: 'Browns', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png', visitante: 'Cowboys', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png' },
  { id: 13, local: 'Seahawks', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png', visitante: 'Broncos', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png' },
  { id: 14, local: 'Lions', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png', visitante: 'Rams', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png' },
  { id: 15, local: '49ers', localLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', visitante: 'Jets', visitanteLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png' },
];

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
  {
    nombre: 'AFC Norte',
    conferencia: 'AFC',
    equipos: [
      { id: '6', nombre: 'Cincinnati Bengals', abrev: 'CIN', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '7', nombre: 'Cleveland Browns', abrev: 'CLE', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '8', nombre: 'Pittsburgh Steelers', abrev: 'PIT', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '5', nombre: 'Baltimore Ravens', abrev: 'BAL', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
    ],
  },
  {
    nombre: 'AFC Sur',
    conferencia: 'AFC',
    equipos: [
      { id: '12', nombre: 'Tennessee Titans', abrev: 'TEN', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '10', nombre: 'Indianapolis Colts', abrev: 'IND', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '11', nombre: 'Jacksonville Jaguars', abrev: 'JAX', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '9', nombre: 'Houston Texans', abrev: 'HOU', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
    ],
  },
  {
    nombre: 'AFC Oeste',
    conferencia: 'AFC',
    equipos: [
      { id: '13', nombre: 'Denver Broncos', abrev: 'DEN', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '14', nombre: 'Kansas City Chiefs', abrev: 'KC', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '15', nombre: 'Las Vegas Raiders', abrev: 'LV', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '16', nombre: 'Los Angeles Chargers', abrev: 'LAC', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
    ],
  },
  {
    nombre: 'NFC Este',
    conferencia: 'NFC',
    equipos: [
      { id: '17', nombre: 'Dallas Cowboys', abrev: 'DAL', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '18', nombre: 'New York Giants', abrev: 'NYG', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '19', nombre: 'Philadelphia Eagles', abrev: 'PHI', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '20', nombre: 'Washington Commanders', abrev: 'WAS', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/was.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
    ],
  },
  {
    nombre: 'NFC Norte',
    conferencia: 'NFC',
    equipos: [
      { id: '21', nombre: 'Chicago Bears', abrev: 'CHI', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '22', nombre: 'Detroit Lions', abrev: 'DET', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '23', nombre: 'Green Bay Packers', abrev: 'GB', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '24', nombre: 'Minnesota Vikings', abrev: 'MIN', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
    ],
  },
  {
    nombre: 'NFC Sur',
    conferencia: 'NFC',
    equipos: [
      { id: '25', nombre: 'Atlanta Falcons', abrev: 'ATL', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '26', nombre: 'Carolina Panthers', abrev: 'CAR', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '27', nombre: 'New Orleans Saints', abrev: 'NO', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '28', nombre: 'Tampa Bay Buccaneers', abrev: 'TB', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
    ],
  },
  {
    nombre: 'NFC Oeste',
    conferencia: 'NFC',
    equipos: [
      { id: '29', nombre: 'Arizona Cardinals', abrev: 'ARI', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '30', nombre: 'Los Angeles Rams', abrev: 'LAR', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '31', nombre: 'San Francisco 49ers', abrev: 'SF', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
      { id: '32', nombre: 'Seattle Seahawks', abrev: 'SEA', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png', victorias: 0, derrotas: 0, empates: 0, pct: '.000' },
    ],
  },
];

export default function Home() {
  const [pestanaActiva, setPestanaActiva] = useState<string>('clasificacion');

  const usuarios: Usuario[] = [
    {
      id: 'cace',
      nombre: 'Cace',
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
  ];

  // Usuario actualmente logueado/activo (por defecto Cace)
  const [usuarioActivoId, setUsuarioActivoId] = useState<string>('cace');

  // Estado de pronósticos individuales por usuario para mantenerlos separados y privados
  const [pronosticosPorUsuario, setPronosticosPorUsuario] = useState<Record<string, { pronosticos: PronosticoPartido[]; confirmado: boolean }>>({
    cace: { pronosticos: PARTIDOS_JORNADA_1.map(p => ({ ...p, eleccion: null })), confirmado: false },
    juanjo: { pronosticos: PARTIDOS_JORNADA_1.map(p => ({ ...p, eleccion: null })), confirmado: false },
    ivan: { pronosticos: PARTIDOS_JORNADA_1.map(p => ({ ...p, eleccion: null })), confirmado: false },
  });

  const [estadoBotonConfirmar, setEstadoBotonConfirmar] = useState<'normal' | 'incompleto' | 'confirmado'>('normal');

  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [cargandoNoticias, setCargandoNoticias] = useState<boolean>(false);

  const [divisiones, setDivisiones] = useState<Division[]>(DIVISIONES_BASE);
  const [sincronizandoPosiciones, setSincronizandoPosiciones] = useState<boolean>(false);

  // Estados para el formulario de Login
  const [usuarioLogueado, setUsuarioLogueado] = useState<any>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  // Comprobar si ya hay una sesión activa al cargar la app
  useEffect(() => {
    const comprobarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUsuarioLogueado(session.user);
        const usuarioEncontrado = usuarios.find(u => u.email.toLowerCase() === session.user.email?.toLowerCase());
        if (usuarioEncontrado) {
          setUsuarioActivoId(usuarioEncontrado.id);
        }
      }
    };

    comprobarSesion();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUsuarioLogueado(session.user);
        const usuarioEncontrado = usuarios.find(u => u.email.toLowerCase() === session.user.email?.toLowerCase());
        if (usuarioEncontrado) {
          setUsuarioActivoId(usuarioEncontrado.id);
        }
      } else {
        setUsuarioLogueado(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Función para iniciar sesión corregida
  const handleLogin = async () => {
    setErrorLogin('');
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: passwordInput,
    });

    if (error) {
      setErrorLogin('Correo o contraseña incorrectos.');
    }
  };

  // Función para cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUsuarioLogueado(null);
  };

  useEffect(() => {
    if (pestanaActiva === 'noticias' && noticias.length === 0) {
      setCargandoNoticias(true);
      fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=50&lang=es&region=es')
        .then((res) => res.json())
        .then((data) => {
          const noticiasMapeadas: Noticia[] = data.articles?.map((art: any, index: number) => {
            const urlOriginal = art.links?.web?.href || '#';
            const urlTraducida = urlOriginal !== '#' 
              ? `https://translate.google.com/translate?sl=auto&tl=es&u=${encodeURIComponent(urlOriginal)}`
              : '#';

            return {
              id: art.id || String(index),
              titulo: art.headline,
              descripcion: art.description || 'Sin descripción disponible.',
              enlace: urlTraducida,
              imagen: art.images?.[0]?.url || '/redzone_logo.png',
              fecha: new Date(art.published).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
            };
          }) || [];
          setNoticias(noticiasMapeadas);
        })
        .catch((err) => console.error('Error cargando noticias:', err))
        .finally(() => setCargandoNoticias(false));
    }
  }, [pestanaActiva, noticias.length]);

  useEffect(() => {
    if (pestanaActiva === 'equipos') {
      setSincronizandoPosiciones(true);
      fetch('https://site.api.espn.com/apis/v2/sports/football/nfl/standings')
        .then((res) => res.json())
        .then((data) => {
          const listaDivisiones: Division[] = [];

          data.children?.forEach((conf: any) => {
            const esAFC = conf.name?.toLowerCase().includes('american') || conf.abbreviation === 'AFC';
            const conferenciaTag: 'AFC' | 'NFC' = esAFC ? 'AFC' : 'NFC';

            conf.children?.forEach((div: any) => {
              const equiposDiv: EquipoPosicion[] = div.standings?.entries?.map((entry: any) => {
                const getStat = (name: string) => {
                  const stat = entry.stats?.find(
                    (s: any) => s.name === name || s.abbreviation === name || s.type === name
                  );
                  return stat ? stat.displayValue : '0';
                };

                return {
                  id: entry.team?.id || String(Math.random()),
                  nombre: entry.team?.displayName || entry.team?.name || 'Equipo',
                  abrev: entry.team?.abbreviation || '',
                  logo: entry.team?.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/nfl/500/${entry.team?.abbreviation?.toLowerCase()}.png`,
                  victorias: getStat('wins'),
                  derrotas: getStat('losses'),
                  empates: getStat('ties'),
                  pct: getStat('winPercent'),
                };
              }) || [];

              if (equiposDiv.length > 0) {
                listaDivisiones.push({
                  nombre: div.name || `${conferenciaTag} - División`,
                  conferencia: conferenciaTag,
                  equipos: equiposDiv,
                });
              }
            });
          });

          if (listaDivisiones.length > 0) {
            setDivisiones(listaDivisiones);
          }
        })
        .catch((err) => console.log('Sincronizando posiciones 2026:', err))
        .finally(() => setSincronizandoPosiciones(false));
    }
  }, [pestanaActiva]);

  // Actualizar el estado del botón de confirmar al cambiar de usuario registrado
  useEffect(() => {
    const actual = pronosticosPorUsuario[usuarioActivoId];
    if (actual?.confirmado) {
      setEstadoBotonConfirmar('confirmado');
    } else {
      setEstadoBotonConfirmar('normal');
    }
  }, [usuarioActivoId, pronosticosPorUsuario]);

  const datosUsuarioActual = pronosticosPorUsuario[usuarioActivoId] || {
    pronosticos: PARTIDOS_JORNADA_1.map(p => ({ ...p, eleccion: null })),
    confirmado: false,
  };

  const handleSeleccionPronostico = (idPartido: number, eleccion: '1' | 'X' | '2') => {
    setPronosticosPorUsuario(prev => {
      const usuarioActualData = prev[usuarioActivoId];
      const nuevosPronosticos = usuarioActualData.pronosticos.map(p => {
        if (p.id === idPartido) {
          const nuevaEleccion = p.eleccion === eleccion ? null : eleccion;
          return { ...p, eleccion: nuevaEleccion };
        }
        return p;
      });

      return {
        ...prev,
        [usuarioActivoId]: {
          ...usuarioActualData,
          pronosticos: nuevosPronosticos,
          confirmado: false,
        },
      };
    });
    setEstadoBotonConfirmar('normal');
  };

  const handleConfirmarPronosticos = () => {
    const hayIncompletos = datosUsuarioActual.pronosticos.some(p => p.eleccion === null);

    if (hayIncompletos) {
      setEstadoBotonConfirmar('incompleto');
      return;
    }

    setPronosticosPorUsuario(prev => ({
      ...prev,
      [usuarioActivoId]: {
        ...prev[usuarioActivoId],
        confirmado: true,
      },
    }));
    setEstadoBotonConfirmar('confirmado');
  };

  const renderTablaDivision = (div: Division, idx: number) => (
    <div
      key={idx}
      className="bg-black/90 border border-red-900/60 rounded-xl overflow-hidden shadow-lg"
    >
      <div className="bg-red-950/80 px-4 py-2.5 border-b border-red-900/60 font-['Orbitron'] text-sm md:text-base font-bold uppercase tracking-wider text-white">
        {div.nombre}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-sans">
          <thead className="bg-zinc-900/80 text-zinc-400 uppercase font-mono text-xs md:text-sm">
            <tr>
              <th className="py-2.5 px-3">Equipo</th>
              <th className="py-2.5 px-2 text-center">G</th>
              <th className="py-2.5 px-2 text-center">P</th>
              <th className="py-2.5 px-2 text-center">E</th>
              <th className="py-2.5 px-3 text-right">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-sm md:text-base">
            {div.equipos.map((eq) => (
              <tr key={eq.id} className="hover:bg-zinc-900/50 transition-colors">
                <td className="py-3 px-3 flex items-center gap-2.5 font-['Orbitron'] font-bold text-white">
                  <img src={eq.logo} alt={eq.nombre} className="w-7 h-7 md:w-8 md:h-8 object-contain" />
                  <span className="truncate">{eq.nombre}</span>
                </td>
                <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400 text-base md:text-lg">
                  {eq.victorias}
                </td>
                <td className="py-3 px-2 text-center font-mono font-bold text-red-400 text-base md:text-lg">
                  {eq.derrotas}
                </td>
                <td className="py-3 px-2 text-center font-mono font-bold text-zinc-300 text-base md:text-lg">
                  {eq.empates}
                </td>
                <td className="py-3 px-3 text-right font-mono font-extrabold text-amber-400 text-base md:text-lg">
                  {eq.pct}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#9e0101] text-white w-full font-sans">
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:ital,wght@0,700;0,900;1,700;1,900&display=swap"
        rel="stylesheet"
      />

      <main className="w-full pb-12">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#9e0101] border-b border-red-900/50 p-3 flex items-center justify-center shadow-md w-full">
          <img
            src="/redzone_logo.png"
            alt="NFL REDZONE"
            className="h-[84px] md:h-24 object-contain"
          />
        </header>

        {/* Menú de Navegación */}
        <nav className="sticky top-[108px] md:top-[120px] z-40 bg-red-950/90 backdrop-blur-md border-b border-red-900/50 grid grid-cols-6 p-2 gap-1 text-[10px] sm:text-xs md:text-sm font-bold text-center w-full font-['Orbitron']">
          {[
            { id: 'clasificacion', label: '1. CLASIFICACIÓN' },
            { id: 'pronosticos', label: '2. PRONÓSTICOS' },
            { id: 'jornada', label: '3. JORNADA' },
            { id: 'equipos', label: '4. EQUIPOS' },
            { id: 'noticias', label: '5. NOTICIAS' },
            { id: 'perfil', label: '6. PERFIL' },
          ].map((tab) => {
            const esActiva = pestanaActiva === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPestanaActiva(tab.id)}
                className={`py-2 px-1 rounded transition-all duration-150 uppercase tracking-tight ${
                  esActiva
                    ? 'bg-white text-[#9e0101] font-black shadow-md scale-105'
                    : 'bg-red-950/60 text-red-100 hover:bg-red-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto">
          {/* 1. CLASIFICACIÓN */}
          {pestanaActiva === 'clasificacion' && (
            <section className="space-y-4">
              <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-red-200 border-b border-red-900/50 pb-2 font-['Orbitron'] italic">
                Tabla General de Posiciones
              </h2>
              <div className="space-y-4">
                {usuarios.map((usr) => (
                  <div
                    key={usr.id}
                    className={`${usr.colorBg} border-2 ${usr.colorBorder} rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl transition-all hover:scale-[1.005]`}
                  >
                    <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-start">
                      <div className="flex items-center gap-4 md:gap-6">
                        <span className="font-black text-white text-2xl md:text-4xl min-w-[35px] font-['Orbitron'] italic">
                          {usr.posicion}
                        </span>
                        <img
                          src={usr.avatar}
                          alt={usr.nombre}
                          className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-2 border-white object-cover shadow-lg"
                        />
                        <div>
                          <p className="text-2xl md:text-4xl font-black text-white tracking-wider font-['Orbitron'] italic uppercase">
                            {usr.nombre}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 w-full md:w-auto border-t md:border-t-0 border-white/20 pt-3 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="text-xs md:text-sm font-bold text-white/80 uppercase tracking-wider font-['Orbitron']">
                          Puntuación
                        </p>
                        <p className="text-2xl md:text-4xl font-black text-white leading-none font-['Orbitron'] italic">
                          {usr.puntos} <span className="text-sm md:text-lg font-bold opacity-80">pts</span>
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-xs md:text-sm font-bold text-white/80 uppercase tracking-wider font-['Orbitron']">
                          Aciertos
                        </p>
                        <p className="text-xl md:text-3xl font-black text-white leading-none font-['Orbitron'] italic">
                          {usr.efectividad}
                        </p>
                      </div>

                      {usr.esLider ? (
                        <span className={`text-sm md:text-base px-4 py-2 rounded-xl font-black shadow-lg font-['Orbitron'] italic ${usr.colorBadge}`}>
                          Líder 🏆
                        </span>
                      ) : (
                        <div className="w-20 hidden md:block"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. PRONÓSTICOS */}
          {pestanaActiva === 'pronosticos' && (
            <section className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-black/90 border border-red-900/80 rounded-2xl p-3 md:p-6 shadow-2xl space-y-3">
                <div className="text-center py-2 border-b border-red-800/60 mb-3">
                  <h2 className="text-xl md:text-2xl font-black font-['Orbitron'] italic tracking-widest text-white uppercase drop-shadow-md">
                    PRONÓSTICOS JORNADA 1
                  </h2>
                </div>

                <div className="space-y-2.5">
                  {datosUsuarioActual.pronosticos.map((p) => {
                    const isLocalSelected = p.eleccion === '1';
                    const isVsSelected = p.eleccion === 'X';
                    const isVisitorSelected = p.eleccion === '2';

                    const getButtonStyle = (isSelected: boolean) => {
                      if (!isSelected) {
                        return 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 border-zinc-800/60';
                      }
                      if (datosUsuarioActual.confirmado) {
                        return 'bg-emerald-400 text-black shadow-lg shadow-emerald-500/30 border-emerald-300 font-black';
                      }
                      return 'bg-white text-black shadow-lg shadow-white/20 border-white font-black';
                    };

                    return (
                      <div
                        key={p.id}
                        className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 bg-black border border-zinc-800/80 p-2 rounded-xl shadow-md"
                      >
                        <button
                          onClick={() => handleSeleccionPronostico(p.id, '1')}
                          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all border ${getButtonStyle(isLocalSelected)}`}
                        >
                          <img src={p.localLogo} alt={p.local} className="w-8 h-8 md:w-9 md:h-9 object-contain flex-shrink-0" />
                          <span className="font-['Orbitron'] font-bold truncate text-xs md:text-sm text-center">
                            {p.local}
                          </span>
                        </button>

                        <button
                          onClick={() => handleSeleccionPronostico(p.id, 'X')}
                          className={`px-4 py-2.5 rounded-lg transition-all border font-['Orbitron'] text-xs md:text-sm font-bold text-center ${getButtonStyle(isVsSelected)}`}
                        >
                          VS
                        </button>

                        <button
                          onClick={() => handleSeleccionPronostico(p.id, '2')}
                          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all border ${getButtonStyle(isVisitorSelected)}`}
                        >
                          <span className="font-['Orbitron'] font-bold truncate text-xs md:text-sm text-center">
                            {p.visitante}
                          </span>
                          <img src={p.visitanteLogo} alt={p.visitante} className="w-8 h-8 md:w-9 md:h-9 object-contain flex-shrink-0" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleConfirmarPronosticos}
                  className={`w-full py-4 rounded-xl shadow-xl transition-all font-['Orbitron'] text-sm md:text-base font-black uppercase tracking-wider italic mt-4 border ${
                    estadoBotonConfirmar === 'confirmado'
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-emerald-500/40'
                      : estadoBotonConfirmar === 'incompleto'
                      ? 'bg-red-600 text-white border-red-500 shadow-red-600/40 animate-pulse'
                      : 'bg-white text-[#9e0101] border-white hover:bg-zinc-100 shadow-white/20'
                  }`}
                >
                  {estadoBotonConfirmar === 'confirmado'
                    ? '✓ Pronósticos Confirmados y Enviados'
                    : estadoBotonConfirmar === 'incompleto'
                    ? '⚠ Pronósticos Incompletos - Faltan partidos por marcar'
                    : 'Confirmar Pronósticos'}
                </button>
              </div>
            </section>
          )}

          {/* 3. JORNADA */}
          {pestanaActiva === 'jornada' && (
            <section className="space-y-6 bg-[#9e0101] p-2 md:p-6 rounded-2xl shadow-2xl border border-red-800/80">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-center">
                {usuarios.map((usr) => (
                  <div key={usr.id} className="relative flex flex-col items-center">
                    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border-2 border-red-900/80 shadow-2xl relative group">
                      <img
                        src={usr.avatarJornada}
                        alt={usr.nombre}
                        className="w-full h-full object-cover filter brightness-95 group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 bg-black/80 px-3 py-1 rounded text-xs font-['Orbitron'] font-bold text-white border border-white/20 uppercase">
                        {usr.nombre}
                      </div>
                    </div>

                    <div className={`w-full ${usr.colorBg} border border-white/20 text-white font-['Orbitron'] text-center py-2.5 font-black text-lg md:text-xl rounded-b-lg shadow-md mt-1 tracking-wider`}>
                      0-0
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center py-2 border-y border-red-800/60 my-4 bg-red-950/40 rounded-lg">
                <h1 className="text-2xl md:text-4xl font-black font-['Orbitron'] italic tracking-widest text-white uppercase drop-shadow-md">
                  JORNADA 1
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {usuarios.map((usr) => {
                  const pronosticosUsr = pronosticosPorUsuario[usr.id]?.pronosticos || [];
                  const confirmadoUsr = pronosticosPorUsuario[usr.id]?.confirmado || false;

                  return (
                    <div key={usr.id} className="flex flex-col space-y-3">
                      <div className="bg-black/90 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-2 md:p-3 space-y-2">
                        {PARTIDOS_JORNADA_1.map((p) => {
                          const pronPart = pronosticosUsr.find(item => item.id === p.id);
                          const eleccion = pronPart?.eleccion;

                          return (
                            <div
                              key={p.id}
                              className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5 bg-zinc-900/60 hover:bg-zinc-800/80 px-2 py-2 rounded transition-colors border border-zinc-800/40"
                            >
                              <div className="flex items-center justify-center gap-2 min-w-0">
                                <img src={p.localLogo} alt={p.local} className="w-8 h-8 md:w-9 md:h-9 object-contain flex-shrink-0" />
                                <span className="font-['Orbitron'] font-bold text-white truncate text-xs md:text-sm text-center">
                                  {p.local}
                                </span>
                              </div>

                              <span className="font-['Orbitron'] font-bold text-zinc-400 text-xs md:text-sm px-1 text-center">
                                vs
                              </span>

                              <div className="flex items-center justify-center gap-2 min-w-0">
                                <span className="font-['Orbitron'] font-bold text-white truncate text-xs md:text-sm text-center">
                                  {p.visitante}
                                </span>
                                <img src={p.visitanteLogo} alt={p.visitante} className="w-8 h-8 md:w-9 md:h-9 object-contain flex-shrink-0" />
                              </div>

                              <div className={`w-7 h-7 flex items-center justify-center border rounded font-['Orbitron'] font-black text-xs md:text-sm ml-1 flex-shrink-0 justify-self-end ${
                                confirmadoUsr && eleccion
                                  ? 'bg-emerald-400 text-black border-emerald-300'
                                  : eleccion
                                  ? 'bg-white text-black border-white'
                                  : 'bg-black text-amber-400 border-zinc-700'
                              }`}>
                                {eleccion === '1' ? p.local.charAt(0) : eleccion === 'X' ? 'X' : eleccion === '2' ? p.visitante.charAt(0) : '-'}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-1">
                        <div className={`${usr.colorBg} border border-white/20 rounded-t-lg py-4 text-center text-white font-['Orbitron'] font-black text-2xl md:text-3xl leading-none shadow`}>
                          0
                        </div>
                        <div className={`${usr.colorBg} border border-white/20 rounded-b-lg py-4 text-center text-white font-['Orbitron'] font-bold text-2xl md:text-3xl leading-none tracking-wider`}>
                          0-0
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. EQUIPOS */}
          {pestanaActiva === 'equipos' && (
            <section className="space-y-8">
              <div className="flex items-center justify-between border-b border-red-900/50 pb-2">
                <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-red-200 font-['Orbitron'] italic">
                  POSICIONES OFICIALES NFL 2026
                </h2>
                {sincronizandoPosiciones && (
                  <span className="text-[10px] text-red-300 font-mono animate-pulse">
                    Actualizando datos desde ESPN...
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b-2 border-red-700 pb-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                  <h3 className="text-base md:text-xl font-black uppercase tracking-wider text-white font-['Orbitron'] italic">
                    Conferencia Americana (AFC)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {divisiones
                    .filter((d) => d.conferencia === 'AFC' || d.nombre.toUpperCase().includes('AFC'))
                    .map((div, idx) => renderTablaDivision(div, idx))}
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3 border-b-2 border-blue-600 pb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <h3 className="text-base md:text-xl font-black uppercase tracking-wider text-white font-['Orbitron'] italic">
                    Conferencia Nacional (NFC)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {divisiones
                    .filter((d) => d.conferencia === 'NFC' || d.nombre.toUpperCase().includes('NFC'))
                    .map((div, idx) => renderTablaDivision(div, idx))}
                </div>
              </div>
            </section>
          )}

          {/* 5. NOTICIAS */}
          {pestanaActiva === 'noticias' && (
            <section className="space-y-4">
              <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-red-200 border-b border-red-900/50 pb-1 font-['Orbitron'] italic">
                Última Hora NFL (Español)
              </h2>

              {cargandoNoticias ? (
                <div className="p-8 text-center text-red-200 font-['Orbitron'] animate-pulse">
                  Cargando noticias en castellano...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {noticias.map((item) => (
                    <article
                      key={item.id}
                      className="bg-black/90 border border-red-900/60 rounded-xl overflow-hidden flex flex-col justify-between hover:border-red-600 transition-all shadow-lg"
                    >
                      <div>
                        {item.imagen && (
                          <div className="h-44 w-full overflow-hidden bg-zinc-900">
                            <img
                              src={item.imagen}
                              alt={item.titulo}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="p-4 space-y-2">
                          <span className="text-[10px] font-mono text-red-400 font-semibold uppercase">
                            {item.fecha}
                          </span>
                          <h3 className="font-['Orbitron'] text-sm font-bold leading-snug text-white">
                            {item.titulo}
                          </h3>
                          <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                            {item.descripcion}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        <a
                          href={item.enlace}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block w-full text-center bg-red-950/80 hover:bg-red-900 text-red-100 text-xs font-['Orbitron'] py-2 rounded border border-red-800 transition-colors uppercase"
                        >
                          Leer Noticia Completa 🇪🇸
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 6. PERFIL */}
          {pestanaActiva === 'perfil' && (
            <section className="space-y-4 max-w-md mx-auto">
              <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-red-200 border-b border-red-900/50 pb-2 font-['Orbitron']">
                Ajustes de Perfil Privado
              </h2>

              {!usuarioLogueado ? (
                <div className="bg-black/90 border border-red-800 rounded-xl p-6 space-y-4 shadow-xl">
                  <h3 className="text-sm font-['Orbitron'] text-white font-bold uppercase text-center">Iniciar Sesión</h3>
                  {errorLogin && (
                    <p className="text-red-400 text-xs text-center font-mono">{errorLogin}</p>
                  )}
                  <input 
                    type="email" 
                    placeholder="Correo electrónico" 
                    value={emailInput} 
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs font-mono"
                  />
                  <input 
                    type="password" 
                    placeholder="Contraseña" 
                    value={passwordInput} 
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs font-mono"
                  />
                  <button 
                    onClick={handleLogin}
                    className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-['Orbitron'] text-xs font-bold rounded-lg uppercase transition-colors"
                  >
                    Entrar
                  </button>
                </div>
              ) : (
                <div className="bg-black/90 border border-red-800 rounded-xl p-6 space-y-4 shadow-xl text-center">
                  <p className="text-xs font-['Orbitron'] text-zinc-300">
                    Sesión activa con: <strong className="text-white">{usuarioLogueado.email}</strong>
                  </p>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-zinc-800 hover:bg-red-900 text-white font-['Orbitron'] text-xs font-bold rounded-lg border border-zinc-700 transition-colors uppercase"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </section>
          )}

        </div>
      </main>
    </div>
  );
}