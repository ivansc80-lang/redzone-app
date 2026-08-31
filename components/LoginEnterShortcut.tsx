"use client";

import { useEffect } from "react";

export default function LoginEnterShortcut() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;

      const passwordInput = document.querySelector<HTMLInputElement>(
        'input[placeholder="Contraseña"]',
      );
      const emailInput = document.querySelector<HTMLInputElement>(
        'input[placeholder="Correo electrónico"]',
      );

      if (!passwordInput || !emailInput) return;

      const loginCard = passwordInput.closest("div.bg-black\\/90");
      if (!loginCard || !loginCard.contains(emailInput)) return;

      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLButtonElement
      ) {
        return;
      }

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
