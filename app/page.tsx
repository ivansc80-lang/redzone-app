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

  // Estado para las jornadas oficiales cargadas desde Supabase
  const [jornadasOficiales, setJornadasOficiales] = useState<Record<number, PronosticoPartido[]>>({});

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
  const [pronosticosPorUsuario, setPronosticosPorUsuario] = useState<Record<number, Record<string, { pronosticos: PronosticoPartido[]; confirmado: boolean; validado?: boolean }>>>({});
  const [estadoBotonConfirmar, setEstadoBotonConfirmar] = useState<'normal' | 'incompleto' | 'confirmado'>('normal');
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [cargandoNoticias, setCargandoNoticias] = useState<boolean>(false);
  const [divisiones, setDivisiones] = useState<Division[]>(DIVISIONES_BASE);
  const [sincronizandoPosiciones, setSincronizandoPosiciones] = useState<boolean>(false);
  
  const [usuarioLogueado, setUsuarioLogueado] = useState<any>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  // Cargar la temporada regular desde Supabase al iniciar
  useEffect(() => {
    const cargarTemporadaRegular = async () => {
      const { data, error } = await supabase.from('temporada_regular').select('*');
      if (error) {
        console.error('Error al cargar temporada_regular:', error);
        return;
      }
      if (data) {
        const agrupadas: Record<number, PronosticoPartido[]> = {};
        for (let j = 1; j <= 18; j++) {
          agrupadas[j] = [];
        }

        data.forEach((row: any) => {
          const numJornada = row.jornada || 1;
          if (!agrupadas[numJornada]) agrupadas[numJornada] = [];
          agrupadas[numJornada].push({
            id: row.id,
            local: row.local,
            localLogo: row.local_logo,
            visitante: row.visitante,
            visitanteLogo: row.visitante_logo,
            eleccion: null,
            resultadoReal: row.resultado_real || undefined
          });
        });

        setJornadasOficiales(agrupadas);

        // Inicializar pronosticosPorUsuario con los datos obtenidos de Supabase
        const obj: Record<number, Record<string, { pronosticos: PronosticoPartido[]; confirmado: boolean; validado?: boolean }>> = {};
        for (let j = 1; j <= 18; j++) {
          obj[j] = {
            cace: { pronosticos: JSON.parse(JSON.stringify(agrupadas[j] || [])), confirmado: false, validado: false },
            juanjo: { pronosticos: JSON.parse(JSON.stringify(agrupadas[j] || [])), confirmado: false, validado: false },
            ivan: { pronosticos: JSON.parse(JSON.stringify(agrupadas[j] || [])), confirmado: false, validado: false },
          };
        }
        setPronosticosPorUsuario(obj);
      }
    };

    cargarTemporadaRegular();
  }, []);

  const cargarPerfil = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setNombrePerfil(data.nombre || '');
      setNombreEquipo(data.nombre_equipo || '');
      setAvatarUrlInput(data.avatar_url || '');
    }
  };

  const handleGuardarPerfil = async () => {
    if (!usuarioLogueado) return;
    setGuardandoPerfil(true);
    const { error } = await supabase.from('profiles').upsert({
      id: usuarioLogueado.id,
      nombre: nombrePerfil,
      nombre_equipo: nombreEquipo,
      avatar_url: avatarUrlInput,
      updated_at: new Date(),
    });
    setGuardandoPerfil(false);
    if (error) {
      alert('Error al guardar el perfil: ' + error.message);
    } else {
      alert('¡Perfil guardado con éxito!');
    }
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
    return () => {
      authListener.subscription.unsubscribe();
    };
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
    let aciertos = 0;
    dataJornada.pronosticos.forEach(p => {
      if (p.eleccion && p.resultadoReal && p.eleccion === p.resultadoReal) {
        aciertos++;
      }
    });
    return aciertos;
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
        let totalPronosticados = 0;

        for (let jNum = 1; jNum <= 18; jNum++) {
          const jData = pronosticosPorUsuario[jNum]?.[usr.id];
          if (jData && jData.confirmado) {
            jData.pronosticos.forEach(p => {
              totalPronosticados++;
              if (p.eleccion && p.resultadoReal && p.eleccion === p.resultadoReal) {
                totalPuntos++;
                totalAciertosPartidos++;
              }
            });
          }
        }

        const efectividadCalc = totalPronosticados > 0 
          ? Math.round((totalAciertosPartidos / totalPronosticados) * 100) + '%' 
          : '0%';

        return { ...usr, puntos: totalPuntos, efectividad: efectividadCalc };
      });

      nuevosUsuarios.sort((a, b) => b.puntos - a.puntos);
      return nuevosUsuarios.map((usr, index) => ({
        ...usr,
        posicion: `${index + 1}º`,
        esLider: index === 0,
      }));
    });
  }, [pronosticosPorUsuario]);

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
              imagen: art.images?.[0]?.url || '/redzone1_logo.png',
              fecha: new Date(art.published).toLocaleDateString('es-ES', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
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
                  const stat = entry.stats?.find((s: any) => s.name === name || s.abbreviation === name || s.type === name);
                  return stat ? parseInt(stat.displayValue, 10) || 0 : 0;
                };
                const getStatStr = (name: string) => {
                  const stat = entry.stats?.find((s: any) => s.name === name || s.abbreviation === name || s.type === name);
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
                  pct: getStatStr('winPercent'),
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
          if (listaDivisiones.length > 0) setDivisiones(listaDivisiones);
        })
        .catch((err) => console.log('Sincronizando posiciones:', err))
        .finally(() => setSincronizandoPosiciones(false));
    }
  }, [pestanaActiva]);

  useEffect(() => {
    const actual = pronosticosPorUsuario[jornadaActual]?.[usuarioActivoId];
    if (actual?.confirmado) {
      setEstadoBotonConfirmar('confirmado');
    } else {
      setEstadoBotonConfirmar('normal');
    }
  }, [usuarioActivoId, jornadaActual, pronosticosPorUsuario]);

  const datosUsuarioActual = pronosticosPorUsuario[jornadaActual]?.[usuarioActivoId] || {
    pronosticos: [],
    confirmado: false,
  };

  const handleSeleccionPronostico = (idPartido: number, eleccion: '1' | 'X' | '2') => {
    setPronosticosPorUsuario(prev => {
      const jornadaData = prev[jornadaActual] || {};
      const usuarioActualData = jornadaData[usuarioActivoId] || { pronosticos: [], confirmado: false };
      const nuevosPronosticos = usuarioActualData.pronosticos.map(p => {
        if (p.id === idPartido) {
          const nuevaEleccion = p.eleccion === eleccion ? null : eleccion;
          return { ...p, eleccion: nuevaEleccion };
        }
        return p;
      });
      return {
        ...prev,
        [jornadaActual]: {
          ...jornadaData,
          [usuarioActivoId]: { ...usuarioActualData, pronosticos: nuevosPronosticos, confirmado: false },
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
    setPronosticosPorUsuario(prev => {
      const jornadaData = prev[jornadaActual] || {};
      const usuarioActualData = jornadaData[usuarioActivoId] || { pronosticos: [], confirmado: false };
      return {
        ...prev,
        [jornadaActual]: {
          ...jornadaData,
          [usuarioActivoId]: { ...usuarioActualData, confirmado: true },
        },
      };
    });
    setEstadoBotonConfirmar('confirmado');
  };

  const handleVotacionAleatoriaYSimular = () => {
    const opciones: ('1' | 'X' | '2')[] = ['1', 'X', '2'];
    setPronosticosPorUsuario(prev => {
      const jornadaData = prev[jornadaActual] || {};
      const usuariosTest = ['juanjo', 'cace'];
      const copiaJornada = { ...jornadaData };

      usuariosTest.forEach(uid => {
        const pronosAleatorios = (copiaJornada[uid]?.pronosticos || jornadasOficiales[jornadaActual] || []).map(p => ({
          ...p,
          eleccion: opciones[Math.floor(Math.random() * opciones.length)]
        }));
        copiaJornada[uid] = { pronosticos: pronosAleatorios, confirmado: true };
      });

      return { ...prev, [jornadaActual]: copiaJornada };
    });
    alert(`¡Votación aleatoria aplicada para Juanjo y Cace en la Jornada ${jornadaActual}!`);
  };

  const handleSiguienteJornada = () => {
    if (jornadaActual < 18) {
      setJornadaActual(prev => prev + 1);
    } else {
      alert('Has llegado a la última jornada (18).');
    }
  };

  const handleValidarJornada = () => {
    const opciones: ('1' | 'X' | '2')[] = ['1', 'X', '2'];
    setPronosticosPorUsuario(prev => {
      const jornadaData = prev[jornadaActual] || {};
      const copiaJornada = { ...jornadaData };

      Object.keys(copiaJornada).forEach(uid => {
        const pronosValidados = copiaJornada[uid].pronosticos.map(p => ({
          ...p,
          resultadoReal: p.resultadoReal || opciones[Math.floor(Math.random() * opciones.length)]
        }));
        copiaJornada[uid] = { ...copiaJornada[uid], pronosticos: pronosValidados, validado: true };
      });

      return { ...prev, [jornadaActual]: copiaJornada };
    });
    alert(`¡Jornada ${jornadaActual} validada correctamente! Puntos y rachas actualizados.`);
  };

  const renderTablaDivision = (div: Division, idx: number) => {
    const esAfc = div.conferencia === 'AFC';
    const headerBgClass = esAfc ? 'bg-red-700 border-red-800' : 'bg-blue-700 border-blue-800';

    return (
      <div key={idx} className="bg-black/90 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className={`${headerBgClass} px-4 py-2.5 border-b font-['Orbitron'] text-sm md:text-base font-bold uppercase tracking-wider text-white`}>
          {div.nombre}
        </div>
        <div className="w-full">
          <table className="w-full table-fixed text-left font-sans">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase font-mono text-[10px] md:text-sm">
              <tr>
                <th className="py-2.5 px-2 w-[48%]">EQUIPO</th>
                <th className="py-2.5 px-1 w-[12%] text-center">G</th>
                <th className="py-2.5 px-1 w-[12%] text-center">P</th>
                <th className="py-2.5 px-1 w-[12%] text-center">E</th>
                <th className="py-2.5 px-2 w-[16%] text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs md:text-base">
              {div.equipos.map((eq) => (
                <tr key={eq.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="py-3 px-2 flex items-center gap-2 font-['Orbitron'] font-bold text-white truncate">
                    <img 
                      src={eq.logo} 
                      alt={eq.nombre} 
                      className={`object-contain flex-shrink-0 ${eq.abrev === 'NYJ' ? 'scale-125 filter brightness-200' : ''}`}
                      style={{ width: eq.abrev === 'NYJ' ? '32px' : '24px', height: eq.abrev === 'NYJ' ? '32px' : '24px' }} 
                    />
                    <span className="truncate">{eq.nombre}</span>
                  </td>
                  <td className="py-3 px-1 text-center font-mono font-bold text-emerald-400 text-sm md:text-lg">{eq.victorias}</td>
                  <td className="py-3 px-1 text-center font-mono font-bold text-red-400 text-sm md:text-lg">{eq.derrotas}</td>
                  <td className="py-3 px-1 text-center font-mono font-bold text-zinc-300 text-sm md:text-lg">{eq.empates}</td>
                  <td className="py-3 px-2 text-right font-mono font-extrabold text-amber-400 text-xs md:text-lg truncate">{eq.pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

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
        <header className="w-full bg-[#8b0000] py-3 flex justify-center items-center">
          <picture className="flex justify-center">
            <source media="(max-width: 768px)" srcSet="/redzone2_logo.png" />
            <img src="/redzone1_logo.png" alt="NFL REDZONE" className="h-10 md:h-12 object-contain" />
          </picture>
        </header>

        {showSearch && (
          <div className={`fixed z-50 p-4 transition-all duration-500 ${searchPosition === 'top' ? 'top-20' : 'bottom-4'} right-4 bg-white text-black rounded-full shadow-xl font-bold font-['Orbitron']`}>
             🔍
          </div>
        )}

        <div className="w-full bg-black/60 border-y border-red-900/60 py-2.5 px-4 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setModoTest(!modoTest)}
              className={`px-3 py-1 rounded-lg text-xs font-black font-['Orbitron'] uppercase ${modoTest ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400'}`}
            >
              {modoTest ? 'MODO TEST' : 'MODO NORMAL'}
            </button>
            <span className="text-xs font-['Orbitron'] font-bold text-red-200">
              Jornada Activa: <strong className="text-white">{jornadaActual} / 18</strong>
            </span>
          </div>

          {modoTest && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleVotacionAleatoriaYSimular}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg font-['Orbitron'] uppercase shadow transition-all cursor-pointer"
              >
                VOTACIÓN ALEATORIA (JUANJO & CACE) + SIMULAR
              </button>
              <button
                onClick={handleSiguienteJornada}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg font-['Orbitron'] uppercase shadow transition-all cursor-pointer flex items-center gap-1"
              >
                SIGUIENTE JORNADA →
              </button>
            </div>
          )}
        </div>

        <nav className="w-full bg-white border-b py-2 flex justify-center">
          <div className="w-full md:max-w-xl flex justify-around items-center px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setPestanaActiva(item.id)}
                className="flex flex-col items-center gap-1 px-1 py-1 transition-all relative cursor-pointer"
              >
                <div className="w-[35px] h-[35px] flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="text-[9px] font-bold text-red-700 tracking-tight leading-none">{item.label}</span>
                <div className={`h-1 w-7 rounded-full transition-all duration-300 mt-0.5 ${pestanaActiva === item.id ? 'bg-red-700 opacity-100 scale-100' : 'bg-transparent opacity-0 scale-0'}`} />
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto">
          {pestanaActiva === 'clasificacion' && (
            <section className="space-y-4">
              <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-red-200 border-b border-red-900/50 pb-2 font-['Orbitron'] italic">
                Tabla General de Posiciones
              </h2>
              <div className="space-y-4">
                {usuarios.map((usr) => (
                  <div key={usr.id} className={`${usr.colorBg} border-2 ${usr.colorBorder} rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl transition-all relative overflow-hidden`}>
                    <img src={usr.logoEquipo} alt={usr.nombreEquipo} className="md:hidden absolute top-2 right-2 w-20 h-20 object-contain opacity-90 drop-shadow-md" />
                    <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-start">
                      <div className="flex items-center gap-3 md:gap-5">
                        <span className="font-black text-white text-2xl md:text-4xl min-w-[35px] font-['Orbitron'] italic">{usr.posicion}</span>
                        <img src={usr.avatar} alt={usr.nombre} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 border-white object-cover shadow-lg flex-shrink-0" />
                        <div className="flex items-center gap-4 md:gap-8">
                          <div className="flex flex-col justify-center w-28 md:w-36 flex-shrink-0">
                            <span className="text-[10px] md:text-xs font-mono tracking-widest text-zinc-300 uppercase font-semibold">HEADCOACH</span>
                            <span className="text-xl md:text-3xl font-black text-white tracking-wider font-['Orbitron'] italic uppercase">{usr.nombre}</span>
                          </div>
                          <div className="hidden md:flex items-center gap-6 ml-4 md:ml-20">
                            <img src={usr.logoEquipo} alt={usr.nombreEquipo} className="h-20 w-20 md:h-32 md:w-32 object-contain drop-shadow-xl flex-shrink-0" />
                            <span className="text-base md:text-xl font-black text-white uppercase font-['Orbitron'] tracking-wider drop-shadow-md">{usr.nombreEquipo}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 w-full md:w-auto border-t md:border-t-0 border-white/20 pt-3 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="text-xs md:text-sm font-bold text-white/80 uppercase tracking-wider font-['Orbitron']">Puntuación Total</p>
                        <p className="text-2xl md:text-4xl font-black text-white leading-none font-['Orbitron'] italic">{usr.puntos} <span className="text-sm md:text-lg font-bold opacity-80">pts</span></p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-xs md:text-sm font-bold text-white/80 uppercase tracking-wider font-['Orbitron']">Efectividad</p>
                        <p className="text-xl md:text-3xl font-black text-white leading-none font-['Orbitron'] italic">{usr.efectividad}</p>
                      </div>
                      {usr.esLider ? (
                        <span className={`text-sm md:text-base px-4 py-2 rounded-xl font-black shadow-lg font-['Orbitron'] italic ${usr.colorBadge}`}>Líder 🏆</span>
                      ) : (
                        <div className="w-20 hidden md:block"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {pestanaActiva === 'pronosticos' && (
            <section className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl p-3 md:p-6 shadow-2xl">
                <div className="bg-white py-3 px-4 rounded-t-xl text-center mb-4 flex justify-between items-center">
                  <span className="text-xs font-bold text-black font-['Orbitron']">Usuario: {usuarioActivoId.toUpperCase()}</span>
                  <h1 className="text-lg md:text-xl font-black text-[#d32f2f] tracking-wide uppercase">PORRA - JORNADA {jornadaActual}</h1>
                  <span className="text-xs font-bold text-black font-['Orbitron']">{datosUsuarioActual.confirmado ? '🔒 Confirmado' : '✏️ Editando'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {datosUsuarioActual.pronosticos.map((p, index, array) => {
                    const isLocalSelected = p.eleccion === '1';
                    const isVsSelected = p.eleccion === 'X';
                    const isVisitorSelected = p.eleccion === '2';
                    const esUltimoEImpar = (array.length % 2 !== 0) && (index === array.length - 1);

                    return (
                      <div key={p.id} className={`bg-[#181818] border border-[#2a2a2a] rounded-xl p-2 flex items-center justify-between gap-1.5 h-16 ${esUltimoEImpar ? 'md:col-span-2 md:w-1/2 md:mx-auto' : ''}`}>
                        <button
                          onClick={() => handleSeleccionPronostico(p.id, '1')}
                          className={`flex-1 h-full flex items-center justify-center gap-2 px-2 rounded-lg transition-all border ${isLocalSelected ? 'bg-white text-black border-white' : 'bg-[#2a2a2a] hover:bg-[#383838] border-[#3a3a3a] text-gray-200'}`}
                        >
                          <img src={p.localLogo} alt={p.local} className={`object-contain flex-shrink-0 ${p.local === 'Jets' ? 'w-10 h-10 scale-125 filter brightness-200' : 'w-[2.25rem] h-[2.25rem] md:w-9 md:h-9'}`} />
                          <span className="hidden md:inline font-bold text-xs md:text-sm font-['Orbitron'] uppercase text-center">{p.local}</span>
                        </button>
                        <button
                          onClick={() => handleSeleccionPronostico(p.id, 'X')}
                          className={`w-12 h-full flex items-center justify-center rounded-lg font-bold text-xs font-['Orbitron'] transition-all border ${isVsSelected ? 'bg-white text-black border-white' : 'bg-[#2a2a2a] hover:bg-[#383838] border-[#3a3a3a] text-gray-300'}`}
                        >
                          VS
                        </button>
                        <button
                          onClick={() => handleSeleccionPronostico(p.id, '2')}
                          className={`flex-1 h-full flex items-center justify-center gap-2 px-2 rounded-lg transition-all border ${isVisitorSelected ? 'bg-white text-black border-white' : 'bg-[#2a2a2a] hover:bg-[#383838] border-[#3a3a3a] text-gray-200'}`}
                        >
                          <span className="hidden md:inline font-bold text-xs md:text-sm font-['Orbitron'] uppercase text-center">{p.visitante}</span>
                          <img src={p.visitanteLogo} alt={p.visitante} className={`object-contain flex-shrink-0 ${p.visitante === 'Jets' ? 'w-10 h-10 scale-125 filter brightness-200' : 'w-[2.25rem] h-[2.25rem] md:w-9 md:h-9'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-2 text-center">
                  <button
                    onClick={handleConfirmarPronosticos}
                    className={`w-full font-black text-sm py-3.5 rounded-xl shadow-lg transition-colors uppercase tracking-wider cursor-pointer ${estadoBotonConfirmar === 'confirmado' ? 'bg-emerald-500 text-black' : estadoBotonConfirmar === 'incompleto' ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-[#d32f2f] hover:bg-gray-100'}`}
                  >
                    {estadoBotonConfirmar === 'confirmado' ? '✓ Pronósticos Confirmados (Clic para re-editar si deseas)' : estadoBotonConfirmar === 'incompleto' ? '⚠ Faltan partidos por marcar' : 'Confirmar Pronósticos'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {pestanaActiva === 'jornada' && (
            <section className="space-y-8 bg-[#8b0000] p-2 md:p-6 rounded-2xl">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-2 border-y border-red-800 my-2 bg-red-950/40 rounded-lg px-4">
                <h1 className="text-xl md:text-3xl font-black font-['Orbitron'] italic tracking-widest text-white uppercase">
                  RESULTADOS JORNADA {jornadaActual}
                </h1>
                <button
                  onClick={handleValidarJornada}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-['Orbitron'] font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg uppercase transition-all cursor-pointer"
                >
                  ✓ VALIDAR JORNADA (SIMULAR RESULTADOS)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {usuarios.map((usr) => {
                  const pronosticosUsr = pronosticosPorUsuario[jornadaActual]?.[usr.id]?.pronosticos || [];
                  const confirmadoUsr = pronosticosPorUsuario[jornadaActual]?.[usr.id]?.confirmado || false;
                  const validadoJornada = pronosticosPorUsuario[jornadaActual]?.[usr.id]?.validado || false;
                  const puntosJornadaActual = calcularPuntosJornada(usr.id, jornadaActual);

                  return (
                    <div key={usr.id} className="flex flex-col space-y-3 bg-black/40 p-3 rounded-2xl border border-red-900/60 shadow-xl">
                      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border-2 border-red-900/80 shadow-2xl relative group">
                        <img src={usr.avatarJornada} alt={usr.nombre} className="w-full h-full object-cover" />
                      </div>

                      <div className="space-y-1">
                        <div className={`${usr.colorBg} border border-white/20 rounded-t-lg py-3 text-center text-white font-['Orbitron'] font-black text-2xl leading-none shadow`}>
                          {confirmadoUsr ? `${puntosJornadaActual} aciertos` : '0 aciertos'}
                        </div>
                        <div className={`${usr.colorBg} border border-white/20 rounded-b-lg py-3 text-center text-white font-['Orbitron'] font-bold text-xl leading-none tracking-wider`}>
                          Total Acumulado: {usr.puntos} pts
                        </div>
                      </div>

                      <div className="bg-black/90 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-2 space-y-2">
                        {pronosticosUsr.map((p) => {
                          const eleccion = p.eleccion;
                          const resultadoOficial = p.resultadoReal;

                          let estiloCajaEleccion = 'bg-black text-amber-400 border-zinc-700';
                          if (validadoJornada && eleccion) {
                            if (eleccion === resultadoOficial) {
                              estiloCajaEleccion = 'bg-emerald-500 text-black border-emerald-400 font-black';
                            } else {
                              estiloCajaEleccion = 'bg-red-600 text-white border-red-500 font-black';
                            }
                          } else if (eleccion) {
                            estiloCajaEleccion = 'bg-white text-black border-white font-black';
                          }

                          return (
                            <div key={p.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5 bg-[#2a2a2a] px-2.5 py-2 rounded transition-colors border border-zinc-700/50">
                              <div className="flex items-center justify-center gap-1.5 min-w-0">
                                <img src={p.localLogo} alt={p.local} className={`object-contain flex-shrink-0 ${p.local === 'Jets' ? 'w-8 h-8 scale-125 filter brightness-200' : 'w-5 h-5 md:w-6 md:h-6'}`} />
                                <span className="font-['Orbitron'] font-bold text-white truncate text-[0.7rem] md:text-[0.8rem] text-center uppercase">{p.local}</span>
                              </div>
                              <span className="font-['Orbitron'] font-bold text-zinc-300 text-[0.65rem] md:text-[0.75rem] px-0.5 text-center">vs</span>
                              <div className="flex items-center justify-center gap-1.5 min-w-0">
                                <span className="font-['Orbitron'] font-bold text-white truncate text-[0.7rem] md:text-[0.8rem] text-center uppercase">{p.visitante}</span>
                                <img src={p.visitanteLogo} alt={p.visitante} className={`object-contain flex-shrink-0 ${p.visitante === 'Jets' ? 'w-8 h-8 scale-125 filter brightness-200' : 'w-5 h-5 md:w-6 md:h-6'}`} />
                              </div>
                              <div className={`w-6 h-6 md:w-7 md:h-7 flex items-center justify-center border rounded font-['Orbitron'] font-black text-xs md:text-sm ml-1 flex-shrink-0 justify-self-end ${estiloCajaEleccion}`}>
                                {eleccion === '1' ? '1' : eleccion === 'X' ? 'X' : eleccion === '2' ? '2' : '-'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {pestanaActiva === 'equipos' && (
            <section className="space-y-6">
              <div className="flex justify-center items-center gap-4 border-b border-red-900/50 pb-4">
                <button
                  onClick={() => setSubPestanaEquipos('score')}
                  className={`px-8 py-2 font-['Orbitron'] text-xs md:text-sm font-bold uppercase rounded-lg transition-all border border-white/20 cursor-pointer ${subPestanaEquipos === 'score' ? 'bg-white text-black shadow-lg scale-105' : 'bg-[#5c0000] text-white hover:bg-[#7a0000]'}`}
                >
                  SCORE
                </button>
                <button
                  onClick={() => setSubPestanaEquipos('games')}
                  className={`px-8 py-2 font-['Orbitron'] text-xs md:text-sm font-bold uppercase rounded-lg transition-all border border-white/20 cursor-pointer ${subPestanaEquipos === 'games' ? 'bg-white text-black shadow-lg scale-105' : 'bg-[#5c0000] text-white hover:bg-[#7a0000]'}`}
                >
                  GAMES (18 JORNADAS)
                </button>
              </div>

              {subPestanaEquipos === 'score' ? (
                <div className="space-y-8">
                  {sincronizandoPosiciones && (
                    <div className="flex justify-end">
                      <span className="text-[10px] text-red-200 font-mono animate-pulse">Actualizando datos desde ESPN...</span>
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="border border-white bg-white p-4 rounded-xl space-y-4 shadow-xl">
                      <div className="flex items-center gap-3 border-b-2 border-red-600 pb-2">
                        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                        <h3 className="text-base md:text-xl font-black uppercase tracking-wider text-red-600 font-['Orbitron'] italic underline decoration-red-600 underline-offset-4">
                          Conferencia Americana (AFC)
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {divisiones.filter((d) => d.conferencia === 'AFC' || d.nombre.toUpperCase().includes('AFC')).map((div, idx) => renderTablaDivision(div, idx))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 pt-4">
                    <div className="border border-white bg-white p-4 rounded-xl space-y-4 shadow-xl">
                      <div className="flex items-center gap-3 border-b-2 border-blue-500 pb-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                        <h3 className="text-base md:text-xl font-black uppercase tracking-wider text-blue-600 font-['Orbitron'] italic underline decoration-blue-600 underline-offset-4">
                          Conferencia Nacional (NFC)
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {divisiones.filter((d) => d.conferencia === 'NFC' || d.nombre.toUpperCase().includes('NFC')).map((div, idx) => renderTablaDivision(div, idx))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((jNum) => {
                    const jornadaValidada = pronosticosPorUsuario[jNum]?.['cace']?.validado;
                    const partidosJornada = jornadasOficiales[jNum] || [];

                    return (
                      <div key={jNum} className="bg-black/80 border border-red-900/80 rounded-2xl p-4 md:p-6 space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-red-900/60 pb-3">
                          <h3 className="text-base md:text-xl font-['Orbitron'] font-black text-amber-400 uppercase tracking-wider">
                            JORNADA {jNum} DE 18 {jornadaValidada ? '(FINALIZADA / VALIDADA)' : '(PENDIENTE DE JUGAR)'}
                          </h3>
                          <span className="text-xs font-mono text-zinc-400">
                            {jornadaValidada ? 'Datos subidos y registrados' : 'Solo información básica de emparejamientos'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {partidosJornada.map((partido) => {
                            const rachaLocalAcumulada = obtenerRachaEquipo(partido.local, jNum);
                            const rachaVisitanteAcumulada = obtenerRachaEquipo(partido.visitante, jNum);

                            return (
                              <div key={partido.id} className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-3 flex flex-col gap-3 shadow-md">
                                <div className="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-zinc-800">
                                  <div className="flex items-center gap-2">
                                    <img src={partido.localLogo} alt={partido.local} className="w-7 h-7 object-contain" />
                                    <span className="font-['Orbitron'] font-bold text-xs text-white uppercase">{partido.local}</span>
                                  </div>
                                  <span className="font-['Orbitron'] font-bold text-xs text-zinc-500">vs</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-['Orbitron'] font-bold text-xs text-white uppercase">{partido.visitante}</span>
                                    <img src={partido.visitanteLogo} alt={partido.visitante} className="w-7 h-7 object-contain" />
                                  </div>
                                </div>

                                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 px-1 border-b border-zinc-800 pb-2">
                                  <span>RACHA LOCAL: <strong className="text-emerald-400">{rachaLocalAcumulada}</strong></span>
                                  <span>RACHA VIS.: <strong className="text-red-400">{rachaVisitanteAcumulada}</strong></span>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">Pronósticos de Participantes:</span>
                                  <div className="grid grid-cols-3 gap-1.5 text-center">
                                    {usuarios.map(usr => {
                                      const eleccionUsr = pronosticosPorUsuario[jNum]?.[usr.id]?.pronosticos?.find(p => p.id === partido.id)?.eleccion || '-';
                                      return (
                                        <div key={usr.id} className="bg-black/60 border border-zinc-800 rounded p-1 flex flex-col">
                                          <span className="text-[9px] font-['Orbitron'] font-bold text-zinc-400 uppercase">{usr.nombre}</span>
                                          <span className="text-xs font-mono font-black text-amber-400 mt-0.5">{eleccionUsr}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
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
              <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-red-200 border-b border-red-900/50 pb-1 font-['Orbitron'] italic">
                Última Hora NFL (Español)
              </h2>
              {cargandoNoticias ? (
                <div className="p-8 text-center text-red-200 font-['Orbitron'] animate-pulse">Cargando noticias en castellano...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {noticias.map((item) => (
                    <article key={item.id} className="bg-black/90 border border-red-900/60 rounded-xl overflow-hidden flex flex-col justify-between hover:border-red-600 transition-all shadow-lg">
                      <div>
                        {item.imagen && (
                          <div className="h-44 w-full overflow-hidden bg-zinc-900">
                            <img src={item.imagen} alt={item.titulo} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                          </div>
                        )}
                        <div className="p-4 space-y-2">
                          <span className="text-[10px] font-mono text-red-400 font-semibold uppercase">{item.fecha}</span>
                          <h3 className="font-['Orbitron'] text-sm font-bold leading-snug text-white">{item.titulo}</h3>
                          <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">{item.descripcion}</p>
                        </div>
                      </div>
                      <div className="p-4 pt-0">
                        <a href={item.enlace} target="_blank" rel="noopener noreferrer" className="inline-block w-full text-center bg-red-950/80 hover:bg-red-900 text-red-100 text-xs font-['Orbitron'] py-2 rounded border border-red-800 transition-colors uppercase">
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
            <section className="space-y-4 max-w-md mx-auto">
              <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-red-200 border-b border-red-900/50 pb-2 font-['Orbitron']">
                Ajustes de Perfil Privado
              </h2>
              {!usuarioLogueado ? (
                <div className="bg-black/90 border border-red-800 rounded-xl p-6 space-y-4 shadow-xl">
                  <h3 className="text-sm font-['Orbitron'] text-white font-bold uppercase text-center">Iniciar Sesión</h3>
                  {errorLogin && <p className="text-red-400 text-xs text-center font-mono">{errorLogin}</p>}
                  <input 
                    type="email" 
                    placeholder="Correo electrónico" 
                    value={emailInput} 
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-xs font-mono focus:outline-none"
                  />
                  <div className="relative">
                    <input 
                      type={verPassword ? "text" : "password"} 
                      placeholder="Contraseña" 
                      value={passwordInput} 
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 pr-10 text-white text-xs font-mono focus:outline-none"
                    />
                    <button type="button" onClick={() => setVerPassword(!verPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-sm focus:outline-none cursor-pointer">
                      {verPassword ? '👁️‍🗨️' : '👁️'}
                    </button>
                  </div>
                  <button onClick={handleLogin} className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-[#fff] font-['Orbitron'] text-xs font-bold rounded-lg uppercase transition-colors shadow-lg cursor-pointer">
                    Entrar
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-red-800 rounded-xl p-6 space-y-4 shadow-2xl text-black font-['Orbitron']">
                  <div className="text-center p-3 bg-[#9e0101] rounded-lg shadow-inner">
                    <p className="text-[10px] text-red-200 uppercase">Sesión activa:</p>
                    <strong className="text-white text-xs font-mono">{usuarioLogueado.email}</strong>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[#002244] font-bold mb-1">Nombre de Usuario</label>
                      <input type="text" value={nombrePerfil} onChange={(e) => setNombrePerfil(e.target.value)} placeholder="Ej: Cace" className="w-full bg-[#9e0101] text-[#ffffff] placeholder-red-200 border border-red-700 rounded-lg p-2.5 font-mono focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[#002244] font-bold mb-1">Nombre de tu Equipo</label>
                      <input type="text" value={nombreEquipo} onChange={(e) => setNombreEquipo(e.target.value)} placeholder="Ej: PATRIOTS" className="w-full bg-[#9e0101] text-[#ffffff] placeholder-red-200 border border-red-700 rounded-lg p-2.5 font-mono focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[#002244] font-bold mb-1">URL del Avatar</label>
                      <input type="text" value={avatarUrlInput} onChange={(e) => setAvatarUrlInput(e.target.value)} placeholder="https://..." className="w-full bg-[#9e0101] text-[#ffffff] placeholder-red-200 border border-red-700 rounded-lg p-2.5 font-mono focus:outline-none" />
                    </div>
                  </div>
                  <button onClick={handleGuardarPerfil} disabled={guardandoPerfil} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg uppercase transition-colors shadow-lg cursor-pointer">
                    {guardandoPerfil ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button onClick={handleLogout} className="w-full py-2 bg-[#9e0101] hover:bg-red-900 text-white text-xs font-bold rounded-lg border border-red-700 transition-colors uppercase cursor-pointer shadow">
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