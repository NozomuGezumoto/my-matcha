// ============================================
// Sushi List Component
// List view of sushi restaurants
// Sorted by Japanese name (あいうえお順)
// ============================================

import React, { useMemo, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SUSHI_COLORS, SPACING, RADIUS } from '../constants/theme';
import { SushiPin } from '../types';
import { getTokyoSushiPins, customShopToPin } from '../data/sushiData';
import { useStore, FilterMode } from '../store/useStore';

// Filter button component
interface FilterChipProps {
  label: string;
  count: number;
  isActive: boolean;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

function FilterChip({ label, count, isActive, color, icon, onPress }: FilterChipProps) {
  return (
    <Pressable 
      style={[
        styles.filterChip, 
        isActive && { backgroundColor: color + '20', borderColor: color }
      ]} 
      onPress={onPress}
    >
      <Ionicons name={icon} size={14} color={isActive ? color : SUSHI_COLORS.textMuted} />
      <Text style={[styles.filterChipText, isActive && { color }]}>{label}</Text>
      <Text style={[styles.filterChipCount, isActive && { color }]}>{count}</Text>
    </Pressable>
  );
}

// Shop list item
interface ShopItemProps {
  shop: SushiPin;
  isVisited: boolean;
  isWantToGo: boolean;
  dateInfo?: string | null;
  onPress: () => void;
}

function ShopItem({ shop, isVisited, isWantToGo, dateInfo, onPress }: ShopItemProps) {
  const typeLabel = shop.type === 'fast_food' ? '回転寿司' : 
                    shop.type === 'seafood' ? '鮮魚店' : '寿司店';
  
  return (
    <Pressable style={styles.shopItem} onPress={onPress}>
      <View style={styles.shopIcon}>
        {isVisited ? (
          <Ionicons name="checkmark-circle" size={24} color={SUSHI_COLORS.accentSecondary} />
        ) : isWantToGo ? (
          <Ionicons name="heart" size={24} color={SUSHI_COLORS.accent} />
        ) : (
          <Text style={styles.shopEmoji}>🍣</Text>
        )}
      </View>
      <View style={styles.shopInfo}>
        <View style={styles.shopNameRow}>
          <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
          {shop.isCustom && (
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>自分で追加</Text>
            </View>
          )}
        </View>
        <Text style={styles.shopType} numberOfLines={1}>
          {typeLabel}
          {dateInfo ? ` · ${dateInfo}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={SUSHI_COLORS.textMuted} />
    </Pressable>
  );
}

interface SushiListProps {
  onShopPress: (shop: SushiPin) => void;
}

export default function SushiList({ onShopPress }: SushiListProps) {
  // Store
  const visitedShops = useStore((state) => state.visitedShops);
  const wantToGoShops = useStore((state) => state.wantToGoShops);
  const customShops = useStore((state) => state.customShops);
  const filterMode = useStore((state) => state.filterMode);
  const setFilterMode = useStore((state) => state.setFilterMode);
  const isVisited = useStore((state) => state.isVisited);
  const isWantToGo = useStore((state) => state.isWantToGo);
  const getVisitedCount = useStore((state) => state.getVisitedCount);
  const getWantToGoCount = useStore((state) => state.getWantToGoCount);

  // Load all pins (OSM + custom)
  const osmPins = useMemo(() => getTokyoSushiPins(), []);
  const customPins = useMemo(() => customShops.map(customShopToPin), [customShops]);
  const allPins = useMemo(() => [...osmPins, ...customPins], [osmPins, customPins]);
  const totalCount = allPins.length;
  const visitedCount = getVisitedCount();
  const wantToGoCount = getWantToGoCount();

  // Filter and sort pins
  const filteredPins = useMemo(() => {
    switch (filterMode) {
      case 'visited':
        // Sort by visitedAt (oldest first = registered order)
        const visitedSorted = [...visitedShops].sort(
          (a, b) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime()
        );
        const visitedMap = new Map(allPins.map(p => [p.id, p]));
        return visitedSorted
          .map(v => visitedMap.get(v.id))
          .filter((p): p is SushiPin => p !== undefined);
        
      case 'wantToGo':
        // Sort by addedAt (oldest first = registered order)
        const wantSorted = [...wantToGoShops].sort(
          (a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
        );
        const wantMap = new Map(allPins.map(p => [p.id, p]));
        return wantSorted
          .map(w => wantMap.get(w.id))
          .filter((p): p is SushiPin => p !== undefined);
        
      default:
        // "すべて" - original order
        return allPins;
    }
  }, [filterMode, allPins, visitedShops, wantToGoShops]);

  // Get date info for display
  const getDateInfo = useCallback((pinId: string): string | null => {
    if (filterMode === 'visited') {
      const shop = visitedShops.find(v => v.id === pinId);
      if (shop) {
        const date = new Date(shop.visitedAt);
        return `${date.getMonth() + 1}/${date.getDate()} 訪問`;
      }
    } else if (filterMode === 'wantToGo') {
      const shop = wantToGoShops.find(w => w.id === pinId);
      if (shop) {
        const date = new Date(shop.addedAt);
        return `${date.getMonth() + 1}/${date.getDate()} 追加`;
      }
    }
    return null;
  }, [filterMode, visitedShops, wantToGoShops]);

  const renderItem = useCallback(({ item }: { item: SushiPin }) => (
    <ShopItem
      shop={item}
      isVisited={isVisited(item.id)}
      isWantToGo={isWantToGo(item.id)}
      dateInfo={getDateInfo(item.id)}
      onPress={() => onShopPress(item)}
    />
  ), [isVisited, isWantToGo, getDateInfo, onShopPress]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍣 寿司店リスト</Text>
        <Text style={styles.headerSubtitle}>
          {filteredPins.length.toLocaleString()} 件
        </Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        <FilterChip
          label="すべて"
          count={totalCount}
          isActive={filterMode === 'all'}
          color={SUSHI_COLORS.primary}
          icon="grid-outline"
          onPress={() => setFilterMode('all')}
        />
        <FilterChip
          label="行きたい"
          count={wantToGoCount}
          isActive={filterMode === 'wantToGo'}
          color={SUSHI_COLORS.accent}
          icon="heart"
          onPress={() => setFilterMode('wantToGo')}
        />
        <FilterChip
          label="行った"
          count={visitedCount}
          isActive={filterMode === 'visited'}
          color={SUSHI_COLORS.accentSecondary}
          icon="checkmark-circle"
          onPress={() => setFilterMode('visited')}
        />
      </View>

      {/* List */}
      {filteredPins.length > 0 ? (
        <FlatList
          data={filteredPins}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>
            {filterMode === 'wantToGo' ? '❤️' : filterMode === 'visited' ? '✅' : '🍣'}
          </Text>
          <Text style={styles.emptyText}>
            {filterMode === 'wantToGo' 
              ? 'まだ行きたい店がありません' 
              : filterMode === 'visited'
              ? 'まだ行った店がありません'
              : 'データがありません'}
          </Text>
          {filterMode !== 'all' && (
            <Pressable 
              style={styles.emptyButton}
              onPress={() => setFilterMode('all')}
            >
              <Text style={styles.emptyButtonText}>すべてのお店を見る</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SUSHI_COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: SUSHI_COLORS.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: SUSHI_COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: SUSHI_COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: SUSHI_COLORS.textMuted,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: SUSHI_COLORS.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: SUSHI_COLORS.border,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
    backgroundColor: SUSHI_COLORS.surface,
    gap: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: SUSHI_COLORS.textMuted,
  },
  filterChipCount: {
    fontSize: 11,
    fontWeight: '700',
    color: SUSHI_COLORS.textMuted,
  },
  listContent: {
    paddingBottom: 100,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: SUSHI_COLORS.backgroundCard,
    gap: SPACING.md,
  },
  shopIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SUSHI_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopEmoji: {
    fontSize: 20,
  },
  shopInfo: {
    flex: 1,
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    color: SUSHI_COLORS.textPrimary,
    flexShrink: 1,
  },
  customBadge: {
    backgroundColor: SUSHI_COLORS.primary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: SUSHI_COLORS.primary,
  },
  shopType: {
    fontSize: 12,
    color: SUSHI_COLORS.textMuted,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: SUSHI_COLORS.border,
    marginLeft: SPACING.lg + 40 + SPACING.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: 16,
    color: SUSHI_COLORS.textMuted,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: SPACING.lg,
    backgroundColor: SUSHI_COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
