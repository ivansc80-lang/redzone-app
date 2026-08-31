"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const TARGET_ID = "redzone-push-error-marker-target";

function serializarError(valor: unknown) {
  if (valor instanceof Error) {
    return `${valor.name}: ${valor.message}`;
  }

  if (typeof valor === "string") return valor;

  try {
    return JSON.stringify(valor);
  } catch {
    return String(valor);
  }
}

export default function PushErrorMarker() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [mensaje, setMensaje] = useState(
    "Sin errores capturados. Pulsa el botón de notificaciones para probar.",
  );
  const [hayError, setHayError] = useState(false);

  useEffect(() => {
    const colocarMarcador = () => {
      const existente = document.getElementById(TARGET_ID);
      if (existente) {
        setTarget(existente);
        return;
      }

      const botones = Array.from(document.querySelectorAll("button"));
      const botonPush = botones.find((boton) =>
        (boton.textContent || "").toUpperCase().includes("NOTIFICACIONES"),
      );

      if (!botonPush || !botonPush.parentElement) return;

      const contenedor = document.createElement("div");
      contenedor.id = TARGET_ID;
      botonPush.insertAdjacentElement("afterend", contenedor);
      setTarget(contenedor);

      botonPush.addEventListener("click", () => {
        setHayError(false);
        setMensaje("Probando PUSH... esperando resultado.");
      });
    };

    colocarMarcador();

    const observer = new MutationObserver(colocarMarcador);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const consoleErrorOriginal = console.error;

    console.error = (...args: unknown[]) => {
      consoleErrorOriginal(...args);

      const texto = args.map(serializarError).join(" | ");

      if (
        texto.includes("Error activando PUSH REDZONE") ||
        texto.includes("Error comprobando PUSH")
      ) {
        setHayError(true);
        setMensaje(texto);
      }
    };

    return () => {
      console.error = consoleErrorOriginal;
    };
  }, []);

  if (!target) return null;

  return createPortal(
    <div
      className={`mt-3 rounded-lg border px-3 py-3 font-mono text-[10px] leading-relaxed break-words ${
        hayError
          ? "border-red-500 bg-red-50 text-red-800"
          : "border-zinc-300 bg-zinc-50 text-zinc-700"
      }`}
    >
      <div className="mb-1 font-bold font-['Orbitron'] text-[9px] uppercase">
        {hayError ? "🚨 CHIVATO PUSH — ERROR" : "🧪 CHIVATO PUSH"}
      </div>
      <div>{mensaje}</div>
    </div>,
    target,
  );
}
