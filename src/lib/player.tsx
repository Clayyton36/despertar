// Estado do jogador, compartilhado entre as telas e salvo no próprio celular.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { dailyMissions, levelFromXp, Player, today } from './game';
import { setupReminders, syncReminders } from './reminders';

const STORAGE_KEY = 'despertar:player';

type PlayerContextValue = {
  player: Player | null;
  loading: boolean;
  awaken: (data: { name: string; heightCm: number; weightKg: number; goalWeightKg: number }) => void;
  addProgress: (missionId: string, amount: number) => { leveledUp: boolean; level: number };
  logWeight: (kg: number) => void;
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
        setPlayer(saved);
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
    });
  }

  // Soma (ou subtrai) progresso numa missão de hoje. Ao bater a meta ganha XP e +1 no atributo;
  // se voltar abaixo da meta, perde de novo.
  function addProgress(missionId: string, amount: number) {
    if (!player) return { leveledUp: false, level: 1 };
    const mission = dailyMissions(player).find((m) => m.id === missionId)!;
    const day = today();
    const before = player.progress[day]?.[missionId] ?? 0;
    const after = Math.max(0, before + amount);
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

  function logWeight(kg: number) {
    if (!player) return;
    const others = player.weights.filter((w) => w.date !== today());
    save({ ...player, weights: [...others, { date: today(), kg }] });
  }

  return (
    <PlayerContext.Provider value={{ player, loading, awaken, addProgress, logWeight }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer precisa estar dentro de <PlayerProvider>');
  return ctx;
}
