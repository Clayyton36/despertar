// Mantém a missão de passos sincronizada com o Health Connect:
// atualiza ao abrir a tela, ao voltar para o app e quando o jogador toca em "Atualizar".
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { connectHealth, healthStatus, HealthStatus, todaySteps } from './health';

export function useStepSync(onSteps: (steps: number) => void) {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  // Guardamos o callback numa ref para o sync não ser recriado a cada render (evita loop).
  const onStepsRef = useRef(onSteps);
  useEffect(() => {
    onStepsRef.current = onSteps;
  });

  const sync = useCallback(async () => {
    const current = await healthStatus();
    setStatus(current);
    if (current !== 'connected') return;
    const steps = await todaySteps();
    if (steps != null) {
      onStepsRef.current(steps);
      setLastSync(new Date());
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      sync();
    }, [sync]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && sync());
    return () => sub.remove();
  }, [sync]);

  async function connect() {
    await connectHealth();
    await sync();
  }

  return { status, lastSync, sync, connect };
}
