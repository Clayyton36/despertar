// Gráficos simples em SVG: linha (peso) e colunas (últimos 7 dias).
// Toque num ponto/coluna para ver o valor exato.
import { useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { colors } from '@/lib/theme';

export type Point = { label: string; value: number };

// Cores dos gráficos: uma série só, no azul do tema (validado contra o fundo do painel).
const MARK = colors.border;
const GRID = '#1A2540';
const PAD = { top: 16, right: 12, bottom: 22, left: 40 };

function niceTicks(min: number, max: number, count = 3) {
  const span = max - min || 1;
  const raw = span / (count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(Number(v.toFixed(6)));
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

function useWidth() {
  const [width, setWidth] = useState(0);
  return { width, onLayout: (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width) };
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export function LineChart({
  data,
  goal,
  unit,
  height = 180,
}: {
  data: Point[];
  goal?: { value: number; label: string };
  unit: string;
  height?: number;
}) {
  const { width, onLayout } = useWidth();
  const [selected, setSelected] = useState<number | null>(null);

  const values = data.map((d) => d.value).concat(goal ? [goal.value] : []);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH;

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${PAD.top + plotH} L${x(0)},${PAD.top + plotH} Z`;
  const last = data.length - 1;
  const active = selected ?? last;

  function onPress(e: GestureResponderEvent) {
    const px = e.nativeEvent.locationX;
    let best = 0;
    data.forEach((_, i) => Math.abs(x(i) - px) < Math.abs(x(best) - px) && (best = i));
    setSelected(best === selected ? null : best);
  }

  return (
    <View onLayout={onLayout}>
      <Text style={styles.readout}>
        {data[active].label}:{' '}
        <Text style={styles.readoutValue}>
          {fmt(data[active].value)} {unit}
        </Text>
      </Text>
      {width > 0 && (
        <Pressable onPress={onPress}>
          <Svg width={width} height={height}>
            {ticks.map((t) => (
              <Line key={t} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            ))}
            {goal && (
              <Line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(goal.value)}
                y2={y(goal.value)}
                stroke={colors.muted}
                strokeWidth={1}
              />
            )}
            <Path d={area} fill={MARK} fillOpacity={0.1} />
            <Path d={line} stroke={MARK} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {selected != null && (
              <Line
                x1={x(selected)}
                x2={x(selected)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke={colors.muted}
                strokeWidth={1}
              />
            )}
            <Circle cx={x(active)} cy={y(data[active].value)} r={5} fill={MARK} stroke={colors.panel} strokeWidth={2} />
          </Svg>
          {/* Rótulos em Text (fora do SVG) para usar as cores de texto do tema */}
          {ticks.map((t) => (
            <Text key={t} style={[styles.tick, { top: y(t) - 7, width: PAD.left - 6 }]}>
              {fmt(t)}
            </Text>
          ))}
          {goal && <Text style={[styles.goalLabel, { top: y(goal.value) - 16, right: PAD.right }]}>{goal.label}</Text>}
          <Text style={[styles.xLabel, { left: PAD.left }]}>{data[0].label}</Text>
          {data.length > 1 && <Text style={[styles.xLabel, { right: PAD.right }]}>{data[last].label}</Text>}
        </Pressable>
      )}
    </View>
  );
}

export function ColumnChart({
  data,
  target,
  format = fmt,
  tickFormat = fmt,
  height = 150,
}: {
  data: Point[];
  target?: number;
  // format = valor no destaque; tickFormat = número curto do eixo (a unidade fica no título)
  format?: (v: number) => string;
  tickFormat?: (v: number) => string;
  height?: number;
}) {
  const { width, onLayout } = useWidth();
  const [selected, setSelected] = useState<number | null>(null);

  const ticks = niceTicks(0, Math.max(1, target ?? 0, ...data.map((d) => d.value)));
  const yMax = ticks[ticks.length - 1];
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const band = plotW / data.length;
  const barW = Math.min(24, band - 8);
  const y = (v: number) => PAD.top + (1 - v / yMax) * plotH;
  const base = PAD.top + plotH;
  const active = selected ?? data.length - 1;

  // Coluna com topo arredondado (4px) e base reta.
  function columnPath(cx: number, value: number) {
    const h = base - y(value);
    if (h <= 0) return '';
    const r = Math.min(4, h, barW / 2);
    const l = cx - barW / 2;
    const rt = cx + barW / 2;
    const top = base - h;
    return `M${l},${base} L${l},${top + r} Q${l},${top} ${l + r},${top} L${rt - r},${top} Q${rt},${top} ${rt},${top + r} L${rt},${base} Z`;
  }

  return (
    <View onLayout={onLayout}>
      <Text style={styles.readout}>
        {data[active].label}: <Text style={styles.readoutValue}>{format(data[active].value)}</Text>
      </Text>
      {width > 0 && (
        <View>
          <Svg width={width} height={height}>
            {ticks.map((t) => (
              <Line key={t} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            ))}
            {target != null && (
              <Line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(target)}
                y2={y(target)}
                stroke={colors.muted}
                strokeWidth={1}
              />
            )}
            {data.map((d, i) => (
              <Path
                key={i}
                d={columnPath(PAD.left + band * (i + 0.5), d.value)}
                fill={MARK}
                fillOpacity={selected == null || selected === i ? 1 : 0.45}
              />
            ))}
            {/* Área de toque maior que a coluna */}
            {data.map((_, i) => (
              <Rect
                key={i}
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotH}
                fill="transparent"
                onPress={() => setSelected(selected === i ? null : i)}
              />
            ))}
          </Svg>
          {ticks.map((t) => (
            <Text key={t} style={[styles.tick, { top: y(t) - 7, width: PAD.left - 6 }]}>
              {tickFormat(t)}
            </Text>
          ))}
          {target != null && <Text style={[styles.goalLabel, { top: y(target) - 16, right: PAD.right }]}>meta</Text>}
          {data.map((d, i) => (
            <Text key={i} style={[styles.colLabel, { left: PAD.left + band * i, width: band }]}>
              {d.label.slice(0, 3)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  readoutValue: { color: colors.text, fontWeight: '700' },
  tick: {
    position: 'absolute',
    left: 0,
    textAlign: 'right',
    color: colors.muted,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  goalLabel: { position: 'absolute', color: colors.muted, fontSize: 10 },
  xLabel: { position: 'absolute', bottom: 2, color: colors.muted, fontSize: 10 },
  colLabel: { position: 'absolute', bottom: 2, color: colors.muted, fontSize: 10, textAlign: 'center' },
});
