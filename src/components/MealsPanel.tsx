// Refeições de hoje: o que já foi registrado em cada horário e o formulário para registrar.
// A missão Alimentação conclui sozinha quando todas as refeições dos horários estão
// registradas e nenhuma foi "besteira".
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SystemPanel } from '@/components/SystemPanel';
import { EXTRA_MEAL, feedingDone, MealRecord, mealKcal, mealsOn, plannedMeals, suggestedSlot } from '@/lib/game';
import { usePlayer } from '@/lib/player';
import { colors } from '@/lib/theme';

const time = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const slotLabel = (slot: string) => (slot === EXTRA_MEAL ? 'Extra' : slot.charAt(0).toUpperCase() + slot.slice(1));

export function MealsPanel({ onMessage }: { onMessage: (text: string, success: boolean) => void }) {
  const { player, addMeal, removeMeal } = usePlayer();
  const [slot, setSlot] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [kcal, setKcal] = useState('');
  const [junk, setJunk] = useState(false);
  if (!player) return null;

  const planned = plannedMeals(player);
  const meals = mealsOn(player);
  const logged = new Set(meals.map((m) => m.slot));
  const extras = meals.filter((m) => !planned.some((p) => p.name === m.slot));
  const total = mealKcal(player);
  const done = feedingDone(player);
  const current = slot ?? suggestedSlot(player);

  function save() {
    const value = Number(kcal.replace(',', '.'));
    const meal: Omit<MealRecord, 'at'> = {
      slot: current,
      description: description.trim(),
      junk,
      ...(value > 0 ? { kcal: Math.round(value) } : {}),
    };
    const register = () => {
      const { fastEnded } = addMeal(meal);
      setSlot(null);
      setDescription('');
      setKcal('');
      setJunk(false);
      if (fastEnded) {
        onMessage(
          fastEnded.success
            ? `Jejum de ${fastEnded.goalHours}h concluído e refeição registrada!`
            : 'Jejum encerrado antes da meta. Refeição registrada.',
          fastEnded.success,
        );
      }
    };
    if (player!.fast) {
      Alert.alert('Você está em jejum', 'Registrar a refeição encerra o jejum. Continuar?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Encerrar e registrar', onPress: register },
      ]);
    } else {
      register();
    }
  }

  function confirmRemove(meal: MealRecord) {
    Alert.alert('Apagar refeição?', `${slotLabel(meal.slot)} às ${time(meal.at)}`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => removeMeal(meal.at) },
    ]);
  }

  return (
    <>
      <SystemPanel title="REFEIÇÕES DE HOJE">
        <Text style={[styles.subtitle, done && { color: colors.success }]}>
          {done
            ? '✓ Missão Alimentação cumprida'
            : `${planned.filter((p) => logged.has(p.name)).length} de ${planned.length} refeições`}
          {total > 0 ? `  •  ${total.toLocaleString('pt-BR')} kcal` : ''}
        </Text>

        {planned.map((p) => {
          const items = meals.filter((m) => m.slot === p.name);
          return (
            <View key={p.name} style={styles.slot}>
              <View style={styles.slotHeader}>
                <Text style={[styles.slotName, items.length > 0 && { color: colors.success }]}>
                  {items.length > 0 ? '✓ ' : ''}
                  {slotLabel(p.name)}
                </Text>
                <Text style={styles.muted}>{p.time}</Text>
              </View>
              {items.length === 0 && <Text style={styles.muted}>Ainda não registrada</Text>}
              {items.map((m) => (
                <MealRow key={m.at} meal={m} onRemove={() => confirmRemove(m)} />
              ))}
            </View>
          );
        })}

        {extras.length > 0 && (
          <View style={styles.slot}>
            <Text style={styles.slotName}>Extras</Text>
            {extras.map((m) => (
              <MealRow key={m.at} meal={m} onRemove={() => confirmRemove(m)} />
            ))}
          </View>
        )}
      </SystemPanel>

      <SystemPanel title="REGISTRAR REFEIÇÃO">
        <View style={styles.chips}>
          {[...planned.map((p) => p.name), EXTRA_MEAL].map((name) => (
            <Pressable
              key={name}
              style={[styles.chip, current === name && styles.chipActive]}
              onPress={() => setSlot(name)}>
              <Text style={styles.chipText}>
                {logged.has(name) && name !== EXTRA_MEAL ? '✓ ' : ''}
                {slotLabel(name)}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="O que você comeu? (opcional)"
          placeholderTextColor={colors.muted}
          value={description}
          onChangeText={setDescription}
          maxLength={120}
        />
        <TextInput
          style={styles.input}
          placeholder="Calorias (opcional)"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          value={kcal}
          onChangeText={setKcal}
          maxLength={5}
        />

        <View style={styles.chips}>
          <Pressable style={[styles.chip, !junk && styles.chipHealthy]} onPress={() => setJunk(false)}>
            <Text style={styles.chipText}>🥗 Saudável</Text>
          </Pressable>
          <Pressable style={[styles.chip, junk && styles.chipJunk]} onPress={() => setJunk(true)}>
            <Text style={styles.chipText}>🍔 Besteira</Text>
          </Pressable>
        </View>
        {junk && <Text style={styles.warning}>Com uma besteira, a missão Alimentação de hoje não é cumprida.</Text>}

        <Pressable style={styles.button} onPress={save}>
          <Text style={styles.buttonText}>REGISTRAR {slotLabel(current).toUpperCase()}</Text>
        </Pressable>
      </SystemPanel>
    </>
  );
}

function MealRow({ meal, onRemove }: { meal: MealRecord; onRemove: () => void }) {
  return (
    <View style={styles.mealRow}>
      <Text style={styles.mealText} numberOfLines={2}>
        <Text style={styles.muted}>{time(meal.at)}  </Text>
        {meal.junk ? '🍔 ' : ''}
        {meal.description || (meal.junk ? 'Besteira' : 'Refeição')}
        {meal.kcal ? <Text style={styles.muted}>  •  {meal.kcal} kcal</Text> : null}
      </Text>
      <Pressable onPress={onRemove} hitSlop={10} accessibilityLabel="Apagar refeição">
        <Text style={styles.remove}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: colors.text, textAlign: 'center', marginBottom: 6 },
  muted: { color: colors.muted, fontSize: 13 },
  slot: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#14203A' },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  slotName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  mealText: { flex: 1, color: colors.text, fontSize: 14 },
  remove: { color: colors.danger, fontSize: 16, paddingHorizontal: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: colors.muted, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { borderColor: colors.glow, backgroundColor: '#0F2140' },
  chipHealthy: { borderColor: colors.success, backgroundColor: '#0E2A22' },
  chipJunk: { borderColor: colors.danger, backgroundColor: '#2A0E16' },
  chipText: { color: colors.text, fontWeight: '700' },
  input: {
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  warning: { color: colors.danger, fontSize: 12, marginBottom: 10 },
  button: { backgroundColor: colors.border, borderRadius: 4, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: colors.text, fontWeight: '700', letterSpacing: 2 },
});
