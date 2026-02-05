// ============================================
// Add Custom Shop Modal
// Allows users to add shops not in OSM data
// ============================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SUSHI_COLORS, SPACING, RADIUS } from '../constants/theme';
import { useStore } from '../store/useStore';

interface AddShopModalProps {
  visible: boolean;
  onClose: () => void;
  initialLocation?: { lat: number; lng: number };
  onSuccess?: (shopId: string) => void;
}

type ShopType = 'restaurant' | 'fast_food' | 'seafood';

const SHOP_TYPES: { value: ShopType; label: string; emoji: string }[] = [
  { value: 'restaurant', label: '寿司店', emoji: '🍣' },
  { value: 'fast_food', label: '回転寿司', emoji: '🔄' },
  { value: 'seafood', label: '鮮魚店', emoji: '🐟' },
];

export default function AddShopModal({
  visible,
  onClose,
  initialLocation,
  onSuccess,
}: AddShopModalProps) {
  const addCustomShop = useStore((state) => state.addCustomShop);

  const [name, setName] = useState('');
  const [type, setType] = useState<ShopType>('restaurant');
  const [address, setAddress] = useState('');

  // Reset form when modal opens with new location
  useEffect(() => {
    if (visible) {
      setName('');
      setType('restaurant');
      setAddress('');
    }
  }, [visible]);

  const resetForm = useCallback(() => {
    setName('');
    setType('restaurant');
    setAddress('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = useCallback(() => {
    // Validation
    if (!name.trim()) {
      Alert.alert('エラー', '店名を入力してください');
      return;
    }

    if (!initialLocation) {
      Alert.alert('エラー', '場所が選択されていません');
      return;
    }

    // Add shop
    const shopId = addCustomShop({
      name: name.trim(),
      type,
      lat: initialLocation.lat,
      lng: initialLocation.lng,
      address: address.trim() || undefined,
    });

    Alert.alert(
      '登録完了',
      `「${name.trim()}」を追加しました`,
      [
        {
          text: 'OK',
          onPress: () => {
            handleClose();
            onSuccess?.(shopId);
          },
        },
      ]
    );
  }, [name, type, initialLocation, address, addCustomShop, handleClose, onSuccess]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>お店を追加</Text>
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={24} color={SUSHI_COLORS.textMuted} />
              </Pressable>
            </View>

            {/* Selected location display */}
            {initialLocation && (
              <View style={styles.locationDisplay}>
                <Ionicons name="location" size={20} color={SUSHI_COLORS.primary} />
                <Text style={styles.locationText}>
                  {initialLocation.lat.toFixed(6)}, {initialLocation.lng.toFixed(6)}
                </Text>
              </View>
            )}

            {/* Shop Name */}
            <View style={styles.field}>
              <Text style={styles.label}>店名 *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="例: すし処 〇〇"
                placeholderTextColor={SUSHI_COLORS.textMuted}
              />
            </View>

            {/* Shop Type */}
            <View style={styles.field}>
              <Text style={styles.label}>種類</Text>
              <View style={styles.typeSelector}>
                {SHOP_TYPES.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.typeOption,
                      type === option.value && styles.typeOptionActive,
                    ]}
                    onPress={() => setType(option.value)}
                  >
                    <Text style={styles.typeEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.typeLabel,
                        type === option.value && styles.typeLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Address */}
            <View style={styles.field}>
              <Text style={styles.label}>住所（任意）</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="例: 東京都渋谷区..."
                placeholderTextColor={SUSHI_COLORS.textMuted}
              />
            </View>

            {/* Submit button */}
            <Pressable style={styles.submitButton} onPress={handleSubmit}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>お店を追加</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    backgroundColor: SUSHI_COLORS.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: SUSHI_COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.sm,
    marginRight: -SPACING.sm,
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SUSHI_COLORS.primary + '10',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  locationText: {
    fontSize: 14,
    color: SUSHI_COLORS.primary,
    fontWeight: '500',
  },
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: SUSHI_COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  hint: {
    fontSize: 12,
    color: SUSHI_COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: SUSHI_COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    fontSize: 16,
    color: SUSHI_COLORS.textPrimary,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: SUSHI_COLORS.surface,
    borderWidth: 2,
    borderColor: SUSHI_COLORS.border,
  },
  typeOptionActive: {
    borderColor: SUSHI_COLORS.primary,
    backgroundColor: SUSHI_COLORS.primary + '10',
  },
  typeEmoji: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SUSHI_COLORS.textMuted,
  },
  typeLabelActive: {
    color: SUSHI_COLORS.primary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SUSHI_COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
