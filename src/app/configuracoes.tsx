// Configurações: perfil, metas, horários dos lembretes, backup e apagar dados.
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SystemPanel } from '@/components/SystemPanel';
import { exportBackup, pickBackup } from '@/lib/backup';
import {
  currentWeight,
  formatAmount,
  isValidTime,
  levelFromXp,
  parseTime,
  Player,
  Settings,
  waterGoalMl,
} from '@/lib/game';
import { usePlayer } from '@/lib/player';
import { playSound } from '@/lib/sounds';
import { colors } from '@/lib/theme';

const toNumber = (v: string) => Number(v.replace(',', '.'));

export default function Configuracoes() {
  const { player } = usePlayer();
  if (!player) return null;
  // key: se os dados forem trocados (importação), o formulário recomeça com os valores novos
  return <SettingsForm key={player.name + player.xp} player={player} />;
}

function SettingsForm({ player }: { player: Player }) {
  const { updateSettings, updateProfile, replacePlayer, resetAll } = usePlayer();

  const [name, setName] = useState(player.name);
  const [height, setHeight] = useState(String(player.heightCm));
  const [goal, setGoal] = useState(String(player.goalWeightKg).replace('.', ','));
  const [water, setWater] = useState(player.settings.waterGoalMl ? String(player.settings.waterGoalMl) : '');
  const [draft, setDraft] = useState<Settings>(player.settings);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);
  const [pendingImport, setPendingImport] = useState<Player | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const autoWater = waterGoalMl(currentWeight(player));
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function save() {
    const times = [
      draft.bedtime,
      draft.water.start,
      draft.water.end,
      ...draft.meals.map((m) => m.time),
      ...draft.trainingTimes,
    ];
    const waterMl = water.trim() ? Math.round(toNumber(water)) : null;
    const error = !name.trim()
      ? 'Informe o nome.'
      : !(toNumber(height) > 0) || !(toNumber(goal) > 0)
        ? 'Altura e peso meta precisam ser números.'
        : times.some((t) => !isValidTime(t))
          ? 'Use horários no formato HH:MM (ex.: 07:30).'
          : toMinutes(draft.water.start) >= toMinutes(draft.water.end)
            ? 'O início da água precisa ser antes do fim.'
            : !(draft.water.everyHours >= 1 && draft.water.everyHours <= 6)
              ? 'O intervalo da água deve ser de 1 a 6 horas.'
              : waterMl != null && !(waterMl >= 500 && waterMl <= 8000)
                ? 'A meta de água deve ficar entre 500 e 8000 ml.'
                : null;
    if (error) return setStatus({ text: error, error: true });

    updateProfile({ name: name.trim(), heightCm: toNumber(height), goalWeightKg: toNumber(goal) });
    updateSettings({ ...draft, waterGoalMl: waterMl });
    setStatus({ text: 'Configurações salvas. Lembretes reagendados.', error: false });
  }

  async function onExport() {
    try {
      await exportBackup(player);
      setStatus({ text: 'Backup gerado. Guarde o arquivo num lugar seguro (Drive, e-mail...).', error: false });
    } catch (e) {
      setStatus({ text: `Não foi possível exportar: ${(e as Error).message}`, error: true });
    }
  }

  async function onImport() {
    try {
      const data = await pickBackup();
      if (data) setPendingImport(data);
    } catch (e) {
      setStatus({ text: `Não foi possível importar: ${(e as Error).message}`, error: true });
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <FontAwesome name="chevron-left" size={20} color={colors.glow} />
        </Pressable>
        <Text style={styles.headerTitle}>CONFIGURAÇÕES</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SystemPanel title="PERFIL">
          <Field label="Nome" value={name} onChangeText={setName} />
          <Field label="Altura (cm)" value={height} onChangeText={setHeight} numeric />
          <Field label="Peso meta (kg)" value={goal} onChangeText={setGoal} numeric />
          <Text style={styles.hint}>O peso atual se registra na aba Status.</Text>
        </SystemPanel>

        <SystemPanel title="METAS">
          <Field
            label="Água por dia (ml)"
            value={water}
            onChangeText={setWater}
            numeric
            placeholder={`automático: ${formatAmount(autoWater, 'ml')}`}
          />
          <Text style={styles.hint}>Deixe vazio para calcular pelo peso (35 ml por kg).</Text>
          <Field label="Dormir até" value={draft.bedtime} onChangeText={(v) => set('bedtime', v)} time />
        </SystemPanel>

        <SystemPanel title="LEMBRETES">
          <Toggle
            label="Água"
            value={draft.reminders.agua}
            onChange={(v) => set('reminders', { ...draft.reminders, agua: v })}>
            <Field
              label="Início"
              value={draft.water.start}
              onChangeText={(v) => set('water', { ...draft.water, start: v })}
              time
            />
            <Field
              label="Fim"
              value={draft.water.end}
              onChangeText={(v) => set('water', { ...draft.water, end: v })}
              time
            />
            <Field
              label="A cada (horas)"
              value={String(draft.water.everyHours || '')}
              onChangeText={(v) => set('water', { ...draft.water, everyHours: Math.round(toNumber(v)) || 0 })}
              numeric
            />
          </Toggle>

          <Toggle
            label="Refeições"
            value={draft.reminders.refeicoes}
            onChange={(v) => set('reminders', { ...draft.reminders, refeicoes: v })}>
            {draft.meals.map((meal, i) => (
              <Field
                key={meal.name}
                label={capitalize(meal.name)}
                value={meal.time}
                time
                onChangeText={(v) =>
                  set(
                    'meals',
                    draft.meals.map((m, j) => (j === i ? { ...m, time: v } : m)),
                  )
                }
              />
            ))}
          </Toggle>

          <Toggle
            label="Treino (o que falta das missões)"
            value={draft.reminders.treino}
            onChange={(v) => set('reminders', { ...draft.reminders, treino: v })}>
            {draft.trainingTimes.map((t, i) => (
              <Field
                key={i}
                label={`${i + 1}º lembrete`}
                value={t}
                time
                onChangeText={(v) =>
                  set(
                    'trainingTimes',
                    draft.trainingTimes.map((x, j) => (j === i ? v : x)),
                  )
                }
              />
            ))}
          </Toggle>

          <Toggle
            label="Sono (30 min antes de dormir)"
            value={draft.reminders.sono}
            onChange={(v) => set('reminders', { ...draft.reminders, sono: v })}
          />
        </SystemPanel>

        <SystemPanel title="SONS">
          <Toggle label="Sons do Sistema" value={draft.sounds} onChange={(v) => set('sounds', v)} />
          <Text style={styles.hint}>
            Missão concluída, level up, conquistas e Dungeon. Não tocam com o celular no silencioso.
          </Text>
          {draft.sounds && (
            <Pressable style={styles.testSound} onPress={() => playSound('nivel', true)}>
              <Text style={styles.buttonText}>▶ TESTAR SOM</Text>
            </Pressable>
          )}
        </SystemPanel>

        {status && (
          <Text style={[styles.status, { color: status.error ? colors.danger : colors.success }]}>{status.text}</Text>
        )}
        <Pressable style={styles.saveButton} onPress={save}>
          <Text style={styles.buttonText}>SALVAR</Text>
        </Pressable>

        <SystemPanel title="BACKUP">
          <Text style={styles.text}>
            Seus dados ficam só neste celular. Exporte um backup de vez em quando e guarde no Drive, e-mail ou WhatsApp.
            Para restaurar (ex.: celular novo), importe o arquivo.
          </Text>
          <View style={styles.row}>
            <Pressable style={styles.outlineButton} onPress={onExport}>
              <Text style={styles.buttonText}>EXPORTAR</Text>
            </Pressable>
            <Pressable style={styles.outlineButton} onPress={onImport}>
              <Text style={styles.buttonText}>IMPORTAR</Text>
            </Pressable>
          </View>
          {pendingImport && (
            <View style={styles.confirmBox}>
              <Text style={styles.text}>
                Backup de {pendingImport.name}, nível {levelFromXp(pendingImport.xp)}. Importar vai substituir TODOS os
                dados atuais.
              </Text>
              <View style={styles.row}>
                <Pressable
                  style={[styles.outlineButton, { borderColor: colors.danger }]}
                  onPress={() => {
                    replacePlayer(pendingImport);
                    setPendingImport(null);
                  }}>
                  <Text style={styles.buttonText}>SUBSTITUIR</Text>
                </Pressable>
                <Pressable style={styles.outlineButton} onPress={() => setPendingImport(null)}>
                  <Text style={styles.buttonText}>CANCELAR</Text>
                </Pressable>
              </View>
            </View>
          )}
        </SystemPanel>

        <SystemPanel title="ZONA DE PERIGO" style={{ borderColor: colors.danger }}>
          <Text style={styles.text}>Apaga tudo: nível, missões, peso, jejuns e treinos. Não dá para desfazer.</Text>
          <Pressable
            style={[styles.outlineButton, { borderColor: colors.danger, marginTop: 12 }]}
            onPress={() => {
              if (!confirmReset) return setConfirmReset(true);
              resetAll();
              router.replace('/despertar');
            }}>
            <Text style={styles.buttonText}>
              {confirmReset ? 'TOQUE DE NOVO PARA APAGAR TUDO' : 'APAGAR TODOS OS DADOS'}
            </Text>
          </Pressable>
        </SystemPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  numeric,
  time,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  numeric?: boolean;
  time?: boolean;
  placeholder?: string;
}) {
  const invalid = time && !isValidTime(value);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, invalid && { borderColor: colors.danger }]}
        value={value}
        onChangeText={time ? (v) => onChangeText(maskTime(v)) : onChangeText}
        keyboardType={numeric || time ? 'number-pad' : 'default'}
        placeholder={placeholder ?? (time ? 'HH:MM' : undefined)}
        placeholderTextColor={colors.muted}
        maxLength={time ? 5 : undefined}
      />
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.toggle}>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: colors.border, false: '#1A2540' }}
          thumbColor={colors.text}
        />
      </View>
      {value && children}
    </View>
  );
}

// Digitar "0730" vira "07:30".
function maskTime(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

function toMinutes(t: string) {
  const [h, m] = parseTime(t);
  return h * 60 + m;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: colors.glow, fontWeight: '700', letterSpacing: 3 },
  content: { padding: 16, paddingTop: 4 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  label: { color: colors.muted, flex: 1 },
  input: {
    flex: 1,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 10 },
  text: { color: colors.text, fontSize: 14, lineHeight: 20 },
  toggle: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#14203A' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  toggleLabel: { color: colors.text, fontWeight: '700', flex: 1 },
  status: { textAlign: 'center', marginBottom: 10 },
  testSound: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  saveButton: {
    backgroundColor: colors.border,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  outlineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: colors.text, fontWeight: '700', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 12, marginTop: 12 },
  confirmBox: { marginTop: 14, padding: 12, borderWidth: 1, borderColor: colors.danger, borderRadius: 4 },
});
