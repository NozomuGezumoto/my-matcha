// ============================================
// Matcha Map - Web placeholder
// react-native-maps is native-only; on web we show a message and list.
// ============================================

import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BEER_COLORS, SPACING, RADIUS } from '../constants/theme';
import { MatchaPin } from '../types';
import { getAllMatchaPins, customMatchaSpotToPin } from '../data/matchaData';
import { useStore } from '../store/useStore';
import MatchaDetail from './MatchaDetail';

function getMatchaTypeLabel(type: MatchaPin['type']): string {
  if (type === 'cafe') return '抹茶カフェ';
  if (type === 'tea_house') return '茶房・茶室';
  return '販売・工房';
}

export default function MatchaMapWeb() {
  const customMatchaSpots = useStore((state) => state.customMatchaSpots);
  const dataPins = useMemo(() => getAllMatchaPins(), []);
  const customPins = useMemo(() => customMatchaSpots.map(customMatchaSpotToPin), [customMatchaSpots]);
  const pins = useMemo(() => [...dataPins, ...customPins], [dataPins, customPins]);
  const [selectedPin, setSelectedPin] = useState<MatchaPin | null>(null);
  const isTried = useStore((state) => state.isTried);
  const isWantToTry = useStore((state) => state.isWantToTry);

  const handleCloseDetail = useCallback(() => setSelectedPin(null), []);

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Ionicons name="map-outline" size={24} color={BEER_COLORS.primary} />
        <Text style={styles.bannerText}>
          地図は iOS・Android アプリでご利用いただけます。Web では一覧で表示しています。
        </Text>
      </View>
      <View style={styles.list}>
        <Text style={styles.listTitle}>🍵 抹茶スポット一覧 ({pins.length} 件)</Text>
        {pins.slice(0, 100).map((pin) => (
          <Pressable
            key={pin.id}
            style={styles.listItem}
            onPress={() => setSelectedPin(pin)}
          >
            <View style={styles.listItemIcon}>
              {isTried(pin.id) ? (
                <Ionicons name="checkmark-circle" size={22} color={BEER_COLORS.accentSecondary} />
              ) : isWantToTry(pin.id) ? (
                <Ionicons name="heart" size={22} color={BEER_COLORS.accent} />
              ) : (
                <Text style={styles.pinEmoji}>🍵</Text>
              )}
            </View>
            <View style={styles.listItemInfo}>
              <Text style={styles.listItemName} numberOfLines={1}>{pin.name}</Text>
              <Text style={styles.listItemType}>{getMatchaTypeLabel(pin.type)} · {pin.prefecture}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={BEER_COLORS.textMuted} />
          </Pressable>
        ))}
        {pins.length > 100 && (
          <Text style={styles.more}>他 {pins.length - 100} 件はアプリで地図からご覧ください。</Text>
        )}
      </View>
      {selectedPin && (
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <MatchaDetail spot={selectedPin} onClose={handleCloseDetail} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BEER_COLORS.background },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: BEER_COLORS.surface,
    padding: SPACING.md,
    margin: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: BEER_COLORS.border,
  },
  bannerText: { flex: 1, fontSize: 14, color: BEER_COLORS.textSecondary },
  list: { flex: 1, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  listTitle: { fontSize: 18, fontWeight: '700', color: BEER_COLORS.textPrimary, marginBottom: SPACING.md },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.md,
    backgroundColor: BEER_COLORS.backgroundCard,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: BEER_COLORS.border,
  },
  listItemIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: BEER_COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 15, fontWeight: '600', color: BEER_COLORS.textPrimary },
  listItemType: { fontSize: 12, color: BEER_COLORS.textMuted, marginTop: 2 },
  pinEmoji: { fontSize: 18 },
  more: { fontSize: 13, color: BEER_COLORS.textMuted, marginTop: SPACING.md, textAlign: 'center' },
  detailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  detailCard: {
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
    backgroundColor: BEER_COLORS.backgroundCard,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
});
