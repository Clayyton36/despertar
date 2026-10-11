// Treinos em casa ou na academia: cronômetro, séries registradas, calorias (MET) e histórico.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SystemPanel } from '@/components/SystemPanel';
import {
  ActiveWorkout,
  currentWeight,
  Exercise,
  exerciseById,
  EXERCISES,
  setText,
  WORKOUT_MIN_MINUTES,
  WORKOUT_XP,
  workoutCalories,
  WorkoutMode,
} from '@/lib/game';
import { usePlayer } from '@/lib/player';
import { colors } from '@/lib/theme';

const MODE_LABELS: Record<WorkoutMode, string> = { casa: 'Casa', academia: 'Academia' };

export default function Treinos() {
  const { player, startWorkout, logSet, removeSet, finishWorkout, cancelWorkout } = usePlayer();
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState<{ text: string; gold: boolean } | null>(null);

  const training = !!player?.workout;
  useEffect(() => {
    if (!training) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [training]);

  if (!player) return null;
  const workout = player.workout;

  function finish() {
    const result = finishWorkout();
    if (!result) return;
    const { record, leveledUp, level } = result;
    const minutes = Math.round((record.end - record.start) / 60_000);
    const reward = record.xp
      ? ` +${record.xp} XP, +1 Força.`
      : minutes < WORKOUT_MIN_MINUTES
        ? ` Treinos a partir de ${WORKOUT_MIN_MINUTES} min dão XP.`
        : ' XP de treino de hoje já recebido.';
    setMessage({
      text: `Treino concluído: ${minutes} min, ~${record.kcal} kcal.${reward}${leveledUp ? ` LEVEL UP! Nível ${level}.` : ''}`,
      gold: record.xp > 0,
    });
  }

  function onLevelUp({ leveledUp, level }: { leveledUp: boolean; level: number }) {
    if (leveledUp) setMessage({ text: `LEVEL UP! Você alcançou o nível ${level}.`, gold: true });
  }

  const weekAgo = now - 7 * 24 * 3600_000;
  const lastWeek = player.workouts.filter((w) => w.start >= weekAgo);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {message && (
          <Pressable onPress={() => setMessage(null)}>
            <SystemPanel title="SISTEMA" style={{ borderColor: message.gold ? colors.gold : colors.border }}>
              <Text style={[styles.message, message.gold && { color: colors.gold }]}>{message.text}</Text>
            </SystemPanel>
          </Pressable>
        )}

        {workout ? (
          <ActiveSession
            workout={workout}
            now={now}
            weightKg={currentWeight(player)}
            onLog={(set) => onLevelUp(logSet(set))}
            onRemove={removeSet}
            onFinish={finish}
            onCancel={cancelWorkout}
          />
        ) : (
          <SystemPanel title="INICIAR TREINO">
            <Text style={styles.subtitle}>
              Treino de {WORKOUT_MIN_MINUTES} min ou mais: +{WORKOUT_XP} XP e +1 Força (1x por dia).
            </Text>
            <View style={styles.modeRow}>
              {(['casa', 'academia'] as WorkoutMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  style={styles.modeButton}
                  onPress={() => {
                    setMessage(null);
                    setNow(Date.now());
                    startWorkout(mode);
                  }}>
                  <Text style={styles.modeIcon}>{mode === 'casa' ? '🏠' : '🏋️'}</Text>
                  <Text style={styles.modeText}>{MODE_LABELS[mode].toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
          </SystemPanel>
        )}

        <SystemPanel title="ÚLTIMOS 7 DIAS">
          <Text style={styles.subtitle}>
            {lastWeek.length} treino(s)  •  ~{lastWeek.reduce((sum, w) => sum + w.kcal, 0)} kcal
          </Text>
          {[...player.workouts]
            .reverse()
            .slice(0, 7)
            .map((w) => (
              <View key={w.start} style={styles.historyRow}>
                <Text style={styles.muted}>
                  {new Date(w.start).toLocaleDateString('pt-BR')} {MODE_LABELS[w.mode]}
                </Text>
                <Text style={styles.historyText}>
                  {Math.round((w.end - w.start) / 60_000)} min  •  {w.sets.length} séries  •  ~{w.kcal} kcal
                </Text>
              </View>
            ))}
          {player.workouts.length === 0 && <Text style={styles.muted}>Nenhum treino ainda.</Text>}
        </SystemPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActiveSession({
  workout,
  now,
  weightKg,
  onLog,
  onRemove,
  onFinish,
  onCancel,
}: {
  workout: ActiveWorkout;
  now: number;
  weightKg: number;
  onLog: (set: { exerciseId: string; value: number; kg?: number }) => void;
  onRemove: (index: number) => void;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const exercises = EXERCISES.filter((e) => e.mode === workout.mode);
  const [selected, setSelected] = useState<Exercise>(exercises[0]);
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <>
      <SystemPanel title={`TREINO EM ${MODE_LABELS[workout.mode].toUpperCase()}`}>
        <Text style={styles.timer}>{formatClock(now - workout.start)}</Text>
        <Text style={styles.subtitle}>~{workoutCalories(workout, now, weightKg)} kcal até agora</Text>
        <View style={styles.modeRow}>
          <Pressable style={[styles.actionButton, { backgroundColor: colors.success }]} onPress={onFinish}>
            <Text style={styles.actionText}>FINALIZAR</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => (confirmCancel ? onCancel() : setConfirmCancel(true))}>
            <Text style={styles.actionText}>{confirmCancel ? 'CONFIRMAR?' : 'CANCELAR'}</Text>
          </Pressable>
        </View>
      </SystemPanel>

      <SystemPanel title="EXERCÍCIO">
        <View style={styles.chips}>
          {exercises.map((e) => (
            <Pressable
              key={e.id}
              style={[styles.chip, selected.id === e.id && styles.chipSelected]}
              onPress={() => setSelected(e)}>
              <Text style={styles.chipText}>{e.name}</Text>
            </Pressable>
          ))}
        </View>
        {/* key reinicia os campos ao trocar de exercício */}
        <SetForm key={selected.id} exercise={selected} onLog={onLog} />
      </SystemPanel>

      {workout.sets.length > 0 && (
        <SystemPanel title="SÉRIES">
          {workout.sets.map((set, i) => (
            <View key={i} style={styles.setRow}>
              <Text style={styles.historyText}>
                {exerciseById(set.exerciseId).name}: {setText(set)}
              </Text>
              <Pressable onPress={() => onRemove(i)} hitSlop={10}>
                <Text style={{ color: colors.danger, fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </SystemPanel>
      )}
    </>
  );
}

function SetForm({
  exercise,
  onLog,
}: {
  exercise: Exercise;
  onLog: (set: { exerciseId: string; value: number; kg?: number }) => void;
}) {
  const [value, setValue] = useState('');
  const [kg, setKg] = useState('');
  const toNumber = (v: string) => Number(v.replace(',', '.'));

  const label = { reps: 'Repetições', carga: 'Repetições', minutos: 'Minutos', segundos: 'Segundos' }[exercise.kind];
  const quick = { reps: [10, 15, 20], carga: [8, 10, 12], minutos: [10, 20, 30], segundos: [30, 45, 60] }[exercise.kind];

  function log(n: number) {
    if (!(n > 0)) return;
    const weight = toNumber(kg);
    onLog({ exerciseId: exercise.id, value: Math.round(n), ...(exercise.kind === 'carga' && weight > 0 ? { kg: weight } : {}) });
    setValue('');
  }

  return (
    <View style={styles.form}>
      {exercise.kind === 'carga' && (
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Carga (kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={kg}
            onChangeText={setKg}
            placeholder="ex.: 20"
            placeholderTextColor={colors.muted}
          />
        </View>
      )}
      <View style={styles.formRow}>
        <Text style={styles.formLabel}>{label}</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={value}
          onChangeText={setValue}
          placeholder="outro"
          placeholderTextColor={colors.muted}
          onSubmitEditing={() => log(toNumber(value))}
          returnKeyType="done"
        />
      </View>
      <View style={styles.chips}>
        {quick.map((n) => (
          <Pressable key={n} style={styles.chip} onPress={() => log(n)}>
            <Text style={styles.chipText}>+{n}</Text>
          </Pressable>
        ))}
        <Pressable style={[styles.chip, styles.chipSelected]} onPress={() => log(toNumber(value))}>
          <Text style={styles.chipText}>REGISTRAR</Text>
        </Pressable>
      </View>
      {exercise.missionId && <Text style={styles.hint}>Conta também na missão diária.</Text>}
    </View>
  );
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  subtitle: { color: colors.text, textAlign: 'center', marginBottom: 12 },
  muted: { color: colors.muted, fontSize: 13 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 8 },
  message: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 12 },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 20,
    alignItems: 'center',
  },
  modeIcon: { fontSize: 32 },
  modeText: { color: colors.text, fontWeight: '700', letterSpacing: 2, marginTop: 6 },
  timer: { color: colors.glow, fontSize: 48, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
  actionButton: { flex: 1, borderRadius: 4, paddingVertical: 12, alignItems: 'center' },
  cancelButton: { borderWidth: 1, borderColor: colors.danger },
  actionText: { color: colors.text, fontWeight: '700', letterSpacing: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  chipSelected: { backgroundColor: colors.border },
  chipText: { color: colors.text, fontWeight: '700' },
  form: { marginTop: 16 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  formLabel: { color: colors.muted, width: 100 },
  input: {
    flex: 1,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  historyRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#14203A' },
  historyText: { color: colors.text },
});
