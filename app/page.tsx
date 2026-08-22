'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getPartidosPorJornada } from '@/lib/queries';

interface PronosticoPartido {
  id: string;
  local: string;
  localLogo: string;
  visitante: string;
  visitanteLogo: string;
  eleccion: '1' | 'X' | '2' | null;
  resultadoReal?: '1' | 'X' | '2';
  acierto?: boolean | null;
  estado?: string;
  puntos_local?: number | null;
  puntos_visitante?: number | null;
  periodo?: number | null;
  reloj?: string | null;
  fecha_partido?: string | null;
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
  esColider?: boolean;
}

type CategoriaNoticia =
  | 'LESIONES'
  | 'SANCIONES'
  | 'FICHAJES'
  | 'RUMORES'
  | 'PARTIDOS'
  | 'OTROS';

interface Noticia {
  id: string;
  titulo: string;
  descripcion: string;
  enlace: string;
  imagen: string;
  fecha: string;
  categoria: CategoriaNoticia;
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

const NOMBRES_FAN: Record<string, string> = {
  ARI: 'Cardinals',
  ATL: 'Falcons',
  BAL: 'Ravens',
  BUF: 'Bills',
  CAR: 'Panthers',
  CHI: 'Bears',
  CIN: 'Bengals',
  CLE: 'Browns',
  DAL: 'Cowboys',
  DEN: 'Broncos',
  DET: 'Lions',
  GB: 'Packers',
  HOU: 'Texans',
  IND: 'Colts',
  JAX: 'Jaguars',
  KC: 'Chiefs',
  LV: 'Raiders',
  LAC: 'Chargers',
  LAR: 'Rams',
  MIA: 'Dolphins',
  MIN: 'Vikings',
  NE: 'Patriots',
  NO: 'Saints',
  NYG: 'Giants',
  NYJ: 'Jets',
  PHI: 'Eagles',
  PIT: 'Steelers',
  SF: '49ers',
  SEA: 'Seahawks',
  TB: 'Buccaneers',
  TEN: 'Titans',
  WSH: 'Commanders',
  WAS: 'Commanders',
};

const nombreFanEquipo = (codigo: string) =>
  NOMBRES_FAN[codigo?.toUpperCase()] || codigo;

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

const contieneTexto = (texto: string, palabras: string[]) =>
  palabras.some((palabra) => texto.includes(palabra));

const clasificarNoticia = (
  tituloOriginal: string,
  descripcionOriginal: string
): CategoriaNoticia => {
  const titulo = (tituloOriginal || '').toLowerCase();
  const descripcion = (descripcionOriginal || '').toLowerCase();

  const sancionesTitulo = [
    'sanción', 'sancionado', 'suspendido', 'suspensión',
    'multado', 'multa', 'castigo'
  ];

  const sancionesDescripcion = [
    'fue sancionado', 'ha sido sancionado',
    'fue suspendido', 'ha sido suspendido',
    'fue multado', 'ha sido multado'
  ];

  const lesionesTitulo = [
    'lesión', 'lesionado', 'lesionó',
    'esguince', 'fractura', 'conmoción',
    'lca', 'acl', 'lcm', 'mcl',
    'ligamento', 'cirugía',
    'baja', 'se pierde', 'pierden',
    'no estará listo', 'no es seguro que esté listo',
    'salió en carrito', 'indefinidamente',
    'espera estar listo', 'regreso',
    'volverá', 'volveria', 'volvería'
  ];

  const lesionesDescripcion = [
    'sufrió una lesión', 'sufrio una lesión',
    'se lesionó', 'se lesiono',
    'estará de baja', 'estara de baja',
    'ligamento', 'esguince', 'fractura',
    'conmoción', 'lca', 'acl', 'lcm', 'mcl',
    'cirugía', 'operado', 'salió en carrito'
  ];

  const fichajesTitulo = [
    'ficha ', 'ficha a ', 'fichará', 'ficharán',
    'firma ', 'firma por ', 'firmará', 'firmarán',
    'acuerda ', 'acuerdan ', 'acordó con',
    'adquiere ', 'adquieren ',
    'traspasa ', 'traspasan ',
    'intercambia ', 'intercambian ',
    'agente libre'
  ];

  const rumoresTitulo = [
    'podría fichar', 'podria fichar',
    'podría firmar', 'podria firmar',
    'posible fichaje', 'posible traspaso',
    'interés en', 'interes en',
    'interesado en fichar',
    'se especula', 'rumor', 'rumores',
    'evalúan fichar', 'evaluan fichar',
    'consideran fichar',
    'posible destino'
  ];

  const partidosTitulo = [
    'partido', 'partidos',
    'juego ', 'juegos ',
    'calendario', 'horario',
    'pretemporada',
    'semana 1', 'semana 2', 'semana 3', 'semana 4',
    'vs.', ' vs '
  ];

  if (contieneTexto(titulo, sancionesTitulo)) return 'SANCIONES';
  if (contieneTexto(titulo, lesionesTitulo)) return 'LESIONES';
  if (contieneTexto(titulo, fichajesTitulo)) return 'FICHAJES';
  if (contieneTexto(titulo, rumoresTitulo)) return 'RUMORES';
  if (contieneTexto(titulo, partidosTitulo)) return 'PARTIDOS';

  if (contieneTexto(descripcion, sancionesDescripcion)) return 'SANCIONES';
  if (contieneTexto(descripcion, lesionesDescripcion)) return 'LESIONES';

  return 'OTROS';
};

const IconoCategoriaNoticia = ({
  categoria,
  className = "w-7 h-7 md:w-8 md:h-8"
}: {
  categoria: 'TODAS' | CategoriaNoticia;
  className?: string;
}) => {
  const base = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (categoria) {
    case 'TODAS':
      return (
        <svg {...base}>
          <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" stroke="none" />
          <rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" stroke="none" />
          <rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" stroke="none" />
          <rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'LESIONES':
      return (
        <svg {...base}>
          <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="currentColor" stroke="none" />
          <path d="M4.8 12h3l1.2-2.3 2.1 5 1.7-3.2 1.2.5h5.2" stroke="#002244" strokeWidth="1.4" />
        </svg>
      );

    case 'SANCIONES':
      return (
        <svg {...base}>
          <path d="M14 4l6 6" />
          <path d="M12.5 5.5l3-3 6 6-3 3z" fill="currentColor" stroke="none" />
          <path d="M4 14l7-7 6 6-7 7z" fill="currentColor" stroke="none" />
          <path d="M3 21h10" />
        </svg>
      );

    case 'FICHAJES':
      return (
        <svg {...base}>
          <path d="M8.5 12.5l2 2a2 2 0 0 0 3 0l2.8-2.8" />
          <path d="M7.8 13.2l-2.6-2.6a2 2 0 0 0-2.8 0L1 12l5 5 1.8-1.8" />
          <path d="M16.2 13.2l2.6-2.6a2 2 0 0 1 2.8 0L23 12l-5 5-1.8-1.8" />
          <path d="M9 10l2-2a2.8 2.8 0 0 1 4 0l3 3" />
        </svg>
      );

    case 'RUMORES':
      return (
        <svg {...base}>
          <path d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.4-4.2A8 8 0 1 1 21 12z" fill="currentColor" stroke="none" />
          <circle cx="8" cy="12" r="1" fill="#002244" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="#002244" stroke="none" />
          <circle cx="16" cy="12" r="1" fill="#002244" stroke="none" />
        </svg>
      );

    case 'PARTIDOS':
      return (
        <svg {...base}>
          <path
            d="M5 19c-3-3-2-8 2-12s9-5 12-2 2 8-2 12-9 5-12 2z"
            fill="currentColor"
            stroke="none"
          />
          <path d="M8 16L16 8" stroke="#002244" strokeWidth="1.5" />
          <path d="M10 11l3 3M12 9l3 3M8 13l3 3" stroke="#002244" strokeWidth="1.2" />
        </svg>
      );

    case 'OTROS':
      return (
        <svg {...base}>
          <circle cx="5" cy="12" r="2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
  }
};

export default function Home() {
  const [pestanaActiva, setPestanaActiva] = useState<string>('clasificacion');
  const [subPestanaEquipos, setSubPestanaEquipos] = useState<'score' | 'games' | 'stats' | 'franquicia'>('score');
  const [tipoStats, setTipoStats] = useState<'jugador' | 'equipo'>('jugador');
  const [subcategoriaStatsJugador, setSubcategoriaStatsJugador] = useState<'pasando' | 'corriendo' | 'recibiendo' | 'devoluciones' | 'pateando' | 'despejes'>('pasando');
  const [categoriaStatsEquipo, setCategoriaStatsEquipo] = useState<'ofensiva' | 'defensiva' | 'especiales' | 'entregas'>('ofensiva');
  const [categoriaStatsJugador, setCategoriaStatsJugador] = useState<'ofensiva' | 'defensiva' | 'anotando' | 'especiales'>('ofensiva');
  const [vistaStatsCompleta, setVistaStatsCompleta] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchPosition, setSearchPosition] = useState<'top' | 'bottom'>('top');
  const [jornadaActual, setJornadaActual] = useState<number>(1);
  const [modoTest, setModoTest] = useState<boolean>(true);

  const [nombrePerfil, setNombrePerfil] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [campoPerfilEditando, setCampoPerfilEditando] = useState<'nombre' | 'equipo' | 'avatar' | null>(null);

  const [jornadasOficiales, setJornadasOficiales] = useState<Record<number, PronosticoPartido[]>>({});

  useEffect(() => {
    let buffer = '';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return;
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

  const [usuarios, setUsuarios] = useState<Usuario[]>([
    { id: 'cace', nombre: 'Cace', nombreEquipo: 'PATRIOTS', logoEquipo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png', email: 'Cace230514@gmail.com', avatar: '/kc.png', avatarJornada: '/kc_jornada.png', colorBg: 'bg-[#002244]', colorBorder: 'border-[#C60C30]', colorBadge: 'bg-[#C60C30] text-white', puntos: 0, efectividad: '0%', posicion: '1º', esLider: true },
    { id: 'juanjo', nombre: 'Juanjo', nombreEquipo: '49ERS', logoEquipo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', email: 'jjgodprimi1978@gmail.com', avatar: '/Primi.png', avatarJornada: '/primi_jornada.png', colorBg: 'bg-[#B3995D]', colorBorder: 'border-[#AA0000]', colorBadge: 'bg-[#AA0000] text-white', puntos: 0, efectividad: '0%', posicion: '2º', esLider: false },
    { id: 'ivan', nombre: 'Iván', nombreEquipo: 'CHIEFS', logoEquipo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', email: 'ivansc80@gmail.com', avatar: '/Ivi.png', avatarJornada: '/ivi_jornada.png', colorBg: 'bg-[#E31837]', colorBorder: 'border-[#FFB81C]', colorBadge: 'bg-[#FFB81C] text-black', puntos: 0, efectividad: '0%', posicion: '3º', esLider: false },
  ]);

  const [usuarioActivoId, setUsuarioActivoId] = useState<string>('cace');
  const [pronosticosPorUsuario, setPronosticosPorUsuario] = useState<Record<number, Record<string, { pronosticos: PronosticoPartido[]; confirmado: boolean; validado?: boolean }>>>({});
  const [estadoBotonConfirmar, setEstadoBotonConfirmar] = useState<'normal' | 'incompleto' | 'confirmado'>('normal');
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [filtroNoticias, setFiltroNoticias] = useState<'TODAS' | CategoriaNoticia>('TODAS');
  const [cargandoNoticias, setCargandoNoticias] = useState<boolean>(false);
  const [divisiones, setDivisiones] = useState<Division[]>(DIVISIONES_BASE);
  const [sincronizandoPosiciones, setSincronizandoPosiciones] = useState<boolean>(false);
  const [usuarioLogueado, setUsuarioLogueado] = useState<any>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  const [estadoDesempate, setEstadoDesempate] = useState<any>(null);
  const [tiradasDesempate, setTiradasDesempate] = useState<any[]>([]);
  const [girandoRuleta, setGirandoRuleta] = useState(false);
  const [numeroRuletaVisual, setNumeroRuletaVisual] = useState<number>(0);
  const [errorDesempate, setErrorDesempate] = useState('');
  const [cargandoDesempate, setCargandoDesempate] = useState(false);

  const [partidoSuperbowl, setPartidoSuperbowl] = useState<any>(null);
  const [eleccionesSuperbowl, setEleccionesSuperbowl] = useState<any[]>([]);
  const [guardandoEleccionSuperbowl, setGuardandoEleccionSuperbowl] = useState(false);

  useEffect(() => {
    const cargarDesempate = async () => {
      if (!usuarioLogueado?.id) return;

      setCargandoDesempate(true);

      try {
        const { data: estado, error: estadoError } = await supabase
          .from('desempate_superbowl_estado')
          .select('*')
          .eq('temporada', 2026)
          .maybeSingle();

        if (estadoError) {
          throw estadoError;
        }

        setEstadoDesempate(estado || null);

        const { data: partidoSb, error: partidoSbError } = await supabase
          .from('partidos')
          .select(`
            id,
            equipo_local,
            equipo_visitante,
            fecha_partido,
            info_local:equipos!partidos_equipo_local_fkey (
              nombre,
              logo_url
            ),
            info_visitante:equipos!partidos_equipo_visitante_fkey (
              nombre,
              logo_url
            )
          `)
          .eq('tipo_competicion', 'superbowl')
          .order('fecha_partido', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (partidoSbError) {
          throw partidoSbError;
        }

        setPartidoSuperbowl(partidoSb || null);

        const { data: eleccionesSb, error: eleccionesSbError } = await supabase
          .from('elecciones_superbowl')
          .select('*')
          .eq('temporada', 2026)
          .order('created_at', { ascending: true });

        if (eleccionesSbError) {
          throw eleccionesSbError;
        }

        setEleccionesSuperbowl(eleccionesSb || []);

        if (!estado || estado.estado === 'inactivo') {
          setTiradasDesempate([]);
          return;
        }

        const fase =
          estado.estado === 'clasificatoria'
            ? 'clasificatoria'
            : 'eleccion_final';

        const ronda = Number(estado.ronda_actual || 1);

        const { data: tiradas, error: tiradasError } = await supabase
          .from('desempates_superbowl')
          .select('user_id, valor, fase, ronda, created_at')
          .eq('temporada', 2026)
          .eq('fase', fase)
          .eq('ronda', ronda)
          .order('created_at', { ascending: true });

        if (tiradasError) {
          throw tiradasError;
        }

        setTiradasDesempate(tiradas || []);
        setErrorDesempate('');
      } catch (error: any) {
        console.error('Error al cargar desempate:', error);
        setErrorDesempate(
          error?.message || 'No se pudo cargar el desempate.'
        );
      } finally {
        setCargandoDesempate(false);
      }
    };

    cargarDesempate();
  }, [usuarioLogueado?.id]);

  useEffect(() => {
    const cargarDatosSupabase = async () => {
      const todasLasJornadas = await Promise.all(
        Array.from({ length: 18 }, (_, i) => getPartidosPorJornada(i + 1))
      );
      const partidosData = todasLasJornadas.flat();
      const agrupadas: Record<number, PronosticoPartido[]> = {};
      for (let j = 1; j <= 18; j++) agrupadas[j] = [];

      partidosData.forEach((row: any) => {
        const numJornada = row.jornada || 1;
        if (!agrupadas[numJornada]) agrupadas[numJornada] = [];
        agrupadas[numJornada].push({
          id: row.id,
          local: row.equipo_local,
          localLogo: row.info_local?.logo_url || '',
          visitante: row.equipo_visitante,
          visitanteLogo: row.info_visitante?.logo_url || '',
          eleccion: null,
          resultadoReal: row.resultado_oficial || undefined,
          acierto: null,
          estado: row.estado ?? '',
          puntos_local: row.puntos_local ?? null,
          puntos_visitante: row.puntos_visitante ?? null,
          periodo: row.periodo ?? null,
          reloj: row.reloj ?? null,
          fecha_partido: row.fecha_partido ?? null,
        });
      });
      setJornadasOficiales(agrupadas);

      const { data: pronosData, error: pronosError } = await supabase.from('pronosticos').select('*');
      if (pronosError) console.error('Error al cargar pronosticos:', pronosError);

      const obj: Record<number, Record<string, { pronosticos: PronosticoPartido[]; confirmado: boolean; validado?: boolean }>> = {};
      for (let j = 1; j <= 18; j++) {
        obj[j] = {
          cace: { pronosticos: JSON.parse(JSON.stringify(agrupadas[j] || [])), confirmado: false, validado: false },
          juanjo: { pronosticos: JSON.parse(JSON.stringify(agrupadas[j] || [])), confirmado: false, validado: false },
          ivan: { pronosticos: JSON.parse(JSON.stringify(agrupadas[j] || [])), confirmado: false, validado: false },
        };
      }

      if (pronosData && pronosData.length > 0) {
        pronosData.forEach((row: any) => {
          const { user_id, partido_id, eleccion, acierto } = row;
          const partidoEncontrado = partidosData.find((p: any) => p.id === partido_id);
          const jornada = partidoEncontrado?.jornada;
          const mapaUsuarios: Record<string, string> = {
            '351a81a5-86f9-4d6d-a567-f49ed5959e57': 'ivan',
            'dadb359a-8bc1-442e-8202-62fa2f8ddab9': 'juanjo',
            '088072d0-0782-409f-b5e4-f8a558f27b4f': 'cace',
          };
          const usuarioInterno = mapaUsuarios[user_id] || null;
          if (jornada && usuarioInterno && obj[jornada]?.[usuarioInterno]) {
            const partido = obj[jornada][usuarioInterno].pronosticos.find(p => p.id === partido_id);
            if (partido) {
              partido.eleccion = eleccion;
              partido.acierto = acierto ?? null;
            }
            obj[jornada][usuarioInterno].confirmado = true;
          }
        });
      }
      setPronosticosPorUsuario(obj);
    };

    if (usuarioLogueado?.id) cargarDatosSupabase();
  }, [usuarioLogueado?.id, usuarioActivoId]);

  const cargarPerfil = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setNombrePerfil(data.nombre || '');
      setNombreEquipo(data.nombre_equipo || '');
      setAvatarUrlInput(data.avatar_url || '');
    }
  };

  const handleGuardarPerfil = async () => {
    if (!usuarioLogueado) return;
    setGuardandoPerfil(true);
    const { error } = await supabase.from('profiles').upsert({ id: usuarioLogueado.id, nombre: nombrePerfil, nombre_equipo: nombreEquipo, avatar_url: avatarUrlInput, updated_at: new Date() });
    setGuardandoPerfil(false);
    if (error) alert('Error al guardar el perfil: ' + error.message);
    else alert('¡Perfil guardado con éxito!');
  };

  useEffect(() => {
    const comprobarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUsuarioLogueado(session.user);
        cargarPerfil(session.user.id);
        const usuarioEncontrado = usuarios.find(u => u.email.toLowerCase() === session.user.email?.toLowerCase());
        if (usuarioEncontrado) setUsuarioActivoId(usuarioEncontrado.id);
      }
    };
    comprobarSesion();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUsuarioLogueado(session.user);
        cargarPerfil(session.user.id);
        const usuarioEncontrado = usuarios.find(u => u.email.toLowerCase() === session.user.email?.toLowerCase());
        if (usuarioEncontrado) setUsuarioActivoId(usuarioEncontrado.id);
      } else {
        setUsuarioLogueado(null);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    setErrorLogin('');
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
    if (error) setErrorLogin('Correo o contraseña incorrectos.');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUsuarioLogueado(null);
  };

  const calcularPuntosJornada = (userId: string, numJornada: number) => {
    const dataJornada = pronosticosPorUsuario[numJornada]?.[userId];
    if (!dataJornada || !dataJornada.confirmado) return 0;
    return dataJornada.pronosticos.filter(p => p.acierto === true).length;
  };

  const obtenerRachaEquipo = (nombreEquipo: string, hastaJornada: number) => {
    let v = 0;
    let d = 0;
    for (let j = 1; j < hastaJornada; j++) {
      const jornadaValidada = pronosticosPorUsuario[j]?.['cace']?.validado;
      if (jornadaValidada) {
        const partidos = pronosticosPorUsuario[j]?.['cace']?.pronosticos || [];
        partidos.forEach(p => {
          if (p.local.toLowerCase() === nombreEquipo.toLowerCase()) {
            if (p.resultadoReal === '1') v++;
            else if (p.resultadoReal === '2') d++;
          } else if (p.visitante.toLowerCase() === nombreEquipo.toLowerCase()) {
            if (p.resultadoReal === '2') v++;
            else if (p.resultadoReal === '1') d++;
          }
        });
      }
    }
    return `${v} V - ${d} D`;
  };

  useEffect(() => {
    setUsuarios(prevUsuarios => {
      const nuevosUsuarios = prevUsuarios.map(usr => {
        let totalPuntos = 0;
        let totalAciertosPartidos = 0;
        let totalValidados = 0;
        for (let jNum = 1; jNum <= 18; jNum++) {
          const jData = pronosticosPorUsuario[jNum]?.[usr.id];
          if (jData && jData.confirmado) {
            jData.pronosticos.forEach(p => {
              if (p.acierto !== null && p.acierto !== undefined) {
                totalValidados++;
                if (p.acierto === true) {
                  totalPuntos++;
                  totalAciertosPartidos++;
                }
              }
            });
          }
        }
        const efectividadCalc = totalValidados > 0
          ? Math.round((totalAciertosPartidos / totalValidados) * 100) + '%'
          : '0%';
        return { ...usr, puntos: totalPuntos, efectividad: efectividadCalc };
      });
      nuevosUsuarios.sort((a, b) => b.puntos - a.puntos);

      const maxPuntos = nuevosUsuarios[0]?.puntos ?? 0;
      const cantidadConMaxPuntos = nuevosUsuarios.filter(
        (usr) => usr.puntos === maxPuntos
      ).length;

      return nuevosUsuarios.map((usr, index) => {
        const tieneMaxPuntos = usr.puntos === maxPuntos;
        const hayEmpateEnCabeza = cantidadConMaxPuntos > 1;

        return {
          ...usr,
          posicion: `${index + 1}º`,
          esLider: tieneMaxPuntos && !hayEmpateEnCabeza,
          esColider: tieneMaxPuntos && hayEmpateEnCabeza,
        };
      });
    });
  }, [pronosticosPorUsuario]);

  useEffect(() => {
    if (pestanaActiva === 'noticias' && noticias.length === 0) {
      setCargandoNoticias(true);
      fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=50&lang=es&region=es')
        .then((res) => res.json())
        .then((data) => {
          const articulosSoloNoticias = (data.articles || []).filter((art: any) => {
            const esMedia = art.type === 'Media';
            const esVideo = art.links?.api?.self?.href?.includes('/video/clips/');
            return !esMedia && !esVideo;
          });

          const noticiasMapeadas: Noticia[] = articulosSoloNoticias.map((art: any, index: number) => {
            const urlEspn = art.links?.web?.href || art.links?.mobile?.href || '#';
            const urlOriginal = urlEspn.replace(
              'https://www.espn.es',
              'https://espndeportes.espn.com'
            );
            const descripcion = art.description || 'Sin descripción disponible.';
            return {
              id: art.id || String(index),
              titulo: art.headline,
              descripcion,
              enlace: urlOriginal,
              imagen: art.images?.[0]?.url || '/redzone1_logo.png',
              fecha: new Date(art.published).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              categoria: clasificarNoticia(art.headline || '', descripcion)
            };
          });
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
                const getStat = (name: string) => { const stat = entry.stats?.find((s: any) => s.name === name || s.abbreviation === name || s.type === name); return stat ? parseInt(stat.displayValue, 10) || 0 : 0; };
                const getStatStr = (name: string) => { const stat = entry.stats?.find((s: any) => s.name === name || s.abbreviation === name || s.type === name); return stat ? stat.displayValue : '0'; };
                return { id: entry.team?.id || String(Math.random()), nombre: entry.team?.displayName || entry.team?.name || 'Equipo', abrev: entry.team?.abbreviation || '', logo: entry.team?.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/nfl/500/${entry.team?.abbreviation?.toLowerCase()}.png`, victorias: getStat('wins'), derrotas: getStat('losses'), empates: getStat('ties'), pct: getStatStr('winPercent') };
              }) || [];
              if (equiposDiv.length > 0) listaDivisiones.push({ nombre: div.name || `${conferenciaTag} - División`, conferencia: conferenciaTag, equipos: equiposDiv });
            });
          });
          if (listaDivisiones.length > 0) setDivisiones(listaDivisiones);
        })
        .catch((err) => console.log('Sincronizando posiciones:', err))
        .finally(() => setSincronizandoPosiciones(false));
    }
  }, [pestanaActiva]);

  useEffect(() => {
    const actual = pronosticosPorUsuario[jornadaActual]?.[usuarioActivoId];
    setEstadoBotonConfirmar(actual?.confirmado ? 'confirmado' : 'normal');
  }, [usuarioActivoId, jornadaActual, pronosticosPorUsuario]);

  const datosUsuarioActual = pronosticosPorUsuario[jornadaActual]?.[usuarioActivoId] || { pronosticos: [], confirmado: false };
  const usuarioPerfilActual = usuarios.find(u => u.id === usuarioActivoId);
  const [estadoJornadaActual, setEstadoJornadaActual] = useState<string>('pendiente');
  const [cierrePronosticosActual, setCierrePronosticosActual] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    const cargarEstadoJornada = async () => {
      const { data, error } = await supabase
        .from('jornadas_eventos')
        .select('estado, cierre_pronosticos')
        .eq('jornada', jornadaActual)
        .maybeSingle();

      if (error) {
        console.error('Error al cargar estado de jornada:', error);
        return;
      }

      if (!activo || !data) return;

      const cierre = data.cierre_pronosticos || null;
      setCierrePronosticosActual(cierre);

      const cierreVencido =
        cierre !== null &&
        Date.now() >= new Date(cierre).getTime();

      if (
        data.estado === 'finalizada' ||
        data.estado === 'cerrada' ||
        cierreVencido
      ) {
        setEstadoJornadaActual(
          data.estado === 'finalizada' ? 'finalizada' : 'cerrada'
        );
      } else {
        setEstadoJornadaActual('pendiente');
      }
    };

    cargarEstadoJornada();

    const intervaloServidor = window.setInterval(
      cargarEstadoJornada,
      30000
    );

    return () => {
      activo = false;
      window.clearInterval(intervaloServidor);
    };
  }, [jornadaActual]);

  useEffect(() => {
    if (!cierrePronosticosActual) return;

    const comprobarCierreExacto = () => {
      if (
        Date.now() >= new Date(cierrePronosticosActual).getTime()
      ) {
        setEstadoJornadaActual(prev =>
          prev === 'finalizada' ? 'finalizada' : 'cerrada'
        );
      }
    };

    comprobarCierreExacto();

    const intervaloReloj = window.setInterval(
      comprobarCierreExacto,
      1000
    );

    return () => window.clearInterval(intervaloReloj);
  }, [cierrePronosticosActual]);

  const handleSeleccionPronostico = (idPartido: string, eleccion: '1' | 'X' | '2') => {
    if (estadoJornadaActual === 'cerrada' || estadoJornadaActual === 'finalizada') return;
    setPronosticosPorUsuario(prev => {
      const jornadaData = prev[jornadaActual] || {};
      const usuarioActualData = jornadaData[usuarioActivoId] || { pronosticos: [], confirmado: false };
      const nuevosPronosticos = usuarioActualData.pronosticos.map(p => p.id === idPartido ? { ...p, eleccion: p.eleccion === eleccion ? null : eleccion } : p);
      return { ...prev, [jornadaActual]: { ...jornadaData, [usuarioActivoId]: { ...usuarioActualData, pronosticos: nuevosPronosticos, confirmado: false } } };
    });
    setEstadoBotonConfirmar('normal');
  };

  const handleConfirmarPronosticos = async () => {
    if (estadoJornadaActual === 'cerrada' || estadoJornadaActual === 'finalizada') { alert('La porra de esta jornada ya está cerrada.'); return; }
    if (datosUsuarioActual.pronosticos.some(p => p.eleccion === null)) { setEstadoBotonConfirmar('incompleto'); return; }
    if (!usuarioLogueado) { alert('Debes iniciar sesión para guardar tus pronósticos.'); return; }
    const filasGuardar = datosUsuarioActual.pronosticos.map(p => ({ user_id: usuarioLogueado.id, partido_id: p.id, eleccion: p.eleccion, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('pronosticos').upsert(filasGuardar, { onConflict: 'user_id,partido_id' });
    if (error) {
      console.error('Error al guardar pronósticos en Supabase:', error);
      if (error.message?.toLowerCase().includes('cerrada')) {
        setEstadoJornadaActual('cerrada');
        alert('La porra ya está cerrada. Tus cambios no se han guardado.');
      } else {
        alert('Hubo un error al guardar tus pronósticos en Supabase.');
      }
      return;
    }
    setPronosticosPorUsuario(prev => {
      const jornadaData = prev[jornadaActual] || {};
      const usuarioActualData = jornadaData[usuarioActivoId] || { pronosticos: [], confirmado: false };
      return { ...prev, [jornadaActual]: { ...jornadaData, [usuarioActivoId]: { ...usuarioActualData, confirmado: true } } };
    });
    setEstadoBotonConfirmar('confirmado');
  };

  const handleTirarDesempate = async () => {
    if (!usuarioLogueado?.id) {
      setErrorDesempate('Debes iniciar sesión para tirar.');
      return;
    }

    if (girandoRuleta) return;

    setGirandoRuleta(true);
    setErrorDesempate('');

    let intervalo: ReturnType<typeof setInterval> | null = null;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        throw new Error('No se pudo validar tu sesión.');
      }

      // Animación visual: cambia números mientras el servidor resuelve.
      intervalo = setInterval(() => {
        setNumeroRuletaVisual(Math.floor(Math.random() * 100) + 1);
      }, 70);

      const response = await fetch('/api/desempate/tirar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const resultado = await response.json();

      if (!response.ok || !resultado.success) {
        throw new Error(
          resultado?.error || 'No se pudo realizar la tirada.'
        );
      }

      // Mantener la animación un instante para que el efecto se perciba.
      await new Promise((resolve) => setTimeout(resolve, 1600));

      if (intervalo) {
        clearInterval(intervalo);
        intervalo = null;
      }

      setNumeroRuletaVisual(resultado.valor);

      // Recargar estado del desempate.
      const { data: estadoActualizado, error: estadoError } = await supabase
        .from('desempate_superbowl_estado')
        .select('*')
        .eq('temporada', 2026)
        .maybeSingle();

      if (estadoError) throw estadoError;

      setEstadoDesempate(estadoActualizado || null);

      if (estadoActualizado) {
        const fase =
          estadoActualizado.estado === 'clasificatoria'
            ? 'clasificatoria'
            : 'eleccion_final';

        const ronda = Number(estadoActualizado.ronda_actual || 1);

        const { data: tiradasActualizadas, error: tiradasError } =
          await supabase
            .from('desempates_superbowl')
            .select('user_id, valor, fase, ronda, created_at')
            .eq('temporada', 2026)
            .eq('fase', fase)
            .eq('ronda', ronda)
            .order('created_at', { ascending: true });

        if (tiradasError) throw tiradasError;

        setTiradasDesempate(tiradasActualizadas || []);
      }
    } catch (error: any) {
      console.error('Error al realizar tirada:', error);
      setErrorDesempate(
        error?.message || 'No se pudo realizar la tirada.'
      );
    } finally {
      if (intervalo) clearInterval(intervalo);
      setGirandoRuleta(false);
    }
  };

  const handleElegirEquipoSuperbowl = async (equipo: string) => {
    if (!usuarioLogueado?.id) {
      setErrorDesempate('Debes iniciar sesión para elegir.');
      return;
    }

    if (guardandoEleccionSuperbowl) return;

    setGuardandoEleccionSuperbowl(true);
    setErrorDesempate('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        throw new Error('No se pudo validar tu sesión.');
      }

      const response = await fetch('/api/desempate/elegir-equipo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ equipo }),
      });

      const resultado = await response.json();

      if (!response.ok || !resultado.success) {
        throw new Error(
          resultado?.error || 'No se pudo guardar la elección.'
        );
      }

      const { data: eleccionesActualizadas, error: eleccionesError } =
        await supabase
          .from('elecciones_superbowl')
          .select('*')
          .eq('temporada', 2026)
          .order('created_at', { ascending: true });

      if (eleccionesError) {
        throw eleccionesError;
      }

      setEleccionesSuperbowl(eleccionesActualizadas || []);
    } catch (error: any) {
      console.error('Error al elegir equipo Super Bowl:', error);
      setErrorDesempate(
        error?.message || 'No se pudo guardar la elección.'
      );
    } finally {
      setGuardandoEleccionSuperbowl(false);
    }
  };

  const handleVotacionAleatoriaYSimular = async () => {
    try {
      const response = await fetch('/api/test-votacion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jornada: jornadaActual }) });
      const resultado = await response.json();
      if (!response.ok || !resultado.success) { console.error('Error al generar votación de prueba:', resultado); alert(resultado?.error || 'No se pudieron generar los pronósticos de prueba.'); return; }
      const { data: pronosData, error: pronosError } = await supabase.from('pronosticos').select('*');
      if (pronosError) { console.error('Error al recargar pronósticos después de la simulación:', pronosError); alert('Los pronósticos se guardaron, pero hubo un error al recargarlos.'); return; }
      const mapaUsuarios: Record<string, string> = { 'dadb359a-8bc1-442e-8202-62fa2f8ddab9': 'juanjo', '088072d0-0782-409f-b5e4-f8a558f27b4f': 'cace', '351a81a5-86f9-4d6d-a567-f49ed5959e57': 'ivan' };
      setPronosticosPorUsuario(prev => {
        const copia = { ...prev };
        if (!copia[jornadaActual]) copia[jornadaActual] = {};
        Object.values(mapaUsuarios).forEach(usuarioInterno => {
          if (!copia[jornadaActual][usuarioInterno]) copia[jornadaActual][usuarioInterno] = { pronosticos: JSON.parse(JSON.stringify(jornadasOficiales[jornadaActual] || [])), confirmado: false, validado: false };
        });
        pronosData?.forEach((row: any) => {
          const usuarioInterno = mapaUsuarios[row.user_id];
          if (!usuarioInterno) return;
          const partido = copia[jornadaActual][usuarioInterno]?.pronosticos.find(p => p.id === row.partido_id);
          if (partido) {
            partido.eleccion = row.eleccion;
            partido.acierto = row.acierto ?? null;
            copia[jornadaActual][usuarioInterno].confirmado = true;
          }
        });
        return copia;
      });
      alert(`¡Votación aleatoria guardada correctamente para Juanjo y Cace en la Jornada ${jornadaActual}!`);
    } catch (error) {
      console.error('Error inesperado en Modo Test:', error);
      alert('Ha ocurrido un error inesperado en el Modo Test.');
    }
  };

  const handleSiguienteJornada = () => {
    if (jornadaActual < 18) setJornadaActual(prev => prev + 1);
    else alert('Has llegado a la última jornada (18).');
  };

  const handleValidarJornada = async () => {
    const opciones: ('1' | 'X' | '2')[] = ['1', 'X', '2'];
    const partidosAActualizar: { id: string; resultado_real: '1' | 'X' | '2' }[] = [];
    const filasGuardarPronos: any[] = [];
    const partidosBase = jornadasOficiales[jornadaActual] || [];
    partidosBase.forEach(p => {
      const resReal = p.resultadoReal || opciones[Math.floor(Math.random() * opciones.length)];
      partidosAActualizar.push({ id: p.id, resultado_real: resReal });
    });
    for (const p of partidosAActualizar) await supabase.from('temporada_regular').update({ resultado_real: p.resultado_real }).eq('id', p.id);
    setPronosticosPorUsuario(prev => {
      const jornadaData = prev[jornadaActual] || {};
      const copiaJornada = { ...jornadaData };
      Object.keys(copiaJornada).forEach(uid => {
        const pronosValidados = copiaJornada[uid].pronosticos.map(p => {
          const resObj = partidosAActualizar.find(item => item.id === p.id);
          const resReal = resObj ? resObj.resultado_real : p.resultadoReal;
          filasGuardarPronos.push({ jornada: jornadaActual, usuario_id: uid, partido_id: p.id, eleccion: p.eleccion, confirmado: copiaJornada[uid].confirmado, validado: true, updated_at: new Date() });
          return { ...p, resultadoReal: resReal };
        });
        copiaJornada[uid] = { ...copiaJornada[uid], pronosticos: pronosValidados, validado: true };
      });
      return { ...prev, [jornadaActual]: copiaJornada };
    });
    if (filasGuardarPronos.length > 0) await supabase.from('pronosticos').upsert(filasGuardarPronos, { onConflict: 'jornada,usuario_id,partido_id' });
    alert(`¡Jornada ${jornadaActual} validada correctamente! Puntos, rachas y datos guardados en Supabase.`);
  };

  const renderTablaDivision = (div: Division, idx: number) => {
    const esAfc = div.conferencia === 'AFC';
    const headerBgClass = esAfc ? 'bg-red-700 border-red-800' : 'bg-blue-700 border-blue-800';
    return (
      <div key={idx} className="bg-black/90 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className={`${headerBgClass} px-4 py-2.5 border-b font-['Orbitron'] text-sm md:text-base font-bold uppercase tracking-wider text-white`}>{div.nombre}</div>
        <div className="w-full">
          <table className="w-full table-fixed text-left font-sans">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase font-mono text-[10px] md:text-sm"><tr><th className="py-2.5 px-2 w-[48%]">EQUIPO</th><th className="py-2.5 px-1 w-[12%] text-center">G</th><th className="py-2.5 px-1 w-[12%] text-center">P</th><th className="py-2.5 px-1 w-[12%] text-center">E</th><th className="py-2.5 px-2 w-[16%] text-right">%</th></tr></thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs md:text-base">
              {div.equipos.map((eq) => (
                <tr key={eq.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="py-3 px-2 flex items-center gap-2 font-['Orbitron'] font-bold text-white truncate"><img src={eq.logo} alt={eq.nombre} className={`object-contain flex-shrink-0 ${eq.abrev === 'NYJ' ? 'scale-125 filter brightness-200' : ''}`} style={{ width: eq.abrev === 'NYJ' ? '32px' : '24px', height: eq.abrev === 'NYJ' ? '32px' : '24px' }} /><span className="truncate">{eq.nombre}</span></td>
                  <td className="py-3 px-1 text-center font-mono font-bold text-emerald-400 text-sm md:text-lg">{eq.victorias}</td><td className="py-3 px-1 text-center font-mono font-bold text-red-400 text-sm md:text-lg">{eq.derrotas}</td><td className="py-3 px-1 text-center font-mono font-bold text-zinc-300 text-sm md:text-lg">{eq.empates}</td><td className="py-3 px-2 text-right font-mono font-extrabold text-amber-400 text-xs md:text-lg truncate">{eq.pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const desempateActivo =
    estadoDesempate &&
    (
      estadoDesempate.estado === 'clasificatoria' ||
      estadoDesempate.estado === 'eleccion_final'
    );

  const participantesDesempate: string[] =
    estadoDesempate?.participantes || [];

  const usuarioParticipaDesempate =
    Boolean(usuarioLogueado?.id) &&
    participantesDesempate.includes(usuarioLogueado.id);

  const tiradaUsuarioActual = tiradasDesempate.find(
    (tirada: any) => tirada.user_id === usuarioLogueado?.id
  );

  const numeroMostradoRuleta =
    girandoRuleta
      ? numeroRuletaVisual
      : tiradaUsuarioActual?.valor ?? numeroRuletaVisual ?? 0;

  const digitosRuleta = String(numeroMostradoRuleta || 0)
    .padStart(3, '0')
    .slice(-3)
    .split('');

  const eleccionSuperbowlActiva =
    estadoDesempate?.estado === 'resuelto';

  const usuarioPuedeElegirSuperbowl =
    eleccionSuperbowlActiva &&
    usuarioLogueado?.id === estadoDesempate?.ganador_eleccion &&
    eleccionesSuperbowl.length === 0;

  const eleccionUsuarioSuperbowl = eleccionesSuperbowl.find(
    (e: any) => e.user_id === usuarioLogueado?.id
  );

  const noticiasFiltradas =
    filtroNoticias === 'TODAS'
      ? noticias
      : noticias.filter((noticia) => noticia.categoria === filtroNoticias);

  const navItems = [
    { id: 'clasificacion', label: 'RANKING', icon: <img src="/logo.clasificacion.png" alt="Ranking" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'pronosticos', label: 'PORRA', icon: <img src="/logo_porra.png" alt="Porra" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'jornada', label: 'JORNADA', icon: <img src="/logo_jornada.jpg" alt="Jornada" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'equipos', label: 'EQUIPOS', icon: <img src="/logo_equipo.png" alt="Equipos" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'noticias', label: 'NOTICIAS', icon: <img src="/logo_noticias.png" alt="Noticias" className="w-[35px] h-[35px] object-contain" /> },
    { id: 'perfil', label: 'PERFIL', icon: <img src="/logo_perfil.png" alt="Perfil" className="w-[35px] h-[35px] object-contain" /> },
  ];

  const tituloBarraPrincipal =
    pestanaActiva === 'clasificacion'
      ? 'TABLA GENERAL DE POSICIONES'
      : pestanaActiva === 'pronosticos'
      ? `PRONÓSTICOS - JORNADA ${jornadaActual}`
      : pestanaActiva === 'jornada'
      ? `RESULTADOS JORNADA ${jornadaActual}`
      : pestanaActiva === 'perfil'
      ? 'AJUSTES DE PERFIL PRIVADO'
      : null;

  return (
    <div className="min-h-screen bg-[#8b0000] text-white w-full font-sans">
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:ital,wght@0,700;0,900;1,700;1,900&display=swap" rel="stylesheet" />
      <main className="w-full pb-12">
        <header className="w-full bg-[#8b0000] py-3 flex justify-center items-center"><picture className="flex justify-center"><source media="(max-width: 768px)" srcSet="/redzone2_logo.png" /><img src="/redzone1_logo.png" alt="NFL REDZONE" className="h-10 md:h-12 object-contain" /></picture></header>
        {showSearch && <div className={`fixed z-50 p-4 transition-all duration-500 ${searchPosition === 'top' ? 'top-20' : 'bottom-4'} right-4 bg-white text-black rounded-full shadow-xl font-bold font-['Orbitron']`}>🔍</div>}
        <nav className="w-full bg-white border-b py-2 flex justify-center"><div className="w-full md:max-w-xl flex justify-around items-center px-2">{navItems.map((item) => <button key={item.id} onClick={() => setPestanaActiva(item.id)} className="flex flex-col items-center gap-1 px-1 py-1 transition-all relative cursor-pointer"><div className="w-[35px] h-[35px] flex items-center justify-center">{item.icon}</div><span className="text-[9px] font-bold text-red-700 tracking-tight leading-none">{item.label}</span><div className={`h-1 w-7 rounded-full transition-all duration-300 mt-0.5 ${pestanaActiva === item.id ? 'bg-red-700 opacity-100 scale-100' : 'bg-transparent opacity-0 scale-0'}`} /></button>)}</div></nav>
        {tituloBarraPrincipal && (
          <div className="w-full bg-[#002244] flex items-center justify-center px-4 py-5 md:py-6">
            <h1 className="text-white text-base md:text-2xl font-black uppercase tracking-wider font-['Orbitron'] italic text-center">
              {tituloBarraPrincipal}
            </h1>
          </div>
        )}

        {pestanaActiva === 'equipos' && (
          <div className="w-full bg-[#002244]">
            <div className="w-full md:max-w-2xl mx-auto flex items-center justify-around px-3 py-3 md:py-2">
              {[
                ['score', 'SCORE', '/score.png'],
                ['games', 'GAMES', '/games.png'],
                ['stats', 'STATS', '/stats.png'],
                ['franquicia', 'FRANQUICIA', '/franquicia.png']
              ].map(([id, label, icono]) => {
                const activo = subPestanaEquipos === id;

                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (
                        id === 'score' ||
                        id === 'games' ||
                        id === 'stats' ||
                        id === 'franquicia'
                      ) {
                        setSubPestanaEquipos(id);
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 min-w-[68px] md:min-w-[100px] text-white transition-all ${
                      activo
                        ? 'opacity-100'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={icono}
                      alt={label}
                      className={`w-8 h-8 md:w-10 md:h-10 object-contain transition-transform ${
                        activo ? 'scale-105' : ''
                      }`}
                    />

                    <span className="font-['Orbitron'] text-[8px] md:text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">
                      {label}
                    </span>

                    <span
                      className={`h-[2px] w-7 rounded-full ${
                        activo
                          ? 'bg-white opacity-100'
                          : 'opacity-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

            {/* STATS_FASE_1_REDZONE */}
            {pestanaActiva === 'equipos' && subPestanaEquipos === 'stats' && (
              <section className="-mx-4 md:mx-0">
                <div className="bg-white text-black rounded-none md:rounded-b-2xl shadow-2xl overflow-hidden">

                  {/* JUGADOR / EQUIPO */}
                  <div className="grid grid-cols-2 border-b border-zinc-200">
                    <button
                      onClick={() => setTipoStats('jugador')}
                      className="relative py-4 md:py-5 font-['Orbitron'] text-sm md:text-base font-black uppercase transition-all text-red-700 hover:text-red-600" 
                    >
                      JUGADOR
                      <span
                        className={`absolute bottom-0 left-4 right-4 h-[3px] ${
                          tipoStats === 'jugador'
                            ? 'bg-red-600'
                            : 'bg-transparent'
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => setTipoStats('equipo')}
                      className="relative py-4 md:py-5 font-['Orbitron'] text-sm md:text-base font-black uppercase transition-all text-red-700 hover:text-red-600" 
                    >
                      EQUIPO
                      <span
                        className={`absolute bottom-0 left-4 right-4 h-[3px] ${
                          tipoStats === 'equipo'
                            ? 'bg-red-600'
                            : 'bg-transparent'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-4 md:p-6">

                    {/* MENU INTERNO STATS */}
                    <div className="mb-5 border-b border-zinc-200">
                      <div className="grid grid-cols-4 gap-1">
                        {(tipoStats === 'jugador'
                          ? [
                              ['ofensiva', 'OFENSIVA'],
                              ['defensiva', 'DEFENSIVA'],
                              ['anotando', 'ANOTANDO'],
                              ['especiales', 'EQUIPOS ESPECIALES']
                            ]
                          : [
                              ['ofensiva', 'OFENSIVA'],
                              ['defensiva', 'DEFENSIVA'],
                              ['especiales', 'EQUIPOS ESPECIALES'],
                              ['entregas', 'ENTREGAS']
                            ]
                        ).map(([id, label]) => {
                          const activo =
                            tipoStats === 'jugador'
                              ? categoriaStatsJugador === id
                              : categoriaStatsEquipo === id;

                          return (
                            <button
                              key={id}
                              onClick={() => {
                                if (tipoStats === 'jugador') {
                                  setCategoriaStatsJugador(id as 'ofensiva' | 'defensiva' | 'anotando' | 'especiales');
                                  if (id === 'ofensiva') setSubcategoriaStatsJugador('pasando');
                                  if (id === 'especiales') setSubcategoriaStatsJugador('devoluciones');
                                } else {
                                  setCategoriaStatsEquipo(id as 'ofensiva' | 'defensiva' | 'especiales' | 'entregas');
                                }
                              }}
                              className={`relative py-3 px-1 font-['Orbitron'] text-[8px] sm:text-[9px] md:text-xs font-black uppercase transition-all ${
                                activo
                                  ? 'text-red-700'
                                  : 'text-zinc-400 hover:text-red-600'
                              }`}
                            >
                              {label}
                              <span
                                className={`absolute bottom-0 left-2 right-2 h-[2px] ${
                                  activo ? 'bg-red-600' : 'bg-transparent'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* SUBMENU OFENSIVA / ESPECIALES DE JUGADOR */}
                    {tipoStats === 'jugador' &&
                      (categoriaStatsJugador === 'ofensiva' ||
                        categoriaStatsJugador === 'especiales') && (
                        <div
                          className={`mb-5 flex ${
                            categoriaStatsJugador === 'especiales'
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div className="inline-flex bg-zinc-100 rounded-full p-1 gap-1">
                            {(categoriaStatsJugador === 'ofensiva'
                              ? [
                                  ['pasando', 'PASANDO'],
                                  ['corriendo', 'CORRIENDO'],
                                  ['recibiendo', 'RECIBIENDO']
                                ]
                              : [
                                  ['devoluciones', 'DEVOLUCIONES'],
                                  ['pateando', 'PATEANDO'],
                                  ['despejes', 'DESPEJES']
                                ]
                            ).map(([id, label]) => (
                              <button
                                key={id}
                                onClick={() =>
                                  setSubcategoriaStatsJugador(
                                    id as 'pasando' | 'corriendo' | 'recibiendo' | 'devoluciones' | 'pateando' | 'despejes'
                                  )
                                }
                                className={`px-4 py-2 rounded-full font-['Orbitron'] text-[8px] sm:text-[9px] md:text-[10px] font-black transition-all ${
                                  subcategoriaStatsJugador === id
                                    ? 'bg-white text-red-700 shadow-md'
                                    : 'text-zinc-600 hover:text-red-700'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* TEMPORADA */}
                    <div className="mb-6">
                      <select className="bg-white border border-zinc-300 rounded-full px-4 py-2 text-xs md:text-sm font-semibold text-zinc-700 outline-none">
                        <option>2025 Temporada regular</option>
                      </select>
                    </div>

                    {vistaStatsCompleta &&
                    tipoStats === 'jugador' &&
                    categoriaStatsJugador === 'defensiva' ? (

                      /* ================= DETALLE_DEFENSIVA_JUGADOR_REDZONE ================= */
                      <div className="w-full">
                        <div className="flex items-center justify-between gap-3 border-b-2 border-blue-500 pb-3 mb-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" />
                            <h3 className="text-sm md:text-xl font-black uppercase tracking-wider text-blue-600 font-['Orbitron'] italic underline decoration-blue-600 underline-offset-4 truncate">
                              Defensiva
                            </h3>
                          </div>

                          <button
                            onClick={() => setVistaStatsCompleta(false)}
                            className="shrink-0 px-3 py-2 rounded-lg border border-blue-600 text-blue-700 hover:bg-blue-700 hover:text-white transition-all font-['Orbitron'] font-black text-[8px] md:text-[10px] uppercase"
                          >
                            ← Volver a líderes
                          </button>
                        </div>

                        <p className="md:hidden text-[9px] text-zinc-500 font-semibold mb-2 text-right">
                          Desliza para ver todas las estadísticas →
                        </p>

                        <div className="w-full overflow-x-auto border border-zinc-200 rounded-xl shadow-sm">
                          <table className="min-w-[1350px] w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-zinc-100 text-zinc-600 font-black uppercase">
                                <th className="sticky left-0 z-30 w-11 min-w-11 bg-zinc-100 border-r border-zinc-300 px-2 py-3 text-center">
                                  POS
                                </th>

                                <th className="sticky left-11 z-30 min-w-[168px] md:min-w-[220px] bg-zinc-100 border-r-2 border-zinc-300 px-3 py-3 text-left">
                                  NOMBRE
                                </th>

                                {[
                                  'POS', 'GP', 'SOLO', 'AST', 'TOT',
                                  'SACK', 'TFL', 'PD', 'INT',
                                  'YDS', 'LNG', 'TD', 'FF', 'FR'
                                ].map((col) => (
                                  <th
                                    key={col}
                                    className="min-w-[72px] px-3 py-3 text-center whitespace-nowrap border-r border-zinc-200"
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>

                            <tbody>
                              {[
                                ['Jordyn Brooks', 'MIA', 'LB', '17', '108', '75', '183', '3.0', '9', '6', '1', '12', '12', '0', '2', '1'],
                                ['Jack Campbell', 'DET', 'LB', '17', '101', '75', '176', '2.5', '8', '5', '1', '7', '7', '0', '1', '1'],
                                ['Devin White', 'LV', 'LB', '17', '105', '69', '174', '4.0', '11', '4', '1', '15', '15', '0', '2', '2'],
                                ['Cedric Gray', 'TEN', 'LB', '17', '94', '70', '164', '2.0', '7', '5', '2', '21', '16', '0', '1', '1'],
                                ['Bobby Wagner', 'WSH', 'LB', '17', '96', '66', '162', '3.5', '10', '4', '1', '8', '8', '0', '2', '1'],
                                ['Myles Garrett', 'CLE', 'DE', '17', '48', '23', '71', '23.0', '28', '5', '0', '0', '0', '0', '4', '2'],
                                ['Brian Burns', 'NYG', 'OLB', '17', '51', '27', '78', '16.5', '21', '6', '1', '11', '11', '0', '3', '1'],
                                ['Danielle Hunter', 'HOU', 'DE', '17', '47', '29', '76', '15.0', '19', '4', '0', '0', '0', '0', '2', '2'],
                                ['Kevin Byard', 'CHI', 'S', '17', '71', '39', '110', '1.0', '4', '12', '7', '96', '41', '1', '1', '1'],
                                ['Devin Lloyd', 'JAX', 'LB', '17', '82', '46', '128', '2.0', '8', '9', '5', '67', '32', '1', '2', '1'],
                              ].map((fila, i) => (
                                <tr
                                  key={fila[0]}
                                  className="border-b border-zinc-100 hover:bg-zinc-50"
                                >
                                  <td className="sticky left-0 z-20 w-11 min-w-11 bg-white border-r border-zinc-200 px-2 py-3 text-center font-semibold text-zinc-500">
                                    {i + 1}
                                  </td>

                                  <td className="sticky left-11 z-20 min-w-[168px] md:min-w-[220px] bg-white border-r-2 border-zinc-300 px-3 py-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <img
                                        src={`https://a.espncdn.com/i/teamlogos/nfl/500/${fila[1].toLowerCase()}.png`}
                                        alt={fila[1]}
                                        className="w-7 h-7 object-contain flex-shrink-0"
                                      />

                                      <div className="min-w-0">
                                        <div className="font-bold text-zinc-900 truncate">
                                          {fila[0]}
                                        </div>
                                        <div className="text-[9px] text-zinc-400 font-semibold">
                                          {fila[1]}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {fila.slice(2).map((valor, idx) => (
                                    <td
                                      key={idx}
                                      className={`min-w-[72px] px-3 py-3 text-center whitespace-nowrap border-r border-zinc-100 ${
                                        idx === 4 || idx === 5 || idx === 8
                                          ? 'font-black text-blue-700'
                                          : 'text-zinc-600'
                                      }`}
                                    >
                                      {valor}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    ) : vistaStatsCompleta &&
                    tipoStats === 'jugador' &&
                    categoriaStatsJugador === 'ofensiva' &&
                    (
                      subcategoriaStatsJugador === 'pasando' ||
                      subcategoriaStatsJugador === 'corriendo' ||
                      subcategoriaStatsJugador === 'recibiendo'
                    ) ? (

                      /* ================= DETALLE_OFENSIVA_JUGADOR_REDZONE ================= */
                      <div className="w-full">

                        {/* CABECERA DETALLE */}
                        <div className="flex items-center justify-between gap-3 border-b-2 border-red-600 pb-3 mb-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-3 h-3 bg-red-600 rounded-full flex-shrink-0" />

                            <h3 className="text-sm md:text-xl font-black uppercase tracking-wider text-red-600 font-['Orbitron'] italic underline decoration-red-600 underline-offset-4 truncate">
                              {subcategoriaStatsJugador === 'recibiendo'
                                ? 'Recibiendo'
                                : subcategoriaStatsJugador === 'corriendo'
                                ? 'Corriendo'
                                : 'Pasando'}
                            </h3>
                          </div>

                          <button
                            onClick={() => setVistaStatsCompleta(false)}
                            className="shrink-0 px-3 py-2 rounded-lg border border-red-600 text-red-700 hover:bg-red-700 hover:text-white transition-all font-['Orbitron'] font-black text-[8px] md:text-[10px] uppercase"
                          >
                            ← Volver a líderes
                          </button>
                        </div>

                        <p className="md:hidden text-[9px] text-zinc-500 font-semibold mb-2 text-right">
                          Desliza para ver todas las estadísticas →
                        </p>

                        <div className="w-full overflow-x-auto border border-zinc-200 rounded-xl shadow-sm">

                          {subcategoriaStatsJugador === 'recibiendo' ? (

                            /* ================= TABLA RECIBIENDO ================= */
                            <table className="min-w-[1120px] w-full border-collapse text-xs">
                              <thead>
                                <tr className="bg-zinc-100 text-zinc-600 font-black uppercase">

                                  <th className="sticky left-0 z-30 w-11 min-w-11 bg-zinc-100 border-r border-zinc-300 px-2 py-3 text-center">
                                    POS
                                  </th>

                                  <th className="sticky left-11 z-30 min-w-[168px] md:min-w-[220px] bg-zinc-100 border-r-2 border-zinc-300 px-3 py-3 text-left">
                                    NOMBRE
                                  </th>

                                  {[
                                    'POS', 'GP', 'REC', 'TGT',
                                    'YDS', 'AVG', 'YDS/G', 'LNG', 'TD', 'FUM'
                                  ].map((col) => (
                                    <th
                                      key={col}
                                      className="min-w-[72px] px-3 py-3 text-center whitespace-nowrap border-r border-zinc-200"
                                    >
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>

                              <tbody>
                                {[
                                  ['Jaxon Smith-Njigba', 'SEA', 'WR', '17', '119', '168', '1,793', '15.1', '105.5', '72', '10', '1'],
                                  ['Puka Nacua', 'LAR', 'WR', '17', '129', '174', '1,715', '13.3', '100.9', '65', '10', '1'],
                                  ["Ja'Marr Chase", 'CIN', 'WR', '17', '117', '171', '1,589', '13.6', '93.5', '70', '12', '1'],
                                  ['Amon-Ra St. Brown', 'DET', 'WR', '17', '115', '158', '1,478', '12.9', '86.9', '61', '11', '0'],
                                  ['CeeDee Lamb', 'DAL', 'WR', '17', '108', '157', '1,421', '13.2', '83.6', '58', '9', '1'],
                                  ['Justin Jefferson', 'MIN', 'WR', '17', '103', '153', '1,389', '13.5', '81.7', '63', '9', '0'],
                                  ['Drake London', 'ATL', 'WR', '17', '101', '149', '1,342', '13.3', '78.9', '56', '10', '1'],
                                  ['Nico Collins', 'HOU', 'WR', '16', '96', '141', '1,301', '13.6', '81.3', '67', '8', '0'],
                                  ['George Pickens', 'DAL', 'WR', '17', '91', '139', '1,268', '13.9', '74.6', '64', '8', '1'],
                                  ['Trey McBride', 'ARI', 'TE', '17', '112', '154', '1,239', '11.1', '72.9', '44', '8', '1'],
                                ].map((fila, i) => (
                                  <tr
                                    key={fila[0]}
                                    className="border-b border-zinc-100 hover:bg-zinc-50"
                                  >
                                    <td className="sticky left-0 z-20 w-11 min-w-11 bg-white border-r border-zinc-200 px-2 py-3 text-center font-semibold text-zinc-500">
                                      {i + 1}
                                    </td>

                                    <td className="sticky left-11 z-20 min-w-[168px] md:min-w-[220px] bg-white border-r-2 border-zinc-300 px-3 py-3">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <img
                                          src={`https://a.espncdn.com/i/teamlogos/nfl/500/${fila[1].toLowerCase()}.png`}
                                          alt={fila[1]}
                                          className="w-7 h-7 object-contain flex-shrink-0"
                                        />

                                        <div className="min-w-0">
                                          <div className="font-bold text-zinc-900 truncate">
                                            {fila[0]}
                                          </div>
                                          <div className="text-[9px] text-zinc-400 font-semibold">
                                            {fila[1]}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {fila.slice(2).map((valor, idx) => (
                                      <td
                                        key={idx}
                                        className={`min-w-[72px] px-3 py-3 text-center whitespace-nowrap border-r border-zinc-100 ${
                                          idx === 4
                                            ? 'font-black text-red-700'
                                            : 'text-zinc-600'
                                        }`}
                                      >
                                        {valor}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                          ) : subcategoriaStatsJugador === 'corriendo' ? (

                            /* ================= TABLA CORRIENDO ================= */
                            <table className="min-w-[1050px] w-full border-collapse text-xs">
                              <thead>
                                <tr className="bg-zinc-100 text-zinc-600 font-black uppercase">

                                  <th className="sticky left-0 z-30 w-11 min-w-11 bg-zinc-100 border-r border-zinc-300 px-2 py-3 text-center">
                                    POS
                                  </th>

                                  <th className="sticky left-11 z-30 min-w-[168px] md:min-w-[220px] bg-zinc-100 border-r-2 border-zinc-300 px-3 py-3 text-left">
                                    NOMBRE
                                  </th>

                                  {[
                                    'POS', 'GP', 'ATT', 'YDS',
                                    'AVG', 'YDS/G', 'LNG', 'TD', 'FUM'
                                  ].map((col) => (
                                    <th
                                      key={col}
                                      className="min-w-[72px] px-3 py-3 text-center whitespace-nowrap border-r border-zinc-200"
                                    >
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>

                              <tbody>
                                {[
                                  ['James Cook III', 'BUF', 'RB', '17', '309', '1,621', '5.2', '95.4', '65', '16', '2'],
                                  ['Derrick Henry', 'BAL', 'RB', '17', '315', '1,595', '5.1', '93.8', '72', '14', '3'],
                                  ['Jonathan Taylor', 'IND', 'RB', '17', '326', '1,585', '4.9', '93.2', '68', '15', '2'],
                                  ['Bijan Robinson', 'ATL', 'RB', '17', '292', '1,478', '5.1', '86.9', '58', '12', '2'],
                                  ['DeVon Achane', 'MIA', 'RB', '17', '246', '1,350', '5.5', '79.4', '71', '11', '1'],
                                  ['Saquon Barkley', 'PHI', 'RB', '17', '278', '1,326', '4.8', '78.0', '63', '13', '2'],
                                  ['Jahmyr Gibbs', 'DET', 'RB', '17', '251', '1,281', '5.1', '75.4', '57', '13', '1'],
                                  ['Kyren Williams', 'LAR', 'RB', '17', '279', '1,267', '4.5', '74.5', '48', '12', '2'],
                                  ['Josh Jacobs', 'GB', 'RB', '17', '283', '1,245', '4.4', '73.2', '45', '11', '3'],
                                  ['Bucky Irving', 'TB', 'RB', '17', '248', '1,208', '4.9', '71.1', '52', '10', '2'],
                                ].map((fila, i) => (
                                  <tr
                                    key={fila[0]}
                                    className="border-b border-zinc-100 hover:bg-zinc-50"
                                  >
                                    <td className="sticky left-0 z-20 w-11 min-w-11 bg-white border-r border-zinc-200 px-2 py-3 text-center font-semibold text-zinc-500">
                                      {i + 1}
                                    </td>

                                    <td className="sticky left-11 z-20 min-w-[168px] md:min-w-[220px] bg-white border-r-2 border-zinc-300 px-3 py-3">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <img
                                          src={`https://a.espncdn.com/i/teamlogos/nfl/500/${fila[1].toLowerCase()}.png`}
                                          alt={fila[1]}
                                          className="w-7 h-7 object-contain flex-shrink-0"
                                        />

                                        <div className="min-w-0">
                                          <div className="font-bold text-zinc-900 truncate">
                                            {fila[0]}
                                          </div>
                                          <div className="text-[9px] text-zinc-400 font-semibold">
                                            {fila[1]}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {fila.slice(2).map((valor, idx) => (
                                      <td
                                        key={idx}
                                        className={`min-w-[72px] px-3 py-3 text-center whitespace-nowrap border-r border-zinc-100 ${
                                          idx === 3
                                            ? 'font-black text-red-700'
                                            : 'text-zinc-600'
                                        }`}
                                      >
                                        {valor}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                          ) : (

                            /* ================= TABLA PASANDO ================= */
                            <table className="min-w-[1500px] w-full border-collapse text-xs">
                              <thead>
                                <tr className="bg-zinc-100 text-zinc-600 font-black uppercase">

                                  <th className="sticky left-0 z-30 w-11 min-w-11 bg-zinc-100 border-r border-zinc-300 px-2 py-3 text-center">
                                    POS
                                  </th>

                                  <th className="sticky left-11 z-30 min-w-[168px] md:min-w-[220px] bg-zinc-100 border-r-2 border-zinc-300 px-3 py-3 text-left">
                                    NOMBRE
                                  </th>

                                  {[
                                    'POS', 'GP', 'CMP', 'ATT', 'CMP%',
                                    'YDS', 'AVG', 'YDS/G', 'LNG',
                                    'TD', 'INT', 'SACK', 'SYL', 'QBR', 'RTG'
                                  ].map((col) => (
                                    <th
                                      key={col}
                                      className="min-w-[72px] px-3 py-3 text-center whitespace-nowrap border-r border-zinc-200"
                                    >
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>

                              <tbody>
                                {[
                                  ['Matthew Stafford', 'LAR', 'QB', '17', '390', '597', '65.3', '4,707', '7.9', '276.9', '88', '46', '8', '24', '168', '72.4', '109.2'],
                                  ['Jared Goff', 'DET', 'QB', '17', '406', '589', '68.9', '4,564', '7.7', '268.5', '73', '37', '12', '28', '181', '68.1', '103.5'],
                                  ['Dak Prescott', 'DAL', 'QB', '17', '421', '626', '67.3', '4,552', '7.3', '267.8', '64', '30', '11', '31', '201', '64.8', '98.7'],
                                  ['Drake Maye', 'NE', 'QB', '17', '371', '543', '68.3', '4,394', '8.1', '258.5', '67', '31', '9', '36', '238', '70.6', '105.1'],
                                  ['Sam Darnold', 'SEA', 'QB', '17', '341', '526', '64.8', '4,048', '7.7', '238.1', '61', '28', '12', '34', '221', '63.9', '96.8'],
                                  ['Josh Allen', 'BUF', 'QB', '17', '338', '520', '65.0', '3,981', '7.7', '234.2', '63', '29', '10', '27', '174', '69.1', '101.4'],
                                  ['Joe Burrow', 'CIN', 'QB', '16', '356', '548', '65.0', '3,944', '7.2', '246.5', '70', '32', '11', '35', '229', '67.2', '99.6'],
                                  ['Patrick Mahomes', 'KC', 'QB', '17', '360', '553', '65.1', '3,928', '7.1', '231.1', '58', '27', '9', '32', '215', '71.0', '101.0'],
                                  ['Brock Purdy', 'SF', 'QB', '16', '329', '493', '66.7', '3,874', '7.9', '242.1', '71', '29', '10', '29', '192', '68.7', '104.2'],
                                  ['Jordan Love', 'GB', 'QB', '17', '337', '516', '65.3', '3,812', '7.4', '224.2', '59', '28', '11', '30', '197', '65.9', '99.1'],
                                ].map((fila, i) => (
                                  <tr
                                    key={fila[0]}
                                    className="border-b border-zinc-100 hover:bg-zinc-50"
                                  >
                                    <td className="sticky left-0 z-20 w-11 min-w-11 bg-white border-r border-zinc-200 px-2 py-3 text-center font-semibold text-zinc-500">
                                      {i + 1}
                                    </td>

                                    <td className="sticky left-11 z-20 min-w-[168px] md:min-w-[220px] bg-white border-r-2 border-zinc-300 px-3 py-3">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <img
                                          src={`https://a.espncdn.com/i/teamlogos/nfl/500/${fila[1].toLowerCase()}.png`}
                                          alt={fila[1]}
                                          className="w-7 h-7 object-contain flex-shrink-0"
                                        />

                                        <div className="min-w-0">
                                          <div className="font-bold text-zinc-900 truncate">
                                            {fila[0]}
                                          </div>
                                          <div className="text-[9px] text-zinc-400 font-semibold">
                                            {fila[1]}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {fila.slice(2).map((valor, idx) => (
                                      <td
                                        key={idx}
                                        className={`min-w-[72px] px-3 py-3 text-center whitespace-nowrap border-r border-zinc-100 ${
                                          idx === 5
                                            ? 'font-black text-red-700'
                                            : 'text-zinc-600'
                                        }`}
                                      >
                                        {valor}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                        </div>
                      </div>

                    ) : tipoStats === 'jugador' ? (

                      /* ================= JUGADORES ================= */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        <div>
                          <div className={`flex items-center gap-3 border-b-2 pb-2 mb-3 ${
                            categoriaStatsJugador === 'especiales'
                              ? 'border-blue-500'
                              : 'border-red-600'
                          }`}>
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              categoriaStatsJugador === 'especiales'
                                ? 'bg-blue-500'
                                : 'bg-red-600'
                            }`} />
                            <h3 className={`text-base md:text-xl font-black uppercase tracking-wider font-['Orbitron'] italic underline underline-offset-4 ${
                              categoriaStatsJugador === 'especiales'
                                ? 'text-blue-600 decoration-blue-600'
                                : 'text-red-600 decoration-red-600'
                            }`}>
                              {categoriaStatsJugador === 'especiales'
                                ? 'Equipos especiales'
                                : 'Líderes a la ofensiva'}
                            </h3>
                          </div>

                          {(categoriaStatsJugador === 'especiales'
                            ? [
                                {
                                  titulo: 'DEVOLUCIONES',
                                  valor: 'YDS',
                                  filas: [
                                    ['KaVontae Turpin', 'DAL', '812'],
                                    ['Rashid Shaheed', 'NO', '776'],
                                    ['Marvin Mims Jr.', 'DEN', '741'],
                                    ['Xavier Gipson', 'NYJ', '705'],
                                    ['DeAndre Carter', 'CHI', '688'],
                                  ]
                                },
                                {
                                  titulo: 'PATEANDO',
                                  valor: 'PTS',
                                  filas: [
                                    ['Brandon Aubrey', 'DAL', '157'],
                                    ['Chris Boswell', 'PIT', '149'],
                                    ['Cameron Dicker', 'LAC', '145'],
                                    ['Ka’imi Fairbairn', 'HOU', '141'],
                                    ['Jake Bates', 'DET', '138'],
                                  ]
                                },
                                {
                                  titulo: 'DESPEJES',
                                  valor: 'AVG',
                                  filas: [
                                    ['A.J. Cole', 'LV', '50.8'],
                                    ['Ryan Stonehouse', 'TEN', '50.3'],
                                    ['Jack Fox', 'DET', '49.8'],
                                    ['Tress Way', 'WSH', '49.5'],
                                    ['Tommy Townsend', 'HOU', '49.1'],
                                  ]
                                }
                              ]
                            : [
                            {
                              titulo: 'PASANDO',
                              valor: 'YDS',
                              filas: [
                                ['Matthew Stafford', 'LAR', '4,707'],
                                ['Jared Goff', 'DET', '4,564'],
                                ['Dak Prescott', 'DAL', '4,552'],
                                ['Drake Maye', 'NE', '4,394'],
                                ['Sam Darnold', 'SEA', '4,048'],
                              ]
                            },
                            {
                              titulo: 'CORRIENDO',
                              valor: 'YDS',
                              filas: [
                                ['James Cook III', 'BUF', '1,621'],
                                ['Derrick Henry', 'BAL', '1,595'],
                                ['Jonathan Taylor', 'IND', '1,585'],
                                ['Bijan Robinson', 'ATL', '1,478'],
                                ['DeVon Achane', 'MIA', '1,350'],
                              ]
                            },
                            {
                              titulo: 'RECIBIENDO',
                              valor: 'YDS',
                              filas: [
                                ['Jaxon Smith-Njigba', 'SEA', '1,793'],
                                ['Puka Nacua', 'LAR', '1,715'],
                                ['George Pickens', 'DAL', '1,429'],
                                ["Ja'Marr Chase", 'CIN', '1,412'],
                                ['Amon-Ra St. Brown', 'DET', '1,401'],
                              ]
                            }
                              ])
                            .filter((bloque) =>
                              bloque.titulo.toLowerCase() === subcategoriaStatsJugador
                            )
                            .map((bloque) => (
                            <div key={bloque.titulo} className="mb-7">
                              <div className={`flex justify-between items-center px-3 py-2 rounded-t-md text-[10px] md:text-xs font-black text-white font-['Orbitron'] ${
                                categoriaStatsJugador === 'especiales'
                                  ? 'bg-[#002244]'
                                  : 'bg-red-700'
                              }`}>
                                <span>{bloque.titulo}</span>
                                <span>{bloque.valor}</span>
                              </div>

                              {bloque.filas.map((fila, i) => (
                                <div
                                  key={fila[0]}
                                  className="grid grid-cols-[24px_1fr_auto] items-center gap-2 px-1 py-2.5 odd:bg-zinc-50 border-b border-zinc-100"
                                >
                                  <span className="text-xs text-zinc-500">
                                    {i + 1}
                                  </span>

                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={`https://a.espncdn.com/i/teamlogos/nfl/500/${fila[1].toLowerCase()}.png`}
                                      alt={fila[1]}
                                      className="w-6 h-6 object-contain flex-shrink-0"
                                    />
                                    <span className="text-xs md:text-sm font-semibold truncate">
                                      {fila[0]}
                                      <span className="ml-1 text-zinc-400 font-normal">
                                        {fila[1]}
                                      </span>
                                    </span>
                                  </div>

                                  <span className="text-xs md:text-sm text-zinc-600">
                                    {fila[2]}
                                  </span>
                                </div>
                              ))}

                              <button
                                onClick={() => {
                                  if (
                                    categoriaStatsJugador === 'ofensiva' &&
                                    (
                                      subcategoriaStatsJugador === 'pasando' ||
                                      subcategoriaStatsJugador === 'corriendo' ||
                                      subcategoriaStatsJugador === 'recibiendo'
                                    )
                                  ) {
                                    setVistaStatsCompleta(true);
                                  }
                                }}
                                className="w-full py-3 text-xs font-black text-zinc-800 hover:text-red-700 transition-colors"
                              >
                                LISTA COMPLETA
                              </button>
                            </div>
                          ))}
                          {/* ANOTANDO_JUGADOR_REDZONE */}
                          {categoriaStatsJugador === 'anotando' && (
                            <div>
                              <div className="flex items-center gap-3 border-b-2 border-red-600 pb-2 mb-3">
                                <div className="w-3 h-3 bg-red-600 rounded-full flex-shrink-0" />
                                <h3 className="text-base md:text-xl font-black uppercase tracking-wider text-red-600 font-['Orbitron'] italic underline decoration-red-600 underline-offset-4">
                                  Líderes anotando
                                </h3>
                              </div>

                              {[
                                {
                                  titulo: 'TOUCHDOWNS',
                                  valor: 'TD',
                                  filas: [
                                    ['Josh Allen', 'BUF', '15'],
                                    ['Jalen Hurts', 'PHI', '14'],
                                    ['Jahmyr Gibbs', 'DET', '13'],
                                    ['Derrick Henry', 'BAL', '13'],
                                    ['Saquon Barkley', 'PHI', '13'],
                                  ]
                                },
                                {
                                  titulo: 'PUNTOS',
                                  valor: 'PTS',
                                  filas: [
                                    ['Brandon Aubrey', 'DAL', '157'],
                                    ['Chris Boswell', 'PIT', '149'],
                                    ['Cameron Dicker', 'LAC', '145'],
                                    ['Ka’imi Fairbairn', 'HOU', '141'],
                                    ['Jake Bates', 'DET', '138'],
                                  ]
                                },
                                {
                                  titulo: 'TD DE RECEPCIÓN',
                                  valor: 'TD',
                                  filas: [
                                    ["Ja'Marr Chase", 'CIN', '12'],
                                    ['Amon-Ra St. Brown', 'DET', '12'],
                                    ['George Pickens', 'DAL', '11'],
                                    ['Puka Nacua', 'LAR', '10'],
                                    ['Jaxon Smith-Njigba', 'SEA', '10'],
                                  ]
                                }
                              ].map((bloque) => (
                                <div key={bloque.titulo} className="mb-7">
                                  <div className="flex justify-between items-center bg-red-700 px-3 py-2 rounded-t-md text-[10px] md:text-xs font-black text-white font-['Orbitron']">
                                    <span>{bloque.titulo}</span>
                                    <span>{bloque.valor}</span>
                                  </div>

                                  {bloque.filas.map((fila, i) => (
                                    <div
                                      key={fila[0]}
                                      className="grid grid-cols-[24px_1fr_auto] items-center gap-2 px-1 py-2.5 odd:bg-zinc-50 border-b border-zinc-100"
                                    >
                                      <span className="text-xs text-zinc-500">
                                        {i + 1}
                                      </span>

                                      <div className="flex items-center gap-2 min-w-0">
                                        <img
                                          src={`https://a.espncdn.com/i/teamlogos/nfl/500/${fila[1].toLowerCase()}.png`}
                                          alt={fila[1]}
                                          className="w-6 h-6 object-contain flex-shrink-0"
                                        />

                                        <span className="text-xs md:text-sm font-semibold truncate">
                                          {fila[0]}
                                          <span className="ml-1 text-zinc-400 font-normal">
                                            {fila[1]}
                                          </span>
                                        </span>
                                      </div>

                                      <span className="text-xs md:text-sm text-zinc-600">
                                        {fila[2]}
                                      </span>
                                    </div>
                                  ))}

                                  <button className="w-full py-3 text-xs font-black text-zinc-800 hover:text-red-700 transition-colors">
                                    LISTA COMPLETA
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}


                        </div>

                        {categoriaStatsJugador === 'defensiva' && (
                          <div>
                            <div className="flex items-center gap-3 border-b-2 border-blue-500 pb-2 mb-3">
                              <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" />
                              <h3 className="text-base md:text-xl font-black uppercase tracking-wider text-blue-600 font-['Orbitron'] italic underline decoration-blue-600 underline-offset-4">
                                Líderes a la defensiva
                              </h3>
                            </div>

                          {[
                            {
                              titulo: 'TACLEADAS',
                              valor: 'TOT',
                              filas: [
                                ['Jordyn Brooks', 'MIA', '183'],
                                ['Jack Campbell', 'DET', '176'],
                                ['Devin White', 'LV', '174'],
                                ['Cedric Gray', 'TEN', '164'],
                                ['Bobby Wagner', 'WSH', '162'],
                              ]
                            },
                            {
                              titulo: 'CAPTURAS DE MARISCAL',
                              valor: 'SACK',
                              filas: [
                                ['Myles Garrett', 'CLE', '23.0'],
                                ['Brian Burns', 'NYG', '16.5'],
                                ['Danielle Hunter', 'HOU', '15.0'],
                                ['Aidan Hutchinson', 'DET', '14.5'],
                                ['Nik Bonitto', 'DEN', '14.0'],
                              ]
                            },
                            {
                              titulo: 'INTERCEPCIONES',
                              valor: 'INT',
                              filas: [
                                ['Kevin Byard', 'CHI', '7'],
                                ['Devin Lloyd', 'JAX', '5'],
                                ['Jaycee Horn', 'CAR', '5'],
                                ['Ernest Jones IV', 'SEA', '5'],
                                ['Antonio Johnson', 'JAX', '5'],
                              ]
                            }
                          ].map((bloque) => (
                            <div key={bloque.titulo} className="mb-7">
                              <div className="flex justify-between items-center bg-[#002244] px-3 py-2 rounded-t-md text-[10px] md:text-xs font-black text-white font-['Orbitron']">
                                <span>{bloque.titulo}</span>
                                <span>{bloque.valor}</span>
                              </div>

                              {bloque.filas.map((fila, i) => (
                                <div
                                  key={fila[0]}
                                  className="grid grid-cols-[24px_1fr_auto] items-center gap-2 px-1 py-2.5 odd:bg-zinc-50 border-b border-zinc-100"
                                >
                                  <span className="text-xs text-zinc-500">
                                    {i + 1}
                                  </span>

                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={`https://a.espncdn.com/i/teamlogos/nfl/500/${fila[1].toLowerCase()}.png`}
                                      alt={fila[1]}
                                      className="w-6 h-6 object-contain flex-shrink-0"
                                    />
                                    <span className="text-xs md:text-sm font-semibold truncate">
                                      {fila[0]}
                                      <span className="ml-1 text-zinc-400 font-normal">
                                        {fila[1]}
                                      </span>
                                    </span>
                                  </div>

                                  <span className="text-xs md:text-sm text-zinc-600">
                                    {fila[2]}
                                  </span>
                                </div>
                              ))}

                              <button
                                onClick={() => setVistaStatsCompleta(true)}
                                className="w-full py-3 text-xs font-black text-zinc-800 hover:text-blue-700 transition-colors"
                              >
                                LISTA COMPLETA
                              </button>
                            </div>
                          ))}
                          </div>
                        )}

                      </div>

                    ) : (

                      /* ================= EQUIPOS ================= */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* ================= OFENSIVA EQUIPOS ================= */}
                        <div className={categoriaStatsEquipo === 'ofensiva' ? '' : 'hidden'}>
                          <div className="flex items-center gap-3 border-b-2 border-red-600 pb-2 mb-3">
                            <div className="w-3 h-3 bg-red-600 rounded-full flex-shrink-0" />
                            <h3 className="text-base md:text-xl font-black uppercase tracking-wider text-red-600 font-['Orbitron'] italic underline decoration-red-600 underline-offset-4">
                              Líderes a la ofensiva
                            </h3>
                          </div>

                          {[
                            {
                              titulo: 'YARDAS TOTALES',
                              valor: 'YDS/G',
                              filas: [
                                ['Los Angeles Rams', 'LAR', '394.6'],
                                ['Dallas Cowboys', 'DAL', '391.9'],
                                ['New England Patriots', 'NE', '379.4'],
                                ['Buffalo Bills', 'BUF', '376.3'],
                                ['Detroit Lions', 'DET', '373.2'],
                              ]
                            },
                            {
                              titulo: 'PASANDO',
                              valor: 'YDS/G',
                              filas: [
                                ['Los Angeles Rams', 'LAR', '268.1'],
                                ['Dallas Cowboys', 'DAL', '266.3'],
                                ['Detroit Lions', 'DET', '253.1'],
                                ['New England Patriots', 'NE', '250.5'],
                                ['San Francisco 49ers', 'SF', '244.5'],
                              ]
                            },
                            {
                              titulo: 'CORRIENDO',
                              valor: 'YDS/G',
                              filas: [
                                ['Buffalo Bills', 'BUF', '159.6'],
                                ['Baltimore Ravens', 'BAL', '156.6'],
                                ['Chicago Bears', 'CHI', '144.5'],
                                ['Washington Commanders', 'WSH', '134.7'],
                                ['New York Giants', 'NYG', '129.1'],
                              ]
                            }
                          ].map((bloque) => (
                            <div key={bloque.titulo} className="mb-7">
                              <div className="flex justify-between items-center bg-red-700 px-3 py-2 rounded-t-md text-[10px] md:text-xs font-black text-white font-['Orbitron']">
                                <span>{bloque.titulo}</span>
                                <span>{bloque.valor}</span>
                              </div>

                              {bloque.filas.map((fila, i) => (
                                <div
                                  key={fila[1]}
                                  className="grid grid-cols-[24px_1fr_auto] items-center gap-2 px-1 py-2.5 odd:bg-zinc-50 border-b border-zinc-100"
                                >
                                  <span className="text-xs text-zinc-500">
                                    {i + 1}
                                  </span>

                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={`https://a.espncdn.com/i/teamlogos/nfl/500/${fila[1].toLowerCase()}.png`}
                                      alt={fila[0]}
                                      className="w-7 h-7 object-contain flex-shrink-0"
                                    />

                                    <span className="text-xs md:text-sm font-semibold truncate">
                                      {fila[0]}
                                    </span>
                                  </div>

                                  <span className="text-xs md:text-sm text-zinc-600">
                                    {fila[2]}
                                  </span>
                                </div>
                              ))}

                              <button className="w-full py-3 text-xs font-black text-zinc-800 hover:text-red-700 transition-colors">
                                LISTA COMPLETA
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* ================= DEFENSIVA EQUIPOS ================= */}
                        <div className={categoriaStatsEquipo === 'defensiva' ? '' : 'hidden'}>
                          <div className="flex items-center gap-3 border-b-2 border-blue-500 pb-2 mb-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" />
                            <h3 className="text-base md:text-xl font-black uppercase tracking-wider text-blue-600 font-['Orbitron'] italic underline decoration-blue-600 underline-offset-4">
                              Líderes a la defensiva
                            </h3>
                          </div>

                          {[
                            {
                              titulo: 'YARDAS PERMITIDAS',
                              valor: 'YDS/G',
                              filas: [
                                ['Houston Texans', 'HOU', '277.2'],
                                ['Denver Broncos', 'DEN', '278.2'],
                                ['Minnesota Vikings', 'MIN', '282.6'],
                                ['Cleveland Browns', 'CLE', '283.6'],
                                ['Los Angeles Chargers', 'LAC', '285.2'],
                              ]
                            },
                            {
                              titulo: 'CAPTURAS DE MARISCAL',
                              valor: 'SACK',
                              filas: [
                                ['Denver Broncos', 'DEN', '68.0'],
                                ['Atlanta Falcons', 'ATL', '57.0'],
                                ['Cleveland Browns', 'CLE', '53.0'],
                                ['Detroit Lions', 'DET', '49.0'],
                                ['Minnesota Vikings', 'MIN', '49.0'],
                              ]
                            },
                            {
                              titulo: 'ENTREGAS',
                              valor: 'DIFF',
                              filas: [
                                ['Chicago Bears', 'CHI', '22'],
                                ['Houston Texans', 'HOU', '17'],
                                ['Jacksonville Jaguars', 'JAX', '13'],
                                ['Pittsburgh Steelers', 'PIT', '12'],
                                ['Los Angeles Rams', 'LAR', '11'],
                              ]
                            }
                          ].map((bloque) => (
                            <div key={bloque.titulo} className="mb-7">
                              <div className="flex justify-between items-center bg-[#002244] px-3 py-2 rounded-t-md text-[10px] md:text-xs font-black text-white font-['Orbitron']">
                                <span>{bloque.titulo}</span>
                                <span>{bloque.valor}</span>
                              </div>

                              {bloque.filas.map((fila, i) => (
                                <div
                                  key={fila[1]}
                                  className="grid grid-cols-[24px_1fr_auto] items-center gap-2 px-1 py-2.5 odd:bg-zinc-50 border-b border-zinc-100"
                                >
                                  <span className="text-xs text-zinc-500">
                                    {i + 1}
                                  </span>

                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={`https://a.espncdn.com/i/teamlogos/nfl/500/${fila[1].toLowerCase()}.png`}
                                      alt={fila[0]}
                                      className="w-7 h-7 object-contain flex-shrink-0"
                                    />

                                    <span className="text-xs md:text-sm font-semibold truncate">
                                      {fila[0]}
                                    </span>
                                  </div>

                                  <span className="text-xs md:text-sm text-zinc-600">
                                    {fila[2]}
                                  </span>
                                </div>
                              ))}

                              <button className="w-full py-3 text-xs font-black text-zinc-800 hover:text-blue-700 transition-colors">
                                LISTA COMPLETA
                              </button>
                            </div>
                          ))}
                        </div>

                      </div>
                    )}

                  </div>
                
                          {/* ESPECIALES_EQUIPO_REDZONE */}
                          <div className={categoriaStatsEquipo === 'especiales' ? '' : 'hidden'}>
                            <div className="flex items-center gap-3 border-b-2 border-blue-500 pb-2 mb-3">
                              <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" />
                              <h3 className="text-base md:text-xl font-black uppercase tracking-wider text-blue-600 font-['Orbitron'] italic underline decoration-blue-600 underline-offset-4">
                                Equipos especiales
                              </h3>
                            </div>

                            {[
                              {
                                titulo: 'DEVOLUCIONES',
                                valor: 'YDS',
                                filas: [
                                  ['Dallas Cowboys', 'DAL', '1,486'],
                                  ['Denver Broncos', 'DEN', '1,421'],
                                  ['New Orleans Saints', 'NO', '1,397'],
                                  ['Chicago Bears', 'CHI', '1,362'],
                                  ['New York Jets', 'NYJ', '1,331'],
                                ]
                              },
                              {
                                titulo: 'PATEANDO',
                                valor: 'PTS',
                                filas: [
                                  ['Dallas Cowboys', 'DAL', '157'],
                                  ['Pittsburgh Steelers', 'PIT', '149'],
                                  ['Los Angeles Chargers', 'LAC', '145'],
                                  ['Houston Texans', 'HOU', '141'],
                                  ['Detroit Lions', 'DET', '138'],
                                ]
                              },
                              {
                                titulo: 'DESPEJES',
                                valor: 'AVG',
                                filas: [
                                  ['Las Vegas Raiders', 'LV', '50.8'],
                                  ['Tennessee Titans', 'TEN', '50.3'],
                                  ['Detroit Lions', 'DET', '49.8'],
                                  ['Washington Commanders', 'WSH', '49.5'],
                                  ['Houston Texans', 'HOU', '49.1'],
                                ]
                              }
                            ].map((bloque) => (
                              <div key={bloque.titulo} className="mb-7">
                                <div className="flex justify-between items-center bg-[#002244] px-3 py-2 rounded-t-md text-[10px] md:text-xs font-black text-white font-['Orbitron']">
                                  <span>{bloque.titulo}</span>
                                  <span>{bloque.valor}</span>
                                </div>

                                {bloque.filas.map((fila, i) => (
                                  <div
                                    key={fila[1]}
                                    className="grid grid-cols-[24px_1fr_auto] items-center gap-2 px-1 py-2.5 odd:bg-zinc-50 border-b border-zinc-100"
                                  >
                                    <span className="text-xs text-zinc-500">
                                      {i + 1}
                                    </span>

                                    <div className="flex items-center gap-2 min-w-0">
                                      <img
                                        src={`https://a.espncdn.com/i/teamlogos/nfl/500/${fila[1].toLowerCase()}.png`}
                                        alt={fila[0]}
                                        className="w-7 h-7 object-contain flex-shrink-0"
                                      />
                                      <span className="text-xs md:text-sm font-semibold truncate">
                                        {fila[0]}
                                      </span>
                                    </div>

                                    <span className="text-xs md:text-sm text-zinc-600">
                                      {fila[2]}
                                    </span>
                                  </div>
                                ))}

                                <button className="w-full py-3 text-xs font-black text-zinc-800 hover:text-blue-700 transition-colors">
                                  LISTA COMPLETA
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* ENTREGAS_EQUIPO_REDZONE */}
                          <div className={categoriaStatsEquipo === 'entregas' ? '' : 'hidden'}>
                            <div className="flex items-center gap-3 border-b-2 border-red-600 pb-2 mb-3">
                              <div className="w-3 h-3 bg-red-600 rounded-full flex-shrink-0" />
                              <h3 className="text-base md:text-xl font-black uppercase tracking-wider text-red-600 font-['Orbitron'] italic underline decoration-red-600 underline-offset-4">
                                Entregas
                              </h3>
                            </div>

                            {[
                              {
                                titulo: 'BALONES PERDIDOS',
                                valor: 'GIVE',
                                filas: [
                                  ['Tennessee Titans', 'TEN', '28'],
                                  ['New York Giants', 'NYG', '27'],
                                  ['Las Vegas Raiders', 'LV', '26'],
                                  ['Cleveland Browns', 'CLE', '25'],
                                  ['New York Jets', 'NYJ', '24'],
                                ]
                              },
                              {
                                titulo: 'BALONES RECUPERADOS',
                                valor: 'TAKE',
                                filas: [
                                  ['Chicago Bears', 'CHI', '34'],
                                  ['Houston Texans', 'HOU', '31'],
                                  ['Jacksonville Jaguars', 'JAX', '29'],
                                  ['Pittsburgh Steelers', 'PIT', '28'],
                                  ['Los Angeles Rams', 'LAR', '27'],
                                ]
                              },
                              {
                                titulo: 'DIFERENCIAL',
                                valor: 'DIFF',
                                filas: [
                                  ['Chicago Bears', 'CHI', '+22'],
                                  ['Houston Texans', 'HOU', '+17'],
                                  ['Jacksonville Jaguars', 'JAX', '+13'],
                                  ['Pittsburgh Steelers', 'PIT', '+12'],
                                  ['Los Angeles Rams', 'LAR', '+11'],
                                ]
                              }
                            ].map((bloque) => (
                              <div key={bloque.titulo} className="mb-7">
                                <div className="flex justify-between items-center bg-red-700 px-3 py-2 rounded-t-md text-[10px] md:text-xs font-black text-white font-['Orbitron']">
                                  <span>{bloque.titulo}</span>
                                  <span>{bloque.valor}</span>
                                </div>

                                {bloque.filas.map((fila, i) => (
                                  <div
                                    key={fila[1]}
                                    className="grid grid-cols-[24px_1fr_auto] items-center gap-2 px-1 py-2.5 odd:bg-zinc-50 border-b border-zinc-100"
                                  >
                                    <span className="text-xs text-zinc-500">
                                      {i + 1}
                                    </span>

                                    <div className="flex items-center gap-2 min-w-0">
                                      <img
                                        src={`https://a.espncdn.com/i/teamlogos/nfl/500/${fila[1].toLowerCase()}.png`}
                                        alt={fila[0]}
                                        className="w-7 h-7 object-contain flex-shrink-0"
                                      />
                                      <span className="text-xs md:text-sm font-semibold truncate">
                                        {fila[0]}
                                      </span>
                                    </div>

                                    <span className="text-xs md:text-sm text-zinc-600">
                                      {fila[2]}
                                    </span>
                                  </div>
                                ))}

                                <button className="w-full py-3 text-xs font-black text-zinc-800 hover:text-red-700 transition-colors">
                                  LISTA COMPLETA
                                </button>
                              </div>
                            ))}
                          </div>
              </div>
          </section>
          )}

        {pestanaActiva === 'noticias' && (
          <div className="w-full bg-[#002244]">
            <div className="w-full md:max-w-4xl mx-auto flex items-center justify-start md:justify-evenly gap-4 md:gap-6 overflow-x-auto px-3 py-3 md:py-2">
              {[
                ['TODAS', '/todas.png'],
                ['LESIONES', '/lesion.png'],
                ['SANCIONES', '/sancion.png'],
                ['FICHAJES', '/fichajes.png'],
                ['RUMORES', '/rumores.png'],
                ['PARTIDOS', '/partidos.png'],
                ['OTROS', '/otros.png']
              ].map(([filtro, icono]) => {
                const activo = filtroNoticias === filtro;

                return (
                  <button
                    key={filtro}
                    onClick={() =>
                      setFiltroNoticias(filtro as 'TODAS' | CategoriaNoticia)
                    }
                    className={`shrink-0 min-w-[62px] md:min-w-[82px] flex flex-col items-center justify-center gap-1.5 text-white transition-all ${
                      activo
                        ? 'opacity-100'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={icono}
                      alt={filtro}
                      className={`w-8 h-8 md:w-10 md:h-10 object-contain transition-transform ${
                        activo ? 'scale-105' : ''
                      }`}
                    />

                    <span className="font-['Orbitron'] text-[7px] md:text-[9px] font-bold uppercase tracking-wide whitespace-nowrap">
                      {filtro}
                    </span>

                    <span
                      className={`h-[2px] w-7 rounded-full ${
                        activo
                          ? 'bg-white opacity-100'
                          : 'opacity-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto">
          {pestanaActiva === 'clasificacion' && <section className="space-y-4"><div className="space-y-4">{usuarios.map((usr) => <div key={usr.id} className={`${usr.colorBg} border-2 ${usr.colorBorder} rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl transition-all relative overflow-hidden`}><img src={usr.logoEquipo} alt={usr.nombreEquipo} className="md:hidden absolute top-2 right-2 w-20 h-20 object-contain opacity-90 drop-shadow-md" /><div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-start"><div className="flex items-center gap-3 md:gap-5"><span className="font-black text-white text-2xl md:text-4xl min-w-[35px] font-['Orbitron'] italic">{usr.posicion}</span><img src={usr.avatar} alt={usr.nombre} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 border-white object-cover shadow-lg flex-shrink-0" /><div className="flex items-center gap-4 md:gap-8"><div className="flex flex-col justify-center w-28 md:w-36 flex-shrink-0"><span className="text-[10px] md:text-xs font-mono tracking-widest text-zinc-300 uppercase font-semibold">HEADCOACH</span><span className="text-xl md:text-3xl font-black text-white tracking-wider font-['Orbitron'] italic uppercase">{usr.nombre}</span></div><div className="hidden md:flex items-center gap-6 ml-4 md:ml-20"><img src={usr.logoEquipo} alt={usr.nombreEquipo} className="h-20 w-20 md:h-32 md:w-32 object-contain drop-shadow-xl flex-shrink-0" /><span className="text-base md:text-xl font-black text-white uppercase font-['Orbitron'] tracking-wider drop-shadow-md">{usr.nombreEquipo}</span></div></div></div></div><div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 w-full md:w-auto border-t md:border-t-0 border-white/20 pt-3 md:pt-0"><div className="text-left md:text-right"><p className="text-xs md:text-sm font-bold text-white/80 uppercase tracking-wider font-['Orbitron']">Puntuación Total</p><p className="text-2xl md:text-4xl font-black text-white leading-none font-['Orbitron'] italic">{usr.puntos} <span className="text-sm md:text-lg font-bold opacity-80">pts</span></p></div><div className="text-left md:text-right"><p className="text-xs md:text-sm font-bold text-white/80 uppercase tracking-wider font-['Orbitron']">Efectividad</p><p className="text-xl md:text-3xl font-black text-white leading-none font-['Orbitron'] italic">{usr.efectividad}</p></div>{usr.esLider || usr.esColider ? <span className={`text-sm md:text-base px-4 py-2 rounded-xl font-black shadow-lg font-['Orbitron'] italic ${usr.colorBadge}`}>{usr.esColider ? 'Colíder 🏆' : 'Líder 🏆'}</span> : <div className="w-20 hidden md:block"></div>}</div></div>)}</div></section>}

          {pestanaActiva === 'pronosticos' && (
            <section className="space-y-6 max-w-5xl mx-auto">

              {desempateActivo && (
                <div className="max-w-xl mx-auto">
                  <div className="bg-gradient-to-b from-zinc-700 via-zinc-900 to-black border-4 border-zinc-500 rounded-[2rem] p-5 md:p-8 shadow-2xl">

                    <div className="bg-black border-2 border-red-700 rounded-2xl px-4 py-4 mb-5 flex justify-center">
                      <img
                        src="/redzone1_logo.png"
                        alt="REDZONE"
                        className="h-12 md:h-16 object-contain"
                      />
                    </div>

                    <div className="text-center mb-5">
                      <h2 className="font-['Orbitron'] font-black text-xl md:text-2xl uppercase text-white tracking-wider">
                        DESEMPATE SUPER BOWL
                      </h2>

                      <p className="font-['Orbitron'] text-xs md:text-sm text-zinc-300 mt-2">
                        {estadoDesempate?.estado === 'clasificatoria'
                          ? 'RONDA CLASIFICATORIA'
                          : 'TIRADA PARA ELEGIR PRIMERO'}
                      </p>
                    </div>

                    <div className="bg-black border-4 border-zinc-600 rounded-2xl p-4 md:p-6 shadow-inner">
                      <div className="grid grid-cols-3 gap-3 md:gap-5">

                        {digitosRuleta.map((digito, index) => (
                          <div
                            key={index}
                            className={`relative overflow-hidden bg-white border-4 border-zinc-400 rounded-xl h-28 md:h-36 flex items-center justify-center shadow-inner ${
                              girandoRuleta ? 'animate-pulse' : ''
                            }`}
                          >
                            <span className="font-['Orbitron'] text-6xl md:text-8xl font-black text-black tabular-nums">
                              {digito}
                            </span>

                            <div className="absolute top-0 left-0 right-0 h-5 bg-gradient-to-b from-black/30 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-black/30 to-transparent" />
                          </div>
                        ))}

                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={handleTirarDesempate}
                        disabled={
                          girandoRuleta ||
                          cargandoDesempate ||
                          !usuarioParticipaDesempate ||
                          Boolean(tiradaUsuarioActual)
                        }
                        className={`w-full py-4 md:py-5 rounded-2xl border-4 font-['Orbitron'] font-black text-xl md:text-2xl uppercase tracking-widest shadow-xl transition-all ${
                          girandoRuleta
                            ? 'bg-amber-500 text-black border-amber-300 cursor-wait'
                            : tiradaUsuarioActual
                              ? 'bg-zinc-700 text-zinc-300 border-zinc-500 cursor-not-allowed'
                              : usuarioParticipaDesempate
                                ? 'bg-red-700 hover:bg-red-600 text-white border-red-500 cursor-pointer active:scale-95'
                                : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                        }`}
                      >
                        {girandoRuleta
                          ? 'GIRANDO...'
                          : tiradaUsuarioActual
                            ? `TIRADA: ${String(tiradaUsuarioActual.valor).padStart(3, '0')}`
                            : usuarioParticipaDesempate
                              ? 'TIRAR'
                              : '🔒 NO PARTICIPAS'}
                      </button>
                    </div>

                    {tiradaUsuarioActual && (
                      <p className="mt-4 text-center font-['Orbitron'] text-sm text-emerald-400 font-bold">
                        ✓ TIRADA REGISTRADA EN SUPABASE
                      </p>
                    )}

                    {usuarioParticipaDesempate && !tiradaUsuarioActual && !girandoRuleta && (
                      <p className="mt-4 text-center font-['Orbitron'] text-xs text-zinc-300">
                        SOLO PUEDES REALIZAR UNA TIRADA EN ESTA RONDA
                      </p>
                    )}

                    {!usuarioParticipaDesempate && (
                      <p className="mt-4 text-center font-['Orbitron'] text-xs text-zinc-400">
                        ESPERANDO EL RESULTADO DE LOS PARTICIPANTES
                      </p>
                    )}

                    {errorDesempate && (
                      <div className="mt-4 bg-red-950 border border-red-600 rounded-xl p-3 text-center text-red-200 font-bold">
                        {errorDesempate}
                      </div>
                    )}

                  </div>
                </div>
              )}

              {eleccionSuperbowlActiva && partidoSuperbowl && (
                <div className="max-w-2xl mx-auto">
                  <div className="bg-gradient-to-b from-zinc-700 via-zinc-900 to-black border-4 border-zinc-500 rounded-[2rem] p-5 md:p-8 shadow-2xl">

                    <div className="bg-black border-2 border-red-700 rounded-2xl px-4 py-4 mb-5 flex justify-center">
                      <img
                        src="/redzone1_logo.png"
                        alt="REDZONE"
                        className="h-12 md:h-16 object-contain"
                      />
                    </div>

                    <div className="text-center mb-6">
                      <h2 className="font-['Orbitron'] font-black text-xl md:text-2xl uppercase text-white tracking-wider">
                        ELECCIÓN SUPER BOWL
                      </h2>

                      <p className="font-['Orbitron'] text-xs md:text-sm text-zinc-300 mt-2">
                        {usuarioPuedeElegirSuperbowl
                          ? 'HAS GANADO LA TIRADA · ELIGE TU EQUIPO'
                          : eleccionUsuarioSuperbowl
                            ? 'TU EQUIPO PARA LA SUPER BOWL'
                            : 'ESPERANDO LA ELECCIÓN DEL GANADOR'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:gap-6">

                      {[
                        {
                          codigo: partidoSuperbowl.equipo_local,
                          nombre:
                            partidoSuperbowl.info_local?.nombre ||
                            partidoSuperbowl.equipo_local,
                          logo: partidoSuperbowl.info_local?.logo_url || '',
                        },
                        {
                          codigo: partidoSuperbowl.equipo_visitante,
                          nombre:
                            partidoSuperbowl.info_visitante?.nombre ||
                            partidoSuperbowl.equipo_visitante,
                          logo: partidoSuperbowl.info_visitante?.logo_url || '',
                        },
                      ].map((equipo) => {
                        const seleccionado =
                          eleccionUsuarioSuperbowl?.equipo === equipo.codigo;

                        return (
                          <button
                            key={equipo.codigo}
                            type="button"
                            onClick={() =>
                              usuarioPuedeElegirSuperbowl &&
                              handleElegirEquipoSuperbowl(equipo.codigo)
                            }
                            disabled={
                              !usuarioPuedeElegirSuperbowl ||
                              guardandoEleccionSuperbowl
                            }
                            className={`relative min-h-[190px] md:min-h-[240px] rounded-2xl border-4 p-4 flex flex-col items-center justify-center gap-4 transition-all ${
                              seleccionado
                                ? 'bg-emerald-600 border-emerald-300 text-white scale-[1.02]'
                                : usuarioPuedeElegirSuperbowl
                                  ? 'bg-white border-zinc-300 text-black hover:border-red-500 hover:scale-[1.02] cursor-pointer'
                                  : 'bg-zinc-800 border-zinc-600 text-zinc-300 cursor-not-allowed'
                            }`}
                          >
                            <img
                              src={equipo.logo}
                              alt={equipo.nombre}
                              className="w-24 h-24 md:w-32 md:h-32 object-contain"
                            />

                            <span className="font-['Orbitron'] font-black text-sm md:text-lg uppercase text-center">
                              {equipo.nombre}
                            </span>

                            {seleccionado && (
                              <span className="font-['Orbitron'] font-black text-xs uppercase">
                                ✓ TU EQUIPO
                              </span>
                            )}

                            {!usuarioPuedeElegirSuperbowl &&
                              !seleccionado &&
                              !eleccionUsuarioSuperbowl && (
                                <span className="absolute top-3 right-3 text-xl">
                                  🔒
                                </span>
                              )}
                          </button>
                        );
                      })}

                    </div>

                    {guardandoEleccionSuperbowl && (
                      <p className="mt-5 text-center font-['Orbitron'] font-bold text-amber-400">
                        GUARDANDO ELECCIÓN...
                      </p>
                    )}

                    {eleccionUsuarioSuperbowl && (
                      <div className="mt-6 bg-emerald-950 border-2 border-emerald-600 rounded-xl p-4 text-center">
                        <p className="font-['Orbitron'] font-black text-emerald-300 uppercase">
                          ✓ EQUIPO ASIGNADO
                        </p>
                      </div>
                    )}

                    {!usuarioPuedeElegirSuperbowl &&
                      !eleccionUsuarioSuperbowl && (
                        <div className="mt-6 bg-black border border-zinc-700 rounded-xl p-4 text-center">
                          <p className="font-['Orbitron'] text-xs md:text-sm text-zinc-300 uppercase">
                            🔒 La elección está bloqueada hasta que el ganador de la tirada seleccione equipo
                          </p>
                        </div>
                      )}

                    {errorDesempate && (
                      <div className="mt-4 bg-red-950 border border-red-600 rounded-xl p-3 text-center text-red-200 font-bold">
                        {errorDesempate}
                      </div>
                    )}

                  </div>
                </div>
              )}

              <div className={`${desempateActivo || eleccionSuperbowlActiva ? 'hidden' : ''} bg-white border border-white rounded-2xl p-3 md:p-6 shadow-2xl`}>
                <div className={`mb-4 text-white text-center py-3 px-4 rounded-xl font-['Orbitron'] font-black uppercase tracking-widest ${
                  estadoJornadaActual === 'cerrada' || estadoJornadaActual === 'finalizada'
                    ? 'bg-red-700 border border-red-500'
                    : 'bg-emerald-600 border border-emerald-400'
                }`}>
                  {estadoJornadaActual === 'cerrada' || estadoJornadaActual === 'finalizada'
                    ? '🔒 PORRA CERRADA'
                    : '🔓 PORRA ABIERTA'}
                </div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{datosUsuarioActual.pronosticos.map((p, index, array) => {
              const isLocalSelected = p.eleccion === '1';
              const isVsSelected = p.eleccion === 'X';
              const isVisitorSelected = p.eleccion === '2';

              const seleccionConfirmada =
                estadoBotonConfirmar === 'confirmado' ||
                estadoJornadaActual === 'cerrada' ||
                estadoJornadaActual === 'finalizada';

              const esUltimoEImpar =
                (array.length % 2 !== 0) && (index === array.length - 1);
              return <div key={p.id} className={`bg-[#002244] border border-[#002244] rounded-xl p-2 flex items-center justify-between gap-1.5 h-16 ${esUltimoEImpar ? 'md:col-span-2 md:w-1/2 md:mx-auto' : ''}`}><button onClick={() => handleSeleccionPronostico(p.id, '1')} className={`flex-1 h-full flex items-center justify-center gap-2 px-2 rounded-lg transition-all border ${isLocalSelected
  ? seleccionConfirmada
    ? 'bg-emerald-500 text-black border-emerald-400'
    : 'bg-amber-400 text-black border-amber-300'
  : 'bg-[#2a2a2a] hover:bg-[#383838] border-[#3a3a3a] text-gray-200'}`}><img
                  src={p.localLogo}
                  alt={p.local}
                  className={`object-contain flex-shrink-0 ${
                    p.local === 'NYJ'
                      ? 'w-11 h-11 md:w-12 md:h-12 scale-110 brightness-150 saturate-150'
                      : 'w-[2.25rem] h-[2.25rem] md:w-9 md:h-9'
                  }`}
                />
                <span className="hidden md:inline font-bold text-xs md:text-sm font-['Orbitron'] uppercase text-center">
                  {nombreFanEquipo(p.local)}
                </span></button><button onClick={() => handleSeleccionPronostico(p.id, 'X')} className={`w-12 h-full flex items-center justify-center rounded-lg font-bold text-xs font-['Orbitron'] transition-all border ${isVsSelected
  ? seleccionConfirmada
    ? 'bg-emerald-500 text-black border-emerald-400'
    : 'bg-amber-400 text-black border-amber-300'
  : 'bg-[#2a2a2a] hover:bg-[#383838] border-[#3a3a3a] text-gray-300'}`}>VS</button><button onClick={() => handleSeleccionPronostico(p.id, '2')} className={`flex-1 h-full flex items-center justify-center gap-2 px-2 rounded-lg transition-all border ${isVisitorSelected
  ? seleccionConfirmada
    ? 'bg-emerald-500 text-black border-emerald-400'
    : 'bg-amber-400 text-black border-amber-300'
  : 'bg-[#2a2a2a] hover:bg-[#383838] border-[#3a3a3a] text-gray-200'}`}><span className="hidden md:inline font-bold text-xs md:text-sm font-['Orbitron'] uppercase text-center">
                  {nombreFanEquipo(p.visitante)}
                </span>
                <img
                  src={p.visitanteLogo}
                  alt={p.visitante}
                  className={`object-contain flex-shrink-0 ${
                    p.visitante === 'NYJ'
                      ? 'w-11 h-11 md:w-12 md:h-12 scale-110 brightness-150 saturate-150'
                      : 'w-[2.25rem] h-[2.25rem] md:w-9 md:h-9'
                  }`}
                /></button></div>;
            })}</div><div className="mt-6 pt-2 text-center"><button onClick={handleConfirmarPronosticos} disabled={estadoJornadaActual === 'cerrada' || estadoJornadaActual === 'finalizada'} className={`w-full font-black text-sm py-3.5 rounded-xl shadow-lg transition-colors uppercase tracking-wider ${estadoJornadaActual === 'cerrada' || estadoJornadaActual === 'finalizada' ? 'bg-zinc-700 text-zinc-300 cursor-not-allowed' : estadoBotonConfirmar === 'confirmado' ? 'bg-emerald-500 text-black cursor-pointer' : estadoBotonConfirmar === 'incompleto' ? 'bg-red-600 text-white animate-pulse cursor-pointer' : 'bg-white text-[#d32f2f] hover:bg-gray-100 cursor-pointer'}`}>{estadoJornadaActual === 'cerrada' || estadoJornadaActual === 'finalizada' ? '🔒 PORRA CERRADA' : estadoBotonConfirmar === 'confirmado' ? '✓ Pronósticos Confirmados (Clic para re-editar si deseas)' : estadoBotonConfirmar === 'incompleto' ? '⚠ Faltan partidos por marcar' : 'Confirmar Pronósticos'}</button></div>

              {modoTest && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={handleVotacionAleatoriaYSimular}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 px-4 rounded-xl font-['Orbitron'] uppercase shadow transition-all cursor-pointer"
                  >
                    VOTACIÓN ALEATORIA (JUANJO & CACE) + SIMULAR
                  </button>
                  <button
                    onClick={handleSiguienteJornada}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-3 px-4 rounded-xl font-['Orbitron'] uppercase shadow transition-all cursor-pointer"
                  >
                    SIGUIENTE JORNADA →
                  </button>
                </div>
              )}

            </div></section>
          )}

          {pestanaActiva === 'jornada' && (
            <section className="space-y-8 bg-[#8b0000] p-2 md:p-6 rounded-2xl">
              {modoTest && (
                <div className="flex justify-end py-2">
                  <button
                    onClick={handleValidarJornada}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-['Orbitron'] font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg uppercase transition-all cursor-pointer"
                  >
                    ✓ VALIDAR JORNADA (SIMULAR RESULTADOS)
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{usuarios.map((usr) => {
                const pronosticosUsr = pronosticosPorUsuario[jornadaActual]?.[usr.id]?.pronosticos || [];
                const confirmadoUsr = pronosticosPorUsuario[jornadaActual]?.[usr.id]?.confirmado || false;
                const puntosJornadaActual = calcularPuntosJornada(usr.id, jornadaActual);

                const mapaUuidUsuarios: Record<string, string> = {
                  cace: '088072d0-0782-409f-b5e4-f8a558f27b4f',
                  juanjo: 'dadb359a-8bc1-442e-8202-62fa2f8ddab9',
                  ivan: '351a81a5-86f9-4d6d-a567-f49ed5959e57',
                };

                const uuidUsuario = mapaUuidUsuarios[usr.id];

                const tiradaUsuario = tiradasDesempate.find(
                  (t: any) => t.user_id === uuidUsuario
                );

                const participantesRonda: string[] =
                  estadoDesempate?.participantes || [];

                const participaEnRonda =
                  participantesRonda.includes(uuidUsuario);

                const valoresRonda = tiradasDesempate
                  .filter((t: any) => participantesRonda.includes(t.user_id))
                  .map((t: any) => Number(t.valor))
                  .sort((a: number, b: number) => b - a);

                let valorTiradaJornada = '000';
                let estiloTiradaJornada =
                  'bg-zinc-700 text-zinc-300 border-zinc-500';

                if (participaEnRonda && tiradaUsuario) {
                  valorTiradaJornada = String(tiradaUsuario.valor).padStart(3, '0');

                  if (valoresRonda.length >= 2) {
                    const maxValor = Math.max(...valoresRonda);
                    const minValor = Math.min(...valoresRonda);

                    if (
                      participantesRonda.length === 3 &&
                      valoresRonda.length === 3
                    ) {
                      const ordenados = [...valoresRonda].sort(
                        (a: number, b: number) => b - a
                      );

                      const tripleEmpate =
                        ordenados[0] === ordenados[1] &&
                        ordenados[1] === ordenados[2];

                      const empateSegundaPlaza =
                        ordenados[0] > ordenados[1] &&
                        ordenados[1] === ordenados[2];

                      if (tripleEmpate) {
                        estiloTiradaJornada =
                          'bg-zinc-700 text-zinc-200 border-zinc-500';
                      } else if (empateSegundaPlaza) {
                        estiloTiradaJornada =
                          Number(tiradaUsuario.valor) === ordenados[0]
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-zinc-700 text-zinc-200 border-zinc-500';
                      } else {
                        estiloTiradaJornada =
                          Number(tiradaUsuario.valor) >= ordenados[1]
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-red-700 text-white border-red-500';
                      }
                    } else {
                      const empateDoble = maxValor === minValor;

                      if (empateDoble) {
                        estiloTiradaJornada =
                          'bg-zinc-700 text-zinc-200 border-zinc-500';
                      } else {
                        estiloTiradaJornada =
                          Number(tiradaUsuario.valor) === maxValor
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-red-700 text-white border-red-500';
                      }
                    }
                  } else {
                    estiloTiradaJornada =
                      'bg-zinc-800 text-white border-zinc-600';
                  }
                }

                return <div key={usr.id} className="flex flex-col space-y-3 bg-black/40 p-3 rounded-2xl border border-red-900/60 shadow-xl"><div className="w-full aspect-video bg-black rounded-xl overflow-hidden border-2 border-red-900/80 shadow-2xl relative group"><img src={usr.avatarJornada} alt={usr.nombre} className="w-full h-full object-cover" /></div><div className="space-y-1"><div className={`${usr.colorBg} border border-white/20 rounded-t-lg py-3 text-center text-white font-['Orbitron'] font-black text-2xl leading-none shadow`}>{confirmadoUsr ? `${puntosJornadaActual} aciertos` : '0 aciertos'}</div><div className={`${usr.colorBg} border border-white/20 rounded-b-lg py-3 text-center text-white font-['Orbitron'] font-bold text-xl leading-none tracking-wider`}>Total Acumulado: {usr.puntos} pts</div></div>

                {estadoDesempate && estadoDesempate.estado !== 'inactivo' && (
                  <div
                    className={`border-2 rounded-xl py-3 text-center font-['Orbitron'] font-black text-3xl tracking-[0.25em] shadow-lg ${estiloTiradaJornada}`}
                  >
                    {valorTiradaJornada}
                  </div>
                )}

                <div className="bg-black/90 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-2 space-y-2">{pronosticosUsr.map((p) => {
                  const pronosticosVisibles = estadoJornadaActual === 'cerrada' || estadoJornadaActual === 'finalizada';
                  const eleccion = pronosticosVisibles ? p.eleccion : null;
                  let estiloCajaEleccion = 'bg-black text-amber-400 border-zinc-700';
                  if (eleccion) {
                    if (p.acierto === true) estiloCajaEleccion = 'bg-emerald-500 text-black border-emerald-400 font-black';
                    else if (p.acierto === false) estiloCajaEleccion = 'bg-red-600 text-white border-red-500 font-black';
                    else estiloCajaEleccion = 'bg-white text-black border-white font-black';
                  }
                  return <div key={p.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5 bg-[#2a2a2a] px-2.5 py-2 rounded transition-colors border border-zinc-700/50"><div className="flex items-center justify-center gap-1.5 min-w-0">
                    <img
                      src={p.localLogo}
                      alt={p.local}
                      className={`object-contain flex-shrink-0 ${
                        p.local === 'NYJ'
                          ? 'w-[27px] h-[27px] md:w-[35px] md:h-[35px] brightness-150 saturate-150'
                          : 'w-[22px] h-[22px] md:w-[28px] md:h-[28px]'
                      }`}
                    />
                    <span className="md:hidden font-['Orbitron'] font-bold text-white truncate text-[0.7rem] text-center uppercase">
                      {p.local}
                    </span>
                    <span className="hidden md:inline font-['Orbitron'] font-bold text-white truncate text-[0.8rem] text-center uppercase">
                      {nombreFanEquipo(p.local)}
                    </span>
                  </div><span className="font-['Orbitron'] font-bold text-zinc-300 text-[0.65rem] md:text-[0.75rem] px-0.5 text-center">vs</span><div className="flex items-center justify-center gap-1.5 min-w-0">
                    <span className="md:hidden font-['Orbitron'] font-bold text-white truncate text-[0.7rem] text-center uppercase">
                      {p.visitante}
                    </span>
                    <span className="hidden md:inline font-['Orbitron'] font-bold text-white truncate text-[0.8rem] text-center uppercase">
                      {nombreFanEquipo(p.visitante)}
                    </span>
                    <img
                      src={p.visitanteLogo}
                      alt={p.visitante}
                      className={`object-contain flex-shrink-0 ${
                        p.visitante === 'NYJ'
                          ? 'w-[27px] h-[27px] md:w-[35px] md:h-[35px] brightness-150 saturate-150'
                          : 'w-[22px] h-[22px] md:w-[28px] md:h-[28px]'
                      }`}
                    />
                  </div><div className={`w-6 h-6 md:w-7 md:h-7 flex items-center justify-center border rounded font-['Orbitron'] font-black text-xs md:text-sm ml-1 flex-shrink-0 justify-self-end ${estiloCajaEleccion}`}>{eleccion === '1' ? '1' : eleccion === 'X' ? 'X' : eleccion === '2' ? '2' : '-'}</div></div>;
                })}</div></div>;
              })}</div>
            </section>
          )}

          {pestanaActiva === 'equipos' && (subPestanaEquipos === 'score' || subPestanaEquipos === 'games') && (
            <section className="space-y-6">{subPestanaEquipos === 'score' ? <div className="space-y-8">{sincronizandoPosiciones && <div className="flex justify-end"><span className="text-[10px] text-red-200 font-mono animate-pulse">Actualizando datos desde ESPN...</span></div>}<div className="space-y-4"><div className="border border-white bg-white p-4 rounded-xl space-y-4 shadow-xl"><div className="flex items-center gap-3 border-b-2 border-red-600 pb-2"><div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" /><h3 className="text-base md:text-xl font-black uppercase tracking-wider text-red-600 font-['Orbitron'] italic underline decoration-red-600 underline-offset-4">Conferencia Americana (AFC)</h3></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{divisiones.filter((d) => d.conferencia === 'AFC' || d.nombre.toUpperCase().includes('AFC')).map((div, idx) => renderTablaDivision(div, idx))}</div></div></div><div className="space-y-4 pt-4"><div className="border border-white bg-white p-4 rounded-xl space-y-4 shadow-xl"><div className="flex items-center gap-3 border-b-2 border-blue-500 pb-2"><div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" /><h3 className="text-base md:text-xl font-black uppercase tracking-wider text-blue-600 font-['Orbitron'] italic underline decoration-blue-600 underline-offset-4">Conferencia Nacional (NFC)</h3></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{divisiones.filter((d) => d.conferencia === 'NFC' || d.nombre.toUpperCase().includes('NFC')).map((div, idx) => renderTablaDivision(div, idx))}</div></div></div></div> : (
              <div className="space-y-8">
                {Array.from({ length: 18 }, (_, i) => i + 1).map((jNum) => {
                  const partidosJornada = jornadasOficiales[jNum] || [];

                  if (partidosJornada.length === 0) return null;

                  return (
                    <div
                      key={jNum}
                      className="bg-white border border-white rounded-2xl p-4 md:p-6 shadow-2xl"
                    >
                      <div className="flex items-center gap-3 border-b-2 border-red-600 pb-2 mb-4">
                        <div className="w-3 h-3 bg-red-600 rounded-full flex-shrink-0" />
                        <h3 className="text-base md:text-xl font-black uppercase tracking-wider text-red-600 font-['Orbitron'] italic underline decoration-red-600 underline-offset-4">
                          JORNADA {jNum}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {partidosJornada.map((partido: any) => {
                          const local = partido.local || partido.equipo_local || '';
                          const visitante = partido.visitante || partido.equipo_visitante || '';

                          const localLogo =
                            partido.localLogo ||
                            partido.info_local?.logo_url ||
                            '';

                          const visitanteLogo =
                            partido.visitanteLogo ||
                            partido.info_visitante?.logo_url ||
                            '';

                          const rachaLocal = obtenerRachaEquipo(local, jNum);
                          const rachaVisitante = obtenerRachaEquipo(visitante, jNum);

                          const estadoRaw = String(
                            partido.estado ||
                            partido.status ||
                            ''
                          ).toUpperCase();

                          const esFinal =
                            estadoRaw.includes('FINAL') ||
                            estadoRaw.includes('FINISHED') ||
                            estadoRaw.includes('COMPLETED') ||
                            estadoRaw.includes('CLOSED');

                          const enJuego =
                            estadoRaw.includes('LIVE') ||
                            estadoRaw.includes('IN_PROGRESS') ||
                            estadoRaw.includes('EN_JUEGO');

                          const fechaPartido =
                            partido.fecha_partido ||
                            partido.fechaPartido ||
                            partido.date ||
                            null;

                          let estadoCentral = '--:--';

                          if (esFinal) {
                            estadoCentral = 'FINAL';
                          } else if (enJuego) {
                            const periodo =
                              partido.periodo ??
                              partido.period ??
                              partido.cuarto ??
                              null;

                            const reloj =
                              partido.reloj ??
                              partido.clock ??
                              partido.display_clock ??
                              '';

                            estadoCentral = periodo
                              ? `${periodo}º CUARTO${reloj ? ` · ${reloj}` : ''}`
                              : `EN JUEGO${reloj ? ` · ${reloj}` : ''}`;
                          } else if (fechaPartido) {
                            estadoCentral = new Date(fechaPartido).toLocaleTimeString(
                              'es-ES',
                              {
                                timeZone: 'Europe/Madrid',
                                hour: '2-digit',
                                minute: '2-digit'
                              }
                            );
                          }

                          const mostrarMarcador = esFinal || enJuego;

                          const puntosLocal =
                            partido.puntos_local ??
                            partido.puntosLocal ??
                            '';

                          const puntosVisitante =
                            partido.puntos_visitante ??
                            partido.puntosVisitante ??
                            '';

                          const parseRacha = (racha: string) => {
                            const match = String(racha).match(
                              /(\d+)\s*V\s*-\s*(\d+)\s*D/i
                            );

                            if (!match) {
                              return (
                                <span className="text-zinc-300">
                                  {racha}
                                </span>
                              );
                            }

                            return (
                              <>
                                <span className="text-emerald-400">
                                  {match[1]} V
                                </span>
                                <span className="text-zinc-400">
                                  {' - '}
                                </span>
                                <span className="text-red-400">
                                  {match[2]} D
                                </span>
                              </>
                            );
                          };

                          return (
                            <div
                              key={partido.id}
                              className="bg-[#181818] border border-[#252525] rounded-xl p-3 shadow-md"
                            >
                              {/* CAJÓN SUPERIOR DEL PARTIDO */}
                              <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2">

                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={localLogo}
                                    alt={local}
                                    className="w-7 h-7 object-contain flex-shrink-0"
                                  />
                                  <span className="font-['Orbitron'] font-bold text-xs text-white uppercase truncate">
                                    {local}
                                  </span>
                                </div>

                                <span className="font-['Orbitron'] font-black text-sm text-white min-w-[18px] text-center">
                                  {mostrarMarcador ? puntosLocal : ''}
                                </span>

                                <span className="font-['Orbitron'] font-bold text-xs text-zinc-300 px-1">
                                  VS
                                </span>

                                <span className="font-['Orbitron'] font-black text-sm text-white min-w-[18px] text-center">
                                  {mostrarMarcador ? puntosVisitante : ''}
                                </span>

                                <div className="flex items-center justify-end gap-2 min-w-0">
                                  <span className="font-['Orbitron'] font-bold text-xs text-white uppercase truncate">
                                    {visitante}
                                  </span>
                                  <img
                                    src={visitanteLogo}
                                    alt={visitante}
                                    className="w-7 h-7 object-contain flex-shrink-0"
                                  />
                                </div>
                              </div>

                              {/* RACHA + HORA / ESTADO */}
                              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 px-1 mt-3 mb-3 overflow-hidden">

                                <div className="font-mono text-[9px] md:text-[8px] lg:text-[10px] xl:text-[11px] whitespace-nowrap">
                                  <span className="text-zinc-300 mr-1">
                                    RACHA
                                  </span>
                                  {parseRacha(rachaLocal)}
                                </div>

                                <div className="font-['Orbitron'] font-bold text-[10px] md:text-[9px] lg:text-[10px] xl:text-xs text-white text-center whitespace-nowrap">
                                  {estadoCentral}
                                </div>

                                <div className="font-mono text-[9px] md:text-[8px] lg:text-[10px] xl:text-[11px] whitespace-nowrap text-right">
                                  <span className="text-zinc-300 mr-1">
                                    RACHA
                                  </span>
                                  {parseRacha(rachaVisitante)}
                                </div>
                              </div>

                              {/* PRONÓSTICOS */}
                              <div className="grid grid-cols-3 gap-1.5 text-center">
                                {usuarios.map((usr) => {
                                  const eleccionUsr =
                                    pronosticosPorUsuario[jNum]?.[usr.id]
                                      ?.pronosticos
                                      ?.find(
                                        p =>
                                          p.local === local ||
                                          p.id === partido.id
                                      )
                                      ?.eleccion || '-';

                                  const partidoFinalizado =
                                    estadoCentral === 'FINAL';

                                  const resultadoFinal =
                                    Number(puntosLocal) > Number(puntosVisitante)
                                      ? '1'
                                      : Number(puntosLocal) < Number(puntosVisitante)
                                      ? '2'
                                      : 'X';

                                  const pronosticoValidado =
                                    partidoFinalizado && eleccionUsr !== '-';

                                  const pronosticoCorrecto =
                                    pronosticoValidado &&
                                    eleccionUsr === resultadoFinal;

                                  const estiloPronostico =
                                    !pronosticoValidado
                                      ? 'bg-[#2a2a2a] border-[#3a3a3a]'
                                      : pronosticoCorrecto
                                      ? 'bg-[#2a2a2a] border-green-500 ring-2 ring-green-500/70 shadow-[0_0_10px_rgba(34,197,94,0.45)]'
                                      : 'bg-[#2a2a2a] border-red-500 ring-2 ring-red-500/70 shadow-[0_0_10px_rgba(239,68,68,0.45)]';

                                  return (
                                    <div
                                      key={usr.id}
                                      className={`border rounded-lg px-1 py-2 flex flex-col items-center justify-center transition-all ${estiloPronostico}`}
                                    >
                                      <span className="text-[9px] font-['Orbitron'] font-bold text-white uppercase">
                                        {usr.nombre}
                                      </span>

                                      <span className="text-xs font-mono font-black text-amber-400 mt-0.5">
                                        {eleccionUsr}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          )}

          {pestanaActiva === 'noticias' && (
            <section className="space-y-4">
              {cargandoNoticias ? (
                <div className="p-8 text-center text-red-200 font-['Orbitron'] animate-pulse">
                  Cargando noticias en castellano...
                </div>
              ) : noticiasFiltradas.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 font-['Orbitron'] text-xs">
                  No hay noticias en esta categoría.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {noticiasFiltradas.map((item) => (
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
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-red-400 font-semibold uppercase">
                              {item.fecha}
                            </span>

                            <span className="text-[9px] font-['Orbitron'] text-zinc-400 border border-zinc-700 px-2 py-1 rounded">
                              {item.categoria}
                            </span>
                          </div>

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

          {pestanaActiva === 'perfil' && (
            <section className="space-y-5 max-w-md mx-auto">

              

              {!usuarioLogueado ? (
                <div className="bg-black/90 border border-red-800 rounded-xl p-6 space-y-4 shadow-xl">
                  <h3 className="text-sm font-['Orbitron'] text-white font-bold uppercase text-center">
                    Iniciar Sesión
                  </h3>

                  {errorLogin && (
                    <p className="text-red-400 text-xs text-center font-mono">
                      {errorLogin}
                    </p>
                  )}

                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs font-mono focus:outline-none"
                  />

                  <div className="relative">
                    <input
                      type={verPassword ? 'text' : 'password'}
                      placeholder="Contraseña"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 pr-10 text-white text-xs font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setVerPassword(!verPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-sm focus:outline-none cursor-pointer"
                    >
                      {verPassword ? '👁️‍🗨️' : '👁️'}
                    </button>
                  </div>

                  <button
                    onClick={handleLogin}
                    className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-['Orbitron'] text-xs font-bold rounded-lg uppercase transition-colors shadow-lg cursor-pointer"
                  >
                    Entrar
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-white border border-red-800 rounded-xl p-6 space-y-5 shadow-2xl text-black font-['Orbitron']">

                    <div className="text-center p-3 bg-[#9e0101] rounded-lg shadow-inner">
                      <p className="text-[10px] text-red-200 uppercase">
                        SESIÓN ACTIVA:
                      </p>
                      <strong className="text-white text-xs font-mono">
                        {usuarioLogueado.email}
                      </strong>
                    </div>

                    <div className="space-y-4 text-xs">

                      <div>
                        <label className="block text-[#002244] font-bold mb-1">
                          Nombre de Usuario
                        </label>

                        <div className="relative">
                          <input
                            type="text"
                            value={nombrePerfil || usuarioPerfilActual?.nombre || ''}
                            readOnly={campoPerfilEditando !== 'nombre'}
                            onChange={(e) => setNombrePerfil(e.target.value)}
                            className={`w-full bg-[#9e0101] text-white border border-red-700 rounded-lg p-2.5 pr-12 font-mono focus:outline-none ${
                              campoPerfilEditando === 'nombre'
                                ? 'ring-2 ring-white'
                                : 'cursor-default'
                            }`}
                          />

                          <button
                            type="button"
                            aria-label="Editar nombre de usuario"
                            onClick={() => {
                              if (!nombrePerfil && usuarioPerfilActual?.nombre) {
                                setNombrePerfil(usuarioPerfilActual.nombre);
                              }
                              setCampoPerfilEditando(
                                campoPerfilEditando === 'nombre' ? null : 'nombre'
                              );
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/20 text-white cursor-pointer"
                          >
                            ✎
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#002244] font-bold mb-1">
                          Nombre de tu Equipo
                        </label>

                        <div className="relative">
                          <input
                            type="text"
                            value={nombreEquipo || usuarioPerfilActual?.nombreEquipo || ''}
                            readOnly={campoPerfilEditando !== 'equipo'}
                            onChange={(e) => setNombreEquipo(e.target.value)}
                            className={`w-full bg-[#9e0101] text-white border border-red-700 rounded-lg p-2.5 pr-12 font-mono focus:outline-none ${
                              campoPerfilEditando === 'equipo'
                                ? 'ring-2 ring-white'
                                : 'cursor-default'
                            }`}
                          />

                          <button
                            type="button"
                            aria-label="Editar nombre del equipo"
                            onClick={() => {
                              if (!nombreEquipo && usuarioPerfilActual?.nombreEquipo) {
                                setNombreEquipo(usuarioPerfilActual.nombreEquipo);
                              }
                              setCampoPerfilEditando(
                                campoPerfilEditando === 'equipo' ? null : 'equipo'
                              );
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/20 text-white cursor-pointer"
                          >
                            ✎
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#002244] font-bold mb-1">
                          URL del Avatar
                        </label>

                        <div className="relative">
                          <input
                            type="text"
                            value={avatarUrlInput}
                            readOnly={campoPerfilEditando !== 'avatar'}
                            onChange={(e) => setAvatarUrlInput(e.target.value)}
                            placeholder="https://..."
                            className={`w-full bg-[#9e0101] text-white placeholder-red-200 border border-red-700 rounded-lg p-2.5 pr-12 font-mono focus:outline-none ${
                              campoPerfilEditando === 'avatar'
                                ? 'ring-2 ring-white'
                                : 'cursor-default'
                            }`}
                          />

                          <button
                            type="button"
                            aria-label="Editar URL del avatar"
                            onClick={() =>
                              setCampoPerfilEditando(
                                campoPerfilEditando === 'avatar' ? null : 'avatar'
                              )
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/20 text-white cursor-pointer"
                          >
                            ✎
                          </button>
                        </div>
                      </div>

                    </div>

                    <button
                      onClick={async () => {
                        await handleGuardarPerfil();
                        setCampoPerfilEditando(null);
                      }}
                      disabled={guardandoPerfil}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg uppercase transition-colors shadow-lg cursor-pointer"
                    >
                      {guardandoPerfil ? 'Guardando...' : 'Guardar Cambios'}
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full py-2 bg-[#9e0101] hover:bg-red-900 text-white text-xs font-bold rounded-lg border border-red-700 transition-colors uppercase cursor-pointer shadow"
                    >
                      Cerrar Sesión
                    </button>

                  </div>

                  <div className="bg-black/80 border border-red-900/60 rounded-xl p-4 flex items-center justify-between gap-4 shadow-lg">
                    <div>
                      <p className="text-xs font-black font-['Orbitron'] uppercase text-white">
                        Modo de prueba
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Controles internos de simulación
                      </p>
                    </div>

                    <button
                      onClick={() => setModoTest(!modoTest)}
                      className={`px-4 py-2 rounded-lg text-xs font-black font-['Orbitron'] uppercase transition-all cursor-pointer ${
                        modoTest
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {modoTest ? 'MODO TEST' : 'MODO NORMAL'}
                    </button>
                  </div>
                </>
              )}

            </section>
          )}

        </div>
      </main>
    </div>
  );
}
