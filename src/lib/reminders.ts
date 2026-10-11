// Lembretes do Sistema: notificações locais que cobram o que falta das missões.
// Toda vez que o progresso muda, cancelamos tudo e agendamos de novo com os valores atualizados.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';

import { amountText, dailyMissions, isDone, Mission, Player, remainingText } from './game';

const CHANNEL_ID = 'lembretes';
// Agenda hoje + os próximos dias, para os lembretes continuarem mesmo sem abrir o app.
const DAYS_AHEAD = 3;

// Horários padrão (hora, minuto). Depois podem virar configuração na tela.
const WATER_TIMES: [number, number][] = [[8, 0], [10, 0], [12, 0], [14, 0], [16, 0], [18, 0], [20, 0]];
const MEALS: { time: [number, number]; name: string }[] = [
  { time: [7, 30], name: 'café da manhã' },
  { time: [12, 0], name: 'almoço' },
  { time: [15, 30], name: 'lanche' },
  { time: [19, 30], name: 'jantar' },
];
const TRAINING_TIMES: [number, number][] = [[12, 30], [18, 0], [21, 0]];
const SLEEP_TIME: [number, number] = [22, 30];

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

export async function syncReminders(player: Player) {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const missions = dailyMissions(player);
  const byId = Object.fromEntries(missions.map((m) => [m.id, m])) as Record<string, Mission>;
  const now = new Date();

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
    const schedule = (time: [number, number], title: string, body: string) => {
      const date = at(time);
      if (date <= now) return;
      return Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
      });
    };

    const jobs: (Promise<string> | undefined)[] = [];

    if (pending(byId.agua)) {
      for (const t of WATER_TIMES) {
        jobs.push(schedule(t, '[SISTEMA] Hidratação', `Faltam ${left(byId.agua)} de água. Beba agora, Jogador.`));
      }
    }

    if (pending(byId.refeicoes)) {
      for (const meal of MEALS) {
        jobs.push(schedule(meal.time, '[SISTEMA] Alimentação', `Hora do ${meal.name}. Coma no horário e sem besteira.`));
      }
    }

    const training = ['flexoes', 'abdominais', 'agachamentos', 'passos'].map((id) => byId[id]).filter(pending);
    if (training.length > 0) {
      const list = training.map(left).join(', ');
      for (const t of TRAINING_TIMES) {
        jobs.push(schedule(t, '[SISTEMA] Missão diária pendente', `Ainda faltam: ${list}.`));
      }
    }

    if (pending(byId.sono)) {
      jobs.push(schedule(SLEEP_TIME, '[SISTEMA] Descanso', 'Hora de se preparar para dormir. Missão: deitar até 23h.'));
    }

    await Promise.all(jobs);
  }
}
