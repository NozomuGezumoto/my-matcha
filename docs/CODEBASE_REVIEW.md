# My Macha ソフト全体レビュー

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| アプリ名 | My Macha（抹茶スポット地図） |
| 技術 | Expo SDK 54, React Native, expo-router, Zustand, react-native-maps |
| プラットフォーム | iOS / Android / Web |
| 現状 | **抹茶（Matcha）** のみルートから利用可能。ビール・寿司は未接続。 |

---

## 2. ディレクトリ構成

```
app/                    # Expo Router 画面
  _layout.tsx           # ルート: GestureHandlerRootView, Stack, (tabs)
  (tabs)/
    _layout.tsx         # タブ: Stack, index のみ
    index.tsx           # ネイティブ → MatchaMap
    index.web.tsx       # Web → MatchaMapWeb

src/
  components/           # 画面・UI コンポーネント
  data/                 # GeoJSON 読み込み・ピン変換
  store/                # Zustand 永続化ストア
  types/                # 型定義
  constants/            # テーマ・地図定数
```

---

## 3. 技術スタック・エントリ

- **エントリ:** `expo-router/entry` → `app/_layout.tsx` → `(tabs)` → `index` / `index.web`
- **状態:** Zustand + persist (AsyncStorage) — **Matcha 用のみ実装**
- **地図:** react-native-maps + react-native-map-clustering（**Web では index.web で MatchaMapWeb に差し替え**）
- **UI:** BottomSheet, Ionicons, Pressable など

---

## 4. 現状の一貫性

### 抹茶（Matcha）— 実装済み・接続済み

- `app/(tabs)/index.tsx` → `MatchaMap`
- `app/(tabs)/index.web.tsx` → `MatchaMapWeb`（Web 用）
- `src/store/useStore.ts` に **Matcha 専用** の state/actions（tried, wantToTry, custom, excluded, memo, filter など）
- `src/types/index.ts` に **Matcha 専用** の型（MatchaPin, MatchaSpot, MatchaGeoJSON など）
- `src/data/matchaData.ts` で `japan_matcha.json` を読みピン生成
- 地図・一覧・詳細・追加モーダルまで一通り接続されている

### ビール（Beer）・寿司（Sushi）— 型・ストア未整備・ルート未接続

- **ルート:** `BeerMap` / `SushiMap` などへのルートが **一つもない**（`(tabs)` は index のみ）
- **型:** `BreweryPin`, `BreweryGeoJSON`, `SushiPin`, `SushiGeoJSON` などを `src/types/index.ts` が **export していない**
- **ストア:** `customBreweries`, `triedBreweries`, `addCustomBrewery`, `deleteCustomBrewery` など **存在しない**（Matcha のみ）
- **データ:** `breweryData.ts` / `sushiData.ts` は `../types` と `../store` から上記を import しており、**型・ストアがないとビルドエラーになる**
- **結論:** ビール・寿司は「コンポーネントとデータ層はあるが、型・ストア・ルートが未整備」な状態。現状は **抹茶だけが動く構成**。

---

## 5. 問題・不整合一覧

| 内容 | 重要度 | 対応案 |
|------|--------|--------|
| 型: Brewery/Sushi が `src/types` にない | 高 | 型を `src/types/index.ts` に追加（後述で実施） |
| ストア: Beer/Sushi 用 state・actions がない | 高 | 使うなら useStore に brewery/sushi スライスを追加 |
| ルート: Beer/Sushi 画面がどこからも開けない | 中 | タブやスタックで BeerMap/SushiMap を追加するか、使わないなら削除 |
| package.json の `"name": "my-sushi"` と app 名 "My Macha" が不一致 | 低 | 必要なら `"name": "my-macha"` に統一 |
| テーマ名が BEER_COLORS / SUSHI_COLORS のまま | 低 | そのままでも可。必要なら MATCHA_COLORS にリネーム |
| tsconfig の `@/*` が未使用 | 低 | 使うなら `@/` → `src/` などに変更、使わないなら削除可 |
| `tokyo_sushi.json` が未使用 | 低 | 使うなら sushiData で読み込む、不要なら削除 |
| app.json の Google Maps API Key がプレースホルダー | 設定 | 実機で地図を使う場合は本番キーに差し替え |

---

## 6. 推奨アクション

1. **今のアプリを「抹茶だけ」として運用する**
   - そのまま利用可能。上記の型だけ追加すれば、ビール・寿司の **コードはビルド可能** になる（表示はされない）。
2. **ビール・寿司も使う**
   - `src/types/index.ts` に Brewery/Sushi 型を追加（実施済み想定）
   - `src/store/useStore.ts` に brewery/sushi 用の state と actions を追加
   - `app/(tabs)/_layout.tsx` でタブを増やすか、別スタックで BeerMap / SushiMap を表示するルートを追加
3. **ビール・寿司を捨てる**
   - BeerMap, BreweryDetail, AddBreweryModal, SushiMap, ShopDetail, AddShopModal, SushiList および関連 data を削除し、types からも Brewery/Sushi を削除

---

## 7. 設定ファイルメモ

- **package.json:** `main: "expo-router/entry"`, scripts: start, android, ios, web, tunnel, start:lan, web:clear（postinstall は外している想定）
- **app.json:** name "My Macha", slug "my-macha", scheme "mymacha", expo-router プラグイン, typedRoutes
- **tsconfig:** `expo/tsconfig.base` 継承, `@/*` → `./*`（未使用）

---

*最終更新: プロジェクト全体見直し時*
