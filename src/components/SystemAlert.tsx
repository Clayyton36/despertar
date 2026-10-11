// Janela do Sistema que aparece por cima de qualquer tela: level up, rank up, conquistas e penalidades.
// Entra com animação, vibra e some sozinha (ou com um toque).
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, Vibration } from 'react-native';

import { PENALTY_PER_MISSION } from '@/lib/game';
import { SystemEvent, usePlayer } from '@/lib/player';
import { colors } from '@/lib/theme';

const DURATION_MS = 4000;

export function SystemAlert() {
  const { events, dismissEvent } = usePlayer();
  const event = events[0];

  // key: cada aviso novo monta de novo e refaz a animação
  return event ? <AlertCard key={event.id} event={event} onDone={dismissEvent} /> : null;
}

function AlertCard({ event, onDone }: { event: SystemEvent; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const { title, body, accent, big } = describe(event);

  useEffect(() => {
    Vibration.vibrate(event.kind === 'penalty' ? [0, 400] : [0, 80, 60, 120]);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
    const timer = setTimeout(close, DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roda só ao montar cada aviso
  }, []);

  function close() {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDone());
  }

  return (
    <Animated.View pointerEvents="box-none" style={[styles.overlay, { opacity: anim }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      <Animated.View
        style={[
          styles.card,
          { borderColor: accent, shadowColor: accent },
          { transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] },
        ]}>
        <Pressable onPress={close}>
          <Text style={[styles.title, { color: accent }]}>[ {title} ]</Text>
          {big && <Text style={styles.big}>{big}</Text>}
          <Text style={styles.body}>{body}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function describe(event: SystemEvent): { title: string; body: string; accent: string; big?: string } {
  switch (event.kind) {
    case 'level':
      return event.rankUp
        ? {
            title: 'RANK UP',
            big: `RANK ${event.rankUp}`,
            body: `Você alcançou o nível ${event.level}.`,
            accent: colors.gold,
          }
        : {
            title: 'LEVEL UP',
            big: `NÍVEL ${event.level}`,
            body: 'Seus atributos estão ficando mais fortes.',
            accent: colors.glow,
          };
    case 'achievement':
      return {
        title: 'CONQUISTA DESBLOQUEADA',
        big: event.achievement.icon,
        body: `${event.achievement.title}\n${event.achievement.detail}${event.achievement.xp ? `\n+${event.achievement.xp} XP` : ''}`,
        accent: colors.gold,
      };
    case 'achievements':
      return {
        title: 'CONQUISTAS DESBLOQUEADAS',
        big: `${event.count}`,
        body: `Você desbloqueou ${event.count} conquistas (+${event.xp} XP). Veja todas na aba Evolução.`,
        accent: colors.gold,
      };
    case 'penalty':
      return {
        title: 'PENALIDADE',
        big: `-${event.xpLost} XP`,
        body: `Missão diária incompleta em ${event.days} dia(s) (-${PENALTY_PER_MISSION} XP por missão). Não falhe de novo, Jogador.`,
        accent: colors.danger,
      };
  }
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 4, 10, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 28,
    paddingHorizontal: 20,
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 12,
  },
  title: { fontSize: 15, fontWeight: '800', letterSpacing: 3, textAlign: 'center' },
  big: { color: colors.text, fontSize: 44, fontWeight: '800', textAlign: 'center', marginVertical: 14 },
  body: { color: colors.text, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
