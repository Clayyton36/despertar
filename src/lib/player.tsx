// Estado do jogador, compartilhado entre as telas e salvo no próprio celular.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  Achievement,
  applyPenalties,
  currentWeight,
  dailyMissions,
  DEFAULT_SETTINGS,
  exerciseById,
  FAST_CHALLENGES,
  fastEnd,
  feedingDone,
  levelFromXp,
  MealRecord,
  Player,
  rankFromLevel,
  Settings,
  today,
  unlockAchievements,
  withProgress,
  WORKOUT_MIN_MINUTES,
  WORKOUT_XP,
  workoutCalories,
  WorkoutMode,
  WorkoutRecord,
  WorkoutSet,
} from './game';
import { claimQuests, Quest } from './quests';
import { cancelReminders, setupReminders, syncReminders } from './reminders';

const STORAGE_KEY = 'despertar:player';

export type SystemEvent = { id?: number } & (
  | { kind: 'level'; level: number; rankUp: string | null }
  | { kind: 'achievement'; achievement: Achievement }
  | { kind: 'achievements'; count: number; xp: number }
  | { kind: 'penalty'; xpLost: number; days: number }
  | { kind: 'quest'; quest: Quest }
);

type PlayerContextValue = {
  player: Player | null;
  loading: boolean;
  awaken: (data: { name: string; heightCm: number; weightKg: number; goalWeightKg: number }) => void;
  // avisos do Sistema na fila (level up, conquistas, penalidades), mostrados um por vez
  events: SystemEvent[];
  dismissEvent: () => void;
  addProgress: (missionId: string, amount: number) => void;
  setProgress: (missionId: string, value: number) => void;
  logWeight: (kg: number) => void;
  startFast: (goalHours: number) => void;
  endFast: () => { success: boolean };
  // Durante um jejum, registrar refeição encerra o jejum (com o XP, se a meta já foi batida).
  addMeal: (meal: Omit<MealRecord, 'at'>) => { fastEnded: { success: boolean; goalHours: number } | null };
  removeMeal: (at: number) => void;
  startWorkout: (mode: WorkoutMode) => void;
  logSet: (set: WorkoutSet) => void;
  removeSet: (index: number) => void;
  finishWorkout: () => { record: WorkoutRecord } | null;
  cancelWorkout: () => void;
  updateSettings: (settings: Settings) => void;
  updateProfile: (data: { name: string; heightCm: number; goalWeightKg: number }) => void;
  replacePlayer: (player: Player) => void;
  resetAll: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const eventId = useRef(0);
  const remindersReady = useRef(false);
  // Cópia sempre atual do jogador para funções que rodam fora do render (penalidades, save).
  const playerRef = useRef<Player | null>(null);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);


  // Reagenda os lembretes quando o progresso muda (espera 1s para juntar vários toques seguidos).
  useEffect(() => {
    if (!player) return;
    const timer = setTimeout(async () => {
      if (!remindersReady.current) remindersReady.current = await setupReminders();
      if (remindersReady.current) await syncReminders(player);
    }, 1000);
    return () => clearTimeout(timer);
  }, [player]);

  // Todo salvamento passa por aqui: completa missões semanais/Dungeon, desbloqueia conquistas
  // e avisa level up / rank up.
  const save = useCallback((changed: Player, extraEvents: SystemEvent[] = []) => {
    const before = playerRef.current;
    const { player: withQuests, claimed } = claimQuests(changed);
    const { player: next, unlocked } = unlockAchievements(withQuests);
    const news: SystemEvent[] = [...extraEvents, ...claimed.map((quest) => ({ kind: 'quest' as const, quest }))];
    if (unlocked.length > 2) {
      news.push({ kind: 'achievements', count: unlocked.length, xp: unlocked.reduce((sum, a) => sum + a.xp, 0) });
    } else {
      news.push(...unlocked.map((achievement) => ({ kind: 'achievement' as const, achievement })));
    }
    if (before) {
      const level = levelFromXp(next.xp);
      if (level > levelFromXp(before.xp)) {
        const rank = rankFromLevel(level);
        news.push({ kind: 'level', level, rankUp: rank !== rankFromLevel(levelFromXp(before.xp)) ? rank : null });
      }
    }
    if (news.length) setEvents((list) => [...list, ...news.map((e) => ({ ...e, id: ++eventId.current }))]);
    playerRef.current = next;
    setPlayer(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  // Carrega os dados salvos. Passa pelo save para liberar conquistas já cumpridas (ex.: após atualizar o app).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && save(normalize(JSON.parse(raw))))
      .finally(() => setLoading(false));
  }, [save]);

  // Penalidades: ao abrir o app, ao voltar para ele e na virada do dia, confere os dias encerrados.
  const checkDay = useCallback(() => {
    const current = playerRef.current;
    if (!current || current.lastCheckDay >= today()) return;
    const { player: next, xpLost, days } = applyPenalties(current);
    save(next, xpLost > 0 ? [{ kind: 'penalty', xpLost, days }] : []);
  }, [save]);

  useEffect(() => {
    if (loading) return;
    checkDay();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && checkDay());
    const timer = setInterval(checkDay, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [loading, checkDay]);

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
      workout: null,
      workouts: [],
      meals: [],
      quests: {},
      settings: DEFAULT_SETTINGS,
      achievements: {},
      lastCheckDay: today(),
    });
  }

  function setProgress(missionId: string, value: number) {
    if (player) save(withProgress(player, missionId, value));
  }

  function addProgress(missionId: string, amount: number) {
    setProgress(missionId, (player?.progress[today()]?.[missionId] ?? 0) + amount);
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

  function endFast() {
    if (!player?.fast) return { success: false };
    const { player: next, success } = closeFast(player);
    save(next);
    return { success };
  }

  // A missão Alimentação acompanha as refeições de hoje: conclui ou desfaz sozinha.
  function withFeeding(p: Player) {
    return withProgress(p, 'refeicoes', feedingDone(p) ? 1 : 0);
  }

  function addMeal(meal: Omit<MealRecord, 'at'>) {
    if (!player) return { fastEnded: null };
    const goalHours = player.fast?.goalHours;
    const { player: afterFast, success } = player.fast ? closeFast(player) : { player, success: false };
    save(withFeeding({ ...afterFast, meals: [...afterFast.meals, { ...meal, at: Date.now() }] }));
    return { fastEnded: goalHours ? { success, goalHours } : null };
  }

  function removeMeal(at: number) {
    if (player) save(withFeeding({ ...player, meals: player.meals.filter((m) => m.at !== at) }));
  }

  function startWorkout(mode: WorkoutMode) {
    if (!player || player.workout) return;
    save({ ...player, workout: { mode, start: Date.now(), sets: [] } });
  }

  // Séries de exercícios ligados a missões (flexão, abdominal, agachamento) somam na missão do dia.
  function changeMission(p: Player, set: WorkoutSet, sign: 1 | -1) {
    const missionId = exerciseById(set.exerciseId).missionId;
    if (!missionId) return p;
    return withProgress(p, missionId, (p.progress[today()]?.[missionId] ?? 0) + sign * set.value);
  }

  function logSet(set: WorkoutSet) {
    if (!player?.workout) return;
    const withSet = { ...player, workout: { ...player.workout, sets: [...player.workout.sets, set] } };
    save(changeMission(withSet, set, 1));
  }

  function removeSet(index: number) {
    if (!player?.workout) return;
    const set = player.workout.sets[index];
    const sets = player.workout.sets.filter((_, i) => i !== index);
    save(changeMission({ ...player, workout: { ...player.workout, sets } }, set, -1));
  }

  // Treino de 15 min ou mais dá XP e +1 Força (no máximo um por dia).
  function finishWorkout() {
    if (!player?.workout) return null;
    const end = Date.now();
    const minutes = (end - player.workout.start) / 60_000;
    const alreadyToday = player.workouts.some((w) => w.xp > 0 && new Date(w.start).toDateString() === new Date().toDateString());
    const xp = minutes >= WORKOUT_MIN_MINUTES && !alreadyToday ? WORKOUT_XP : 0;
    const record: WorkoutRecord = {
      ...player.workout,
      end,
      kcal: workoutCalories(player.workout, end, currentWeight(player)),
      xp,
    };
    const next: Player = {
      ...player,
      xp: player.xp + xp,
      attributes: { ...player.attributes, forca: player.attributes.forca + (xp ? 1 : 0) },
      workout: null,
      workouts: [...player.workouts, record],
    };
    save(next);
    return { record };
  }

  // Cancelar descarta a sessão e desfaz o que ela tinha somado nas missões.
  function cancelWorkout() {
    if (!player?.workout) return;
    const reverted = player.workout.sets.reduce((p, set) => changeMission(p, set, -1), player);
    save({ ...reverted, workout: null });
  }

  // Mudar os horários de refeição muda o que a missão Alimentação exige.
  function updateSettings(settings: Settings) {
    if (player) save(withFeeding({ ...player, settings }));
  }

  function updateProfile(data: { name: string; heightCm: number; goalWeightKg: number }) {
    if (player) save({ ...player, ...data });
  }

  // Usado pela importação de backup: troca todos os dados pelos do arquivo.
  function replacePlayer(next: Player) {
    save(normalize(next));
  }

  function resetAll() {
    setPlayer(null);
    AsyncStorage.removeItem(STORAGE_KEY);
    cancelReminders();
  }

  return (
    <PlayerContext.Provider value={{
        player,
        loading,
        events,
        dismissEvent: () => setEvents((list) => list.slice(1)),
        awaken,
        addProgress,
        setProgress,
        logWeight,
        startFast,
        endFast,
        addMeal,
        removeMeal,
        startWorkout,
        logSet,
        removeSet,
        finishWorkout,
        cancelWorkout,
        updateSettings,
        updateProfile,
        replacePlayer,
        resetAll,
      }}>
      {children}
    </PlayerContext.Provider>
  );
}

// Encerrar depois da meta = sucesso (XP + Disciplina). Antes da meta, só registra, sem penalidade.
function closeFast(player: Player): { player: Player; success: boolean } {
  const fast = player.fast!;
  const end = Date.now();
  const success = end >= fastEnd(fast);
  const xp = success ? FAST_CHALLENGES.find((c) => c.hours === fast.goalHours)!.xp : 0;
  return {
    success,
    player: {
      ...player,
      xp: player.xp + xp,
      attributes: { ...player.attributes, disciplina: player.attributes.disciplina + (success ? 1 : 0) },
      fast: null,
      fasts: [...player.fasts, { ...fast, end, success }],
    },
  };
}

// Completa dados salvos por versões antigas do app (ou vindos de um backup antigo).
// Recebe o dado bruto do armazenamento, por isso o tipo any.
function normalize(saved: any): Player {
  saved.completed ??= {};
  // Versão antiga só tinha missões marcadas, sem quantidade: considera a meta inteira feita.
  if (!saved.progress) {
    const missions = dailyMissions({ ...saved, progress: {}, settings: DEFAULT_SETTINGS });
    const targets = Object.fromEntries(missions.map((m) => [m.id, m.target]));
    saved.progress = Object.fromEntries(
      Object.entries(saved.completed as Record<string, string[]>).map(([day, ids]) => [
        day,
        Object.fromEntries(ids.map((id) => [id, targets[id]])),
      ]),
    );
  }
  return {
    fast: null,
    fasts: [],
    workout: null,
    workouts: [],
    meals: [],
    quests: {},
    ...saved,
    achievements: {},
    // sem data de verificação (dados antigos): começa hoje, sem penalizar o passado
    lastCheckDay: today(),
    ...saved,
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
  };
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer precisa estar dentro de <PlayerProvider>');
  return ctx;
}
