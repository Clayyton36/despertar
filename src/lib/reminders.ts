// Lembretes do Sistema: notificações locais que cobram o que falta das missões.
// Toda vez que o progresso muda, cancelamos tudo e agendamos de novo com os valores atualizados.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';

import {
  amountText,
  dailyMissions,
  fastEnd,
  isDone,
  mealsOn,
  minusMinutes,
  Mission,
  parseTime,
  Player,
  remainingText,
} from './game';

const CHANNEL_ID = 'lembretes';
// Agenda hoje + os próximos dias, para os lembretes continuarem mesmo sem abrir o app.
const DAYS_AHEAD = 3;

// O Expo Go no Android não inclui mais o módulo de notificações (só funciona num build próprio do app).
// Por isso carregamos o módulo só fora do Expo Go; dentro dele os lembretes ficam desligados.
export const remindersAvailable = !(
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient
);

// eslint-disable-next-line @typescript-eslint/no-require-imports -- import condicional de propósito
const Notifications: typeof NotificationsModule | null = remindersAvailable ? require('expo-notifications') : null;

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupReminders() {
  if (!Notifications) return false;
  // No Android 13+ o pedido de permissão só aparece depois de existir um canal.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Lembretes do Sistema',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

export async function cancelReminders() {
  await Notifications?.cancelAllScheduledNotificationsAsync();
}

export async function syncReminders(player: Player) {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { settings } = player;
  const waterTimes: [number, number][] = [];
  const [startH, startM] = parseTime(settings.water.start);
  const [endH, endM] = parseTime(settings.water.end);
  for (let min = startH * 60 + startM; min <= endH * 60 + endM; min += settings.water.everyHours * 60) {
    waterTimes.push([Math.floor(min / 60), min % 60]);
  }

  const missions = dailyMissions(player);
  const byId = Object.fromEntries(missions.map((m) => [m.id, m])) as Record<string, Mission>;
  const now = new Date();
  const fast = player.fast;
  const duringFast = (date: Date) => !!fast && date.getTime() >= fast.start && date.getTime() <= fastEnd(fast);

  if (fast) {
    const notify = (time: number, title: string, body: string) =>
      time > now.getTime() &&
      Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: time, channelId: CHANNEL_ID },
      });
    const half = fast.start + (fastEnd(fast) - fast.start) / 2;
    await Promise.all([
      notify(half, '[SISTEMA] Jejum', `Metade do jejum de ${fast.goalHours}h concluída. Continue firme.`),
      notify(fastEnd(fast), '[SISTEMA] Jejum concluído', `Desafio de ${fast.goalHours}h cumprido! Encerre o jejum para receber o XP.`),
    ]);
  }

  for (let day = 0; day < DAYS_AHEAD; day++) {
    const isToday = day === 0;
    // Hoje: mostra o que falta de verdade. Dias seguintes: a meta inteira.
    const pending = (m: Mission) => !isToday || !isDone(player, m);
    const left = (m: Mission) => (isToday ? remainingText(player, m) : amountText(m, m.target));

    const at = ([h, min]: [number, number]) => {
      const d = new Date(now);
      d.setDate(d.getDate() + day);
      d.setHours(h, min, 0, 0);
      return d;
    };
    const schedule = (time: [number, number], title: string, body: string, skipDuringFast = false) => {
      const date = at(time);
      if (date <= now || (skipDuringFast && duringFast(date))) return;
      return Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
      });
    };

    const jobs: (Promise<string> | undefined)[] = [];

    if (settings.reminders.agua && pending(byId.agua)) {
      for (const t of waterTimes) {
        jobs.push(schedule(t, '[SISTEMA] Hidratação', `Faltam ${left(byId.agua)} de água. Beba agora, Jogador.`));
      }
    }

    if (settings.reminders.refeicoes && pending(byId.refeicoes)) {
      // Hoje, só as refeições que ainda não foram registradas.
      const logged = new Set(isToday ? mealsOn(player).map((m) => m.slot) : []);
      for (const meal of settings.meals.filter((m) => !logged.has(m.name))) {
        jobs.push(
          schedule(
            parseTime(meal.time),
            '[SISTEMA] Alimentação',
            `Hora do ${meal.name}. Coma sem besteira e registre na aba Dieta.`,
            true,
          ),
        );
      }
    }

    const training = ['flexoes', 'abdominais', 'agachamentos', 'passos'].map((id) => byId[id]).filter(pending);
    if (settings.reminders.treino && training.length > 0) {
      const list = training.map(left).join(', ');
      for (const t of settings.trainingTimes) {
        jobs.push(schedule(parseTime(t), '[SISTEMA] Missão diária pendente', `Ainda faltam: ${list}.`));
      }
    }

    if (settings.reminders.sono && pending(byId.sono)) {
      jobs.push(
        schedule(
          minusMinutes(settings.bedtime, 30),
          '[SISTEMA] Descanso',
          `Hora de se preparar para dormir. Missão: deitar até ${settings.bedtime}.`,
        ),
      );
    }

    await Promise.all(jobs);
  }
}
