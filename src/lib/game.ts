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
};

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

// Recomendação comum: ~35 ml de água por kg de peso (arredondado para 100 ml).
export function waterGoalMl(weightKg: number) {
  return Math.round((weightKg * 35) / 100) * 100;
}

// A missão de treino cresce junto com o nível (começa leve para não machucar).
export function dailyMissions(player: Player): Mission[] {
  const level = levelFromXp(player.xp);
  const reps = Math.min(100, 10 + (level - 1) * 2);
  const steps = Math.min(10000, 3000 + (level - 1) * 250);
  const water = waterGoalMl(currentWeight(player));

  return [
    { id: 'agua', title: 'Hidratação', detail: `Beber ${formatAmount(water, 'ml')} de água`, xp: 20, attribute: 'resistencia', target: water, unit: 'ml', steps: [200, 300, 500] },
    { id: 'refeicoes', title: 'Alimentação', detail: 'Comer nos horários e sem besteira', xp: 20, attribute: 'disciplina', target: 1 },
    { id: 'flexoes', title: 'Flexões', detail: `${reps} flexões`, xp: 15, attribute: 'forca', target: reps, unit: 'reps', steps: [1, 5, 10] },
    { id: 'abdominais', title: 'Abdominais', detail: `${reps} abdominais`, xp: 15, attribute: 'forca', target: reps, unit: 'reps', steps: [1, 5, 10] },
    { id: 'agachamentos', title: 'Agachamentos', detail: `${reps} agachamentos`, xp: 15, attribute: 'forca', target: reps, unit: 'reps', steps: [1, 5, 10] },
    { id: 'passos', title: 'Caminhada', detail: `${formatAmount(steps, 'passos')}`, xp: 20, attribute: 'resistencia', target: steps, unit: 'passos', steps: [500, 1000, 2000] },
    { id: 'sono', title: 'Descanso', detail: 'Dormir até 23h (7h+ de sono)', xp: 20, attribute: 'vitalidade', target: 1 },
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
