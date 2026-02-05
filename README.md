# Project My Sushi 🍣

OSM (OpenStreetMap) から日本全国の寿司店データを抽出し、GeoJSON として出力するツールです。  
React Native の地図アプリなどで使用できる形式で出力します。

## 成果物

- `data/out/sushi_japan.geojson` - 日本全国の寿司店データ（Point形式）

## 必要な環境

- Windows 10/11
- [Anaconda](https://www.anaconda.com/download) または [Miniconda](https://docs.conda.io/en/latest/miniconda.html)
- PowerShell 5.1 以上

## 環境構築

### 1. Conda 環境の作成

```powershell
# プロジェクトのルートディレクトリで実行
conda env create -f environment.yml

# 環境を有効化
conda activate sushi-osm
```

### 2. Python パッケージのインストール（Conda経由でうまくいかない場合）

```powershell
# sushi-osm 環境を有効化した状態で
pip install osmium shapely
```

### 3. osmium-tool の確認

```powershell
osmium --version
# libosmium version X.X.X と表示されればOK
```

## 実行方法

### 基本的な実行（日本全国）

```powershell
# Conda環境を有効化
conda activate sushi-osm

# スクリプト実行（PBFダウンロード〜抽出まで自動実行）
.\scripts\fetch_and_extract_sushi.ps1
```

### テストモード（東京のみ・高速）

初回は関東のPBF（約500MB）をダウンロードします。

```powershell
.\scripts\fetch_and_extract_sushi.ps1 -TestMode
```

### 特定の都道府県のみ抽出

```powershell
# 東京都のみ
.\scripts\fetch_and_extract_sushi.ps1 -Pref tokyo

# 大阪府のみ
.\scripts\fetch_and_extract_sushi.ps1 -Pref osaka

# 北海道のみ
.\scripts\fetch_and_extract_sushi.ps1 -Pref hokkaido
```

### オプション一覧

| オプション | 説明 |
|-----------|------|
| `-Pref <名前>` | 都道府県でフィルタ (例: tokyo, osaka, kyoto) |
| `-TestMode` | テストモード（関東PBFを使用、東京のみ抽出） |
| `-SkipDownload` | PBFダウンロードをスキップ（既存ファイル使用） |

### 対応都道府県名

以下の名前で `-Pref` オプションを使用できます：

```
tokyo, osaka, kyoto, hokkaido, kanagawa, aichi, fukuoka, hyogo, 
saitama, chiba, shizuoka, hiroshima, miyagi, niigata, nagano, 
okinawa, ibaraki, tochigi, gunma, nara, mie, gifu, okayama, 
kumamoto, kagoshima, yamaguchi, nagasaki, ehime, aomori, iwate, 
yamagata, fukushima, akita, toyama, ishikawa, fukui, yamanashi, 
wakayama, tottori, shimane, tokushima, kagawa, kochi, saga, 
oita, miyazaki
```

## 出力形式

### GeoJSON 構造

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [139.7671, 35.6812]
      },
      "properties": {
        "osm_id": "node/123456789",
        "name": "すし三昧",
        "amenity": "restaurant",
        "shop": "",
        "cuisine": "sushi",
        "addr:prefecture": "東京都",
        "addr:city": "中央区",
        "addr:full": "",
        "source": "OSM"
      }
    }
  ]
}
```

### プロパティの説明

| プロパティ | 説明 |
|-----------|------|
| `osm_id` | OSM ID (形式: node/xxx, way/xxx, relation/xxx) |
| `name` | 店舗名（なければ空文字） |
| `amenity` | OSM amenityタグ (restaurant, fast_food など) |
| `shop` | OSM shopタグ (seafood など) |
| `cuisine` | 料理の種類 |
| `addr:prefecture` | 都道府県（あれば） |
| `addr:city` | 市区町村（あれば） |
| `addr:full` | 完全な住所（あれば） |
| `source` | データソース（常に "OSM"） |

## 抽出条件

以下のいずれかの条件に一致するものを「寿司店」として抽出します：

1. `amenity=restaurant` かつ `cuisine=sushi`
2. `amenity=restaurant` かつ `name` に "寿司" を含む
3. `shop=seafood` かつ `name` に "寿司" を含む
4. `amenity=fast_food` かつ `cuisine=sushi`（回転寿司など）

※ Way/Relation は centroid（重心）に変換して Point として出力します。

## データソース

- **Geofabrik** からダウンロード
  - 日本全国: https://download.geofabrik.de/asia/japan-latest.osm.pbf (~2GB)
  - 関東地方: https://download.geofabrik.de/asia/japan/kanto-latest.osm.pbf (~500MB)

※ PBF ファイルは毎日更新されています。最新データが必要な場合は既存の PBF を削除して再実行してください。

## ディレクトリ構造

```
Project_My_Shushi/
├── data/
│   ├── raw/           # PBF ファイル（Git管理外）
│   │   ├── japan-latest.osm.pbf
│   │   └── kanto-latest.osm.pbf
│   └── out/           # 出力 GeoJSON
│       ├── sushi_japan.geojson
│       └── sushi_tokyo.geojson
├── scripts/
│   ├── fetch_and_extract_sushi.ps1  # メインスクリプト
│   └── extract_sushi.py              # Python 抽出ロジック
├── environment.yml    # Conda 環境定義
├── requirements.txt   # Python パッケージ
├── .gitignore
└── README.md
```

## トラブルシューティング

### osmium-tool が見つからない

```powershell
# Conda-forge から再インストール
conda install -c conda-forge osmium-tool
```

### Python osmium モジュールが見つからない

```powershell
pip install osmium
```

### ダウンロードが途中で止まる

大きなファイルのダウンロード時はネットワーク状況によって時間がかかることがあります。

```powershell
# 手動でダウンロードする場合
Invoke-WebRequest -Uri "https://download.geofabrik.de/asia/japan-latest.osm.pbf" -OutFile "data\raw\japan-latest.osm.pbf"
```

または、ブラウザで直接ダウンロードして `data/raw/` に配置してください。

### メモリ不足

日本全国の PBF は大きいため、メモリ不足になることがあります。その場合：

1. テストモード（`-TestMode`）で動作確認
2. 都道府県フィルタ（`-Pref`）で分割処理
3. 不要なアプリケーションを終了

## React Native アプリ（My Sushi）

このプロジェクトには、寿司店を地図上に表示する React Native (Expo) アプリが含まれています。

### セットアップ手順

#### 1. 東京の寿司データを作成

```powershell
# Anaconda Prompt で実行
conda activate sushi-osm
python scripts\filter_tokyo.py
```

#### 2. データをアプリにコピー

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\copy_data_to_app.ps1
```

#### 3. Node.js パッケージをインストール

```powershell
npm install
```

#### 4. アプリを起動

```powershell
npx expo start
```

Expo Go アプリをスマホにインストールして、QRコードをスキャンすると確認できます。

### Google Maps API キーの設定

Android で地図を表示するには Google Maps API キーが必要です：

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. Maps SDK for Android を有効化
3. API キーを作成
4. `app.json` の `android.config.googleMaps.apiKey` を設定

### アプリの機能

- 🍣 東京の寿司店を地図上にピン表示
- 📍 クラスタリング（近接するピンをまとめて表示）
- 📋 タップで店舗詳細を表示（店名、種類、座標）
- 🎨 寿司をイメージしたオレンジ系テーマ

### ディレクトリ構造（アプリ部分）

```
Project_My_Shushi/
├── app/                    # Expo Router ページ
│   ├── _layout.tsx
│   └── (tabs)/
│       ├── _layout.tsx
│       └── index.tsx
├── src/
│   ├── components/         # UIコンポーネント
│   │   └── SushiMap.tsx
│   ├── constants/          # テーマ設定
│   │   └── theme.ts
│   ├── data/               # 寿司店データ
│   │   └── tokyo_sushi.json
│   └── types/              # TypeScript型定義
│       └── index.ts
├── assets/images/          # アプリアイコン
├── app.json                # Expo設定
├── package.json
└── tsconfig.json
```

## ライセンス

- このツール自体: MIT License
- OSM データ: [Open Database License (ODbL)](https://www.openstreetmap.org/copyright)

OSM データを使用する場合は、適切なクレジット表示が必要です：
> © OpenStreetMap contributors

## 参考

- [OpenStreetMap](https://www.openstreetmap.org/)
- [Geofabrik Downloads](https://download.geofabrik.de/)
- [osmium-tool](https://osmcode.org/osmium-tool/)
- [pyosmium](https://osmcode.org/pyosmium/)
