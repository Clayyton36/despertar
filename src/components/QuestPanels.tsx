// Painéis da aba Missões: missões semanais e a Dungeon do fim de semana.
import { StyleSheet, Text, View } from 'react-native';

import { SystemPanel } from '@/components/SystemPanel';
import { ATTRIBUTE_LABELS, Player } from '@/lib/game';
import { claimedQuests, daysLeftInWeek, Quest, questDone, weekDungeon, weeklyQuests } from '@/lib/quests';
import { colors } from '@/lib/theme';

const num = (v: number) => v.toLocaleString('pt-BR');

export function WeeklyPanel({ player }: { player: Player }) {
  const quests = weeklyQuests(player);
  const claimed = new Set(claimedQuests(player));
  const done = quests.filter((q) => claimed.has(q.id)).length;
  const left = daysLeftInWeek();

  return (
    <SystemPanel title="MISSÕES SEMANAIS">
      <Text style={styles.subtitle}>
        {done} / {quests.length} concluídas • {left === 1 ? 'último dia da semana' : `reinicia em ${left} dias`}
      </Text>
      {quests.map((q) => (
        <QuestRow key={q.id} quest={q} claimed={claimed.has(q.id)} />
      ))}
    </SystemPanel>
  );
}

export function DungeonPanel({ player }: { player: Player }) {
  const dungeon = weekDungeon(player);
  const cleared = claimedQuests(player).includes('dungeon');
  const progress = Math.min(1, dungeon.progress / dungeon.target);
  const accent = cleared ? colors.success : dungeon.open ? colors.gold : colors.muted;

  return (
    <SystemPanel title={dungeon.open ? 'DUNGEON ABERTA' : 'DUNGEON'} style={{ borderColor: accent, shadowColor: accent }}>
      <Text style={styles.dungeonIcon}>{dungeon.open || cleared ? dungeon.icon : '🔒'}</Text>
      <Text style={[styles.dungeonName, { color: accent }]}>{dungeon.name}</Text>
      <Text style={styles.lore}>{dungeon.lore}</Text>
      <Text style={styles.dungeonDetail}>{dungeon.detail}</Text>
      <Text style={styles.reward}>
        Recompensa: +{dungeon.xp} XP, +{dungeon.points} {ATTRIBUTE_LABELS[dungeon.attribute]}
      </Text>

      {dungeon.open ? (
        <>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: cleared ? colors.success : colors.gold }]} />
          </View>
          <Text style={styles.status}>
            {cleared
              ? '✓ Dungeon conquistada! Volte no próximo fim de semana.'
              : `${num(dungeon.progress)} de ${num(dungeon.target)}${dungeon.unit ? ` ${dungeon.unit}` : ''} • fecha domingo à meia-noite`}
          </Text>
        </>
      ) : (
        <Text style={styles.status}>O portal abre no sábado e fecha no domingo à meia-noite. Prepare-se, Jogador.</Text>
      )}
    </SystemPanel>
  );
}

function QuestRow({ quest, claimed }: { quest: Quest; claimed: boolean }) {
  const ok = claimed || questDone(quest);
  const progress = Math.min(1, quest.progress / quest.target);
  return (
    <View style={styles.quest}>
      <View style={styles.questHeader}>
        <Text style={styles.questIcon}>{quest.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.questTitle, ok && { color: colors.success }]}>
            {ok ? '✓ ' : ''}
            {quest.title}
          </Text>
          <Text style={styles.questDetail}>{quest.detail}</Text>
        </View>
        <Text style={styles.questReward}>
          +{quest.xp} XP{'\n'}+{quest.points} {ATTRIBUTE_LABELS[quest.attribute]}
        </Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }, ok && { backgroundColor: colors.success }]} />
      </View>
      <Text style={styles.progressText}>
        {num(Math.min(quest.progress, quest.target))} / {num(quest.target)}
        {quest.unit ? ` ${quest.unit}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: colors.muted, textAlign: 'center', marginBottom: 8 },
  quest: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#14203A' },
  questHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  questIcon: { fontSize: 22 },
  questTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  questDetail: { color: colors.muted, fontSize: 12, marginTop: 2 },
  questReward: { color: colors.glow, fontSize: 11, textAlign: 'right' },
  bar: { height: 6, backgroundColor: colors.background, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  barFill: { height: '100%', backgroundColor: colors.glow },
  progressText: { color: colors.text, fontSize: 12, marginTop: 4 },
  dungeonIcon: { fontSize: 44, textAlign: 'center' },
  dungeonName: { fontSize: 20, fontWeight: '800', textAlign: 'center', letterSpacing: 1, marginTop: 4 },
  lore: { color: colors.muted, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
  dungeonDetail: { color: colors.text, textAlign: 'center', marginTop: 10 },
  reward: { color: colors.gold, fontSize: 12, textAlign: 'center', marginTop: 6 },
  status: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
