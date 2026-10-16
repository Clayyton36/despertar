// Tela de Status: nível, rank, XP, atributos e evolução do peso.
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RANK_FORMS, RankAvatar } from '@/components/RankAvatar';
import { SystemPanel } from '@/components/SystemPanel';
import {
  Attribute,
  ATTRIBUTE_LABELS,
  bmi,
  currentWeight,
  dateKey,
  levelFromXp,
  missionProgress,
  rankFromLevel,
  RANKS,
  stepCalories,
  streak,
  today,
  xpForLevel,
} from '@/lib/game';
import { usePlayer } from '@/lib/player';
import { colors } from '@/lib/theme';

export default function Status() {
  const { player, logWeight } = usePlayer();
  const [newWeight, setNewWeight] = useState('');
  const [showForms, setShowForms] = useState(false);
  if (!player) return null;

  const level = levelFromXp(player.xp);
  const levelStart = xpForLevel(level);
  const levelEnd = xpForLevel(level + 1);
  const progress = (player.xp - levelStart) / (levelEnd - levelStart);
  const rank = rankFromLevel(level);
  const rankIndex = RANKS.findIndex((r) => r.rank === rank);
  const nextRank = RANKS[rankIndex + 1];

  const weight = currentWeight(player);
  const lost = player.startWeightKg - weight;
  const toGo = weight - player.goalWeightKg;
  const burnedToday =
    stepCalories(missionProgress(player, 'passos'), weight) +
    player.workouts.filter((w) => dateKey(new Date(w.start)) === today()).reduce((sum, w) => sum + w.kcal, 0);

  function saveWeight() {
    const kg = Number(newWeight.replace(',', '.'));
    if (kg > 0) {
      logWeight(kg);
      setNewWeight('');
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Link href="/configuracoes" asChild>
            <Pressable hitSlop={12} accessibilityLabel="Configurações">
              <FontAwesome name="cog" size={24} color={colors.glow} />
            </Pressable>
          </Link>
        </View>
        <SystemPanel title="STATUS">
          <Pressable style={styles.avatar} onPress={() => setShowForms((v) => !v)} accessibilityLabel="Ver as formas de cada rank">
            <RankAvatar rank={rank} size={170} />
            <Text style={[styles.formTitle, { color: RANK_FORMS[rank].color }]}>
              RANK {rank} · {RANK_FORMS[rank].title.toUpperCase()}
            </Text>
            <Text style={styles.formHint}>
              {nextRank ? `Próxima forma no nível ${nextRank.minLevel} (Rank ${nextRank.rank})` : 'Forma máxima alcançada'}
              {showForms ? '' : '  •  toque para ver todas'}
            </Text>
          </Pressable>
          {showForms && (
            <View style={styles.forms}>
              {RANKS.map((r, i) => (
                <View key={r.rank} style={styles.form}>
                  <RankAvatar rank={r.rank} size={88} locked={i > rankIndex} />
                  <Text style={[styles.formLabel, i <= rankIndex && { color: RANK_FORMS[r.rank].color }]}>
                    {i > rankIndex ? '🔒 ' : ''}
                    {r.rank} · {RANK_FORMS[r.rank].title}
                  </Text>
                  <Text style={styles.formLevel}>nível {r.minLevel}</Text>
                </View>
              ))}
            </View>
          )}

          <Row label="Nome" value={player.name} />
          <Row label="Nível" value={String(level)} />
          <Row label="Rank" value={rankFromLevel(level)} highlight />
          <Row label="Sequência" value={`${streak(player)} dia(s)`} />

          <Text style={styles.xpLabel}>
            XP {player.xp - levelStart} / {levelEnd - levelStart}
          </Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
          </View>
        </SystemPanel>

        <SystemPanel title="ATRIBUTOS">
          {(Object.keys(ATTRIBUTE_LABELS) as Attribute[]).map((attr) => (
            <Row key={attr} label={ATTRIBUTE_LABELS[attr]} value={String(player.attributes[attr])} />
          ))}
        </SystemPanel>

        <SystemPanel title="CORPO">
          <Row label="Peso atual" value={`${weight.toFixed(1)} kg`} />
          <Row label="Meta" value={`${player.goalWeightKg.toFixed(1)} kg`} />
          <Row label="Já perdeu" value={`${lost.toFixed(1)} kg`} highlight={lost > 0} />
          <Row label="Falta" value={`${Math.max(0, toGo).toFixed(1)} kg`} />
          <Row label="IMC" value={bmi(weight, player.heightCm).toFixed(1)} />
          <Row label="Gasto hoje (passos + treinos)" value={`~${burnedToday} kcal`} />

          <View style={styles.weightRow}>
            <TextInput
              style={styles.input}
              placeholder="Peso de hoje (kg)"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={newWeight}
              onChangeText={setNewWeight}
            />
            <Pressable style={styles.button} onPress={saveWeight}>
              <Text style={styles.buttonText}>REGISTRAR</Text>
            </Pressable>
          </View>
        </SystemPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && { color: colors.gold }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingTop: 8 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  avatar: { alignItems: 'center', marginBottom: 12 },
  formTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 2, marginTop: 6 },
  formHint: { color: colors.muted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  forms: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 12 },
  form: { width: '30%', alignItems: 'center' },
  formLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  formLevel: { color: colors.muted, fontSize: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: colors.muted, fontSize: 15 },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  xpLabel: { color: colors.glow, fontSize: 12, marginTop: 12, marginBottom: 6 },
  bar: { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.glow },
  weightRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: {
    flex: 1,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button: { backgroundColor: colors.border, borderRadius: 4, paddingHorizontal: 14, justifyContent: 'center' },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
});
