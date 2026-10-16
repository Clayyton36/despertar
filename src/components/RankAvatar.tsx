// Emblema do Caçador: muda de cor e ganha detalhes a cada rank (E até S).
// Os detalhes são cumulativos: o rank B tem tudo do C, do D e do E, mais as asas.
import Svg, { Circle, Defs, G, Path, Polygon, RadialGradient, Stop } from 'react-native-svg';

export const RANK_FORMS: Record<string, { title: string; color: string; eyes: string }> = {
  E: { title: 'Despertado', color: '#8A94A6', eyes: '#8A94A6' },
  D: { title: 'Aprendiz', color: '#C98A4B', eyes: '#C98A4B' },
  C: { title: 'Combatente', color: '#D3DCE8', eyes: '#4FC3FF' },
  B: { title: 'Elite', color: '#FFD166', eyes: '#4FC3FF' },
  A: { title: 'Campeão', color: '#4FC3FF', eyes: '#E6F1FF' },
  S: { title: 'Lenda', color: '#B266FF', eyes: '#FF3B5C' },
};

const ORDER = ['E', 'D', 'C', 'B', 'A', 'S'];

export function RankAvatar({ rank, size = 160, locked = false }: { rank: string; size?: number; locked?: boolean }) {
  const tier = ORDER.indexOf(rank);
  const has = (r: string) => tier >= ORDER.indexOf(r);
  const form = RANK_FORMS[rank];
  const color = locked ? '#1A2540' : form.color;
  const eyes = locked ? '#1A2540' : form.eyes;
  const fill = '#0B1224';

  // Escudo hexagonal centrado em (100, 105).
  const shield = '100,28 162,62 162,140 100,182 38,140 38,62';
  const inner = '100,40 152,69 152,134 100,170 48,134 48,69';

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id={`aura-${rank}`} cx="50%" cy="52%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.55} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* S: aura */}
      {has('S') && !locked && <Circle cx={100} cy={105} r={98} fill={`url(#aura-${rank})`} />}

      {/* A: coroa de raios atrás do escudo */}
      {has('A') && (
        <G stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.9}>
          {[-60, -40, -20, 0, 20, 40, 60].map((deg) => {
            const rad = ((deg - 90) * Math.PI) / 180;
            const r1 = 82;
            const r2 = deg === 0 ? 100 : 94;
            return (
              <Path
                key={deg}
                d={`M${100 + r1 * Math.cos(rad)},${105 + r1 * Math.sin(rad)} L${100 + r2 * Math.cos(rad)},${105 + r2 * Math.sin(rad)}`}
              />
            );
          })}
        </G>
      )}

      {/* B: asas */}
      {has('B') && (
        <G fill={color} opacity={0.85}>
          <Path d="M40,78 L6,64 L22,84 L2,92 L26,102 L10,114 L38,116 Z" />
          <Path d="M160,78 L194,64 L178,84 L198,92 L174,102 L190,114 L162,116 Z" />
        </G>
      )}

      {/* C: pontas nos vértices do escudo */}
      {has('C') && (
        <G fill={color}>
          <Polygon points="100,12 106,30 94,30" />
          <Polygon points="100,198 94,180 106,180" />
          <Polygon points="174,56 160,68 158,58" />
          <Polygon points="26,56 42,58 40,68" />
        </G>
      )}

      <Polygon points={shield} fill={fill} stroke={color} strokeWidth={4} strokeLinejoin="round" />
      {/* D: segundo anel */}
      {has('D') && <Polygon points={inner} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7} />}

      {/* Busto encapuzado */}
      <G fill={color} opacity={locked ? 1 : 0.95}>
        <Path d="M100,58 C82,58 74,72 74,88 C74,104 84,116 100,116 C116,116 126,104 126,88 C126,72 118,58 100,58 Z" />
        <Path d="M60,158 C62,130 78,118 100,118 C122,118 138,130 140,158 L120,166 L100,170 L80,166 Z" />
      </G>
      {/* Rosto na sombra do capuz */}
      <Path d="M100,72 C90,72 84,80 84,90 C84,101 91,109 100,109 C109,109 116,101 116,90 C116,80 110,72 100,72 Z" fill={fill} />
      {/* C+: olhos acesos */}
      {has('C') && (
        <G fill={eyes}>
          <Path d="M88,90 L97,92 L88,95 Z" />
          <Path d="M112,90 L103,92 L112,95 Z" />
        </G>
      )}
    </Svg>
  );
}
