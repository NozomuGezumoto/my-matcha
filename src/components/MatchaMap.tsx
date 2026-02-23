// ============================================
// Matcha Map Component
// 日本全国の抹茶スポット地図。ごちそうさまでした / 飲んでみたい = チェックで表示
// ============================================

import React, { useRef, useCallback, useMemo, useState, memo, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Switch } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import {
  BEER_COLORS,
  JAPAN_INITIAL_REGION,
  PIN_SIZE,
  SPACING,
  RADIUS,
} from '../constants/theme';
import { MatchaPin } from '../types';
import { getAllMatchaPins, customMatchaSpotToPin } from '../data/matchaData';
import { useStore } from '../store/useStore';
import MatchaDetail from './MatchaDetail';
import AddMatchaModal from './AddMatchaModal';

const REGIONS: { name: string; prefectures: string[] }[] = [
  { name: '北海道', prefectures: ['北海道'] },
  { name: '東北', prefectures: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  { name: '関東', prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'] },
  { name: '中部', prefectures: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'] },
  { name: '近畿', prefectures: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
  { name: '中国', prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'] },
  { name: '四国', prefectures: ['徳島県', '香川県', '愛媛県', '高知県'] },
  { name: '九州', prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'] },
];

const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#eef2e8' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a5d3a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#dfe6d8' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#c8e0b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dfe6d8' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#a8d4e0' }] },
];

interface FilterButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

function FilterButton({ label, count, isActive, color, icon, onPress }: FilterButtonProps) {
  return (
    <Pressable
      style={[styles.filterButton, isActive && { backgroundColor: color + '20', borderColor: color }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={14} color={isActive ? color : BEER_COLORS.textMuted} />
      <Text style={[styles.filterButtonText, isActive && { color }]}>{label}</Text>
      <Text style={[styles.filterCount, isActive && { color }]}>{count}</Text>
    </Pressable>
  );
}

function getMatchaTypeLabel(type: MatchaPin['type']): string {
  if (type === 'cafe') return '抹茶カフェ';
  if (type === 'tea_house') return '茶房・茶室';
  return '販売・工房';
}

interface ListItemProps {
  spot: MatchaPin;
  isTried: boolean;
  isWantToTry: boolean;
  onPress: () => void;
}

const ListSeparator = memo(() => <View style={styles.listSeparator} />);

const ListItem = memo(function ListItem({ spot, isTried, isWantToTry, onPress }: ListItemProps) {
  const typeLabel = getMatchaTypeLabel(spot.type);
  return (
    <Pressable style={styles.listItem} onPress={onPress}>
      <View style={styles.listItemIcon}>
        {isTried ? (
          <Ionicons name="checkmark-circle" size={24} color={BEER_COLORS.accentSecondary} />
        ) : isWantToTry ? (
          <Ionicons name="heart" size={24} color={BEER_COLORS.accent} />
        ) : (
          <Ionicons name="ellipse-outline" size={24} color={BEER_COLORS.textMuted} />
        )}
      </View>
      <View style={styles.listItemInfo}>
        <Text style={styles.listItemName} numberOfLines={1}>{spot.name}</Text>
        <Text style={styles.listItemType} numberOfLines={1}>
          {typeLabel}
          {spot.isCustom ? ' · 自分で追加' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={BEER_COLORS.textMuted} />
    </Pressable>
  );
});

export default function MatchaMap() {
  const mapRef = useRef<MapView | null>(null);
  const detailSheetRef = useRef<BottomSheet>(null);
  const listSheetRef = useRef<BottomSheet>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedPin, setSelectedPin] = useState<MatchaPin | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [newSpotLocation, setNewSpotLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const setPrefectureFilter = useStore((state) => state.setPrefectureFilter);

  const handleAreaFilterChange = useCallback((regionName: string | null) => {
    if (regionName === null) {
      setSelectedRegion(null);
      setPrefectureFilter('');
      return;
    }
    const region = REGIONS.find((r) => r.name === regionName);
    if (!region) return;
    setSelectedRegion(regionName);
    if (region.prefectures.length === 1) {
      setPrefectureFilter(region.prefectures[0]);
    } else {
      setPrefectureFilter('');
    }
  }, [setPrefectureFilter]);

  const handlePrefectureFilterChange = useCallback((prefecture: string) => {
    setPrefectureFilter(prefecture);
  }, [setPrefectureFilter]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const customMatchaSpots = useStore((state) => state.customMatchaSpots);
  const excludedMatchaSpots = useStore((state) => state.excludedMatchaSpots);
  const filterMode = useStore((state) => state.filterMode);
  const setFilterMode = useStore((state) => state.setFilterMode);
  const prefectureFilter = useStore((state) => state.prefectureFilter);
  const hideExcluded = useStore((state) => state.hideExcluded);
  const setHideExcluded = useStore((state) => state.setHideExcluded);
  const isTried = useStore((state) => state.isTried);
  const isWantToTry = useStore((state) => state.isWantToTry);
  const clearAllExcluded = useStore((state) => state.clearAllExcluded);

  const dataPins = useMemo(() => getAllMatchaPins(), []);
  const customPins = useMemo(() => customMatchaSpots.map(customMatchaSpotToPin), [customMatchaSpots]);
  const allPins = useMemo(() => [...dataPins, ...customPins], [dataPins, customPins]);

  const prefectureFilteredPins = useMemo(() => {
    if (!prefectureFilter) return allPins;
    return allPins.filter((pin) => pin.prefecture === prefectureFilter);
  }, [allPins, prefectureFilter]);

  const triedMatchaSpots = useStore((state) => state.triedMatchaSpots);
  const wantToTryMatchaSpots = useStore((state) => state.wantToTryMatchaSpots);
  const triedIdsSet = useMemo(() => new Set(triedMatchaSpots.map((t) => t.id)), [triedMatchaSpots]);
  const wantToTryIdsSet = useMemo(() => new Set(wantToTryMatchaSpots), [wantToTryMatchaSpots]);
  const totalCount = prefectureFilteredPins.length;
  const triedCount = useMemo(
    () => prefectureFilteredPins.filter((pin) => triedIdsSet.has(pin.id)).length,
    [prefectureFilteredPins, triedIdsSet]
  );
  const wantToTryCount = useMemo(
    () => prefectureFilteredPins.filter((pin) => wantToTryIdsSet.has(pin.id)).length,
    [prefectureFilteredPins, wantToTryIdsSet]
  );

  const pins = useMemo(() => {
    let filtered = prefectureFilteredPins;
    if (filterMode === 'tried') {
      filtered = filtered.filter((pin) => triedIdsSet.has(pin.id));
    } else if (filterMode === 'wantToTry') {
      filtered = filtered.filter((pin) => wantToTryIdsSet.has(pin.id));
    }
    if (hideExcluded && excludedMatchaSpots.length > 0) {
      const excludedSet = new Set(excludedMatchaSpots);
      filtered = filtered.filter((pin) => !excludedSet.has(pin.id));
    }
    return filtered;
  }, [filterMode, prefectureFilteredPins, triedIdsSet, wantToTryIdsSet, hideExcluded, excludedMatchaSpots]);

  const displayCount = pins.length;
  const detailSnapPoints = useMemo(() => ['55%', '85%'], []);
  const listSnapPoints = useMemo(() => ['12%', '50%', '85%'], []);

  const handleResetToCenter = useCallback(() => {
    mapRef.current?.animateToRegion(JAPAN_INITIAL_REGION, 500);
  }, []);

  const handleRegionChange = useCallback((_region: Region) => {}, []);

  const handlePinPress = useCallback((pin: MatchaPin) => {
    setSelectedPin(pin);
    listSheetRef.current?.snapToIndex(0);
    detailSheetRef.current?.snapToIndex(0);
    mapRef.current?.animateToRegion({
      latitude: pin.lat,
      longitude: pin.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);
  }, []);

  const handleListItemPress = useCallback((pin: MatchaPin) => {
    setSelectedPin(pin);
    listSheetRef.current?.snapToIndex(0);
    detailSheetRef.current?.snapToIndex(0);
    mapRef.current?.animateToRegion({
      latitude: pin.lat,
      longitude: pin.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);
  }, []);

  const handleCloseDetail = useCallback(() => {
    detailSheetRef.current?.close();
    setSelectedPin(null);
  }, []);

  const handleToggleAddMode = useCallback(() => {
    setAddMode((prev) => !prev);
    setNewSpotLocation(null);
  }, []);

  const handleMapPress = useCallback((e: any) => {
    if (!addMode) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setNewSpotLocation({ lat: latitude, lng: longitude });
    setShowAddModal(true);
  }, [addMode]);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    setNewSpotLocation(null);
    setAddMode(false);
  }, []);

  const renderListItem = useCallback(({ item }: { item: MatchaPin }) => (
    <ListItem
      spot={item}
      isTried={isTried(item.id)}
      isWantToTry={isWantToTry(item.id)}
      onPress={() => handleListItemPress(item)}
    />
  ), [isTried, isWantToTry, handleListItemPress]);

  const getPinStyle = (pin: MatchaPin) => {
    const tried = isTried(pin.id);
    const wantToTry = isWantToTry(pin.id);
    if (tried) {
      return {
        borderColor: BEER_COLORS.accentSecondary,
        bgColor: BEER_COLORS.accentSecondary,
        icon: 'checkmark' as const,
        iconColor: '#fff',
        iconSize: 26,
        emoji: '' as const,
        isTried: true,
      };
    }
    if (wantToTry) {
      return {
        borderColor: BEER_COLORS.accent,
        bgColor: BEER_COLORS.accent + '30',
        icon: null,
        iconColor: '',
        iconSize: 0,
        emoji: '❤️' as const,
        isTried: false,
      };
    }
    return {
      borderColor: '#8b9a7a',
      bgColor: BEER_COLORS.backgroundCard,
      icon: null,
      iconColor: '',
      iconSize: 0,
      emoji: '🍵' as const,
      isTried: false,
    };
  };

  const renderCluster = (cluster: any) => {
    const { id, geometry, onPress } = cluster;
    const points = cluster.properties.point_count;
    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{ longitude: geometry.coordinates[0], latitude: geometry.coordinates[1] }}
        onPress={onPress}
        tracksViewChanges={false}
      >
        <View style={styles.clusterContainer}>
          <Text style={styles.clusterText}>{points > 99 ? '99+' : points}</Text>
        </View>
      </Marker>
    );
  };

  return (
    <View style={styles.container}>
      {addMode && (
        <View style={styles.addModeBanner}>
          <Ionicons name="location" size={20} color="#fff" />
          <Text style={styles.addModeBannerText}>地図をタップしてスポットを選択</Text>
          <Pressable style={styles.addModeCancelButton} onPress={handleToggleAddMode}>
            <Text style={styles.addModeCancelText}>キャンセル</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.actionButtonsContainer}>
        <Pressable style={styles.actionButton} onPress={handleResetToCenter}>
          <Ionicons name="locate" size={22} color={BEER_COLORS.primary} />
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.addButton, addMode && styles.addButtonActive]}
          onPress={handleToggleAddMode}
        >
          <Ionicons name={addMode ? 'close' : 'add'} size={24} color="#fff" />
        </Pressable>
      </View>

      <ClusteredMapView
        mapRef={(ref: MapView | null) => { mapRef.current = ref; }}
        style={styles.map}
        initialRegion={JAPAN_INITIAL_REGION}
        customMapStyle={MAP_STYLE}
        onRegionChangeComplete={handleRegionChange}
        onPress={handleMapPress}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
        minZoomLevel={5}
        maxZoomLevel={18}
        clusterColor={BEER_COLORS.cluster}
        clusterTextColor="#fff"
        clusterFontFamily="System"
        radius={50}
        renderCluster={renderCluster}
        minPoints={3}
      >
        {pins.map((pin) => {
          const pinStyle = getPinStyle(pin);
          return (
            <Marker
              key={pin.id}
              coordinate={{ latitude: pin.lat, longitude: pin.lng }}
              onPress={() => handlePinPress(pin)}
              tracksViewChanges={false}
            >
              <View
                style={[
                  styles.pinContainer,
                  { borderColor: pinStyle.borderColor, backgroundColor: pinStyle.bgColor },
                  pinStyle.isTried && styles.highlightedPinShadow,
                ]}
              >
                {pinStyle.icon ? (
                  <Ionicons name={pinStyle.icon} size={pinStyle.iconSize} color={pinStyle.iconColor} />
                ) : (
                  <Text style={styles.pinEmoji}>{pinStyle.emoji || '🍵'}</Text>
                )}
              </View>
            </Marker>
          );
        })}
      </ClusteredMapView>

      <BottomSheet
        ref={listSheetRef}
        index={0}
        snapPoints={listSnapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        animateOnMount={false}
        enableOverDrag={false}
        handleHeight={24}
      >
        <View style={styles.listHeader}>
          <View style={styles.listHeaderRow}>
            <View>
              <Text style={styles.listTitle}>🍵 {prefectureFilter || '全国'}の抹茶スポット</Text>
              <Text style={styles.listSubtitle}>
                {displayCount.toLocaleString()} 件表示
                {excludedMatchaSpots.length > 0 && hideExcluded && ` (${excludedMatchaSpots.length}件除外中)`}
              </Text>
            </View>
            <Pressable
              style={[styles.filterToggle, showAdvancedFilters && styles.filterToggleActive]}
              onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Ionicons name="options-outline" size={18} color={showAdvancedFilters ? '#fff' : BEER_COLORS.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.listFilterRow}>
          <FilterButton label="すべて" count={totalCount} isActive={filterMode === 'all'} color={BEER_COLORS.primary} icon="grid-outline" onPress={() => setFilterMode('all')} />
          <FilterButton label="ごちそうさまでした" count={triedCount} isActive={filterMode === 'tried'} color={BEER_COLORS.accentSecondary} icon="checkmark-circle" onPress={() => setFilterMode('tried')} />
          <FilterButton label="飲んでみたい" count={wantToTryCount} isActive={filterMode === 'wantToTry'} color={BEER_COLORS.accent} icon="heart" onPress={() => setFilterMode('wantToTry')} />
        </View>

        {showAdvancedFilters && (
          <View style={styles.advancedFilters}>
            <View style={styles.advancedFilterSection}>
              <View style={styles.advancedFilterLabel}>
                <Ionicons name="location-outline" size={18} color={BEER_COLORS.textSecondary} />
                <Text style={styles.advancedFilterText}>地域・都道府県</Text>
                {prefectureFilter && <Text style={styles.prefectureSelected}>{prefectureFilter}</Text>}
              </View>
              <View style={styles.regionContainer}>
                <Pressable style={[styles.regionOption, !selectedRegion && !prefectureFilter && styles.regionOptionActive]} onPress={() => handleAreaFilterChange(null)}>
                  <Text style={[styles.regionOptionText, !selectedRegion && !prefectureFilter && styles.regionOptionTextActive]}>全国</Text>
                </Pressable>
                {REGIONS.map((region) => (
                  <Pressable key={region.name} style={[styles.regionOption, selectedRegion === region.name && styles.regionOptionActive]} onPress={() => handleAreaFilterChange(region.name)}>
                    <Text style={[styles.regionOptionText, selectedRegion === region.name && styles.regionOptionTextActive]}>{region.name}</Text>
                  </Pressable>
                ))}
              </View>
              {selectedRegion && (() => {
                const region = REGIONS.find((r) => r.name === selectedRegion);
                if (!region || region.prefectures.length <= 1) return null;
                return (
                  <View style={styles.prefectureContainer}>
                    {region.prefectures.map((pref) => (
                      <Pressable key={pref} style={[styles.prefectureOption, prefectureFilter === pref && styles.prefectureOptionActive]} onPress={() => handlePrefectureFilterChange(pref)}>
                        <Text style={[styles.prefectureOptionText, prefectureFilter === pref && styles.prefectureOptionTextActive]}>{pref.replace(/[都府県]$/, '')}</Text>
                      </Pressable>
                    ))}
                  </View>
                );
              })()}
            </View>

            {excludedMatchaSpots.length > 0 && (
              <View style={styles.advancedFilterSection}>
                <View style={styles.advancedFilterRow}>
                  <View style={styles.advancedFilterLabel}>
                    <Ionicons name="eye-off-outline" size={18} color={BEER_COLORS.textSecondary} />
                    <Text style={styles.advancedFilterText}>除外したスポットを非表示</Text>
                    <Text style={styles.excludedCount}>({excludedMatchaSpots.length}件)</Text>
                  </View>
                  <Switch value={hideExcluded} onValueChange={setHideExcluded} trackColor={{ false: BEER_COLORS.border, true: BEER_COLORS.primary + '60' }} thumbColor={hideExcluded ? BEER_COLORS.primary : '#f4f3f4'} />
                </View>
                <Pressable style={styles.clearExcludedButton} onPress={clearAllExcluded}>
                  <Ionicons name="refresh-outline" size={14} color={BEER_COLORS.error} />
                  <Text style={styles.clearExcludedText}>除外をすべて解除</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {pins.length > 0 ? (
          <BottomSheetFlatList
            data={pins}
            keyExtractor={(item) => item.id}
            renderItem={renderListItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={ListSeparator}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={3}
            getItemLayout={(_, index) => ({ length: 57, offset: 57 * index, index })}
          />
        ) : (
          <View style={styles.listEmpty}>
            <Text style={styles.listEmptyIcon}>{filterMode === 'tried' ? '✅' : filterMode === 'wantToTry' ? '❤️' : '🍵'}</Text>
            <Text style={styles.listEmptyText}>
              {filterMode === 'tried' ? 'まだごちそうさまでしたのスポットがありません' : filterMode === 'wantToTry' ? 'まだ飲んでみたいのスポットがありません' : 'データがありません'}
            </Text>
          </View>
        )}
      </BottomSheet>

      <BottomSheet ref={detailSheetRef} index={-1} snapPoints={detailSnapPoints} enablePanDownToClose backgroundStyle={styles.sheetBackground} handleIndicatorStyle={styles.sheetIndicator} animateOnMount={false}>
        <BottomSheetScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {selectedPin && <MatchaDetail spot={selectedPin} onClose={handleCloseDetail} />}
        </BottomSheetScrollView>
      </BottomSheet>

      <AddMatchaModal visible={showAddModal} onClose={handleCloseAddModal} initialLocation={newSpotLocation || undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BEER_COLORS.background },
  addModeBanner: {
    position: 'absolute', top: 60, left: SPACING.lg, right: SPACING.lg, zIndex: 20,
    backgroundColor: BEER_COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 6,
  },
  addModeBannerText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff' },
  addModeCancelButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.md },
  addModeCancelText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  actionButtonsContainer: { position: 'absolute', top: 60, right: SPACING.lg, zIndex: 10, gap: SPACING.sm },
  actionButton: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: BEER_COLORS.backgroundCard, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  addButton: { backgroundColor: BEER_COLORS.primary },
  addButtonActive: { backgroundColor: BEER_COLORS.error },
  map: { flex: 1 },
  pinContainer: {
    width: PIN_SIZE.marker, height: PIN_SIZE.marker, borderRadius: PIN_SIZE.marker / 2, borderWidth: 3, backgroundColor: BEER_COLORS.backgroundCard,
    justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  pinEmoji: { fontSize: 22 },
  highlightedPinShadow: { shadowOpacity: 0.4, shadowRadius: 5, elevation: 6 },
  clusterContainer: {
    width: PIN_SIZE.cluster, height: PIN_SIZE.cluster, borderRadius: PIN_SIZE.cluster / 2, backgroundColor: BEER_COLORS.cluster, borderWidth: 3, borderColor: BEER_COLORS.backgroundCard,
    justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  clusterText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  sheetBackground: { backgroundColor: BEER_COLORS.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetIndicator: { backgroundColor: BEER_COLORS.textMuted, width: 48, height: 5 },
  listHeader: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: { fontSize: 20, fontWeight: '700', color: BEER_COLORS.textPrimary },
  listSubtitle: { fontSize: 13, color: BEER_COLORS.textMuted, marginTop: 2 },
  filterToggle: { width: 36, height: 36, borderRadius: 18, backgroundColor: BEER_COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BEER_COLORS.border },
  filterToggleActive: { backgroundColor: BEER_COLORS.primary, borderColor: BEER_COLORS.primary },
  listFilterRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.sm },
  filterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BEER_COLORS.surface, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: BEER_COLORS.border, gap: 4 },
  filterButtonText: { fontSize: 12, fontWeight: '600', color: BEER_COLORS.textMuted },
  filterCount: { fontSize: 11, fontWeight: '700', color: BEER_COLORS.textMuted },
  listContent: { paddingBottom: 100 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md },
  listItemIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: BEER_COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 15, fontWeight: '600', color: BEER_COLORS.textPrimary },
  listItemType: { fontSize: 12, color: BEER_COLORS.textMuted, marginTop: 2 },
  listSeparator: { height: 1, backgroundColor: BEER_COLORS.border, marginLeft: SPACING.lg + 40 + SPACING.md },
  listEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: SPACING.xl },
  listEmptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  listEmptyText: { fontSize: 14, color: BEER_COLORS.textMuted, textAlign: 'center' },
  advancedFilters: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: BEER_COLORS.border, marginBottom: SPACING.sm },
  advancedFilterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  advancedFilterSection: { paddingVertical: SPACING.sm },
  advancedFilterLabel: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  advancedFilterText: { fontSize: 14, color: BEER_COLORS.textSecondary },
  excludedCount: { fontSize: 12, color: BEER_COLORS.textMuted },
  prefectureSelected: { fontSize: 12, color: BEER_COLORS.primary, fontWeight: '600', marginLeft: SPACING.xs },
  regionContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm },
  regionOption: { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, backgroundColor: BEER_COLORS.surface, borderWidth: 1, borderColor: BEER_COLORS.border },
  regionOptionActive: { backgroundColor: BEER_COLORS.primary, borderColor: BEER_COLORS.primary },
  regionOptionText: { fontSize: 13, fontWeight: '500', color: BEER_COLORS.textSecondary },
  regionOptionTextActive: { color: '#fff' },
  prefectureContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: BEER_COLORS.border },
  prefectureOption: { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, backgroundColor: BEER_COLORS.surfaceLight, borderWidth: 1, borderColor: BEER_COLORS.border },
  prefectureOptionActive: { backgroundColor: BEER_COLORS.primary, borderColor: BEER_COLORS.primary },
  prefectureOptionText: { fontSize: 12, fontWeight: '500', color: BEER_COLORS.textSecondary },
  prefectureOptionTextActive: { color: '#fff' },
  clearExcludedButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: SPACING.sm, marginTop: SPACING.xs },
  clearExcludedText: { fontSize: 13, color: BEER_COLORS.error },
});
