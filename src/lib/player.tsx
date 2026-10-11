// Estado do jogador, compartilhado entre as telas e salvo no próprio celular.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { dailyMissions, FAST_CHALLENGES, fastEnd, levelFromXp, Player, today } from './game';
import { setupReminders, syncReminders } from './reminders';

const STORAGE_KEY = 'despertar:player';

type PlayerContextValue = {
  player: Player | null;
  loading: boolean;
  awaken: (data: { name: string; heightCm: number; weightKg: number; goalWeightKg: number }) => void;
  addProgress: (missionId: string, amount: number) => { leveledUp: boolean; level: number };
  setProgress: (missionId: string, value: number) => { leveledUp: boolean; level: number };
  logWeight: (kg: number) => void;
  startFast: (goalHours: number) => void;
  endFast: () => { success: boolean; leveledUp: boolean; level: number };
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const remindersReady = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        // Versão antiga só tinha missões marcadas, sem quantidade: considera a meta inteira feita.
        if (!saved.progress) {
          const targets = Object.fromEntries(dailyMissions({ ...saved, progress: {} }).map((m) => [m.id, m.target]));
          saved.progress = Object.fromEntries(
            Object.entries(saved.completed as Record<string, string[]>).map(([day, ids]) => [
              day,
              Object.fromEntries(ids.map((id) => [id, targets[id]])),
            ]),
          );
        }
        setPlayer({ fast: null, fasts: [], ...saved });
      })
      .finally(() => setLoading(false));
  }, []);

  // Reagenda os lembretes quando o progresso muda (espera 1s para juntar vários toques seguidos).
  useEffect(() => {
    if (!player) return;
    const timer = setTimeout(async () => {
      if (!remindersReady.current) remindersReady.current = await setupReminders();
      if (remindersReady.current) await syncReminders(player);
    }, 1000);
    return () => clearTimeout(timer);
  }, [player]);

  function save(next: Player) {
    setPlayer(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function awaken({ name, heightCm, weightKg, goalWeightKg }: Parameters<PlayerContextValue['awaken']>[0]) {
    save({
      name,
      heightCm,
      startWeightKg: weightKg,
      goalWeightKg,
      weights: [{ date: today(), kg: weightKg }],
      xp: 0,
      attributes: { forca: 10, vitalidade: 10, resistencia: 10, disciplina: 10 },
      progress: {},
      completed: {},
      fast: null,
      fasts: [],
    });
  }

  // Define o progresso de hoje numa missão. Ao bater a meta ganha XP e +1 no atributo;
  // se voltar abaixo da meta, perde de novo.
  function setProgress(missionId: string, value: number) {
    if (!player) return { leveledUp: false, level: 1 };
    const mission = dailyMissions(player).find((m) => m.id === missionId)!;
    const day = today();
    const before = player.progress[day]?.[missionId] ?? 0;
    const after = Math.max(0, value);
    const wasDone = before >= mission.target;
    const nowDone = after >= mission.target;
    const sign = nowDone === wasDone ? 0 : nowDone ? 1 : -1;
    const done = player.completed[day] ?? [];

    const next: Player = {
      ...player,
      xp: Math.max(0, player.xp + sign * mission.xp),
      attributes: { ...player.attributes, [mission.attribute]: player.attributes[mission.attribute] + sign },
      progress: { ...player.progress, [day]: { ...player.progress[day], [missionId]: after } },
      completed: {
        ...player.completed,
        [day]: nowDone ? [...done.filter((id) => id !== missionId), missionId] : done.filter((id) => id !== missionId),
      },
    };
    save(next);
    const level = levelFromXp(next.xp);
    return { leveledUp: level > levelFromXp(player.xp), level };
  }

  function addProgress(missionId: string, amount: number) {
    return setProgress(missionId, (player?.progress[today()]?.[missionId] ?? 0) + amount);
  }

  function logWeight(kg: number) {
    if (!player) return;
    const others = player.weights.filter((w) => w.date !== today());
    save({ ...player, weights: [...others, { date: today(), kg }] });
  }

  function startFast(goalHours: number) {
    if (!player || player.fast) return;
    save({ ...player, fast: { start: Date.now(), goalHours } });
  }

  // Encerrar depois da meta = sucesso (XP + Disciplina). Antes da meta, só registra, sem penalidade.
  function endFast() {
    if (!player?.fast) return { success: false, leveledUp: false, level: 1 };
    const end = Date.now();
    const success = end >= fastEnd(player.fast);
    const xp = success ? FAST_CHALLENGES.find((c) => c.hours === player.fast!.goalHours)!.xp : 0;

    const next: Player = {
      ...player,
      xp: player.xp + xp,
      attributes: { ...player.attributes, disciplina: player.attributes.disciplina + (success ? 1 : 0) },
      fast: null,
      fasts: [...player.fasts, { ...player.fast, end, success }],
    };
    save(next);
    const level = levelFromXp(next.xp);
    return { success, leveledUp: level > levelFromXp(player.xp), level };
  }

  return (
    <PlayerContext.Provider value={{ player, loading, awaken, addProgress, setProgress, logWeight, startFast, endFast }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer precisa estar dentro de <PlayerProvider>');
  return ctx;
}
