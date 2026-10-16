// Sons do Sistema: efeitos curtos para missão concluída, level up, conquistas, etc.
// Os arquivos são gerados por scripts/gerar-sons.py. Respeitam o modo silencioso do
// celular e tocam junto com música de outros apps (não pausam o Spotify).
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const FILES = {
  missao: require('../../assets/sounds/missao.wav'),
  semanal: require('../../assets/sounds/semanal.wav'),
  conquista: require('../../assets/sounds/conquista.wav'),
  nivel: require('../../assets/sounds/nivel.wav'),
  rank: require('../../assets/sounds/rank.wav'),
  dungeon: require('../../assets/sounds/dungeon.wav'),
  penalidade: require('../../assets/sounds/penalidade.wav'),
};

export type SoundName = keyof typeof FILES;

let enabled = true;
let ready: Promise<void> | null = null;
const players: Partial<Record<SoundName, AudioPlayer>> = {};

export function setSoundsEnabled(on: boolean) {
  enabled = on;
}

// force: toca mesmo com os sons desligados (botão de teste nas Configurações).
export function playSound(name: SoundName, force = false) {
  if (!enabled && !force) return;
  ready ??= setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  ready.then(() => {
    try {
      // Um player por som, criado na primeira vez e reaproveitado (volta ao início a cada toque).
      const player = (players[name] ??= createAudioPlayer(FILES[name]));
      player.seekTo(0);
      player.play();
    } catch {
      // Som é enfeite: se falhar, o app segue normalmente.
    }
  });
}
