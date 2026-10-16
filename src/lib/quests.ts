// Missões semanais (segunda a domingo) e a Dungeon de fim de semana.
//
// Nada aqui é marcado à mão: o progresso é calculado do que já foi registrado no app
// (missões diárias, treinos, jejuns, passos). Ao completar, o XP entra uma vez só e
// fica guardado em player.quests, mesmo que depois algum registro seja apagado.
import { Attribute, dailyMissions, dateKey, FAST_CHALLENGES, fastSuccesses, FASTS_TO_UNLOCK, levelFromXp, Player } from './game';

export type Quest = {
  id: string;
  title: string;
  detail: string;
  icon: string;
  xp: number;
  attribute: Attribute;
  points: number; // pontos de atributo ao completar
  target: number;
  progress: number;
  unit?: string;
};

export type Dungeon = Quest & { name: string; lore: string; open: boolean };

const WEEKLY_XP = 40;
const DUNGEON_XP = 100;

// Segunda-feira da semana de uma data (as missões semanais reiniciam toda segunda).
export function weekStart(d = new Date()) {
  const monday = new Date(d);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

export function weekKey(d = new Date()) {
  return dateKey(weekStart(d));
}

function weekDays(d = new Date()) {
  const start = weekStart(d);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return dateKey(day);
  });
}

// Sábado e domingo da semana.
function weekendDays(d = new Date()) {
  return weekDays(d).slice(5);
}

export function daysLeftInWeek(d = new Date()) {
  return 7 - ((d.getDay() + 6) % 7); // segunda = 7 ... domingo = 1 (contando hoje)
}

export function isWeekend(d = new Date()) {
  return d.getDay() === 0 || d.getDay() === 6;
}

const inWeek = (ms: number, days: string[]) => days.includes(dateKey(new Date(ms)));

export function weeklyQuests(player: Player, d = new Date()): Quest[] {
  const days = weekDays(d);
  const missionDays = (id: string) => days.filter((k) => player.completed[k]?.includes(id)).length;
  const stepTarget = dailyMissions(player).find((m) => m.id === 'passos')!.target;
  const weekSteps = days.reduce((sum, k) => sum + (player.progress[k]?.passos ?? 0), 0);
  const workouts = player.workouts.filter((w) => inWeek(w.start, days) && w.end - w.start >= 15 * 60_000).length;
  const fasts = player.fasts.filter((f) => f.success && inWeek(f.end, days)).length;

  const base = { xp: WEEKLY_XP, points: 2 };
  return [
    { ...base, id: 'semana-agua', title: 'Fonte Inesgotável', detail: 'Bater a meta de água em 5 dias', icon: '💧', attribute: 'resistencia', target: 5, progress: missionDays('agua'), unit: 'dias' },
    { ...base, id: 'semana-dieta', title: 'Disciplina à Mesa', detail: 'Cumprir a missão Alimentação em 5 dias', icon: '🥗', attribute: 'disciplina', target: 5, progress: missionDays('refeicoes'), unit: 'dias' },
    { ...base, id: 'semana-treinos', title: 'Treinamento Semanal', detail: 'Finalizar 3 treinos de 15 min ou mais', icon: '🏋️', attribute: 'forca', target: 3, progress: workouts, unit: 'treinos' },
    { ...base, id: 'semana-passos', title: 'Longa Jornada', detail: `Somar ${(stepTarget * 5).toLocaleString('pt-BR')} passos na semana`, icon: '👟', attribute: 'resistencia', target: stepTarget * 5, progress: weekSteps, unit: 'passos' },
    { ...base, id: 'semana-jejum', title: 'Fome Domada', detail: 'Concluir 2 jejuns', icon: '⏳', attribute: 'disciplina', target: 2, progress: fasts, unit: 'jejuns' },
    { ...base, id: 'semana-sono', title: 'Sono dos Justos', detail: 'Cumprir a missão Descanso em 5 dias', icon: '🌙', attribute: 'vitalidade', target: 5, progress: missionDays('sono'), unit: 'dias' },
  ];
}

// A Dungeon da semana segue um rodízio (a mesma para o fim de semana inteiro) e
// cresce com o nível. Fica aberta só no sábado e no domingo; não completar não tem penalidade.
export function weekDungeon(player: Player, d = new Date()): Dungeon {
  const weekend = weekendDays(d);
  const open = isWeekend(d);
  const level = levelFromXp(player.xp);
  const missions = dailyMissions(player);
  const target = (id: string) => missions.find((m) => m.id === id)!.target;
  const onWeekend = (id: string) => weekend.map((k) => player.progress[k]?.[id] ?? 0);

  const reps = target('flexoes');
  const strength = Math.max(...weekend.map((k) => ['flexoes', 'abdominais', 'agachamentos'].reduce((s, id) => s + (player.progress[k]?.[id] ?? 0), 0)));
  const steps = Math.min(20000, target('passos') * 2);
  const perfectDays = weekend.filter((k) => (player.completed[k]?.length ?? 0) >= missions.length).length;
  // Jejum: o maior desafio já liberado, até 16h.
  const unlockedHours = FAST_CHALLENGES.filter((c, i) => i === 0 || fastSuccesses(player, FAST_CHALLENGES[i - 1].hours) >= FASTS_TO_UNLOCK).map((c) => c.hours);
  const fastHours = Math.min(16, Math.max(...unlockedHours));
  const fastDone = player.fasts.some((f) => f.success && f.goalHours >= fastHours && weekend.includes(dateKey(new Date(f.end))));

  const base = { id: 'dungeon', xp: DUNGEON_XP + level * 2, points: 3, open };
  const pool: Dungeon[] = [
    { ...base, name: 'Covil dos Golens', title: 'Covil dos Golens', icon: '🗿', lore: 'Golens de pedra só caem diante de força bruta.', detail: `${reps * 6} repetições (flexões + abdominais + agachamentos) num só dia do fim de semana`, attribute: 'forca', target: reps * 6, progress: strength, unit: 'reps' },
    { ...base, name: 'Trilha Infinita', title: 'Trilha Infinita', icon: '🌲', lore: 'Uma floresta sem fim. Só sai quem não para de andar.', detail: `${steps.toLocaleString('pt-BR')} passos num só dia do fim de semana`, attribute: 'resistencia', target: steps, progress: Math.max(...onWeekend('passos')), unit: 'passos' },
    { ...base, name: 'Torre da Disciplina', title: 'Torre da Disciplina', icon: '🗼', lore: 'Cada andar exige um dia perfeito.', detail: 'Cumprir todas as missões diárias no sábado e no domingo', attribute: 'disciplina', target: 2, progress: perfectDays, unit: 'dias' },
    { ...base, name: 'Templo do Jejum', title: 'Templo do Jejum', icon: '🏯', lore: 'Os monges do templo testam a sua vontade.', detail: `Concluir um jejum de ${fastHours}h terminando no fim de semana`, attribute: 'vitalidade', target: 1, progress: fastDone ? 1 : 0 },
  ];
  // Rodízio: cada fim de semana é a próxima Dungeon da lista (nunca repete em seguida).
  const weeks = Math.round((weekStart(d).getTime() - new Date(2026, 0, 5, 12).getTime()) / (7 * 86_400_000));
  return pool[((weeks % pool.length) + pool.length) % pool.length];
}

export const questDone = (q: Quest) => q.progress >= q.target;

export function claimedQuests(player: Player, d = new Date()) {
  return player.quests[weekKey(d)] ?? [];
}

// Dá o XP e os pontos de atributo das missões semanais (e da Dungeon, se aberta) que
// acabaram de ser completadas nesta semana.
export function claimQuests(player: Player, d = new Date()): { player: Player; claimed: Quest[] } {
  const claimed = new Set(claimedQuests(player, d));
  const dungeon = weekDungeon(player, d);
  const ready = [...weeklyQuests(player, d), ...(dungeon.open ? [dungeon] : [])].filter((q) => !claimed.has(q.id) && questDone(q));
  if (!ready.length) return { player, claimed: [] };

  const attributes = { ...player.attributes };
  for (const q of ready) attributes[q.attribute] += q.points;
  return {
    claimed: ready,
    player: {
      ...player,
      xp: player.xp + ready.reduce((sum, q) => sum + q.xp, 0),
      attributes,
      quests: { ...player.quests, [weekKey(d)]: [...claimed, ...ready.map((q) => q.id)] },
    },
  };
}

// Quantas Dungeons já foram completadas (para as conquistas).
export function dungeonsCleared(player: Player) {
  return Object.values(player.quests).filter((ids) => ids.includes('dungeon')).length;
}
