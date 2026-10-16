// Evolução: resumo em números e gráficos de peso e dos últimos 7 dias.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ColumnChart, LineChart, Point } from '@/components/Charts';
import { SystemPanel } from '@/components/SystemPanel';
import {
  ACHIEVEMENTS,
  currentWeight,
  dailyMissions,
  dateKey,
  formatAmount,
  mealKcal,
  Player,
  stepCalories,
  streak,
  waterTargetMl,
} from '@/lib/game';
import { usePlayer } from '@/lib/player';
import { colors } from '@/lib/theme';

const shortDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

// Últimos 7 dias (hoje por último), com rótulo "seg, 06/10".
function lastDays(n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    return { key: dateKey(d), label: `${weekday}, ${shortDate(d)}` };
  });
}

function caloriesOn(player: Player, key: string) {
  const steps = stepCalories(player.progress[key]?.passos ?? 0, currentWeight(player));
  const workouts = player.workouts.filter((w) => dateKey(new Date(w.start)) === key).reduce((s, w) => s + w.kcal, 0);
  return steps + workouts;
}

export default function Evolucao() {
  const { player } = usePlayer();
  if (!player) return null;

  const weight = currentWeight(player);
  const lost = player.startWeightKg - weight;
  const days = lastDays();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekStart = dateKey(weekAgo);

  const weights: Point[] = [...player.weights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((w) => ({ label: shortDate(new Date(`${w.date}T12:00:00`)), value: w.kg }));

  const missionsDone: Point[] = days.map((d) => ({ label: d.label, value: player.completed[d.key]?.length ?? 0 }));
  const water: Point[] = days.map((d) => ({ label: d.label, value: player.progress[d.key]?.agua ?? 0 }));
  const kcal: Point[] = days.map((d) => ({ label: d.label, value: caloriesOn(player, d.key) }));
  const eaten: Point[] = days.map((d) => ({ label: d.label, value: mealKcal(player, d.key) }));
  const hasEaten = eaten.some((d) => d.value > 0);

  const workoutsWeek = player.workouts.filter((w) => dateKey(new Date(w.start)) >= weekStart).length;
  const fastsDone = player.fasts.filter((f) => f.success).length;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <SystemPanel title="EVOLUÇÃO">
          <Text style={styles.heroLabel}>{lost >= 0 ? 'Peso perdido' : 'Peso ganho'}</Text>
          <Text style={styles.hero}>{fmtKg(Math.abs(lost))} kg</Text>
          <Text style={styles.heroSub}>
            de {fmtKg(player.startWeightKg)} kg para {fmtKg(weight)} kg • meta {fmtKg(player.goalWeightKg)} kg
          </Text>
          <View style={styles.tiles}>
            <Tile label="Sequência" value={`${streak(player)} d`} />
            <Tile label="Treinos (7 dias)" value={String(workoutsWeek)} />
            <Tile label="Jejuns concluídos" value={String(fastsDone)} />
          </View>
        </SystemPanel>

        <SystemPanel title="PESO (KG)">
          {weights.length >= 2 ? (
            <LineChart
              data={weights}
              unit="kg"
              goal={{ value: player.goalWeightKg, label: `meta ${fmtKg(player.goalWeightKg)}` }}
            />
          ) : (
            <Text style={styles.empty}>Registre seu peso em dias diferentes (na aba Status) para ver a curva.</Text>
          )}
        </SystemPanel>

        <SystemPanel title="MISSÕES CONCLUÍDAS">
          <ColumnChart data={missionsDone} target={dailyMissions(player).length} format={(v) => String(v)} />
        </SystemPanel>

        <SystemPanel title="ÁGUA POR DIA (L)">
          <ColumnChart
            data={water}
            target={waterTargetMl(player)}
            format={(v) => formatAmount(v, 'ml')}
            tickFormat={(v) => (v / 1000).toLocaleString('pt-BR')}
          />
        </SystemPanel>

        <SystemPanel title="CALORIAS GASTAS (KCAL)">
          <Text style={styles.caption}>Passos + treinos</Text>
          <ColumnChart data={kcal} format={(v) => `${v.toLocaleString('pt-BR')} kcal`} />
        </SystemPanel>

        {hasEaten && (
          <SystemPanel title="CALORIAS CONSUMIDAS (KCAL)">
            <Text style={styles.caption}>Das refeições registradas com calorias</Text>
            <ColumnChart
              data={eaten}
              format={(v, i) => `${v.toLocaleString('pt-BR')} kcal • gastou ${kcal[i].value.toLocaleString('pt-BR')}`}
            />
          </SystemPanel>
        )}

        <Text style={styles.footnote}>Toque num ponto ou coluna para ver o valor do dia.</Text>

        <SystemPanel title="CONQUISTAS">
          <Text style={styles.caption}>
            {Object.keys(player.achievements).length} de {ACHIEVEMENTS.length} desbloqueadas
          </Text>
          <View style={styles.badges}>
            {ACHIEVEMENTS.map((a) => {
              const at = player.achievements[a.id];
              return (
                <View key={a.id} style={[styles.badge, !at && styles.badgeLocked]}>
                  <Text style={styles.badgeIcon}>{at ? a.icon : '🔒'}</Text>
                  <Text style={styles.badgeTitle}>{a.title}</Text>
                  <Text style={styles.badgeDetail}>{a.detail}</Text>
                  {at ? (
                    <Text style={styles.badgeDate}>{new Date(at).toLocaleDateString('pt-BR')}</Text>
                  ) : (
                    a.xp > 0 && <Text style={styles.badgeDate}>+{a.xp} XP</Text>
                  )}
                </View>
              );
            })}
          </View>
        </SystemPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const fmtKg = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  heroLabel: { color: colors.muted, textAlign: 'center' },
  hero: { color: colors.text, fontSize: 48, fontWeight: '700', textAlign: 'center' },
  heroSub: { color: colors.muted, fontSize: 12, textAlign: 'center', marginBottom: 14 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, borderWidth: 1, borderColor: '#1A2540', borderRadius: 4, padding: 10, alignItems: 'center' },
  tileValue: { color: colors.text, fontSize: 20, fontWeight: '700' },
  tileLabel: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 2 },
  caption: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: -6, marginBottom: 8 },
  empty: { color: colors.muted, textAlign: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
  },
  badgeLocked: { borderColor: '#1A2540', opacity: 0.55 },
  badgeIcon: { fontSize: 26 },
  badgeTitle: { color: colors.text, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  badgeDetail: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 2 },
  badgeDate: { color: colors.muted, fontSize: 10, marginTop: 4 },
  footnote: { color: colors.muted, fontSize: 12, textAlign: 'center', marginBottom: 16 },
});
