// Missões diárias: registre quanto fez (ex.: +200 ml, +5 flexões) e veja quanto falta.
// Bater a meta dá XP e aumenta o atributo ligado à missão.
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DungeonPanel, WeeklyPanel } from '@/components/QuestPanels';
import { SystemPanel } from '@/components/SystemPanel';
import {
  amountText,
  ATTRIBUTE_LABELS,
  currentWeight,
  dailyMissions,
  formatAmount,
  isDone,
  mealsOn,
  Mission,
  missionProgress,
  PENALTY_PER_MISSION,
  plannedMeals,
  Player,
  remainingText,
  stepCalories,
  stepDistanceKm,
} from '@/lib/game';
import { openHealthSettings } from '@/lib/health';
import { usePlayer } from '@/lib/player';
import { colors } from '@/lib/theme';
import { useStepSync } from '@/lib/useStepSync';

export default function Missoes() {
  const { player, addProgress, setProgress } = usePlayer();
  const steps = useStepSync((count) => {
    if (player && count !== missionProgress(player, 'passos')) setProgress('passos', count);
  });
  if (!player) return null;

  const missions = dailyMissions(player);
  const doneCount = missions.filter((m) => isDone(player, m)).length;
  const allDone = doneCount === missions.length;


  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SystemPanel title="MISSÃO DIÁRIA">
          <Text style={styles.subtitle}>
            {doneCount} / {missions.length} concluídas
          </Text>

          {missions.map((m) =>
            m.unit ? (
              <QuantityMission
                key={m.id}
                player={player}
                mission={m}
                onAdd={(amount) => addProgress(m.id, amount)}
                automatic={m.id === 'passos' && steps.status === 'connected'}
              >
                {m.id === 'passos' && <StepsInfo player={player} {...steps} />}
              </QuantityMission>
            ) : m.id === 'refeicoes' ? (
              <FeedingMission key={m.id} player={player} mission={m} />
            ) : (
              <CheckMission key={m.id} player={player} mission={m} onAdd={(amount) => addProgress(m.id, amount)} />
            ),
          )}
        </SystemPanel>

        <SystemPanel title={allDone ? 'MISSÃO CONCLUÍDA' : 'AVISO'}>
          <Text style={styles.warning}>
            {allDone
              ? 'Todas as missões de hoje foram cumpridas. Descanse, Jogador.'
              : `Missão incompleta no fim do dia: -${PENALTY_PER_MISSION} XP por missão e a sequência quebra.`}
          </Text>
        </SystemPanel>

        <DungeonPanel player={player} />
        <WeeklyPanel player={player} />
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

// Alimentação conclui sozinha pelas refeições registradas na aba Dieta.
function FeedingMission({ player, mission }: Omit<MissionProps, 'onAdd'>) {
  const done = isDone(player, mission);
  const meals = mealsOn(player);
  const planned = plannedMeals(player);
  const logged = planned.filter((p) => meals.some((m) => m.slot === p.name)).length;
  const junk = meals.some((m) => m.junk);
  return (
    <Pressable style={styles.mission} onPress={() => router.navigate('/jejum')}>
      <Header mission={mission} done={done} />
      <Text style={[styles.hint, junk && { color: colors.danger }]}>
        {junk
          ? 'Teve besteira hoje: missão não cumprida.'
          : `${logged} de ${planned.length} refeições registradas. Toque para registrar na aba Dieta.`}
      </Text>
    </Pressable>
  );
}

function QuantityMission({
  player,
  mission,
  onAdd,
  automatic,
  children,
}: MissionProps & { automatic?: boolean; children?: ReactNode }) {
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

      {children}

      {!automatic && (
        <View style={styles.buttons}>
          <Pressable
            style={[styles.chip, styles.chipMinus]}
            onPress={() => onAdd(-mission.steps![0])}
            disabled={value === 0}
          >
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
      )}
    </View>
  );
}

function StepsInfo({ player, status, lastSync, sync, connect }: { player: Player } & ReturnType<typeof useStepSync>) {
  const steps = missionProgress(player, 'passos');
  const kcal = stepCalories(steps, currentWeight(player));
  const km = stepDistanceKm(steps, player.heightCm);
  const time = lastSync?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.stepsInfo}>
      <Text style={styles.stepsStats}>
        🔥 ~{kcal} kcal • 📏 ~{km.toFixed(1).replace('.', ',')} km
      </Text>

      {status === 'connected' && (
        <Pressable onPress={sync}>
          <Text style={styles.hint}>
            Automático via Health Connect{time ? `, atualizado às ${time}` : ''}. Toque para atualizar.
          </Text>
        </Pressable>
      )}
      {status === 'no-permission' && (
        <Pressable style={styles.connectButton} onPress={connect}>
          <Text style={styles.chipText}>CONECTAR PASSOS AUTOMÁTICOS</Text>
        </Pressable>
      )}
      {status === 'not-installed' && (
        <Pressable onPress={openHealthSettings}>
          <Text style={styles.hint}>
            Health Connect não encontrado ou desatualizado. Instale/atualize pela Play Store.
          </Text>
        </Pressable>
      )}
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
  stepsInfo: { marginTop: 8 },
  stepsStats: { color: colors.text, fontSize: 13 },
  connectButton: {
    backgroundColor: colors.border,
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  levelUp: { color: colors.gold, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  warning: { color: colors.text, textAlign: 'center' },
});
