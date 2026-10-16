"""Gera os efeitos sonoros do Sistema (assets/sounds/*.wav) por síntese, sem arquivos de terceiros.

Uso: python3 scripts/gerar-sons.py
Cada som é uma soma de tons com envelope (ataque curto, decaimento) e um eco leve, para soar
"digital" como as janelas do Sistema. WAV mono, 22.050 Hz, 16 bits.
"""

import math
import struct
import wave
from pathlib import Path

RATE = 22050
OUT = Path(__file__).resolve().parent.parent / "assets" / "sounds"


def note(freq, start, dur, vol=1.0, wave_fn="sine", decay=6.0, attack=0.008, glide=0.0):
    """Um tom: começa em `start` (s), dura `dur` (s); glide = variação de frequência até o fim."""
    return (freq, start, dur, vol, wave_fn, decay, attack, glide)


def osc(kind, phase):
    if kind == "sine":
        return math.sin(phase)
    if kind == "bell":  # seno com harmônicos inarmônicos, timbre de sino
        return math.sin(phase) + 0.45 * math.sin(2.76 * phase) + 0.2 * math.sin(5.4 * phase)
    if kind == "square":  # quadrada suavizada (só harmônicos ímpares baixos)
        return math.sin(phase) + math.sin(3 * phase) / 3 + math.sin(5 * phase) / 5
    raise ValueError(kind)


def render(notes, length, echo=(0.12, 0.25)):
    n = int(RATE * length)
    buf = [0.0] * n
    for freq, start, dur, vol, kind, decay, attack, glide in notes:
        s0 = int(start * RATE)
        phase = 0.0
        for i in range(int(dur * RATE)):
            t = i / RATE
            if s0 + i >= n:
                break
            f = freq * (1 + glide * t / dur)
            phase += 2 * math.pi * f / RATE
            env = min(1.0, t / attack) * math.exp(-decay * t)
            # fade final de 10 ms para não estalar
            env *= min(1.0, (dur - t) / 0.01)
            buf[s0 + i] += vol * env * osc(kind, phase)
    if echo:
        delay, gain = int(echo[0] * RATE), echo[1]
        for i in range(delay, n):
            buf[i] += gain * buf[i - delay]
    peak = max(abs(x) for x in buf) or 1.0
    scale = 0.7 / peak  # cerca de -3 dB
    return [x * scale for x in buf]


def save(name, samples):
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, x)) * 32767)) for x in samples))


C5, E5, G5, C6, E6, G6 = 523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0

SOUNDS = {
    # missão diária concluída: dois blips subindo
    "missao": render([note(880, 0, 0.12, 0.8, decay=18), note(1320, 0.08, 0.2, 1.0, decay=14)], 0.45),
    # missão semanal: carrilhão de duas notas
    "semanal": render([note(G5, 0, 0.5, 0.9, "bell", decay=5), note(C6, 0.14, 0.6, 1.0, "bell", decay=4)], 0.9),
    # conquista: brilho de sinos agudos
    "conquista": render([note(C6, 0, 0.6, 0.7, "bell", decay=5), note(E6, 0.07, 0.6, 0.7, "bell", decay=5),
                          note(G6, 0.14, 0.8, 0.8, "bell", decay=4)], 1.1),
    # level up: arpejo maior subindo
    "nivel": render([note(C5, 0, 0.25, 0.8, decay=6), note(E5, 0.09, 0.25, 0.8, decay=6),
                      note(G5, 0.18, 0.25, 0.8, decay=6), note(C6, 0.27, 0.7, 1.0, decay=3.5)], 1.2),
    # rank up: arpejo + acorde sustentado com grave
    "rank": render([note(C5, 0, 0.3, 0.7), note(E5, 0.1, 0.3, 0.7), note(G5, 0.2, 0.3, 0.7),
                     note(C6, 0.3, 1.4, 0.8, decay=1.6), note(E6, 0.3, 1.4, 0.5, decay=1.6),
                     note(G6, 0.3, 1.4, 0.4, "bell", decay=2), note(130.8, 0.3, 1.5, 0.9, decay=1.4)], 2.0),
    # dungeon concluída: gongo grave + varredura subindo
    "dungeon": render([note(98, 0, 1.6, 1.0, "bell", decay=1.8), note(196, 0, 1.4, 0.5, "bell", decay=2.2),
                        note(440, 0.25, 0.9, 0.5, decay=2.5, glide=1.0), note(C6, 0.6, 0.9, 0.6, "bell", decay=3)], 2.0),
    # penalidade: zumbido descendo, dois pulsos
    "penalidade": render([note(300, 0, 0.28, 0.9, "square", decay=4, glide=-0.4),
                           note(220, 0.3, 0.4, 1.0, "square", decay=4, glide=-0.45)], 0.8, echo=None),
}

if __name__ == "__main__":
    for name, samples in SOUNDS.items():
        save(name, samples)
        print(f"{name}.wav  {len(samples) / RATE:.2f}s")
