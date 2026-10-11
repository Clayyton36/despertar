// Primeira tela: o jogador "desperta" informando suas métricas.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SystemPanel } from '@/components/SystemPanel';
import { usePlayer } from '@/lib/player';
import { colors } from '@/lib/theme';

const toNumber = (v: string) => Number(v.replace(',', '.'));

export default function Despertar() {
  const { awaken } = usePlayer();
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('');

  const valid = name.trim() && toNumber(height) > 0 && toNumber(weight) > 0 && toNumber(goal) > 0;

  function submit() {
    if (!valid) return;
    awaken({ name: name.trim(), heightCm: toNumber(height), weightKg: toNumber(weight), goalWeightKg: toNumber(goal) });
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SystemPanel title="ALERTA">
          <Text style={styles.message}>Você foi escolhido como Jogador.</Text>
          <Text style={styles.message}>Registre suas métricas para iniciar o Despertar.</Text>
        </SystemPanel>

        <SystemPanel>
          <Field label="Nome do jogador" value={name} onChangeText={setName} />
          <Field label="Altura (cm)" value={height} onChangeText={setHeight} numeric />
          <Field label="Peso atual (kg)" value={weight} onChangeText={setWeight} numeric />
          <Field label="Peso meta (kg)" value={goal} onChangeText={setGoal} numeric />

          <Pressable style={[styles.button, !valid && styles.buttonDisabled]} onPress={submit} disabled={!valid}>
            <Text style={styles.buttonText}>ACEITAR</Text>
          </Pressable>
        </SystemPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, numeric, ...props }: { label: string; numeric?: boolean; value: string; onChangeText: (v: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.muted}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, flexGrow: 1, justifyContent: 'center' },
  message: { color: colors.text, fontSize: 16, textAlign: 'center', marginBottom: 6 },
  field: { marginBottom: 14 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  input: {
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: { backgroundColor: colors.border, borderRadius: 4, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.text, fontWeight: '700', letterSpacing: 4 },
});
