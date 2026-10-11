// Jejum intermitente: escolha um desafio, acompanhe o timer e encerre para receber o XP.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SystemPanel } from '@/components/SystemPanel';
import { FAST_CHALLENGES, fastEnd, fastSuccesses, FASTS_TO_UNLOCK, isChallengeUnlocked } from '@/lib/game';
import { usePlayer } from '@/lib/player';
import { colors } from '@/lib/theme';

export default function Jejum() {
  const { player, startFast, endFast } = usePlayer();
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Atualiza o relógio a cada segundo só enquanto há um jejum rodando.
  const fasting = !!player?.fast;
  useEffect(() => {
    if (!fasting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [fasting]);

  if (!player) return null;
  const fast = player.fast;

  function finish() {
    const { success } = endFast();
    const xp = FAST_CHALLENGES.find((c) => c.hours === fast!.goalHours)!.xp;
    setMessage(
      success
        ? { text: `Jejum de ${fast!.goalHours}h concluído! +${xp} XP, +1 Disciplina.`, success }
        : { text: 'Jejum encerrado antes da meta. Sem XP desta vez, tente de novo.', success },
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {message && (
          <Pressable onPress={() => setMessage(null)}>
            <SystemPanel title="SISTEMA" style={{ borderColor: message.success ? colors.gold : colors.danger }}>
              <Text style={[styles.message, { color: message.success ? colors.gold : colors.text }]}>{message.text}</Text>
            </SystemPanel>
          </Pressable>
        )}

        {fast ? (
          <FastTimer start={fast.start} end={fastEnd(fast)} goalHours={fast.goalHours} now={now} onFinish={finish} />
        ) : (
          <SystemPanel title="DESAFIOS DE JEJUM">
            <Text style={styles.subtitle}>Complete {FASTS_TO_UNLOCK}x um desafio para liberar o próximo.</Text>
            {FAST_CHALLENGES.map((c, i) => {
              const unlocked = isChallengeUnlocked(player, i);
              const wins = fastSuccesses(player, c.hours);
              return (
                <Pressable
                  key={c.hours}
                  style={[styles.challenge, !unlocked && styles.locked]}
                  disabled={!unlocked}
                  onPress={() => {
                    setMessage(null);
                    setNow(Date.now());
                    startFast(c.hours);
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.challengeTitle}>
                      {unlocked ? '' : '🔒 '}Jejum de {c.hours}h
                    </Text>
                    <Text style={styles.challengeDetail}>
                      {unlocked
                        ? `Concluído ${wins}x`
                        : `Complete o de ${FAST_CHALLENGES[i - 1].hours}h mais ${FASTS_TO_UNLOCK - fastSuccesses(player, FAST_CHALLENGES[i - 1].hours)}x`}
                    </Text>
                  </View>
                  <Text style={styles.reward}>+{c.xp} XP{'\n'}+1 Disciplina</Text>
                </Pressable>
              );
            })}
          </SystemPanel>
        )}

        <SystemPanel title="HISTÓRICO">
          {player.fasts.length === 0 ? (
            <Text style={styles.muted}>Nenhum jejum ainda.</Text>
          ) : (
            [...player.fasts]
              .reverse()
              .slice(0, 7)
              .map((f) => (
                <View key={f.start} style={styles.historyRow}>
                  <Text style={styles.muted}>{new Date(f.start).toLocaleDateString('pt-BR')}</Text>
                  <Text style={styles.historyText}>
                    {formatDuration(f.end - f.start)} / {f.goalHours}h
                  </Text>
                  <Text style={{ color: f.success ? colors.success : colors.danger }}>{f.success ? '✓' : '✗'}</Text>
                </View>
              ))
          )}
        </SystemPanel>

        <SystemPanel title="AVISO">
          <Text style={styles.muted}>
            Beba água durante o jejum. Se sentir tontura, fraqueza ou mal-estar, encerre e se alimente. Se tiver alguma
            condição de saúde, converse com um médico antes.
          </Text>
        </SystemPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

function FastTimer({
  start,
  end,
  goalHours,
  now,
  onFinish,
}: {
  start: number;
  end: number;
  goalHours: number;
  now: number;
  onFinish: () => void;
}) {
  const elapsed = now - start;
  const progress = Math.min(1, elapsed / (end - start));
  const done = now >= end;
  const time = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <SystemPanel title={done ? 'JEJUM CONCLUÍDO' : `JEJUM DE ${goalHours}H EM ANDAMENTO`}>
      <Text style={[styles.timer, done && { color: colors.success }]}>{formatDuration(elapsed, true)}</Text>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }, done && { backgroundColor: colors.success }]} />
      </View>
      <Text style={styles.subtitle}>
        {done ? 'Meta batida! Encerre para receber o XP.' : `Faltam ${formatDuration(end - now)}`}
      </Text>
      <Text style={styles.muted}>
        Início {time(start)}  •  Fim {time(end)}
      </Text>

      <Pressable style={[styles.button, !done && styles.buttonGiveUp]} onPress={onFinish}>
        <Text style={styles.buttonText}>{done ? 'ENCERRAR E RECEBER XP' : 'ENCERRAR ANTES DA META'}</Text>
      </Pressable>
    </SystemPanel>
  );
}

function formatDuration(ms: number, withSeconds = false) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return withSeconds ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${h}h${pad(m)}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  subtitle: { color: colors.text, textAlign: 'center', marginVertical: 10 },
  muted: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  message: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  challenge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#14203A',
  },
  locked: { opacity: 0.4 },
  challengeTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  challengeDetail: { color: colors.muted, fontSize: 13, marginTop: 2 },
  reward: { color: colors.glow, fontSize: 11, textAlign: 'right' },
  timer: { color: colors.glow, fontSize: 48, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
  bar: { height: 10, backgroundColor: colors.background, borderRadius: 5, overflow: 'hidden', marginTop: 12 },
  barFill: { height: '100%', backgroundColor: colors.glow },
  button: { backgroundColor: colors.success, borderRadius: 4, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  buttonGiveUp: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  buttonText: { color: colors.text, fontWeight: '700', letterSpacing: 2 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  historyText: { color: colors.text },
});
