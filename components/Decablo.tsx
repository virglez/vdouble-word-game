import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { ROUND_COLORS, BRAND } from '@/constants/colors';

const roundIcons = ['message-circle', 'zap', 'smile'] as const;

/** Presentational only: round identity never determines game state. */
export function RoundBadge({ index, label }: { index: number; label: string }) {
  return <View style={[s.badge, { backgroundColor: ROUND_COLORS[index] }]}>
    <Feather name={roundIcons[index]} size={16} color={BRAND.navy} />
    <Text style={s.badgeText}>{label}</Text>
  </View>;
}

export function DecabloLogo({ compact = false }: { compact?: boolean }) {
  return <View style={s.brand}>
    <Text style={[s.logo, compact && s.logoSmall]}>
      <Text style={s.logoLight}>DEC</Text><Text style={s.logoAccent}>A</Text><Text style={s.logoLight}>BLO</Text><Text style={s.logoQuestion}>?</Text>
    </Text>
    <Text style={s.signature}>by VDOUBLE</Text>
  </View>;
}

export function RoundCards({ labels, rounds }: { labels: string[]; rounds: string[] }) {
  const art = [
    require('@/assets/rounds/card-describelo.png'),
    require('@/assets/rounds/card-una-palabra.png'),
    require('@/assets/rounds/card-hazlo.png'),
  ];
  return <View style={s.cards}>
    {labels.map((label, index) => <View key={index} style={[s.roundCard, { transform: [{ rotate: `${(index - 1) * 7}deg` }, { translateY: index === 1 ? -10 : 0 }] }]}>
      <Image source={art[index]} resizeMode="contain" style={s.roundCardArt} accessible accessibilityLabel={label} />
    </View>)}
  </View>;
}

export function PartyArt({ kind, color }: { kind: 'phone' | 'award' | 'repeat'; color: string }) {
  return <View style={s.art} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {Array.from({ length: 8 }, (_, i) => <View key={i} style={[s.confetti, {
      backgroundColor: ROUND_COLORS[i % 3], left: `${8 + (i % 4) * 26}%`, top: i < 4 ? 12 + (i % 2) * 24 : 130 + (i % 2) * 24,
      transform: [{ rotate: `${i * 37}deg` }], borderRadius: i % 2 ? 8 : 2,
    }]} />)}
    <View style={[s.artDisc, { backgroundColor: color }]}>
      {kind === 'phone' ? <View style={s.phone}>
        <View style={s.speaker} />
        <Feather name="message-circle" size={36} color={color} />
        <View style={[s.phoneDot, { backgroundColor: color }]} />
      </View> : kind === 'award' ? <FontAwesome name="trophy" size={68} color={BRAND.navy} /> : <Feather name="refresh-cw" size={64} color={BRAND.navy} />}
    </View>
  </View>;
}

const s = StyleSheet.create({
  brand: { alignItems: 'center', paddingVertical: 16 },
  logo: { fontFamily: 'Inter_900Black', fontSize: 54, letterSpacing: -5, textShadowColor: '#00000045', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 },
  logoSmall: { fontSize: 21, letterSpacing: -1, textShadowOffset: { width: 0, height: 1 } },
  logoLight: { color: BRAND.white },
  logoAccent: { color: BRAND.yellow },
  logoQuestion: { color: BRAND.white, fontSize: 30, letterSpacing: -2, verticalAlign: 'top' },
  signature: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 2, color: BRAND.white, marginTop: 5 },
  badge: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10 },
  badgeText: { color: BRAND.navy, fontFamily: 'Inter_700Bold', fontSize: 12, flexShrink: 1 },
  cards: { flexDirection: 'row', gap: 8, paddingVertical: 22, marginVertical: 4 },
  roundCard: { flex: 1, minWidth: 0, height: 188, alignItems: 'center', justifyContent: 'center' },
  roundCardArt: { width: '100%', height: '100%' },
  roundNumber: { fontFamily: 'Inter_700Bold', fontSize: 8, color: BRAND.navy, textTransform: 'uppercase', textAlign: 'center' },
  roundTitle: { fontFamily: 'Inter_900Black', fontSize: 10, color: BRAND.navy, textAlign: 'center' },
  art: { height: 192, width: '100%', alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  artDisc: { width: 144, height: 144, borderRadius: 72, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  confetti: { position: 'absolute', width: 9, height: 18 },
  phone: { height: 138, width: 82, backgroundColor: BRAND.navy, borderRadius: 18, borderWidth: 5, borderColor: BRAND.white, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  speaker: { height: 4, width: 24, borderRadius: 4, backgroundColor: BRAND.white },
  phoneDot: { width: 8, height: 8, borderRadius: 8 },
});
