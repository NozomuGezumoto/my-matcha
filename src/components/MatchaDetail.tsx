// ============================================
// Matcha Spot Detail Component
// 抹茶スポット詳細: ごちそうさまでした / 飲んでみたい = チェックで記録
// ============================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  Linking,
  Platform,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BEER_COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { MatchaPin } from '../types';
import { useStore } from '../store/useStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getMatchaTypeLabel(type: MatchaPin['type']): string {
  if (type === 'cafe') return '抹茶カフェ';
  if (type === 'tea_house') return '茶房・茶室';
  return '販売・工房';
}

interface MatchaDetailProps {
  spot: MatchaPin;
  onClose: () => void;
}

function StarRating({ rating, onRatingChange }: { rating: number; onRatingChange: (r: number) => void }) {
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => onRatingChange(star)}>
          <Ionicons name={star <= rating ? 'star' : 'star-outline'} size={28} color={star <= rating ? '#6b8e4e' : BEER_COLORS.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

function PhotoGallery({ photos, onAddPhoto, onRemovePhoto }: { photos: string[]; onAddPhoto: () => void; onRemovePhoto: (uri: string) => void }) {
  const mainPhoto = photos[0];
  const subPhotos = photos.slice(1, 4);
  const canAddMore = photos.length < 4;
  const hasPhotos = photos.length > 0;
  const handleLongPress = (uri: string) => {
    Alert.alert('写真を削除', 'この写真を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => onRemovePhoto(uri) },
    ]);
  };
  return (
    <View style={styles.photoGallery}>
      <Pressable style={[styles.mainPhotoSlot, hasPhotos && styles.mainPhotoSlotFilled]} onPress={!mainPhoto ? onAddPhoto : undefined} onLongPress={mainPhoto ? () => handleLongPress(mainPhoto) : undefined}>
        {mainPhoto ? (
          <Image source={{ uri: mainPhoto }} style={styles.mainPhoto} />
        ) : (
          <View style={styles.addPhotoPlaceholder}>
            <Text style={styles.addPhotoEmoji}>📸</Text>
            <Text style={styles.addPhotoTitle}>最初の一枚を残そう</Text>
            <Text style={styles.addPhotoSubtitle}>タップして写真を追加</Text>
          </View>
        )}
      </Pressable>
      {hasPhotos && (
        <View style={styles.subPhotoRow}>
          {[0, 1, 2].map((index) => {
            const photo = subPhotos[index];
            const isAddButton = !photo && canAddMore && index === subPhotos.length;
            return (
              <Pressable key={index} style={[styles.subPhotoSlot, photo && styles.subPhotoSlotFilled]} onPress={isAddButton ? onAddPhoto : undefined} onLongPress={photo ? () => handleLongPress(photo) : undefined}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.subPhoto} />
                ) : isAddButton ? (
                  <View style={styles.addPhotoPlaceholderSmall}>
                    <Ionicons name="add" size={24} color={BEER_COLORS.primary} />
                  </View>
                ) : (
                  <View style={styles.emptyPhotoSlot} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function MatchaDetail({ spot, onClose }: MatchaDetailProps) {
  // ストアの配列を直接購読して、変更が即反映されるようにする
  const triedMatchaSpots = useStore((state) => state.triedMatchaSpots);
  const wantToTryMatchaSpots = useStore((state) => state.wantToTryMatchaSpots);
  const excludedMatchaSpots = useStore((state) => state.excludedMatchaSpots);
  const matchaSpotMemos = useStore((state) => state.matchaSpotMemos);

  const markAsTried = useStore((state) => state.markAsTried);
  const unmarkAsTried = useStore((state) => state.unmarkAsTried);
  const markAsWantToTry = useStore((state) => state.markAsWantToTry);
  const unmarkAsWantToTry = useStore((state) => state.unmarkAsWantToTry);
  const setMatchaSpotMemo = useStore((state) => state.setMatchaSpotMemo);
  const addMatchaSpotPhoto = useStore((state) => state.addMatchaSpotPhoto);
  const removeMatchaSpotPhoto = useStore((state) => state.removeMatchaSpotPhoto);
  const deleteCustomMatchaSpot = useStore((state) => state.deleteCustomMatchaSpot);
  const excludeMatchaSpot = useStore((state) => state.excludeMatchaSpot);
  const unexcludeMatchaSpot = useStore((state) => state.unexcludeMatchaSpot);

  const existingMemo = matchaSpotMemos.find((m) => m.id === spot.id);
  const [note, setNote] = useState(existingMemo?.note || '');
  const [rating, setRating] = useState(existingMemo?.rating || 0);
  const [showCelebration, setShowCelebration] = useState(false);
  const photos = existingMemo?.photos ?? [];

  useEffect(() => {
    const memo = matchaSpotMemos.find((m) => m.id === spot.id);
    setNote(memo?.note || '');
    setRating(memo?.rating || 0);
    setShowCelebration(false);
  }, [spot.id, matchaSpotMemos]);

  const isSpotTried = triedMatchaSpots.some((t) => t.id === spot.id);
  const isSpotWantToTry = wantToTryMatchaSpots.includes(spot.id);
  const isSpotExcluded = excludedMatchaSpots.includes(spot.id);
  const triedCount = triedMatchaSpots.length;

  useEffect(() => {
    if (note || rating > 0) setMatchaSpotMemo(spot.id, note, rating);
  }, [note, rating, spot.id, setMatchaSpotMemo]);

  const handleAddPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('許可が必要', '写真を追加するには、カメラロールへのアクセス許可が必要です。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) addMatchaSpotPhoto(spot.id, result.assets[0].uri);
  }, [spot.id, addMatchaSpotPhoto]);

  const handleRemovePhoto = useCallback((uri: string) => removeMatchaSpotPhoto(spot.id, uri), [spot.id, removeMatchaSpotPhoto]);

  const handleOpenMaps = useCallback(() => {
    const { lat, lng, name } = spot;
    const encodedName = encodeURIComponent(name);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodedName}`;
    const appleMapsUrl = `http://maps.apple.com/?q=${encodedName}&ll=${lat},${lng}`;
    const url = Platform.OS === 'ios' ? appleMapsUrl : googleMapsUrl;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
      else Linking.openURL(googleMapsUrl);
    });
  }, [spot]);

  const handleSearchWeb = useCallback(() => {
    const query = [spot.prefecture, spot.name, '抹茶'].filter(Boolean).join(' ');
    Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
  }, [spot]);

  const handleToggleTried = useCallback(() => {
    if (isSpotTried) {
      Alert.alert('チェックを外しますか？', '', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '外す', style: 'destructive', onPress: () => unmarkAsTried(spot.id) },
      ]);
    } else {
      markAsTried(spot.id);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [spot.id, isSpotTried, markAsTried, unmarkAsTried]);

  const typeLabel = getMatchaTypeLabel(spot.type);

  const handleDeleteCustom = useCallback(() => {
    Alert.alert('このスポットを削除しますか？', '自分で追加したスポットを削除します。この操作は取り消せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => { deleteCustomMatchaSpot(spot.id); onClose(); } },
    ]);
  }, [spot.id, deleteCustomMatchaSpot, onClose]);

  const handleToggleExclude = useCallback(() => {
    if (isSpotExcluded) unexcludeMatchaSpot(spot.id);
    else excludeMatchaSpot(spot.id);
  }, [spot.id, isSpotExcluded, excludeMatchaSpot, unexcludeMatchaSpot]);

  const handleToggleWantToTry = useCallback(() => {
    if (isSpotWantToTry) unmarkAsWantToTry(spot.id);
    else markAsWantToTry(spot.id);
  }, [spot.id, isSpotWantToTry, markAsWantToTry, unmarkAsWantToTry]);

  return (
    <View style={styles.content}>
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={24} color={BEER_COLORS.textMuted} />
      </Pressable>

      <View style={styles.nameRow}>
        <Text style={styles.emoji}>{isSpotTried ? '✅' : '🍵'}</Text>
        <Text style={styles.name}>{spot.name}</Text>
      </View>

      <View style={styles.tags}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{typeLabel}</Text>
        </View>
        {spot.isCustom && (
          <View style={[styles.tag, styles.tagCustom]}>
            <Ionicons name="person" size={14} color={BEER_COLORS.primary} />
            <Text style={[styles.tagText, { color: BEER_COLORS.primary }]}>自分で追加</Text>
          </View>
        )}
        {isSpotTried && (
          <View style={[styles.tag, styles.tagTried]}>
            <Ionicons name="checkmark" size={14} color={BEER_COLORS.accentSecondary} />
            <Text style={[styles.tagText, { color: BEER_COLORS.accentSecondary }]}>ごちそうさまでした</Text>
          </View>
        )}
        {isSpotWantToTry && (
          <View style={[styles.tag, styles.tagWantToTry]}>
            <Ionicons name="heart" size={14} color={BEER_COLORS.accent} />
            <Text style={[styles.tagText, { color: BEER_COLORS.accent }]}>飲んでみたい</Text>
          </View>
        )}
      </View>

      {spot.characteristics ? (
        <View style={styles.characteristicsSection}>
          <Text style={styles.characteristicsLabel}>このスポットの特徴</Text>
          <Text style={styles.characteristicsText}>{spot.characteristics}</Text>
        </View>
      ) : null}

      <PhotoGallery photos={photos} onAddPhoto={handleAddPhoto} onRemovePhoto={handleRemovePhoto} />

      {spot.address ? (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={18} color={BEER_COLORS.textMuted} />
          <Text style={styles.infoText}>{spot.address}</Text>
        </View>
      ) : null}
      <View style={styles.infoRow}>
        <Ionicons name="compass-outline" size={18} color={BEER_COLORS.textMuted} />
        <Text style={styles.infoText}>{spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}</Text>
      </View>

      {showCelebration && (
        <View style={styles.celebrationBanner}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationText}>{triedCount}件目をごちそうさまでした！</Text>
          <Text style={styles.celebrationSubtext}>抹茶マップに追加しました</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>お気に入り度</Text>
        <StarRating rating={rating} onRatingChange={setRating} />
        {rating > 0 && (
          <Text style={styles.ratingHint}>
            {rating === 5 ? '最高！' : rating === 4 ? 'かなり良かった' : rating === 3 ? 'まあまあ' : rating === 2 ? 'うーん...' : '一度でいいかな'}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>メモ</Text>
        <TextInput style={styles.noteInput} value={note} onChangeText={setNote} placeholder="メモを入力..." placeholderTextColor={BEER_COLORS.textMuted} multiline numberOfLines={3} textAlignVertical="top" />
      </View>

      <Pressable style={[styles.triedButton, isSpotTried && styles.triedButtonActive]} onPress={handleToggleTried}>
        <Ionicons name={isSpotTried ? 'checkmark-circle' : 'cafe-outline'} size={22} color={isSpotTried ? '#fff' : BEER_COLORS.accentSecondary} />
        <Text style={[styles.triedButtonText, isSpotTried && styles.triedButtonTextActive]}>{isSpotTried ? 'ごちそうさまでした！' : 'ごちそうさまでした'}</Text>
      </Pressable>

      <Pressable style={[styles.wantToTryButton, isSpotWantToTry && styles.wantToTryButtonActive]} onPress={handleToggleWantToTry}>
        <Ionicons name={isSpotWantToTry ? 'heart' : 'heart-outline'} size={22} color={isSpotWantToTry ? '#fff' : BEER_COLORS.accent} />
        <Text style={[styles.wantToTryButtonText, isSpotWantToTry && styles.wantToTryButtonTextActive]}>{isSpotWantToTry ? '飲んでみたい！' : '飲んでみたい'}</Text>
      </Pressable>

      <Pressable style={styles.mapsButton} onPress={handleOpenMaps}>
        <Ionicons name="map-outline" size={20} color={BEER_COLORS.primary} />
        <Text style={styles.mapsButtonText}>地図アプリで開く</Text>
      </Pressable>
      <Pressable style={styles.webSearchButton} onPress={handleSearchWeb}>
        <Ionicons name="search-outline" size={20} color={BEER_COLORS.accentSecondary} />
        <Text style={styles.webSearchButtonText}>Webで検索</Text>
      </Pressable>
      <Pressable style={styles.excludeButton} onPress={handleToggleExclude}>
        <Ionicons name={isSpotExcluded ? 'eye-outline' : 'eye-off-outline'} size={18} color={isSpotExcluded ? BEER_COLORS.accentSecondary : BEER_COLORS.textMuted} />
        <Text style={[styles.excludeButtonText, isSpotExcluded && { color: BEER_COLORS.accentSecondary }]}>{isSpotExcluded ? '除外を解除' : 'リストから除外'}</Text>
      </Pressable>
      {spot.isCustom && (
        <Pressable style={styles.deleteButton} onPress={handleDeleteCustom}>
          <Ionicons name="trash-outline" size={18} color={BEER_COLORS.error} />
          <Text style={styles.deleteButtonText}>このスポットを削除</Text>
        </Pressable>
      )}
      <Text style={styles.source}>{spot.isCustom ? '自分で追加したスポット' : '抹茶スポットデータ（サンプル含む）。店舗情報は変更されている場合があります'}</Text>
    </View>
  );
}

const PHOTO_WIDTH = SCREEN_WIDTH - SPACING.xl * 2;
const MAIN_PHOTO_HEIGHT = 160;
const SUB_PHOTO_SIZE = (PHOTO_WIDTH - SPACING.sm * 2) / 3;

const styles = StyleSheet.create({
  content: { padding: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.xl, alignItems: 'center' },
  closeButton: { position: 'absolute', top: SPACING.sm, right: SPACING.md, padding: SPACING.sm, zIndex: 10 },
  photoGallery: { width: '100%', marginBottom: SPACING.md },
  mainPhotoSlot: { width: '100%', height: MAIN_PHOTO_HEIGHT, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.sm },
  mainPhoto: { width: '100%', height: '100%' },
  mainPhotoSlotFilled: { borderWidth: 0 },
  addPhotoPlaceholder: { flex: 1, backgroundColor: BEER_COLORS.primary + '08', borderRadius: RADIUS.lg, borderWidth: 2, borderColor: BEER_COLORS.primary + '30', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', paddingVertical: SPACING.lg },
  addPhotoEmoji: { fontSize: 36, marginBottom: SPACING.sm },
  addPhotoTitle: { fontSize: 16, fontWeight: '600', color: BEER_COLORS.textPrimary, marginBottom: SPACING.xs },
  addPhotoSubtitle: { fontSize: 13, color: BEER_COLORS.textMuted },
  subPhotoRow: { flexDirection: 'row', gap: SPACING.sm },
  subPhotoSlot: { width: SUB_PHOTO_SIZE, height: SUB_PHOTO_SIZE, borderRadius: RADIUS.md, overflow: 'hidden' },
  subPhotoSlotFilled: { borderWidth: 0 },
  subPhoto: { width: '100%', height: '100%' },
  addPhotoPlaceholderSmall: { flex: 1, backgroundColor: BEER_COLORS.primary + '10', borderRadius: RADIUS.md, borderWidth: 2, borderColor: BEER_COLORS.primary + '30', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  emptyPhotoSlot: { flex: 1, backgroundColor: BEER_COLORS.surface, borderRadius: RADIUS.md, opacity: 0.5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm, width: '100%', paddingRight: 40 },
  emoji: { fontSize: 28 },
  name: { fontSize: 20, fontWeight: '700', color: BEER_COLORS.textPrimary, flex: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md, width: '100%' },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: BEER_COLORS.primary + '20', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, gap: 4 },
  tagCustom: { backgroundColor: BEER_COLORS.primary + '20' },
  tagTried: { backgroundColor: BEER_COLORS.accentSecondary + '20' },
  tagWantToTry: { backgroundColor: BEER_COLORS.accent + '20' },
  tagText: { fontSize: 13, fontWeight: '600', color: BEER_COLORS.primary },
  characteristicsSection: { width: '100%', marginBottom: SPACING.md },
  characteristicsLabel: { fontSize: 13, fontWeight: '600', color: BEER_COLORS.textSecondary, marginBottom: SPACING.xs },
  characteristicsText: { fontSize: 14, color: BEER_COLORS.textPrimary, lineHeight: 22, backgroundColor: BEER_COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: BEER_COLORS.border },
  triedButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.full, marginTop: SPACING.sm, marginBottom: SPACING.md, gap: SPACING.sm, borderWidth: 2, borderColor: BEER_COLORS.accentSecondary, backgroundColor: 'transparent', ...SHADOWS.sm },
  triedButtonActive: { backgroundColor: BEER_COLORS.accentSecondary, borderColor: BEER_COLORS.accentSecondary, ...SHADOWS.md },
  triedButtonText: { fontSize: 16, fontWeight: '700', color: BEER_COLORS.accentSecondary },
  triedButtonTextActive: { color: '#fff' },
  wantToTryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.full, marginTop: SPACING.sm, marginBottom: SPACING.md, gap: SPACING.sm, borderWidth: 2, borderColor: BEER_COLORS.accent, backgroundColor: 'transparent', ...SHADOWS.sm },
  wantToTryButtonActive: { backgroundColor: BEER_COLORS.accent, borderColor: BEER_COLORS.accent, ...SHADOWS.md },
  wantToTryButtonText: { fontSize: 16, fontWeight: '700', color: BEER_COLORS.accent },
  wantToTryButtonTextActive: { color: '#fff' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm, width: '100%' },
  infoText: { fontSize: 14, color: BEER_COLORS.textSecondary, flex: 1 },
  celebrationBanner: { width: '100%', backgroundColor: BEER_COLORS.accentSecondary + '15', borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.lg, borderWidth: 1, borderColor: BEER_COLORS.accentSecondary + '30' },
  celebrationEmoji: { fontSize: 32, marginBottom: SPACING.xs },
  celebrationText: { fontSize: 16, fontWeight: '700', color: BEER_COLORS.accentSecondary },
  celebrationSubtext: { fontSize: 13, color: BEER_COLORS.textSecondary, marginTop: 2 },
  section: { width: '100%', marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: BEER_COLORS.textSecondary, marginBottom: SPACING.sm },
  starContainer: { flexDirection: 'row', gap: SPACING.xs },
  ratingHint: { fontSize: 13, color: BEER_COLORS.textMuted, marginTop: SPACING.sm, fontStyle: 'italic' },
  noteInput: { backgroundColor: BEER_COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, fontSize: 15, color: BEER_COLORS.textPrimary, minHeight: 80, borderWidth: 1, borderColor: BEER_COLORS.border },
  mapsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BEER_COLORS.primary + '15', paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.lg, marginTop: SPACING.lg, gap: SPACING.sm, width: '100%' },
  mapsButtonText: { fontSize: 15, fontWeight: '600', color: BEER_COLORS.primary },
  webSearchButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BEER_COLORS.accentSecondary + '15', paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.lg, marginTop: SPACING.sm, gap: SPACING.sm, width: '100%' },
  webSearchButtonText: { fontSize: 15, fontWeight: '600', color: BEER_COLORS.accentSecondary },
  excludeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.md, gap: SPACING.xs },
  excludeButtonText: { fontSize: 14, color: BEER_COLORS.textMuted },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.sm, gap: SPACING.xs },
  deleteButtonText: { fontSize: 14, color: BEER_COLORS.error },
  source: { fontSize: 11, color: BEER_COLORS.textMuted, marginTop: SPACING.lg },
});
