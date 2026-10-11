// Regras do "Sistema": níveis, ranks, atributos e missões diárias.

export type Attribute = 'forca' | 'vitalidade' | 'resistencia' | 'disciplina';

export const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  forca: 'Força',
  vitalidade: 'Vitalidade',
  resistencia: 'Resistência',
  disciplina: 'Disciplina',
};

export type Mission = {
  id: string;
  title: string;
  detail: string;
  xp: number;
  attribute: Attribute;
  // Quanto precisa fazer no dia. Missões de "sim/não" têm target 1 e sem unidade.
  target: number;
  unit?: 'ml' | 'reps' | 'passos';
  // Botões de adicionar rápido (ex.: +200 ml, +5 flexões).
  steps?: number[];
};

export type Player = {
  name: string;
  heightCm: number;
  startWeightKg: number;
  goalWeightKg: number;
  weights: { date: string; kg: number }[];
  xp: number;
  attributes: Record<Attribute, number>;
  // progresso por dia: { '2026-10-11': { agua: 1200, flexoes: 5, sono: 1 } }
  progress: Record<string, Record<string, number>>;
  // missões concluídas por dia (guarda o resultado mesmo se a meta mudar depois)
  completed: Record<string, string[]>;
  // jejum em andamento (horários em milissegundos) e histórico dos anteriores
  fast: { start: number; goalHours: number } | null;
  fasts: FastRecord[];
  // treino em andamento e histórico
  workout: ActiveWorkout | null;
  workouts: WorkoutRecord[];
  settings: Settings;
};

// ---------- Configurações ----------

// Horários sempre no formato "HH:MM".
export type Settings = {
  waterGoalMl: number | null; // null = automático pelo peso
  bedtime: string;
  reminders: { agua: boolean; refeicoes: boolean; treino: boolean; sono: boolean };
  water: { start: string; end: string; everyHours: number };
  meals: { name: string; time: string }[];
  trainingTimes: string[];
};

export const DEFAULT_SETTINGS: Settings = {
  waterGoalMl: null,
  bedtime: '23:00',
  reminders: { agua: true, refeicoes: true, treino: true, sono: true },
  water: { start: '08:00', end: '20:00', everyHours: 2 },
  meals: [
    { name: 'café da manhã', time: '07:30' },
    { name: 'almoço', time: '12:00' },
    { name: 'lanche', time: '15:30' },
    { name: 'jantar', time: '19:30' },
  ],
  trainingTimes: ['12:30', '18:00', '21:00'],
};

export function isValidTime(t: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export function parseTime(t: string): [number, number] {
  const [h, m] = t.split(':').map(Number);
  return [h, m];
}

// "23:00" menos 30 min = "22:30"
export function minusMinutes(t: string, minutes: number): [number, number] {
  const [h, m] = parseTime(t);
  const total = (h * 60 + m - minutes + 24 * 60) % (24 * 60);
  return [Math.floor(total / 60), total % 60];
}

export function waterTargetMl(player: Player) {
  return player.settings.waterGoalMl ?? waterGoalMl(currentWeight(player));
}

export type FastRecord = { start: number; end: number; goalHours: number; success: boolean };

// Desafios de jejum: cada um libera depois de completar o anterior algumas vezes.
// Paramos em 18h de propósito, por segurança.
export const FAST_CHALLENGES = [
  { hours: 12, xp: 30 },
  { hours: 14, xp: 40 },
  { hours: 16, xp: 50 },
  { hours: 18, xp: 60 },
];
export const FASTS_TO_UNLOCK = 3;

export function fastSuccesses(player: Player, hours: number) {
  return player.fasts.filter((f) => f.success && f.goalHours === hours).length;
}

export function isChallengeUnlocked(player: Player, index: number) {
  return index === 0 || fastSuccesses(player, FAST_CHALLENGES[index - 1].hours) >= FASTS_TO_UNLOCK;
}

export function fastEnd(fast: { start: number; goalHours: number }) {
  return fast.start + fast.goalHours * 3600_000;
}

export const RANKS = [
  { rank: 'E', minLevel: 1 },
  { rank: 'D', minLevel: 10 },
  { rank: 'C', minLevel: 20 },
  { rank: 'B', minLevel: 35 },
  { rank: 'A', minLevel: 50 },
  { rank: 'S', minLevel: 75 },
];

// XP total necessário para chegar a um nível: cresce aos poucos (50, 150, 300, 500...).
export function xpForLevel(level: number) {
  return 25 * (level - 1) * level;
}

export function levelFromXp(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function rankFromLevel(level: number) {
  return [...RANKS].reverse().find((r) => level >= r.minLevel)!.rank;
}

export function currentWeight(player: Player) {
  return player.weights[player.weights.length - 1]?.kg ?? player.startWeightKg;
}

export function bmi(weightKg: number, heightCm: number) {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

// Estimativas a partir dos passos: ~0,0005 kcal por passo por kg (≈0,04 kcal/passo a 80 kg)
// e passada de ~41,5% da altura.
export function stepCalories(steps: number, weightKg: number) {
  return Math.round(steps * weightKg * 0.0005);
}

export function stepDistanceKm(steps: number, heightCm: number) {
  return (steps * heightCm * 0.415) / 100_000;
}

// Recomendação comum: ~35 ml de água por kg de peso (arredondado para 100 ml).
export function waterGoalMl(weightKg: number) {
  return Math.round((weightKg * 35) / 100) * 100;
}

// A missão de treino cresce junto com o nível (começa leve para não machucar).
export function dailyMissions(player: Player): Mission[] {
  const level = levelFromXp(player.xp);
  const reps = Math.min(100, 10 + (level - 1) * 2);
  const steps = Math.min(10000, 3000 + (level - 1) * 250);
  const water = waterTargetMl(player);

  return [
    { id: 'agua', title: 'Hidratação', detail: `Beber ${formatAmount(water, 'ml')} de água`, xp: 20, attribute: 'resistencia', target: water, unit: 'ml', steps: [200, 300, 500] },
    { id: 'refeicoes', title: 'Alimentação', detail: 'Comer nos horários e sem besteira', xp: 20, attribute: 'disciplina', target: 1 },
    { id: 'flexoes', title: 'Flexões', detail: `${reps} flexões`, xp: 15, attribute: 'forca', target: reps, unit: 'reps', steps: [1, 5, 10] },
    { id: 'abdominais', title: 'Abdominais', detail: `${reps} abdominais`, xp: 15, attribute: 'forca', target: reps, unit: 'reps', steps: [1, 5, 10] },
    { id: 'agachamentos', title: 'Agachamentos', detail: `${reps} agachamentos`, xp: 15, attribute: 'forca', target: reps, unit: 'reps', steps: [1, 5, 10] },
    { id: 'passos', title: 'Caminhada', detail: `${formatAmount(steps, 'passos')}`, xp: 20, attribute: 'resistencia', target: steps, unit: 'passos', steps: [500, 1000, 2000] },
    { id: 'sono', title: 'Descanso', detail: `Dormir até ${player.settings.bedtime} (7h+ de sono)`, xp: 20, attribute: 'vitalidade', target: 1 },
  ];
}

export function formatAmount(value: number, unit?: Mission['unit']) {
  if (unit === 'ml') return value >= 1000 ? `${(value / 1000).toLocaleString('pt-BR')} L` : `${value} ml`;
  if (unit === 'passos') return `${value.toLocaleString('pt-BR')} passos`;
  return String(value);
}

export function missionProgress(player: Player, missionId: string, date = today()) {
  return player.progress[date]?.[missionId] ?? 0;
}

export function isDone(player: Player, mission: Mission) {
  return missionProgress(player, mission.id) >= mission.target;
}

// Quantidade com o nome certo (ex.: "1,3 L", "5 flexões", "2.000 passos").
export function amountText(mission: Mission, value: number) {
  if (mission.unit === 'reps') return `${value} ${mission.title.toLowerCase()}`;
  return formatAmount(value, mission.unit);
}

export function remainingText(player: Player, mission: Mission) {
  return amountText(mission, Math.max(0, mission.target - missionProgress(player, mission.id)));
}

export function dateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today() {
  return dateKey(new Date());
}

// Dias seguidos (até ontem ou hoje) com todas as missões concluídas.
export function streak(player: Player) {
  const total = dailyMissions(player).length;
  const allDone = (date: string) => (player.completed[date]?.length ?? 0) >= total;
  let count = 0;
  const d = new Date();
  if (!allDone(today())) d.setDate(d.getDate() - 1);
  while (allDone(dateKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

// Define o progresso de hoje numa missão. Ao bater a meta ganha XP e +1 no atributo;
// se voltar abaixo da meta, perde de novo.
export function withProgress(player: Player, missionId: string, value: number): Player {
  const mission = dailyMissions(player).find((m) => m.id === missionId)!;
  const day = today();
  const before = player.progress[day]?.[missionId] ?? 0;
  const after = Math.max(0, value);
  const wasDone = before >= mission.target;
  const nowDone = after >= mission.target;
  const sign = nowDone === wasDone ? 0 : nowDone ? 1 : -1;
  const done = (player.completed[day] ?? []).filter((id) => id !== missionId);

  return {
    ...player,
    xp: Math.max(0, player.xp + sign * mission.xp),
    attributes: { ...player.attributes, [mission.attribute]: player.attributes[mission.attribute] + sign },
    progress: { ...player.progress, [day]: { ...player.progress[day], [missionId]: after } },
    completed: { ...player.completed, [day]: nowDone ? [...done, missionId] : done },
  };
}

// ---------- Treinos ----------

export type WorkoutMode = 'casa' | 'academia';

export type Exercise = {
  id: string;
  name: string;
  mode: WorkoutMode;
  // 'reps' = repetições, 'carga' = repetições + kg, 'minutos' = cardio, 'segundos' = prancha
  kind: 'reps' | 'carga' | 'minutos' | 'segundos';
  // missão diária que esse exercício alimenta
  missionId?: string;
  // MET usado só para cardio (minutos registrados à parte do tempo da sessão)
  met?: number;
};

export const EXERCISES: Exercise[] = [
  { id: 'flexao', name: 'Flexão', mode: 'casa', kind: 'reps', missionId: 'flexoes' },
  { id: 'abdominal', name: 'Abdominal', mode: 'casa', kind: 'reps', missionId: 'abdominais' },
  { id: 'agachamento', name: 'Agachamento', mode: 'casa', kind: 'reps', missionId: 'agachamentos' },
  { id: 'afundo', name: 'Afundo', mode: 'casa', kind: 'reps' },
  { id: 'polichinelo', name: 'Polichinelo', mode: 'casa', kind: 'reps' },
  { id: 'burpee', name: 'Burpee', mode: 'casa', kind: 'reps' },
  { id: 'prancha', name: 'Prancha', mode: 'casa', kind: 'segundos' },
  { id: 'supino', name: 'Supino', mode: 'academia', kind: 'carga' },
  { id: 'agachamento-livre', name: 'Agachamento livre', mode: 'academia', kind: 'carga', missionId: 'agachamentos' },
  { id: 'leg-press', name: 'Leg press', mode: 'academia', kind: 'carga' },
  { id: 'puxada', name: 'Puxada', mode: 'academia', kind: 'carga' },
  { id: 'remada', name: 'Remada', mode: 'academia', kind: 'carga' },
  { id: 'desenvolvimento', name: 'Desenvolvimento', mode: 'academia', kind: 'carga' },
  { id: 'rosca', name: 'Rosca direta', mode: 'academia', kind: 'carga' },
  { id: 'triceps', name: 'Tríceps polia', mode: 'academia', kind: 'carga' },
  { id: 'abdominal-academia', name: 'Abdominal', mode: 'academia', kind: 'reps', missionId: 'abdominais' },
  { id: 'esteira-caminhada', name: 'Esteira (caminhada)', mode: 'academia', kind: 'minutos', met: 4.3 },
  { id: 'esteira-corrida', name: 'Esteira (corrida)', mode: 'academia', kind: 'minutos', met: 8.3 },
  { id: 'bicicleta', name: 'Bicicleta', mode: 'academia', kind: 'minutos', met: 7.0 },
];

export function exerciseById(id: string) {
  return EXERCISES.find((e) => e.id === id)!;
}

// value = repetições, minutos ou segundos, conforme o tipo do exercício
export type WorkoutSet = { exerciseId: string; value: number; kg?: number };

export type ActiveWorkout = { mode: WorkoutMode; start: number; sets: WorkoutSet[] };
export type WorkoutRecord = ActiveWorkout & { end: number; kcal: number; xp: number };

// MET médio da sessão (fora o cardio): calistenia moderada ~3,8; musculação ~5,0.
const SESSION_MET: Record<WorkoutMode, number> = { casa: 3.8, academia: 5.0 };
export const WORKOUT_XP = 30;
export const WORKOUT_MIN_MINUTES = 15;

// calorias = MET × peso (kg) × horas. Os minutos de cardio usam o MET do próprio aparelho.
export function workoutCalories(workout: ActiveWorkout, end: number, weightKg: number) {
  const totalMin = (end - workout.start) / 60_000;
  let cardioMin = 0;
  let cardioKcal = 0;
  for (const set of workout.sets) {
    const ex = exerciseById(set.exerciseId);
    if (ex.kind === 'minutos' && ex.met) {
      cardioMin += set.value;
      cardioKcal += ex.met * weightKg * (set.value / 60);
    }
  }
  const restMin = Math.max(0, totalMin - cardioMin);
  return Math.round(cardioKcal + SESSION_MET[workout.mode] * weightKg * (restMin / 60));
}

export function setText(set: WorkoutSet) {
  const ex = exerciseById(set.exerciseId);
  if (ex.kind === 'minutos') return `${set.value} min`;
  if (ex.kind === 'segundos') return `${set.value} s`;
  return set.kg ? `${set.value} × ${set.kg} kg` : `${set.value} reps`;
}
