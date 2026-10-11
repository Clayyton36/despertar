// Janela azul no estilo "mensagem do Sistema".
import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors } from '@/lib/theme';

export function SystemPanel({ title, children, style }: { title?: string; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.panel, style]}>
      {title && <Text style={styles.title}>[ {title} ]</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.glow,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    color: colors.glow,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 12,
  },
});
