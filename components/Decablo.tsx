import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
    <Text style={[s.logo, compact && s.logoSmall]}>DECABLO</Text>
    <Text style={s.signature}>by VDOUBLE</Text>
  </View>;
}

export function RoundCards({ labels, rounds }: { labels: string[]; rounds: string[] }) {
  return <View style={s.cards}>
    {labels.map((label, index) => <View key={index} style={[s.roundCard, { backgroundColor: ROUND_COLORS[index], transform: [{ rotate: `${(index - 1) * 7}deg` }, { translateY: index === 1 ? -10 : 0 }] }]}>
      <Text style={s.roundNumber}>{rounds[index]}</Text>
      <Feather name={roundIcons[index]} size={34} color={BRAND.navy} />
      <Text style={s.roundTitle}>{label.toUpperCase()}</Text>
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
  logo: { fontFamily: 'Inter_900Black', fontSize: 52, letterSpacing: -3, color: BRAND.yellow, textShadowColor: '#806717', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0 },
  logoSmall: { fontSize: 21, letterSpacing: -1, textShadowOffset: { width: 0, height: 1 } },
  signature: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 2, color: BRAND.white, marginTop: 5 },
  badge: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10 },
  badgeText: { color: BRAND.navy, fontFamily: 'Inter_700Bold', fontSize: 12, flexShrink: 1 },
  cards: { flexDirection: 'row', gap: 5, paddingVertical: 30, marginVertical: 8 },
  roundCard: { flex: 1, minWidth: 0, minHeight: 160, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'space-between', gap: 14, borderBottomWidth: 5, borderBottomColor: '#00000025' },
  roundNumber: { fontFamily: 'Inter_700Bold', fontSize: 9, color: BRAND.navy, textTransform: 'uppercase', textAlign: 'center' },
  roundTitle: { fontFamily: 'Inter_900Black', fontSize: 12, color: BRAND.navy, textAlign: 'center' },
  art: { height: 192, width: '100%', alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  artDisc: { width: 144, height: 144, borderRadius: 72, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  confetti: { position: 'absolute', width: 9, height: 18 },
  phone: { height: 138, width: 82, backgroundColor: BRAND.navy, borderRadius: 18, borderWidth: 5, borderColor: BRAND.white, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  speaker: { height: 4, width: 24, borderRadius: 4, backgroundColor: BRAND.white },
  phoneDot: { width: 8, height: 8, borderRadius: 8 },
});
