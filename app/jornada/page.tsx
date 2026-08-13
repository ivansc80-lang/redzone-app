import { supabase } from "@/lib/supabase"; // Importas tu cliente ya configurado

export default async function JornadaPage() {
  // 1. Obtener datos de la jornada (ej: la que esté activa)
  const { data: jornada } = await supabase
    .from("jornadas")
    .select("*")
    .eq("activa", true)
    .single();

  // 2. Aquí obtienes los pronósticos
  // ... tu lógica de filtrado aquí ...

  return (
    <div>
      <h1>Página de la Jornada</h1>
      {/* Aquí va tu tabla o lista de pronósticos */}
    </div>
  );
}
