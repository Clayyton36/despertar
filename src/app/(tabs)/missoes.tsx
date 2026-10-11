// Missões diárias: registre quanto fez (ex.: +200 ml, +5 flexões) e veja quanto falta.
// Bater a meta dá XP e aumenta o atributo ligado à missão.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SystemPanel } from '@/components/SystemPanel';
import {
  amountText,
  ATTRIBUTE_LABELS,
  dailyMissions,
  formatAmount,
  isDone,
  Mission,
  missionProgress,
  Player,
  remainingText,
} from '@/lib/game';
import { usePlayer } from '@/lib/player';
import { colors } from '@/lib/theme';

export default function Missoes() {
  const { player, addProgress } = usePlayer();
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);
  if (!player) return null;

  const missions = dailyMissions(player);
  const doneCount = missions.filter((m) => isDone(player, m)).length;
  const allDone = doneCount === missions.length;

  function add(id: string, amount: number) {
    const { leveledUp, level } = addProgress(id, amount);
    if (leveledUp) setLevelUpMessage(`LEVEL UP! Você alcançou o nível ${level}.`);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {levelUpMessage && (
          <Pressable onPress={() => setLevelUpMessage(null)}>
            <SystemPanel title="SISTEMA" style={{ borderColor: colors.gold }}>
              <Text style={styles.levelUp}>{levelUpMessage}</Text>
            </SystemPanel>
          </Pressable>
        )}

        <SystemPanel title="MISSÃO DIÁRIA">
          <Text style={styles.subtitle}>
            {doneCount} / {missions.length} concluídas
          </Text>

          {missions.map((m) =>
            m.unit ? (
              <QuantityMission key={m.id} player={player} mission={m} onAdd={(amount) => add(m.id, amount)} />
            ) : (
              <CheckMission key={m.id} player={player} mission={m} onAdd={(amount) => add(m.id, amount)} />
            ),
          )}
        </SystemPanel>

        <SystemPanel title={allDone ? 'MISSÃO CONCLUÍDA' : 'AVISO'}>
          <Text style={styles.warning}>
            {allDone
              ? 'Todas as missões de hoje foram cumpridas. Descanse, Jogador.'
              : 'Não completar a missão diária quebra sua sequência.'}
          </Text>
        </SystemPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ mission, done }: { mission: Mission; done: boolean }) {
  return (
    <View style={styles.headerRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.missionTitle, done && styles.missionDone]}>
          {done ? '✓ ' : ''}
          {mission.title}
        </Text>
        <Text style={styles.missionDetail}>{mission.detail}</Text>
      </View>
      <Text style={styles.reward}>
        +{mission.xp} XP{'\n'}+1 {ATTRIBUTE_LABELS[mission.attribute]}
      </Text>
    </View>
  );
}

type MissionProps = { player: Player; mission: Mission; onAdd: (amount: number) => void };

function CheckMission({ player, mission, onAdd }: MissionProps) {
  const done = isDone(player, mission);
  return (
    <Pressable style={styles.mission} onPress={() => onAdd(done ? -1 : 1)}>
      <Header mission={mission} done={done} />
      <Text style={styles.hint}>{done ? 'Toque para desmarcar' : 'Toque quando cumprir'}</Text>
    </Pressable>
  );
}

function QuantityMission({ player, mission, onAdd }: MissionProps) {
  const [custom, setCustom] = useState('');
  const value = missionProgress(player, mission.id);
  const done = isDone(player, mission);
  const progress = Math.min(1, value / mission.target);

  function addCustom() {
    const n = Number(custom.replace(',', '.'));
    if (n > 0) {
      onAdd(Math.round(n));
      setCustom('');
    }
  }

  return (
    <View style={styles.mission}>
      <Header mission={mission} done={done} />

      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }, done && { backgroundColor: colors.success }]} />
      </View>
      <Text style={styles.progressText}>
        {amountText(mission, value)} de {formatAmount(mission.target, mission.unit)}
        {done ? '  •  meta batida!' : `  •  faltam ${remainingText(player, mission)}`}
      </Text>

      <View style={styles.buttons}>
        <Pressable style={[styles.chip, styles.chipMinus]} onPress={() => onAdd(-mission.steps![0])} disabled={value === 0}>
          <Text style={styles.chipText}>−{mission.steps![0]}</Text>
        </Pressable>
        {mission.steps!.map((step) => (
          <Pressable key={step} style={styles.chip} onPress={() => onAdd(step)}>
            <Text style={styles.chipText}>+{step}</Text>
          </Pressable>
        ))}
        <TextInput
          style={styles.customInput}
          placeholder="outro"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          value={custom}
          onChangeText={setCustom}
          onSubmitEditing={addCustom}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  subtitle: { color: colors.muted, textAlign: 'center', marginBottom: 12 },
  mission: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#14203A' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  missionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  missionDone: { color: colors.success },
  missionDetail: { color: colors.muted, fontSize: 13, marginTop: 2 },
  reward: { color: colors.glow, fontSize: 11, textAlign: 'right' },
  hint: { color: colors.muted, fontSize: 12, marginTop: 6 },
  bar: { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden', marginTop: 10 },
  barFill: { height: '100%', backgroundColor: colors.glow },
  progressText: { color: colors.text, fontSize: 13, marginTop: 6 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  chipMinus: { borderColor: colors.danger },
  chipText: { color: colors.text, fontWeight: '700' },
  customInput: {
    flex: 1,
    minWidth: 70,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  levelUp: { color: colors.gold, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  warning: { color: colors.text, textAlign: 'center' },
});
