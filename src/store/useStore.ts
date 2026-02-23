// ============================================
// My Macha (抹茶) - State Management
// ごちそうさまでした / 飲んでみたい = チェックで記録
// Matcha 実装済み。Brewery / Sushi は未ルート接続だが型・state は用意。
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomBrewery, CustomShop } from '../types';

export type MatchaSpotPinType = 'cafe' | 'tea_house' | 'shop';

export interface TriedMatchaSpot {
  id: string;
  triedAt: string;
}

export interface MatchaSpotMemo {
  id: string;
  note: string;
  rating?: number;
  photos?: string[];
  updatedAt: string;
}

export interface CustomMatchaSpot {
  id: string;
  name: string;
  type: MatchaSpotPinType;
  lat: number;
  lng: number;
  address?: string;
  createdAt: string;
}

// Brewery memo/photo (same shape as Matcha for reuse)
interface BreweryMemo {
  id: string;
  note: string;
  rating?: number;
  photos?: string[];
  updatedAt: string;
}

interface ShopMemo {
  id: string;
  note: string;
  rating?: number;
  photos?: string[];
  updatedAt: string;
}

export type FilterMode = 'all' | 'tried' | 'wantToTry';
export type PrefectureFilter = string;

interface StoreState {
  // ---- Matcha ----
  triedMatchaSpots: TriedMatchaSpot[];
  wantToTryMatchaSpots: string[];
  matchaSpotMemos: MatchaSpotMemo[];
  customMatchaSpots: CustomMatchaSpot[];
  excludedMatchaSpots: string[];

  filterMode: FilterMode;
  prefectureFilter: PrefectureFilter;
  hideExcluded: boolean;

  setFilterMode: (mode: FilterMode) => void;
  setPrefectureFilter: (filter: PrefectureFilter) => void;
  setHideExcluded: (value: boolean) => void;

  excludeMatchaSpot: (id: string) => void;
  unexcludeMatchaSpot: (id: string) => void;
  clearAllExcluded: () => void;
  isExcluded: (id: string) => boolean;

  markAsTried: (id: string) => void;
  unmarkAsTried: (id: string) => void;
  isTried: (id: string) => boolean;
  getTriedCount: () => number;

  markAsWantToTry: (id: string) => void;
  unmarkAsWantToTry: (id: string) => void;
  isWantToTry: (id: string) => boolean;
  getWantToTryCount: () => number;

  setMatchaSpotMemo: (id: string, note: string, rating?: number) => void;
  getMatchaSpotMemo: (id: string) => MatchaSpotMemo | undefined;

  addMatchaSpotPhoto: (id: string, photoUri: string) => void;
  removeMatchaSpotPhoto: (id: string, photoUri: string) => void;
  getMatchaSpotPhotos: (id: string) => string[];

  addCustomMatchaSpot: (spot: Omit<CustomMatchaSpot, 'id' | 'createdAt'>) => string;
  updateCustomMatchaSpot: (id: string, updates: Partial<CustomMatchaSpot>) => void;
  deleteCustomMatchaSpot: (id: string) => void;
  getCustomMatchaSpots: () => CustomMatchaSpot[];
  isCustomMatchaSpot: (id: string) => boolean;

  // ---- Brewery (地ビール) ----
  customBreweries: CustomBrewery[];
  triedBreweries: { id: string; triedAt: string }[];
  excludedBreweries: string[];
  breweryMemos: BreweryMemo[];

  getBreweryMemo: (id: string) => BreweryMemo | undefined;
  setBreweryMemo: (id: string, note: string, rating?: number) => void;
  addBreweryPhoto: (id: string, photoUri: string) => void;
  removeBreweryPhoto: (id: string, photoUri: string) => void;
  getBreweryPhotos: (id: string) => string[];
  addCustomBrewery: (brewery: Omit<CustomBrewery, 'id' | 'createdAt'>) => string;
  deleteCustomBrewery: (id: string) => void;
  excludeBrewery: (id: string) => void;
  unexcludeBrewery: (id: string) => void;

  markAsTriedBrewery: (id: string) => void;
  unmarkAsTriedBrewery: (id: string) => void;
  isTriedBrewery: (id: string) => boolean;
  getBreweryTriedCount: () => number;

  // ---- Sushi ----
  customShops: CustomShop[];
  visitedShops: { id: string; visitedAt: string }[];
  wantToGoShops: string[];
  excludedShops: string[];
  shopMemos: ShopMemo[];
  distanceFilter: number;
  excludeKaiten: boolean;

  setDistanceFilter: (km: number) => void;
  setExcludeKaiten: (value: boolean) => void;
  getShopMemo: (id: string) => ShopMemo | undefined;
  setShopMemo: (id: string, note: string, rating?: number) => void;
  addShopPhoto: (id: string, photoUri: string) => void;
  removeShopPhoto: (id: string, photoUri: string) => void;
  getShopPhotos: (id: string) => string[];
  markAsVisited: (id: string) => void;
  unmarkAsVisited: (id: string) => void;
  isVisited: (id: string) => boolean;
  addToWantToGo: (id: string) => void;
  removeFromWantToGo: (id: string) => void;
  isWantToGo: (id: string) => boolean;
  addCustomShop: (shop: Omit<CustomShop, 'id' | 'createdAt'>) => string;
  deleteCustomShop: (id: string) => void;
  excludeShop: (id: string) => void;
  unexcludeShop: (id: string) => void;
  getVisitedCount: () => number;
  getWantToGoCount: () => number;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      triedMatchaSpots: [],
      wantToTryMatchaSpots: [],
      matchaSpotMemos: [],
      customMatchaSpots: [],
      excludedMatchaSpots: [],
      filterMode: 'all',
      prefectureFilter: '',
      hideExcluded: false,

      setFilterMode: (mode) => set({ filterMode: mode }),
      setPrefectureFilter: (filter) => set({ prefectureFilter: filter }),
      setHideExcluded: (value) => set({ hideExcluded: value }),

      excludeMatchaSpot: (id) => {
        set((state) => {
          if (state.excludedMatchaSpots.includes(id)) return state;
          return { excludedMatchaSpots: [...state.excludedMatchaSpots, id] };
        });
      },
      unexcludeMatchaSpot: (id) => {
        set((state) => ({
          excludedMatchaSpots: state.excludedMatchaSpots.filter((s) => s !== id),
        }));
      },
      clearAllExcluded: () => set({
        excludedMatchaSpots: [],
        excludedBreweries: [],
        excludedShops: [],
      }),
      isExcluded: (id) =>
        get().excludedMatchaSpots.includes(id) ||
        get().excludedBreweries.includes(id) ||
        get().excludedShops.includes(id),

      markAsTried: (id) => {
        if (get().triedMatchaSpots.some((t) => t.id === id)) return;
        set((state) => ({
          triedMatchaSpots: [...state.triedMatchaSpots, { id, triedAt: new Date().toISOString() }],
        }));
      },
      unmarkAsTried: (id) => {
        set((state) => ({
          triedMatchaSpots: state.triedMatchaSpots.filter((t) => t.id !== id),
        }));
      },
      isTried: (id) => get().triedMatchaSpots.some((t) => t.id === id),
      getTriedCount: () => get().triedMatchaSpots.length,

      markAsWantToTry: (id) => {
        if (get().wantToTryMatchaSpots.includes(id)) return;
        set((state) => ({ wantToTryMatchaSpots: [...state.wantToTryMatchaSpots, id] }));
      },
      unmarkAsWantToTry: (id) => {
        set((state) => ({
          wantToTryMatchaSpots: state.wantToTryMatchaSpots.filter((s) => s !== id),
        }));
      },
      isWantToTry: (id) => get().wantToTryMatchaSpots.includes(id),
      getWantToTryCount: () => get().wantToTryMatchaSpots.length,

      setMatchaSpotMemo: (id, note, rating) => {
        set((state) => {
          const existing = state.matchaSpotMemos.find((m) => m.id === id);
          if (existing) {
            return {
              matchaSpotMemos: state.matchaSpotMemos.map((m) =>
                m.id === id ? { ...m, note, rating, updatedAt: new Date().toISOString() } : m
              ),
            };
          }
          return {
            matchaSpotMemos: [...state.matchaSpotMemos, { id, note, rating, updatedAt: new Date().toISOString() }],
          };
        });
      },
      getMatchaSpotMemo: (id) => get().matchaSpotMemos.find((m) => m.id === id),

      addMatchaSpotPhoto: (id, photoUri) => {
        set((state) => {
          const existing = state.matchaSpotMemos.find((m) => m.id === id);
          const photos = existing?.photos || [];
          if (photos.length >= 4) return state;
          if (existing) {
            return {
              matchaSpotMemos: state.matchaSpotMemos.map((m) =>
                m.id === id ? { ...m, photos: [...photos, photoUri], updatedAt: new Date().toISOString() } : m
              ),
            };
          }
          return {
            matchaSpotMemos: [...state.matchaSpotMemos, { id, note: '', photos: [photoUri], updatedAt: new Date().toISOString() }],
          };
        });
      },
      removeMatchaSpotPhoto: (id, photoUri) => {
        set((state) => ({
          matchaSpotMemos: state.matchaSpotMemos.map((m) =>
            m.id === id ? { ...m, photos: (m.photos || []).filter((p) => p !== photoUri), updatedAt: new Date().toISOString() } : m
          ),
        }));
      },
      getMatchaSpotPhotos: (id) => {
        const memo = get().matchaSpotMemos.find((m) => m.id === id);
        return memo?.photos || [];
      },

      addCustomMatchaSpot: (spot) => {
        const id = `custom-${Date.now()}`;
        set((state) => ({
          customMatchaSpots: [...state.customMatchaSpots, { ...spot, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },
      updateCustomMatchaSpot: (id, updates) => {
        set((state) => ({
          customMatchaSpots: state.customMatchaSpots.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }));
      },
      deleteCustomMatchaSpot: (id) => {
        set((state) => ({
          customMatchaSpots: state.customMatchaSpots.filter((s) => s.id !== id),
          triedMatchaSpots: state.triedMatchaSpots.filter((t) => t.id !== id),
          wantToTryMatchaSpots: state.wantToTryMatchaSpots.filter((s) => s !== id),
          matchaSpotMemos: state.matchaSpotMemos.filter((m) => m.id !== id),
        }));
      },
      getCustomMatchaSpots: () => get().customMatchaSpots,
      isCustomMatchaSpot: (id) => id.startsWith('custom-'),

      // ---- Brewery ----
      customBreweries: [],
      triedBreweries: [],
      excludedBreweries: [],
      breweryMemos: [],

      getBreweryMemo: (id) => get().breweryMemos.find((m) => m.id === id),
      setBreweryMemo: (id, note, rating) => {
        set((state) => {
          const existing = state.breweryMemos.find((m) => m.id === id);
          const next = { id, note, rating, updatedAt: new Date().toISOString() };
          if (existing) {
            return { breweryMemos: state.breweryMemos.map((m) => (m.id === id ? { ...m, ...next } : m)) };
          }
          return { breweryMemos: [...state.breweryMemos, { ...next, photos: [] }] };
        });
      },
      addBreweryPhoto: (id, photoUri) => {
        set((state) => {
          const existing = state.breweryMemos.find((m) => m.id === id);
          const photos = existing?.photos || [];
          if (photos.length >= 4) return state;
          const next = existing ? { ...existing, photos: [...photos, photoUri], updatedAt: new Date().toISOString() } : { id, note: '', photos: [photoUri], updatedAt: new Date().toISOString() };
          if (existing) return { breweryMemos: state.breweryMemos.map((m) => (m.id === id ? next : m)) };
          return { breweryMemos: [...state.breweryMemos, next] };
        });
      },
      removeBreweryPhoto: (id, photoUri) => {
        set((state) => ({
          breweryMemos: state.breweryMemos.map((m) =>
            m.id === id ? { ...m, photos: (m.photos || []).filter((p) => p !== photoUri), updatedAt: new Date().toISOString() } : m
          ),
        }));
      },
      getBreweryPhotos: (id) => get().breweryMemos.find((m) => m.id === id)?.photos || [],
      addCustomBrewery: (brewery) => {
        const id = `custom-brewery-${Date.now()}`;
        set((state) => ({
          customBreweries: [...state.customBreweries, { ...brewery, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },
      deleteCustomBrewery: (id) => {
        set((state) => ({
          customBreweries: state.customBreweries.filter((s) => s.id !== id),
          triedBreweries: state.triedBreweries.filter((t) => t.id !== id),
          breweryMemos: state.breweryMemos.filter((m) => m.id !== id),
          excludedBreweries: state.excludedBreweries.filter((e) => e !== id),
        }));
      },
      excludeBrewery: (id) => {
        set((state) => (state.excludedBreweries.includes(id) ? state : { excludedBreweries: [...state.excludedBreweries, id] }));
      },
      unexcludeBrewery: (id) => {
        set((state) => ({ excludedBreweries: state.excludedBreweries.filter((s) => s !== id) }));
      },

      markAsTriedBrewery: (id) => {
        if (get().triedBreweries.some((t) => t.id === id)) return;
        set((state) => ({ triedBreweries: [...state.triedBreweries, { id, triedAt: new Date().toISOString() }] }));
      },
      unmarkAsTriedBrewery: (id) => {
        set((state) => ({ triedBreweries: state.triedBreweries.filter((t) => t.id !== id) }));
      },
      isTriedBrewery: (id) => get().triedBreweries.some((t) => t.id === id),
      getBreweryTriedCount: () => get().triedBreweries.length,

      // ---- Sushi ----
      customShops: [],
      visitedShops: [],
      wantToGoShops: [],
      excludedShops: [],
      shopMemos: [],
      distanceFilter: 0,
      excludeKaiten: false,

      setDistanceFilter: (km) => set({ distanceFilter: km }),
      setExcludeKaiten: (value) => set({ excludeKaiten: value }),
      getShopMemo: (id) => get().shopMemos.find((m) => m.id === id),
      setShopMemo: (id, note, rating) => {
        set((state) => {
          const existing = state.shopMemos.find((m) => m.id === id);
          const next = { id, note, rating, updatedAt: new Date().toISOString() };
          if (existing) {
            return { shopMemos: state.shopMemos.map((m) => (m.id === id ? { ...m, ...next } : m)) };
          }
          return { shopMemos: [...state.shopMemos, { ...next, photos: [] }] };
        });
      },
      addShopPhoto: (id, photoUri) => {
        set((state) => {
          const existing = state.shopMemos.find((m) => m.id === id);
          const photos = existing?.photos || [];
          if (photos.length >= 4) return state;
          const next = existing ? { ...existing, photos: [...photos, photoUri], updatedAt: new Date().toISOString() } : { id, note: '', photos: [photoUri], updatedAt: new Date().toISOString() };
          if (existing) return { shopMemos: state.shopMemos.map((m) => (m.id === id ? next : m)) };
          return { shopMemos: [...state.shopMemos, next] };
        });
      },
      removeShopPhoto: (id, photoUri) => {
        set((state) => ({
          shopMemos: state.shopMemos.map((m) =>
            m.id === id ? { ...m, photos: (m.photos || []).filter((p) => p !== photoUri), updatedAt: new Date().toISOString() } : m
          ),
        }));
      },
      getShopPhotos: (id) => get().shopMemos.find((m) => m.id === id)?.photos || [],
      markAsVisited: (id) => {
        if (get().visitedShops.some((t) => t.id === id)) return;
        set((state) => ({ visitedShops: [...state.visitedShops, { id, visitedAt: new Date().toISOString() }] }));
      },
      unmarkAsVisited: (id) => {
        set((state) => ({ visitedShops: state.visitedShops.filter((t) => t.id !== id) }));
      },
      isVisited: (id) => get().visitedShops.some((t) => t.id === id),
      addToWantToGo: (id) => {
        if (get().wantToGoShops.includes(id)) return;
        set((state) => ({ wantToGoShops: [...state.wantToGoShops, id] }));
      },
      removeFromWantToGo: (id) => {
        set((state) => ({ wantToGoShops: state.wantToGoShops.filter((s) => s !== id) }));
      },
      isWantToGo: (id) => get().wantToGoShops.includes(id),
      addCustomShop: (shop) => {
        const id = `custom-shop-${Date.now()}`;
        set((state) => ({
          customShops: [...state.customShops, { ...shop, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },
      deleteCustomShop: (id) => {
        set((state) => ({
          customShops: state.customShops.filter((s) => s.id !== id),
          visitedShops: state.visitedShops.filter((t) => t.id !== id),
          wantToGoShops: state.wantToGoShops.filter((s) => s !== id),
          shopMemos: state.shopMemos.filter((m) => m.id !== id),
          excludedShops: state.excludedShops.filter((e) => e !== id),
        }));
      },
      excludeShop: (id) => {
        set((state) => (state.excludedShops.includes(id) ? state : { excludedShops: [...state.excludedShops, id] }));
      },
      unexcludeShop: (id) => {
        set((state) => ({ excludedShops: state.excludedShops.filter((s) => s !== id) }));
      },
      getVisitedCount: () => get().visitedShops.length,
      getWantToGoCount: () => get().wantToGoShops.length,
    }),
    {
      name: 'my-macha-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        triedMatchaSpots: state.triedMatchaSpots,
        wantToTryMatchaSpots: state.wantToTryMatchaSpots,
        matchaSpotMemos: state.matchaSpotMemos,
        customMatchaSpots: state.customMatchaSpots,
        excludedMatchaSpots: state.excludedMatchaSpots,
        customBreweries: state.customBreweries,
        triedBreweries: state.triedBreweries,
        excludedBreweries: state.excludedBreweries,
        breweryMemos: state.breweryMemos,
        customShops: state.customShops,
        visitedShops: state.visitedShops,
        wantToGoShops: state.wantToGoShops,
        excludedShops: state.excludedShops,
        shopMemos: state.shopMemos,
        distanceFilter: state.distanceFilter,
        excludeKaiten: state.excludeKaiten,
      }),
    }
  )
);
