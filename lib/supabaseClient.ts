import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'TU_SUPABASE_URL';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'TU_SUPABASE_ANON_KEY';

const baseClient = createClient(supabaseUrl, supabaseAnonKey);

// RAMA TEST TR25 EXCLUSIVAMENTE.
// Este commit nunca debe promocionarse a MAIN. Toda lectura/escritura competitiva
// de la PWA se redirige a tablas aisladas para proteger TR26.
const TEST_TABLES: Record<string, string> = {
  app_config: 'app_config_test',
  jornadas_eventos: 'jornadas_eventos_test_compat',
  partidos: 'partidos_test',
  pronosticos: 'pronosticos_test',
};

export const supabase = new Proxy(baseClient, {
  get(target, prop, receiver) {
    if (prop === 'from') {
      return (relation: string) => target.from(TEST_TABLES[relation] || relation);
    }
    const value = Reflect.get(target, prop, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as typeof baseClient;
