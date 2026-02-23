// ============================================
// Add Custom Matcha Spot Modal
// データにない抹茶スポットを追加
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
import { BEER_COLORS, SPACING, RADIUS } from '../constants/theme';
import { useStore } from '../store/useStore';
import type { MatchaPin } from '../types';

interface AddMatchaModalProps {
  visible: boolean;
  onClose: () => void;
  initialLocation?: { lat: number; lng: number };
  onSuccess?: (spotId: string) => void;
}

type MatchaSpotType = MatchaPin['type'];

const MATCHA_TYPES: { value: MatchaSpotType; label: string; emoji: string }[] = [
  { value: 'cafe', label: '抹茶カフェ', emoji: '🍵' },
  { value: 'tea_house', label: '茶房・茶室', emoji: '🏯' },
  { value: 'shop', label: '販売・工房', emoji: '🛒' },
];

export default function AddMatchaModal({
  visible,
  onClose,
  initialLocation,
  onSuccess,
}: AddMatchaModalProps) {
  const addCustomMatchaSpot = useStore((state) => state.addCustomMatchaSpot);

  const [name, setName] = useState('');
  const [type, setType] = useState<MatchaSpotType>('cafe');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
      setType('cafe');
      setAddress('');
    }
  }, [visible]);

  const resetForm = useCallback(() => {
    setName('');
    setType('cafe');
    setAddress('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('エラー', 'スポット名を入力してください');
      return;
    }
    if (!initialLocation) {
      Alert.alert('エラー', '場所が選択されていません');
      return;
    }
    const spotId = addCustomMatchaSpot({
      name: name.trim(),
      type,
      lat: initialLocation.lat,
      lng: initialLocation.lng,
      address: address.trim() || undefined,
    });
    Alert.alert('登録完了', `「${name.trim()}」を追加しました`, [
      { text: 'OK', onPress: () => { handleClose(); onSuccess?.(spotId); } },
    ]);
  }, [name, type, initialLocation, address, addCustomMatchaSpot, handleClose, onSuccess]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>抹茶スポットを追加</Text>
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={24} color={BEER_COLORS.textMuted} />
              </Pressable>
            </View>
            {initialLocation && (
              <View style={styles.locationDisplay}>
                <Ionicons name="location" size={20} color={BEER_COLORS.primary} />
                <Text style={styles.locationText}>
                  {initialLocation.lat.toFixed(6)}, {initialLocation.lng.toFixed(6)}
                </Text>
              </View>
            )}
            <View style={styles.field}>
              <Text style={styles.label}>スポット名 *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="例: ○○茶房"
                placeholderTextColor={BEER_COLORS.textMuted}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>種類</Text>
              <View style={styles.typeSelector}>
                {MATCHA_TYPES.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[styles.typeOption, type === option.value && styles.typeOptionActive]}
                    onPress={() => setType(option.value)}
                  >
                    <Text style={styles.typeEmoji}>{option.emoji}</Text>
                    <Text style={[styles.typeLabel, type === option.value && styles.typeLabelActive]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>住所（任意）</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="例: 京都府宇治市..."
                placeholderTextColor={BEER_COLORS.textMuted}
              />
            </View>
            <Pressable style={styles.submitButton} onPress={handleSubmit}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>スポットを追加</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  container: { backgroundColor: BEER_COLORS.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  title: { fontSize: 22, fontWeight: '700', color: BEER_COLORS.textPrimary },
  closeButton: { padding: SPACING.sm, marginRight: -SPACING.sm },
  locationDisplay: { flexDirection: 'row', alignItems: 'center', backgroundColor: BEER_COLORS.primary + '10', padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.lg, gap: SPACING.sm },
  locationText: { fontSize: 14, color: BEER_COLORS.primary, fontWeight: '500' },
  field: { marginBottom: SPACING.lg },
  label: { fontSize: 14, fontWeight: '600', color: BEER_COLORS.textSecondary, marginBottom: SPACING.sm },
  input: { backgroundColor: BEER_COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, fontSize: 16, color: BEER_COLORS.textPrimary, borderWidth: 1, borderColor: BEER_COLORS.border },
  typeSelector: { flexDirection: 'row', gap: SPACING.sm },
  typeOption: { flex: 1, alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: BEER_COLORS.surface, borderWidth: 2, borderColor: BEER_COLORS.border },
  typeOptionActive: { borderColor: BEER_COLORS.primary, backgroundColor: BEER_COLORS.primary + '10' },
  typeEmoji: { fontSize: 24, marginBottom: SPACING.xs },
  typeLabel: { fontSize: 12, fontWeight: '600', color: BEER_COLORS.textMuted },
  typeLabelActive: { color: BEER_COLORS.primary },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BEER_COLORS.primary, paddingVertical: SPACING.md, borderRadius: RADIUS.lg, gap: SPACING.sm, marginTop: SPACING.md, marginBottom: SPACING.xl },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
