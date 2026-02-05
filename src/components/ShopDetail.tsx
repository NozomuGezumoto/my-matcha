// ============================================
// Shop Detail Component
// Shows shop details with notes, rating, and actions
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
import { SUSHI_COLORS, SPACING, RADIUS } from '../constants/theme';
import { SushiPin } from '../types';
import { useStore } from '../store/useStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShopDetailProps {
  shop: SushiPin;
  onClose: () => void;
}

// Star rating component
function StarRating({ 
  rating, 
  onRatingChange 
}: { 
  rating: number; 
  onRatingChange: (rating: number) => void;
}) {
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => onRatingChange(star)}>
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={28}
            color={star <= rating ? '#f0a500' : SUSHI_COLORS.textMuted}
          />
        </Pressable>
      ))}
    </View>
  );
}

// Photo gallery component
function PhotoGallery({
  photos,
  onAddPhoto,
  onRemovePhoto,
}: {
  photos: string[];
  onAddPhoto: () => void;
  onRemovePhoto: (uri: string) => void;
}) {
  const mainPhoto = photos[0];
  const subPhotos = photos.slice(1, 4);
  const canAddMore = photos.length < 4;
  const hasPhotos = photos.length > 0;

  const handleLongPress = (uri: string) => {
    Alert.alert(
      '写真を削除',
      'この写真を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => onRemovePhoto(uri) },
      ]
    );
  };

  return (
    <View style={styles.photoGallery}>
      {/* Main photo slot */}
      <Pressable
        style={[
          styles.mainPhotoSlot,
          hasPhotos && styles.mainPhotoSlotFilled
        ]}
        onPress={!mainPhoto ? onAddPhoto : undefined}
        onLongPress={mainPhoto ? () => handleLongPress(mainPhoto) : undefined}
      >
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

      {/* Sub photo slots - only show if has at least 1 photo */}
      {hasPhotos && (
        <View style={styles.subPhotoRow}>
          {[0, 1, 2].map((index) => {
            const photo = subPhotos[index];
            const isAddButton = !photo && canAddMore && index === subPhotos.length;

            return (
              <Pressable
                key={index}
                style={[
                  styles.subPhotoSlot,
                  photo && styles.subPhotoSlotFilled
                ]}
                onPress={isAddButton ? onAddPhoto : undefined}
                onLongPress={photo ? () => handleLongPress(photo) : undefined}
              >
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.subPhoto} />
                ) : isAddButton ? (
                  <View style={styles.addPhotoPlaceholderSmall}>
                    <Ionicons name="add" size={24} color={SUSHI_COLORS.primary} />
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

export default function ShopDetail({ shop, onClose }: ShopDetailProps) {
  // Store
  const isVisited = useStore((state) => state.isVisited);
  const isWantToGo = useStore((state) => state.isWantToGo);
  const markAsVisited = useStore((state) => state.markAsVisited);
  const unmarkAsVisited = useStore((state) => state.unmarkAsVisited);
  const addToWantToGo = useStore((state) => state.addToWantToGo);
  const removeFromWantToGo = useStore((state) => state.removeFromWantToGo);
  const getShopMemo = useStore((state) => state.getShopMemo);
  const setShopMemo = useStore((state) => state.setShopMemo);
  const addShopPhoto = useStore((state) => state.addShopPhoto);
  const removeShopPhoto = useStore((state) => state.removeShopPhoto);
  const getShopPhotos = useStore((state) => state.getShopPhotos);
  const deleteCustomShop = useStore((state) => state.deleteCustomShop);
  const excludeShop = useStore((state) => state.excludeShop);
  const unexcludeShop = useStore((state) => state.unexcludeShop);
  const isExcluded = useStore((state) => state.isExcluded);

  // Local state
  const existingMemo = getShopMemo(shop.id);
  const [note, setNote] = useState(existingMemo?.note || '');
  const [rating, setRating] = useState(existingMemo?.rating || 0);
  const [showCelebration, setShowCelebration] = useState(false);
  const photos = getShopPhotos(shop.id);

  // Reset local state when shop changes
  useEffect(() => {
    const memo = getShopMemo(shop.id);
    setNote(memo?.note || '');
    setRating(memo?.rating || 0);
    setShowCelebration(false);
  }, [shop.id, getShopMemo]);

  const isShopVisited = isVisited(shop.id);
  const isShopWantToGo = isWantToGo(shop.id);
  const isShopExcluded = isExcluded(shop.id);
  const visitedCount = useStore((state) => state.getVisitedCount)();

  // Save memo when changed
  useEffect(() => {
    if (note || rating > 0) {
      setShopMemo(shop.id, note, rating);
    }
  }, [note, rating, shop.id, setShopMemo]);

  // Pick photo from library
  const handleAddPhoto = useCallback(async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('許可が必要', '写真を追加するには、カメラロールへのアクセス許可が必要です。');
      return;
    }

    // Launch picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      addShopPhoto(shop.id, result.assets[0].uri);
    }
  }, [shop.id, addShopPhoto]);

  // Remove photo
  const handleRemovePhoto = useCallback((uri: string) => {
    removeShopPhoto(shop.id, uri);
  }, [shop.id, removeShopPhoto]);

  // Open in maps
  const handleOpenMaps = useCallback(() => {
    const { lat, lng, name } = shop;
    const encodedName = encodeURIComponent(name);
    
    // Try Google Maps first, fallback to Apple Maps on iOS
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodedName}`;
    const appleMapsUrl = `http://maps.apple.com/?q=${encodedName}&ll=${lat},${lng}`;
    
    const url = Platform.OS === 'ios' ? appleMapsUrl : googleMapsUrl;
    
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps web
        Linking.openURL(googleMapsUrl);
      }
    });
  }, [shop]);

  // Search on web (Google)
  const handleSearchWeb = useCallback(() => {
    const { name, prefecture } = shop;
    // Build search query: prefecture + shop name + "寿司"
    const query = [prefecture, name, '寿司'].filter(Boolean).join(' ');
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.google.com/search?q=${encodedQuery}`;
    
    Linking.openURL(searchUrl);
  }, [shop]);

  // Toggle visited with celebration
  const handleToggleVisited = useCallback(() => {
    if (isShopVisited) {
      Alert.alert(
        '訪問を取り消しますか？',
        '',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '取り消す', style: 'destructive', onPress: () => unmarkAsVisited(shop.id) },
        ]
      );
    } else {
      markAsVisited(shop.id);
      setShowCelebration(true);
      // Hide celebration after 3 seconds
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [shop.id, isShopVisited, markAsVisited, unmarkAsVisited]);

  // Toggle want to go
  const handleToggleWantToGo = useCallback(() => {
    if (isShopWantToGo) {
      removeFromWantToGo(shop.id);
    } else {
      addToWantToGo(shop.id);
    }
  }, [shop.id, isShopWantToGo, addToWantToGo, removeFromWantToGo]);

  // Get type label
  const typeLabel = shop.type === 'fast_food' ? '回転寿司' : 
                    shop.type === 'seafood' ? '鮮魚店' : '寿司店';

  // Handle delete custom shop
  const handleDeleteCustomShop = useCallback(() => {
    Alert.alert(
      'このお店を削除しますか？',
      '自分で追加したお店を削除します。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive', 
          onPress: () => {
            deleteCustomShop(shop.id);
            onClose();
          }
        },
      ]
    );
  }, [shop.id, deleteCustomShop, onClose]);

  // Handle exclude/unexclude
  const handleToggleExclude = useCallback(() => {
    if (isShopExcluded) {
      unexcludeShop(shop.id);
    } else {
      excludeShop(shop.id);
    }
  }, [shop.id, isShopExcluded, excludeShop, unexcludeShop]);

  return (
    <View style={styles.content}>
      {/* Close button */}
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={24} color={SUSHI_COLORS.textMuted} />
      </Pressable>

      {/* Emoji and name - ABOVE photos */}
      <View style={styles.nameRow}>
        <Text style={styles.emoji}>
          {isShopVisited ? '✅' : isShopWantToGo ? '❤️' : '🍣'}
        </Text>
        <Text style={styles.name}>{shop.name}</Text>
      </View>
      
      {/* Tags - ABOVE photos */}
      <View style={styles.tags}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{typeLabel}</Text>
        </View>
        {shop.isCustom && (
          <View style={[styles.tag, styles.tagCustom]}>
            <Ionicons name="person" size={14} color={SUSHI_COLORS.primary} />
            <Text style={[styles.tagText, { color: SUSHI_COLORS.primary }]}>
              自分で追加
            </Text>
          </View>
        )}
        {isShopVisited && (
          <View style={[styles.tag, styles.tagVisited]}>
            <Ionicons name="checkmark" size={14} color={SUSHI_COLORS.accentSecondary} />
            <Text style={[styles.tagText, { color: SUSHI_COLORS.accentSecondary }]}>
              訪問済
            </Text>
          </View>
        )}
        {isShopWantToGo && (
          <View style={[styles.tag, styles.tagWant]}>
            <Ionicons name="heart" size={14} color={SUSHI_COLORS.accent} />
            <Text style={[styles.tagText, { color: SUSHI_COLORS.accent }]}>
              行きたい
            </Text>
          </View>
        )}
      </View>

      {/* Photo Gallery */}
      <PhotoGallery
        photos={photos}
        onAddPhoto={handleAddPhoto}
        onRemovePhoto={handleRemovePhoto}
      />

      {/* Info rows */}
      {shop.address ? (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={18} color={SUSHI_COLORS.textMuted} />
          <Text style={styles.infoText}>{shop.address}</Text>
        </View>
      ) : null}
      
      <View style={styles.infoRow}>
        <Ionicons name="compass-outline" size={18} color={SUSHI_COLORS.textMuted} />
        <Text style={styles.infoText}>
          {shop.lat.toFixed(5)}, {shop.lng.toFixed(5)}
        </Text>
      </View>

      {/* Celebration message */}
      {showCelebration && (
        <View style={styles.celebrationBanner}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationText}>
            {visitedCount}件目の寿司を記録しました！
          </Text>
          <Text style={styles.celebrationSubtext}>
            あなたの寿司マップが育っています
          </Text>
        </View>
      )}

      {/* Rating */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>また行きたい度</Text>
        <StarRating rating={rating} onRatingChange={setRating} />
        {rating > 0 && (
          <Text style={styles.ratingHint}>
            {rating === 5 ? '絶対また行く！' : 
             rating === 4 ? 'かなり良かった' :
             rating === 3 ? 'まあまあ' :
             rating === 2 ? 'うーん...' : '一度でいいかな'}
          </Text>
        )}
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>あなたのメモ</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="お店のメモを入力..."
          placeholderTextColor={SUSHI_COLORS.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        {!isShopVisited && (
          <Pressable 
            style={[
              styles.actionButton,
              isShopWantToGo ? styles.actionButtonActiveWant : styles.actionButtonOutline
            ]}
            onPress={handleToggleWantToGo}
          >
            <Ionicons 
              name={isShopWantToGo ? "heart" : "heart-outline"} 
              size={20} 
              color={isShopWantToGo ? "#fff" : SUSHI_COLORS.accent} 
            />
            <Text style={[
              styles.actionButtonText,
              !isShopWantToGo && { color: SUSHI_COLORS.accent }
            ]}>
              {isShopWantToGo ? '行きたいから削除' : '行きたい'}
            </Text>
          </Pressable>
        )}
        
        <Pressable 
          style={[
            styles.actionButton,
            isShopVisited ? styles.actionButtonActiveVisited : styles.actionButtonPrimary
          ]}
          onPress={handleToggleVisited}
        >
          <Ionicons 
            name={isShopVisited ? "close-circle-outline" : "checkmark-circle-outline"} 
            size={20} 
            color={isShopVisited ? SUSHI_COLORS.textMuted : "#fff"} 
          />
          <Text style={[
            styles.actionButtonText,
            isShopVisited && { color: SUSHI_COLORS.textMuted }
          ]}>
            {isShopVisited ? '訪問を取り消す' : '行った！'}
          </Text>
        </Pressable>
      </View>

      {/* Open in Maps button - at bottom */}
      <Pressable style={styles.mapsButton} onPress={handleOpenMaps}>
        <Ionicons name="map-outline" size={20} color={SUSHI_COLORS.primary} />
        <Text style={styles.mapsButtonText}>地図アプリで開く</Text>
      </Pressable>

      {/* Web search button */}
      <Pressable style={styles.webSearchButton} onPress={handleSearchWeb}>
        <Ionicons name="search-outline" size={20} color={SUSHI_COLORS.accentSecondary} />
        <Text style={styles.webSearchButtonText}>Webで検索</Text>
      </Pressable>

      {/* Exclude button */}
      <Pressable style={styles.excludeButton} onPress={handleToggleExclude}>
        <Ionicons 
          name={isShopExcluded ? "eye-outline" : "eye-off-outline"} 
          size={18} 
          color={isShopExcluded ? SUSHI_COLORS.accentSecondary : SUSHI_COLORS.textMuted} 
        />
        <Text style={[
          styles.excludeButtonText,
          isShopExcluded && { color: SUSHI_COLORS.accentSecondary }
        ]}>
          {isShopExcluded ? '除外を解除' : 'リストから除外'}
        </Text>
      </Pressable>

      {/* Delete button for custom shops */}
      {shop.isCustom && (
        <Pressable style={styles.deleteButton} onPress={handleDeleteCustomShop}>
          <Ionicons name="trash-outline" size={18} color={SUSHI_COLORS.error} />
          <Text style={styles.deleteButtonText}>このお店を削除</Text>
        </Pressable>
      )}

      <Text style={styles.source}>
        {shop.isCustom ? '自分で追加したお店' : 'データ: © OpenStreetMap contributors'}
      </Text>
    </View>
  );
}

const PHOTO_WIDTH = SCREEN_WIDTH - SPACING.xl * 2;
const MAIN_PHOTO_HEIGHT = 160;
const SUB_PHOTO_SIZE = (PHOTO_WIDTH - SPACING.sm * 2) / 3;

const styles = StyleSheet.create({
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.md,
    padding: SPACING.sm,
    zIndex: 10,
  },
  // Photo gallery styles
  photoGallery: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  mainPhotoSlot: {
    width: '100%',
    height: MAIN_PHOTO_HEIGHT,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  mainPhotoSlotFilled: {
    borderWidth: 0,
  },
  addPhotoPlaceholder: {
    flex: 1,
    backgroundColor: SUSHI_COLORS.primary + '08',
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: SUSHI_COLORS.primary + '30',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  addPhotoEmoji: {
    fontSize: 36,
    marginBottom: SPACING.sm,
  },
  addPhotoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SUSHI_COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  addPhotoSubtitle: {
    fontSize: 13,
    color: SUSHI_COLORS.textMuted,
  },
  subPhotoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  subPhotoSlot: {
    width: SUB_PHOTO_SIZE,
    height: SUB_PHOTO_SIZE,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  subPhotoSlotFilled: {
    borderWidth: 0,
  },
  subPhoto: {
    width: '100%',
    height: '100%',
  },
  addPhotoPlaceholderSmall: {
    flex: 1,
    backgroundColor: SUSHI_COLORS.primary + '10',
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: SUSHI_COLORS.primary + '30',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPhotoSlot: {
    flex: 1,
    backgroundColor: SUSHI_COLORS.surface,
    borderRadius: RADIUS.md,
    opacity: 0.5,
  },
  // Name section
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    width: '100%',
    paddingRight: 40, // Space for close button
  },
  emoji: {
    fontSize: 28,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: SUSHI_COLORS.textPrimary,
    flex: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    width: '100%',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SUSHI_COLORS.primary + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  tagCustom: {
    backgroundColor: SUSHI_COLORS.primary + '20',
  },
  tagVisited: {
    backgroundColor: SUSHI_COLORS.accentSecondary + '20',
  },
  tagWant: {
    backgroundColor: SUSHI_COLORS.accent + '20',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: SUSHI_COLORS.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: SUSHI_COLORS.textSecondary,
    flex: 1,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SUSHI_COLORS.primary + '15',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
    width: '100%',
  },
  mapsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: SUSHI_COLORS.primary,
  },
  webSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SUSHI_COLORS.accentSecondary + '15',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
    width: '100%',
  },
  webSearchButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: SUSHI_COLORS.accentSecondary,
  },
  section: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: SUSHI_COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  starContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  ratingHint: {
    fontSize: 13,
    color: SUSHI_COLORS.textMuted,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  // Celebration banner
  celebrationBanner: {
    width: '100%',
    backgroundColor: SUSHI_COLORS.accentSecondary + '15',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.accentSecondary + '30',
  },
  celebrationEmoji: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  celebrationText: {
    fontSize: 16,
    fontWeight: '700',
    color: SUSHI_COLORS.accentSecondary,
  },
  celebrationSubtext: {
    fontSize: 13,
    color: SUSHI_COLORS.textSecondary,
    marginTop: 2,
  },
  noteInput: {
    backgroundColor: SUSHI_COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    fontSize: 15,
    color: SUSHI_COLORS.textPrimary,
    minHeight: 80,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
  },
  actionButtons: {
    width: '100%',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  actionButtonPrimary: {
    backgroundColor: SUSHI_COLORS.accentSecondary,
  },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: SUSHI_COLORS.accent,
  },
  actionButtonActiveWant: {
    backgroundColor: SUSHI_COLORS.accent,
  },
  actionButtonActiveVisited: {
    backgroundColor: SUSHI_COLORS.surface,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  excludeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  excludeButtonText: {
    fontSize: 14,
    color: SUSHI_COLORS.textMuted,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  deleteButtonText: {
    fontSize: 14,
    color: SUSHI_COLORS.error,
  },
  source: {
    fontSize: 11,
    color: SUSHI_COLORS.textMuted,
    marginTop: SPACING.lg,
  },
});
