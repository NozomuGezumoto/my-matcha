// ============================================
// Sushi Map Component
// Full-screen map showing sushi restaurants
// With visited/want-to-go tracking and filtering
// ============================================

import React, { useRef, useCallback, useMemo, useState, memo, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Switch, ScrollView } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import {
  SUSHI_COLORS,
  JAPAN_INITIAL_REGION,
  PIN_SIZE,
  SPACING,
  RADIUS,
} from '../constants/theme';
import { SushiPin } from '../types';
import { getTokyoSushiPins, customShopToPin } from '../data/sushiData';
import { useStore, DistanceFilter, PrefectureFilter } from '../store/useStore';
import ShopDetail from './ShopDetail';
import AddShopModal from './AddShopModal';

// Calculate distance between two coordinates in meters
function getDistanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance filter options
const DISTANCE_OPTIONS: { value: DistanceFilter; label: string; meters: number | null }[] = [
  { value: 'none', label: '制限なし', meters: null },
  { value: '500m', label: '500m', meters: 500 },
  { value: '1km', label: '1km', meters: 1000 },
  { value: '3km', label: '3km', meters: 3000 },
];

// 地方と都道府県の定義
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

// Map styling (clean modern theme)
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5f6368' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#e8eaed' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#c8e6c9' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadce0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d7e8' }] },
];

// Filter button component
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
      style={[
        styles.filterButton, 
        isActive && { backgroundColor: color + '20', borderColor: color }
      ]} 
      onPress={onPress}
    >
      <Ionicons name={icon} size={14} color={isActive ? color : SUSHI_COLORS.textMuted} />
      <Text style={[styles.filterButtonText, isActive && { color }]}>{label}</Text>
      <Text style={[styles.filterCount, isActive && { color }]}>{count}</Text>
    </Pressable>
  );
}

// List item component (memoized to prevent unnecessary re-renders)
interface ListItemProps {
  shop: SushiPin;
  isVisited: boolean;
  isWantToGo: boolean;
  onPress: () => void;
}

// List separator (extracted to prevent re-creation)
const ListSeparator = memo(() => <View style={styles.listSeparator} />);

const ListItem = memo(function ListItem({ shop, isVisited, isWantToGo, onPress }: ListItemProps) {
  const typeLabel = shop.type === 'fast_food' ? '回転寿司' : 
                    shop.type === 'seafood' ? '鮮魚店' : '寿司店';
  return (
    <Pressable style={styles.listItem} onPress={onPress}>
      <View style={styles.listItemIcon}>
        {isVisited ? (
          <Ionicons name="checkmark-circle" size={24} color={SUSHI_COLORS.accentSecondary} />
        ) : isWantToGo ? (
          <Ionicons name="heart" size={24} color={SUSHI_COLORS.accent} />
        ) : (
          <Text style={styles.listItemEmoji}>🍣</Text>
        )}
      </View>
      <View style={styles.listItemInfo}>
        <Text style={styles.listItemName} numberOfLines={1}>{shop.name}</Text>
        <Text style={styles.listItemType} numberOfLines={1}>
          {typeLabel}
          {shop.isCustom ? ' · 自分で追加' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={SUSHI_COLORS.textMuted} />
    </Pressable>
  );
});

export default function SushiMap() {
  const mapRef = useRef<MapView | null>(null);
  const detailSheetRef = useRef<BottomSheet>(null);
  const listSheetRef = useRef<BottomSheet>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedPin, setSelectedPin] = useState<SushiPin | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [newShopLocation, setNewShopLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: JAPAN_INITIAL_REGION.latitude, lng: JAPAN_INITIAL_REGION.longitude });
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Safe area filter change handler (地方選択)
  const handleAreaFilterChange = useCallback((regionName: string | null) => {
    if (regionName === null) {
      // 全国選択
      setSelectedRegion(null);
      setPrefectureFilter('');
      return;
    }
    
    const region = REGIONS.find(r => r.name === regionName);
    if (!region) return;
    
    setSelectedRegion(regionName);
    // 県が1つの地方は直接その県を選択
    if (region.prefectures.length === 1) {
      setPrefectureFilter(region.prefectures[0]);
    } else {
      setPrefectureFilter('');
    }
  }, [setPrefectureFilter]);

  // Safe prefecture change handler  
  const handlePrefectureFilterChange = useCallback((prefecture: string) => {
    setPrefectureFilter(prefecture);
  }, [setPrefectureFilter]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Update map center when distance filter is turned on
  useEffect(() => {
    if (distanceFilter !== 'none' && mapRef.current) {
      // Get current map region and update center
      mapRef.current.getCamera().then((camera) => {
        if (camera.center) {
          setMapCenter({ lat: camera.center.latitude, lng: camera.center.longitude });
        }
      });
    }
  }, [distanceFilter]);

  // Store
  const visitedShops = useStore((state) => state.visitedShops);
  const wantToGoShops = useStore((state) => state.wantToGoShops);
  const customShops = useStore((state) => state.customShops);
  const excludedShops = useStore((state) => state.excludedShops);
  const filterMode = useStore((state) => state.filterMode);
  const setFilterMode = useStore((state) => state.setFilterMode);
  const distanceFilter = useStore((state) => state.distanceFilter);
  const setDistanceFilter = useStore((state) => state.setDistanceFilter);
  const prefectureFilter = useStore((state) => state.prefectureFilter);
  const setPrefectureFilter = useStore((state) => state.setPrefectureFilter);
  const excludeKaiten = useStore((state) => state.excludeKaiten);
  const setExcludeKaiten = useStore((state) => state.setExcludeKaiten);
  const hideExcluded = useStore((state) => state.hideExcluded);
  const setHideExcluded = useStore((state) => state.setHideExcluded);
  const isVisited = useStore((state) => state.isVisited);
  const isWantToGo = useStore((state) => state.isWantToGo);
  const isExcluded = useStore((state) => state.isExcluded);
  const clearAllExcluded = useStore((state) => state.clearAllExcluded);
  const getShopMemo = useStore((state) => state.getShopMemo);
  const getVisitedCount = useStore((state) => state.getVisitedCount);
  const getWantToGoCount = useStore((state) => state.getWantToGoCount);

  // Load all sushi pins (OSM + custom)
  const osmPins = useMemo(() => getTokyoSushiPins(), []);
  const customPins = useMemo(() => customShops.map(customShopToPin), [customShops]);
  const allPins = useMemo(() => [...osmPins, ...customPins], [osmPins, customPins]);
  
  // Filter pins by prefecture for counts
  const prefectureFilteredPins = useMemo(() => {
    try {
      if (!prefectureFilter) return allPins;
      return allPins.filter(pin => pin.prefecture === prefectureFilter);
    } catch (e) {
      console.error('Error filtering pins by prefecture:', e);
      return allPins;
    }
  }, [allPins, prefectureFilter]);
  
  // Calculate counts based on prefecture filter
  const totalCount = prefectureFilteredPins.length;
  const visitedIds = useMemo(() => new Set(visitedShops.map(v => v.id)), [visitedShops]);
  const wantToGoIds = useMemo(() => new Set(wantToGoShops.map(w => w.id)), [wantToGoShops]);
  
  const visitedCount = useMemo(() => 
    prefectureFilteredPins.filter(pin => visitedIds.has(pin.id)).length,
    [prefectureFilteredPins, visitedIds]
  );
  const wantToGoCount = useMemo(() => 
    prefectureFilteredPins.filter(pin => wantToGoIds.has(pin.id)).length,
    [prefectureFilteredPins, wantToGoIds]
  );

  // Filter pins based on all filters
  const pins = useMemo(() => {
    try {
      // Start with prefecture-filtered pins
      let filtered = prefectureFilteredPins || [];
      
      // Filter by mode (visited/wantToGo)
      switch (filterMode) {
        case 'visited':
          filtered = filtered.filter(pin => visitedIds.has(pin.id));
          break;
        case 'wantToGo':
          filtered = filtered.filter(pin => wantToGoIds.has(pin.id));
          break;
      }
      
      // Filter: Exclude kaiten-zushi
      if (excludeKaiten) {
        filtered = filtered.filter(pin => pin.type !== 'fast_food');
      }
      
      // Filter: Distance from map center
      const distanceOption = DISTANCE_OPTIONS.find(d => d.value === distanceFilter);
      if (distanceOption?.meters) {
        const maxDistance = distanceOption.meters;
        filtered = filtered.filter(pin => {
          const distance = getDistanceInMeters(mapCenter.lat, mapCenter.lng, pin.lat, pin.lng);
          return distance <= maxDistance;
        });
      }
      
      // Filter: Hide excluded
      if (hideExcluded && excludedShops.length > 0) {
        const excludedSet = new Set(excludedShops);
        filtered = filtered.filter(pin => !excludedSet.has(pin.id));
      }
      
      return filtered;
    } catch (e) {
      console.error('Error filtering pins:', e);
      return [];
    }
  }, [filterMode, prefectureFilteredPins, visitedIds, wantToGoIds, excludeKaiten, distanceFilter, mapCenter, hideExcluded, excludedShops]);

  // Count for display
  const displayCount = pins.length;

  // Bottom sheet snap points
  const detailSnapPoints = useMemo(() => ['55%', '85%'], []);
  const listSnapPoints = useMemo(() => ['12%', '50%', '85%'], []);

  // Reset map to center
  const handleResetToCenter = useCallback(() => {
    mapRef.current?.animateToRegion(JAPAN_INITIAL_REGION, 500);
  }, []);

  // Update map center when region changes (debounced, only when distance filter is active)
  const handleRegionChange = useCallback((region: Region) => {
    // Only update mapCenter when distance filter is active (to avoid unnecessary recalculations)
    if (distanceFilter === 'none') return;
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Only update after user stops moving for 300ms
    debounceTimerRef.current = setTimeout(() => {
      setMapCenter({ lat: region.latitude, lng: region.longitude });
    }, 300);
  }, [distanceFilter]);

  // Handle pin press
  const handlePinPress = useCallback((pin: SushiPin) => {
    setSelectedPin(pin);
    listSheetRef.current?.snapToIndex(0); // Collapse list
    detailSheetRef.current?.snapToIndex(0);
    
    mapRef.current?.animateToRegion({
      latitude: pin.lat,
      longitude: pin.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);
  }, []);

  // Handle list item press
  const handleListItemPress = useCallback((pin: SushiPin) => {
    setSelectedPin(pin);
    listSheetRef.current?.snapToIndex(0); // Collapse list
    detailSheetRef.current?.snapToIndex(0);
    
    mapRef.current?.animateToRegion({
      latitude: pin.lat,
      longitude: pin.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);
  }, []);

  // Close detail sheet
  const handleCloseDetail = useCallback(() => {
    detailSheetRef.current?.close();
    setSelectedPin(null);
  }, []);

  // Toggle add mode
  const handleToggleAddMode = useCallback(() => {
    setAddMode((prev) => !prev);
    setNewShopLocation(null);
  }, []);

  // Handle map press in add mode
  const handleMapPress = useCallback((e: any) => {
    if (!addMode) return;
    
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setNewShopLocation({ lat: latitude, lng: longitude });
    setShowAddModal(true);
  }, [addMode]);

  // Close add modal
  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    setNewShopLocation(null);
    setAddMode(false);
  }, []);

  // Render list item
  const renderListItem = useCallback(({ item }: { item: SushiPin }) => (
    <ListItem
      shop={item}
      isVisited={isVisited(item.id)}
      isWantToGo={isWantToGo(item.id)}
      onPress={() => handleListItemPress(item)}
    />
  ), [isVisited, isWantToGo, handleListItemPress]);

  // Get pin color and icon based on status and rating
  const getPinStyle = (pin: SushiPin) => {
    const visited = isVisited(pin.id);
    const wantTo = isWantToGo(pin.id);
    
    if (visited) {
      // 行った店！アイコンは「また行きたい度」で変化
      const memo = getShopMemo(pin.id);
      const rating = memo?.rating || 0;
      
      // また行きたい度でアイコン・色・サイズを変える
      if (rating >= 5) {
        return { 
          borderColor: '#D4AF37',      // アンティークゴールド
          bgColor: '#D4AF37',
          icon: 'trophy' as const,
          iconColor: '#fff',
          iconSize: 28,
          isVisited: true,
          isWantTo: false,
        };
      } else if (rating >= 4) {
        return { 
          borderColor: '#E67E22',      // キャロットオレンジ
          bgColor: '#E67E22',
          icon: 'star' as const,
          iconColor: '#fff',
          iconSize: 28,
          isVisited: true,
          isWantTo: false,
        };
      } else if (rating >= 3) {
        return { 
          borderColor: '#E84393',      // ローズピンク
          bgColor: '#E84393',
          icon: 'heart' as const,
          iconColor: '#fff',
          iconSize: 26,
          isVisited: true,
          isWantTo: false,
        };
      }
      // 1-2 or 未評価: チェックマーク
      return { 
        borderColor: '#5DADE2',        // スカイブルー
        bgColor: '#5DADE2',
        icon: 'checkmark' as const,
        iconColor: '#fff',
        iconSize: 26,
        isVisited: true,
        isWantTo: false,
      };
    }
    if (wantTo) {
      return { 
        borderColor: '#27AE60',  // エメラルドグリーン
        bgColor: '#27AE60',
        icon: 'flag' as const,  // 行きたい = 旗（目標）
        iconColor: '#fff',
        iconSize: 26,
        isVisited: false,
        isWantTo: true,
      };
    }
    // 普通のピンはウォームグレーで控えめに
    return { 
      borderColor: '#a1887f', 
      bgColor: SUSHI_COLORS.backgroundCard,
      icon: null, 
      iconColor: '',
      iconSize: 0,
      isVisited: false,
      isWantTo: false,
    };
  };

  // Render cluster
  const renderCluster = (cluster: any) => {
    const { id, geometry, onPress, properties } = cluster;
    const points = properties.point_count;
    
    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{
          longitude: geometry.coordinates[0],
          latitude: geometry.coordinates[1],
        }}
        onPress={onPress}
        tracksViewChanges={false}
      >
        <View style={styles.clusterContainer}>
          <Text style={styles.clusterText}>
            {points > 99 ? '99+' : points}
          </Text>
        </View>
      </Marker>
    );
  };

  return (
    <View style={styles.container}>
      {/* Add mode banner */}
      {addMode && (
        <View style={styles.addModeBanner}>
          <Ionicons name="location" size={20} color="#fff" />
          <Text style={styles.addModeBannerText}>地図をタップして場所を選択</Text>
          <Pressable style={styles.addModeCancelButton} onPress={handleToggleAddMode}>
            <Text style={styles.addModeCancelText}>キャンセル</Text>
          </Pressable>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionButtonsContainer}>
        <Pressable style={styles.actionButton} onPress={handleResetToCenter}>
          <Ionicons name="locate" size={22} color={SUSHI_COLORS.primary} />
        </Pressable>
        <Pressable 
          style={[styles.actionButton, styles.addButton, addMode && styles.addButtonActive]} 
          onPress={handleToggleAddMode}
        >
          <Ionicons name={addMode ? "close" : "add"} size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Map */}
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
        clusterColor={SUSHI_COLORS.cluster}
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
              coordinate={{
                latitude: pin.lat,
                longitude: pin.lng,
              }}
              onPress={() => handlePinPress(pin)}
              tracksViewChanges={false}
            >
              <View style={[
                styles.pinContainer, 
                { 
                  borderColor: pinStyle.borderColor,
                  backgroundColor: pinStyle.bgColor,
                },
                (pinStyle.isVisited || pinStyle.isWantTo) && styles.highlightedPinShadow,
              ]}>
                {pinStyle.icon ? (
                  <Ionicons name={pinStyle.icon} size={pinStyle.iconSize} color={pinStyle.iconColor} />
                ) : (
                  <Text style={styles.pinEmoji}>🍣</Text>
                )}
              </View>
            </Marker>
          );
        })}
      </ClusteredMapView>

      {/* List Bottom Sheet */}
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
        {/* List Header */}
        <View style={styles.listHeader}>
          <View style={styles.listHeaderRow}>
            <View>
              <Text style={styles.listTitle}>🍣 {prefectureFilter || '全国'}の寿司店</Text>
              <Text style={styles.listSubtitle}>
                {displayCount.toLocaleString()} 件表示
                {excludedShops.length > 0 && hideExcluded && ` (${excludedShops.length}件除外中)`}
              </Text>
            </View>
            <Pressable 
              style={[styles.filterToggle, showAdvancedFilters && styles.filterToggleActive]}
              onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Ionicons name="options-outline" size={18} color={showAdvancedFilters ? '#fff' : SUSHI_COLORS.primary} />
            </Pressable>
          </View>
        </View>

        {/* Filter buttons in list */}
        <View style={styles.listFilterRow}>
          <FilterButton
            label="すべて"
            count={totalCount}
            isActive={filterMode === 'all'}
            color={SUSHI_COLORS.primary}
            icon="grid-outline"
            onPress={() => setFilterMode('all')}
          />
          <FilterButton
            label="行きたい"
            count={wantToGoCount}
            isActive={filterMode === 'wantToGo'}
            color={SUSHI_COLORS.accent}
            icon="heart"
            onPress={() => setFilterMode('wantToGo')}
          />
          <FilterButton
            label="行った"
            count={visitedCount}
            isActive={filterMode === 'visited'}
            color={SUSHI_COLORS.accentSecondary}
            icon="checkmark-circle"
            onPress={() => setFilterMode('visited')}
          />
        </View>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <View style={styles.advancedFilters}>
            {/* Exclude kaiten-zushi toggle */}
            <View style={styles.advancedFilterRow}>
              <View style={styles.advancedFilterLabel}>
                <Ionicons name="close-circle-outline" size={18} color={SUSHI_COLORS.textSecondary} />
                <Text style={styles.advancedFilterText}>回転寿司を除外</Text>
              </View>
              <Switch
                value={excludeKaiten}
                onValueChange={setExcludeKaiten}
                trackColor={{ false: SUSHI_COLORS.border, true: SUSHI_COLORS.primary + '60' }}
                thumbColor={excludeKaiten ? SUSHI_COLORS.primary : '#f4f3f4'}
              />
            </View>

            {/* Prefecture filter - Region then Prefecture */}
            <View style={styles.advancedFilterSection}>
              <View style={styles.advancedFilterLabel}>
                <Ionicons name="location-outline" size={18} color={SUSHI_COLORS.textSecondary} />
                <Text style={styles.advancedFilterText}>地域・都道府県</Text>
                {prefectureFilter && (
                  <Text style={styles.prefectureSelected}>{prefectureFilter}</Text>
                )}
              </View>
              
              {/* Region selection */}
              <View style={styles.regionContainer}>
                <Pressable
                  style={[
                    styles.regionOption,
                    !selectedRegion && !prefectureFilter && styles.regionOptionActive
                  ]}
                  onPress={() => handleAreaFilterChange(null)}
                >
                  <Text style={[
                    styles.regionOptionText,
                    !selectedRegion && !prefectureFilter && styles.regionOptionTextActive
                  ]}>
                    全国
                  </Text>
                </Pressable>
                {REGIONS.map((region) => (
                  <Pressable
                    key={region.name}
                    style={[
                      styles.regionOption,
                      selectedRegion === region.name && styles.regionOptionActive
                    ]}
                    onPress={() => handleAreaFilterChange(region.name)}
                  >
                    <Text style={[
                      styles.regionOptionText,
                      selectedRegion === region.name && styles.regionOptionTextActive
                    ]}>
                      {region.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Prefecture selection (show when region selected and has multiple prefectures) */}
              {selectedRegion && (() => {
                const region = REGIONS.find(r => r.name === selectedRegion);
                if (!region || region.prefectures.length <= 1) return null;
                return (
                  <View style={styles.prefectureContainer}>
                    {region.prefectures.map((pref) => (
                      <Pressable
                        key={pref}
                        style={[
                          styles.prefectureOption,
                          prefectureFilter === pref && styles.prefectureOptionActive
                        ]}
                        onPress={() => handlePrefectureFilterChange(pref)}
                      >
                        <Text style={[
                          styles.prefectureOptionText,
                          prefectureFilter === pref && styles.prefectureOptionTextActive
                        ]}>
                          {pref.replace(/[都府県]$/, '')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                );
              })()}
            </View>

            {/* Distance filter */}
            <View style={styles.advancedFilterSection}>
              <View style={styles.advancedFilterLabel}>
                <Ionicons name="navigate-outline" size={18} color={SUSHI_COLORS.textSecondary} />
                <Text style={styles.advancedFilterText}>距離（マップ中心から）</Text>
              </View>
              <View style={styles.distanceOptions}>
                {DISTANCE_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.distanceOption,
                      distanceFilter === option.value && styles.distanceOptionActive
                    ]}
                    onPress={() => setDistanceFilter(option.value)}
                  >
                    <Text style={[
                      styles.distanceOptionText,
                      distanceFilter === option.value && styles.distanceOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Hide excluded toggle */}
            {excludedShops.length > 0 && (
              <View style={styles.advancedFilterSection}>
                <View style={styles.advancedFilterRow}>
                  <View style={styles.advancedFilterLabel}>
                    <Ionicons name="eye-off-outline" size={18} color={SUSHI_COLORS.textSecondary} />
                    <Text style={styles.advancedFilterText}>除外した店を非表示</Text>
                    <Text style={styles.excludedCount}>({excludedShops.length}件)</Text>
                  </View>
                  <Switch
                    value={hideExcluded}
                    onValueChange={setHideExcluded}
                    trackColor={{ false: SUSHI_COLORS.border, true: SUSHI_COLORS.primary + '60' }}
                    thumbColor={hideExcluded ? SUSHI_COLORS.primary : '#f4f3f4'}
                  />
                </View>
                <Pressable 
                  style={styles.clearExcludedButton}
                  onPress={clearAllExcluded}
                >
                  <Ionicons name="refresh-outline" size={14} color={SUSHI_COLORS.error} />
                  <Text style={styles.clearExcludedText}>除外をすべて解除</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Shop List */}
        {pins.length > 0 ? (
          <BottomSheetFlatList
            data={pins}
            keyExtractor={(item) => item.id}
            renderItem={renderListItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={ListSeparator}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={100}
            windowSize={3}
            removeClippedSubviews={true}
            getItemLayout={(_, index) => ({
              length: 57,
              offset: 57 * index,
              index,
            })}
          />
        ) : (
          <View style={styles.listEmpty}>
            <Text style={styles.listEmptyIcon}>
              {filterMode === 'wantToGo' ? '❤️' : filterMode === 'visited' ? '✅' : '🍣'}
            </Text>
            <Text style={styles.listEmptyText}>
              {filterMode === 'wantToGo' 
                ? 'まだ行きたい店がありません' 
                : filterMode === 'visited'
                ? 'まだ行った店がありません'
                : 'データがありません'}
            </Text>
          </View>
        )}
      </BottomSheet>

      {/* Detail Bottom Sheet */}
      <BottomSheet
        ref={detailSheetRef}
        index={-1}
        snapPoints={detailSnapPoints}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        animateOnMount={false}
      >
        <BottomSheetScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {selectedPin && (
            <ShopDetail shop={selectedPin} onClose={handleCloseDetail} />
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Add Shop Modal */}
      <AddShopModal
        visible={showAddModal}
        onClose={handleCloseAddModal}
        initialLocation={newShopLocation || undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SUSHI_COLORS.background,
  },
  // Add mode banner
  addModeBanner: {
    position: 'absolute',
    top: 60,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 20,
    backgroundColor: SUSHI_COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  addModeBannerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  addModeCancelButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.md,
  },
  addModeCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  // Action buttons
  actionButtonsContainer: {
    position: 'absolute',
    top: 60,
    right: SPACING.lg,
    zIndex: 10,
    gap: SPACING.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: SUSHI_COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  addButton: {
    backgroundColor: SUSHI_COLORS.primary,
  },
  addButtonActive: {
    backgroundColor: SUSHI_COLORS.error,
  },
  // Map
  map: {
    flex: 1,
  },
  pinContainer: {
    width: PIN_SIZE.marker,
    height: PIN_SIZE.marker,
    borderRadius: PIN_SIZE.marker / 2,
    borderWidth: 3,
    backgroundColor: SUSHI_COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pinEmoji: {
    fontSize: 22,
  },
  highlightedPinShadow: {
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  clusterContainer: {
    width: PIN_SIZE.cluster,
    height: PIN_SIZE.cluster,
    borderRadius: PIN_SIZE.cluster / 2,
    backgroundColor: SUSHI_COLORS.cluster,
    borderWidth: 3,
    borderColor: SUSHI_COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  clusterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  // Bottom Sheet styles
  sheetBackground: {
    backgroundColor: SUSHI_COLORS.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetIndicator: {
    backgroundColor: SUSHI_COLORS.textMuted,
    width: 48,
    height: 5,
  },
  // List header
  listHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: SUSHI_COLORS.textPrimary,
  },
  listSubtitle: {
    fontSize: 13,
    color: SUSHI_COLORS.textMuted,
    marginTop: 2,
  },
  filterToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SUSHI_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
  },
  filterToggleActive: {
    backgroundColor: SUSHI_COLORS.primary,
    borderColor: SUSHI_COLORS.primary,
  },
  // List filter row
  listFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SUSHI_COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
    gap: 4,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: SUSHI_COLORS.textMuted,
  },
  filterCount: {
    fontSize: 11,
    fontWeight: '700',
    color: SUSHI_COLORS.textMuted,
  },
  // List content
  listContent: {
    paddingBottom: 100,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SUSHI_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemEmoji: {
    fontSize: 20,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: SUSHI_COLORS.textPrimary,
  },
  listItemType: {
    fontSize: 12,
    color: SUSHI_COLORS.textMuted,
    marginTop: 2,
  },
  listSeparator: {
    height: 1,
    backgroundColor: SUSHI_COLORS.border,
    marginLeft: SPACING.lg + 40 + SPACING.md,
  },
  // List empty state
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  listEmptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  listEmptyText: {
    fontSize: 14,
    color: SUSHI_COLORS.textMuted,
    textAlign: 'center',
  },
  // Advanced filters
  advancedFilters: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: SUSHI_COLORS.border,
    marginBottom: SPACING.sm,
  },
  advancedFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  advancedFilterSection: {
    paddingVertical: SPACING.sm,
  },
  advancedFilterLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  advancedFilterText: {
    fontSize: 14,
    color: SUSHI_COLORS.textSecondary,
  },
  excludedCount: {
    fontSize: 12,
    color: SUSHI_COLORS.textMuted,
  },
  distanceOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  distanceOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: SUSHI_COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
  },
  distanceOptionActive: {
    backgroundColor: SUSHI_COLORS.primary,
    borderColor: SUSHI_COLORS.primary,
  },
  distanceOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: SUSHI_COLORS.textSecondary,
  },
  distanceOptionTextActive: {
    color: '#fff',
  },
  // Prefecture filter
  prefectureSelected: {
    fontSize: 12,
    color: SUSHI_COLORS.primary,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  regionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  regionOption: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: SUSHI_COLORS.surface,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
  },
  regionOptionActive: {
    backgroundColor: SUSHI_COLORS.primary,
    borderColor: SUSHI_COLORS.primary,
  },
  regionOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: SUSHI_COLORS.textSecondary,
  },
  regionOptionTextActive: {
    color: '#fff',
  },
  prefectureContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: SUSHI_COLORS.border,
  },
  prefectureOption: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: SUSHI_COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
  },
  prefectureOptionActive: {
    backgroundColor: SUSHI_COLORS.primary,
    borderColor: SUSHI_COLORS.primary,
  },
  prefectureOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: SUSHI_COLORS.textSecondary,
  },
  prefectureOptionTextActive: {
    color: '#fff',
  },
  // Clear excluded button
  clearExcludedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.xs,
  },
  clearExcludedText: {
    fontSize: 13,
    color: SUSHI_COLORS.error,
  },
});
