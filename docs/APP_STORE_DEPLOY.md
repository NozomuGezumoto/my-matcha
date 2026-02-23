# App Store 正式ビルド・デプロイ手順

My Macha アプリを App Store に公開するための手順です。

---

## 前提条件

- **Apple Developer Program** への登録（年間 $99）
- **Expo / EAS アカウント**（無料）
- **Google Cloud Console** で Maps API キー取得（地図機能用）

---

## Step 0: 事前準備

### 0-1. Google Maps API キー（本番用）

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. **Maps SDK for iOS** を有効化
3. **API とサービス** → **認証情報** で API キー作成
4. `app.json` の `android.config.googleMaps.apiKey` を実キーに差し替え  
   - iOS の場合は `app.json` に `ios.config.googleMaps.apiKey` も追加するか、環境変数で渡す

**app.json の差し替え例:**
```json
"config": {
  "googleMaps": {
    "apiKey": "AIzaSy..."
  }
}
```

※ 本番キーは IP 制限などを推奨

### 0-2. EAS CLI のインストール

```bash
npm install -g eas-cli
```

### 0-3. Expo へのログイン

```bash
eas login
```

### 0-4. プロジェクトを EAS に紐付け

```bash
eas init
```

初回は Expo プロジェクトを作成するか聞かれるので、指示に従って進める。

---

## Step 1: iOS 本番ビルド

プロジェクトルートで実行:

```bash
eas build --platform ios --profile production
```

- 初回は Apple Developer アカウントの接続や証明書・プロビジョニングプロファイルの作成を案内される
- ビルド完了まで 15〜30 分ほどかかることがある
- 完了後、Expo のダッシュボード URL が表示される

---

## Step 2: App Store Connect の設定

1. [App Store Connect](https://appstoreconnect.apple.com/) にログイン
2. **マイ App** → **+** で新規 App 作成
3. 以下を入力:
   - **プラットフォーム**: iOS
   - **名前**: My Macha
   - **主言語**: 日本語
   - **バンドル ID**: `com.mymacha.app`（app.json と一致させる）
   - **SKU**: 任意（例: `mymacha-001`）
4. App 情報・価格・プライバシーなどを入力

---

## Step 3: ビルドの提出（EAS Submit）

### オプション A: 対話形式（推奨）

```bash
eas submit --platform ios --profile production
```

- 最新の production ビルドを選択
- Apple ID・App Store Connect の App ID などを聞かれたら入力

### オプション B: ビルド＋提出を一度に

```bash
eas build --platform ios --profile production --auto-submit
```

### オプション C: 事前に eas.json を設定

`eas.json` の `submit.production.ios` を編集:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@example.com",
      "ascAppId": "1234567890",
      "appleTeamId": "XXXXXXXXXX"
    }
  }
}
```

- **ascAppId**: App Store Connect → 該当 App → **App 情報** の「Apple ID」
- **appleTeamId**: [Apple Developer](https://developer.apple.com/account/) → **メンバーシップ** の Team ID

設定後:

```bash
eas submit --platform ios --profile production --non-interactive
```

---

## Step 4: App Store Connect での審査提出

1. **TestFlight** にビルドが届いたら、内部テスト用に利用可能
2. **App Store** タブで以下を準備:
   - **スクリーンショット**（6.7", 6.5", 5.5" など必須サイズ）
   - **説明文**
   - **キーワード**
   - **プライバシーポリシー URL**（必須）
   - **年齢制限・カテゴリ** など
3. **審査に提出** をクリック

---

## よく使うコマンド一覧

| コマンド | 用途 |
|----------|------|
| `eas build --platform ios --profile production` | iOS 本番ビルド |
| `eas submit --platform ios --profile production` | 最新ビルドを App Store に提出 |
| `eas build --platform ios --profile production --auto-submit` | ビルド＋提出を一括実行 |
| `eas build:list` | ビルド一覧 |
| `eas credentials` | 証明書・プロビジョニングの管理 |

---

## トラブルシューティング

### ビルドが失敗する

- `eas build --platform ios --profile production` のログを確認
- `app.json` の `expo.ios.bundleIdentifier` が App Store Connect のものと一致しているか確認
- Google Maps API キーが有効か確認

### 審査で却下された

- 却下理由のメールを確認
- プライバシーポリシー、スクリーンショット、説明文などが不足していないか確認
- 位置情報・カメラ・フォトライブラリの利用目的をアプリ内でも明示しているか確認（Info.plist の文言と整合する）

### eas.json のプロファイル

- **production**: 本番リリース用（App Store / Google Play）
- **preview**: 内部テスト用（TestFlight / 内部テスト）
- **development**: 開発用クライアント

---

## 参考リンク

- [EAS Build - Expo](https://docs.expo.dev/build/introduction/)
- [EAS Submit（iOS）- Expo](https://docs.expo.dev/submit/ios/)
- [App Store Connect ヘルプ](https://help.apple.com/app-store-connect/)
