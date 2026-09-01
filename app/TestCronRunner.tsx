'use client';

import { useEffect } from 'react';

const INTERVALO_TEST_MS = 5_000;

export default function TestCronRunner() {
  useEffect(() => {
    let activo = true;
    let ejecutando = false;

    const tick = async () => {
      if (!activo || ejecutando) return;
      ejecutando = true;
      try {
        const response = await fetch('/api/test-season-tick', {
          method: 'GET',
          cache: 'no-store',
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || data?.success === false) {
          console.error('[TR25 TEST] Tick cron fallido:', data);
        } else {
          console.log('[TR25 TEST] Tick cron:', data);
        }
      } catch (error) {
        console.error('[TR25 TEST] Error simulando cron:', error);
      } finally {
        ejecutando = false;
      }
    };

    void tick();
    const interval = window.setInterval(() => void tick(), INTERVALO_TEST_MS);

    return () => {
      activo = false;
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
