"use client";

import { useEffect } from "react";

export default function LoginEnterShortcut() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;

      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.placeholder !== "Contraseña") return;

      const loginCard = target.closest("div.bg-black\\/90");
      if (!loginCard) return;

      const entrarButton = Array.from(
        loginCard.querySelectorAll<HTMLButtonElement>("button"),
      ).find((button) => button.textContent?.trim().toUpperCase() === "ENTRAR");

      if (!entrarButton || entrarButton.disabled) return;

      event.preventDefault();
      entrarButton.click();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
