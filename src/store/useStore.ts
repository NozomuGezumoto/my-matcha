// ============================================
// My Sushi - State Management
// Using Zustand with AsyncStorage persistence
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VisitedShop {
  id: string;          // OSM ID
  visitedAt: string;   // ISO date string
  note?: string;       // Optional memo
  rating?: number;     // 1-5 stars (optional)
}

export interface WantToGoShop {
  id: string;          // OSM ID
  addedAt: string;     // ISO date string
  note?: string;       // Optional memo
  priority?: number;   // 1-3 priority (optional)
}

export interface ShopMemo {
  id: string;          // OSM ID
  note: string;        // User memo
  rating?: number;     // 1-5 stars
  photos?: string[];   // Array of photo URIs (max 4)
  updatedAt: string;   // ISO date string
}

export interface CustomShop {
  id: string;          // Custom ID (custom-{timestamp})
  name: string;
  type: 'restaurant' | 'fast_food' | 'seafood';
  lat: number;
  lng: number;
  address?: string;
  createdAt: string;
}

export type FilterMode = 'all' | 'wantToGo' | 'visited';
export type DistanceFilter = 'none' | '500m' | '1km' | '3km';
export type PrefectureFilter = string; // '' means all prefectures

interface StoreState {
  // Data
  visitedShops: VisitedShop[];
  wantToGoShops: WantToGoShop[];
  shopMemos: ShopMemo[];
  customShops: CustomShop[];
  excludedShops: string[]; // Array of excluded shop IDs
  
  // UI State
  filterMode: FilterMode;
  distanceFilter: DistanceFilter;
  prefectureFilter: PrefectureFilter;
  excludeKaiten: boolean;
  hideExcluded: boolean;
  
  // Filter Actions
  setFilterMode: (mode: FilterMode) => void;
  setDistanceFilter: (filter: DistanceFilter) => void;
  setPrefectureFilter: (filter: PrefectureFilter) => void;
  setExcludeKaiten: (value: boolean) => void;
  setHideExcluded: (value: boolean) => void;
  
  // Exclude Actions
  excludeShop: (id: string) => void;
  unexcludeShop: (id: string) => void;
  clearAllExcluded: () => void;
  isExcluded: (id: string) => boolean;
  
  // Visited Actions
  markAsVisited: (id: string, note?: string, rating?: number) => void;
  unmarkAsVisited: (id: string) => void;
  isVisited: (id: string) => boolean;
  getVisitedShop: (id: string) => VisitedShop | undefined;
  updateVisitedShop: (id: string, updates: Partial<VisitedShop>) => void;
  getVisitedCount: () => number;
  
  // Want to Go Actions
  addToWantToGo: (id: string, note?: string) => void;
  removeFromWantToGo: (id: string) => void;
  isWantToGo: (id: string) => boolean;
  getWantToGoShop: (id: string) => WantToGoShop | undefined;
  getWantToGoCount: () => number;
  
  // Move from want-to-go to visited
  moveToVisited: (id: string) => void;
  
  // Memo Actions
  setShopMemo: (id: string, note: string, rating?: number) => void;
  getShopMemo: (id: string) => ShopMemo | undefined;
  deleteShopMemo: (id: string) => void;
  
  // Photo Actions
  addShopPhoto: (id: string, photoUri: string) => void;
  removeShopPhoto: (id: string, photoUri: string) => void;
  getShopPhotos: (id: string) => string[];
  
  // Custom Shop Actions
  addCustomShop: (shop: Omit<CustomShop, 'id' | 'createdAt'>) => string;
  updateCustomShop: (id: string, updates: Partial<CustomShop>) => void;
  deleteCustomShop: (id: string) => void;
  getCustomShops: () => CustomShop[];
  isCustomShop: (id: string) => boolean;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      visitedShops: [],
      wantToGoShops: [],
      shopMemos: [],
      customShops: [],
      excludedShops: [],
      filterMode: 'all',
      distanceFilter: 'none',
      prefectureFilter: '',
      excludeKaiten: false,
      hideExcluded: false,
      
      // Filter Actions
      setFilterMode: (mode) => {
        set({ filterMode: mode });
      },
      
      setDistanceFilter: (filter) => {
        set({ distanceFilter: filter });
      },
      
      setPrefectureFilter: (filter) => {
        set({ prefectureFilter: filter });
      },
      
      setExcludeKaiten: (value) => {
        set({ excludeKaiten: value });
      },
      
      setHideExcluded: (value) => {
        set({ hideExcluded: value });
      },
      
      // ============================================
      // Exclude Actions
      // ============================================
      
      excludeShop: (id) => {
        set((state) => {
          if (state.excludedShops.includes(id)) return state;
          return { excludedShops: [...state.excludedShops, id] };
        });
      },
      
      unexcludeShop: (id) => {
        set((state) => ({
          excludedShops: state.excludedShops.filter((s) => s !== id),
        }));
      },
      
      clearAllExcluded: () => {
        set({ excludedShops: [] });
      },
      
      isExcluded: (id) => {
        return get().excludedShops.includes(id);
      },
      
      // ============================================
      // Visited Actions
      // ============================================
      
      markAsVisited: (id, note, rating) => {
        const existing = get().visitedShops.find((v) => v.id === id);
        if (existing) return;
        
        const newVisit: VisitedShop = {
          id,
          visitedAt: new Date().toISOString(),
          note,
          rating,
        };
        
        set((state) => ({
          visitedShops: [...state.visitedShops, newVisit],
          // Remove from want-to-go if exists
          wantToGoShops: state.wantToGoShops.filter((w) => w.id !== id),
        }));
      },
      
      unmarkAsVisited: (id) => {
        set((state) => ({
          visitedShops: state.visitedShops.filter((v) => v.id !== id),
        }));
      },
      
      isVisited: (id) => {
        return get().visitedShops.some((v) => v.id === id);
      },
      
      getVisitedShop: (id) => {
        return get().visitedShops.find((v) => v.id === id);
      },
      
      updateVisitedShop: (id, updates) => {
        set((state) => ({
          visitedShops: state.visitedShops.map((v) =>
            v.id === id ? { ...v, ...updates } : v
          ),
        }));
      },
      
      getVisitedCount: () => {
        return get().visitedShops.length;
      },
      
      // ============================================
      // Want to Go Actions
      // ============================================
      
      addToWantToGo: (id, note) => {
        const existing = get().wantToGoShops.find((w) => w.id === id);
        if (existing) return;
        
        // Don't add if already visited
        if (get().isVisited(id)) return;
        
        const newWant: WantToGoShop = {
          id,
          addedAt: new Date().toISOString(),
          note,
        };
        
        set((state) => ({
          wantToGoShops: [...state.wantToGoShops, newWant],
        }));
      },
      
      removeFromWantToGo: (id) => {
        set((state) => ({
          wantToGoShops: state.wantToGoShops.filter((w) => w.id !== id),
        }));
      },
      
      isWantToGo: (id) => {
        return get().wantToGoShops.some((w) => w.id === id);
      },
      
      getWantToGoShop: (id) => {
        return get().wantToGoShops.find((w) => w.id === id);
      },
      
      getWantToGoCount: () => {
        return get().wantToGoShops.length;
      },
      
      // Move from want-to-go to visited
      moveToVisited: (id) => {
        const wantToGo = get().getWantToGoShop(id);
        get().markAsVisited(id, wantToGo?.note);
      },
      
      // ============================================
      // Memo Actions
      // ============================================
      
      setShopMemo: (id, note, rating) => {
        set((state) => {
          const existing = state.shopMemos.find((m) => m.id === id);
          if (existing) {
            return {
              shopMemos: state.shopMemos.map((m) =>
                m.id === id 
                  ? { ...m, note, rating, updatedAt: new Date().toISOString() }
                  : m
              ),
            };
          }
          return {
            shopMemos: [
              ...state.shopMemos,
              { id, note, rating, updatedAt: new Date().toISOString() },
            ],
          };
        });
      },
      
      getShopMemo: (id) => {
        return get().shopMemos.find((m) => m.id === id);
      },
      
      deleteShopMemo: (id) => {
        set((state) => ({
          shopMemos: state.shopMemos.filter((m) => m.id !== id),
        }));
      },
      
      // ============================================
      // Photo Actions
      // ============================================
      
      addShopPhoto: (id, photoUri) => {
        set((state) => {
          const existing = state.shopMemos.find((m) => m.id === id);
          if (existing) {
            const photos = existing.photos || [];
            if (photos.length >= 4) return state; // Max 4 photos
            return {
              shopMemos: state.shopMemos.map((m) =>
                m.id === id
                  ? { ...m, photos: [...photos, photoUri], updatedAt: new Date().toISOString() }
                  : m
              ),
            };
          }
          // Create new memo with photo
          return {
            shopMemos: [
              ...state.shopMemos,
              { id, note: '', photos: [photoUri], updatedAt: new Date().toISOString() },
            ],
          };
        });
      },
      
      removeShopPhoto: (id, photoUri) => {
        set((state) => ({
          shopMemos: state.shopMemos.map((m) =>
            m.id === id
              ? { ...m, photos: (m.photos || []).filter((p) => p !== photoUri), updatedAt: new Date().toISOString() }
              : m
          ),
        }));
      },
      
      getShopPhotos: (id) => {
        const memo = get().shopMemos.find((m) => m.id === id);
        return memo?.photos || [];
      },
      
      // ============================================
      // Custom Shop Actions
      // ============================================
      
      addCustomShop: (shop) => {
        const id = `custom-${Date.now()}`;
        set((state) => ({
          customShops: [
            ...state.customShops,
            { ...shop, id, createdAt: new Date().toISOString() },
          ],
        }));
        return id;
      },
      
      updateCustomShop: (id, updates) => {
        set((state) => ({
          customShops: state.customShops.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },
      
      deleteCustomShop: (id) => {
        set((state) => ({
          customShops: state.customShops.filter((s) => s.id !== id),
          // Also remove related data
          visitedShops: state.visitedShops.filter((v) => v.id !== id),
          wantToGoShops: state.wantToGoShops.filter((w) => w.id !== id),
          shopMemos: state.shopMemos.filter((m) => m.id !== id),
        }));
      },
      
      getCustomShops: () => get().customShops,
      
      isCustomShop: (id) => id.startsWith('custom-'),
    }),
    {
      name: 'my-sushi-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        visitedShops: state.visitedShops,
        wantToGoShops: state.wantToGoShops,
        shopMemos: state.shopMemos,
        customShops: state.customShops,
        excludedShops: state.excludedShops,
      }),
    }
  )
);
