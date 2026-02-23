# トンネル (expo start --tunnel) が失敗するとき

「failed to start tunnel」「session closed」が出る場合の対処です。

## 1. @expo/ngrok をグローバルにインストール（まず試す）

```bash
npm install -g @expo/ngrok@^4.1.0
```

その後、もう一度:

```bash
npx expo start --tunnel
```

## 2. 同じ Wi‑Fi なら LAN を使う（トンネル不要）

PC とスマホが**同じ Wi‑Fi**なら、トンネルは不要です。

```bash
npx expo start
```

表示された QR コードを Expo Go で読み、同じネットワークで接続できます。

## 3. サブドメインの衝突を避ける

別プロジェクトや別マシンで同じ Expo トンネルを使っていると「session closed」になることがあります。  
サブドメインを固定して試します:

```bash
set EXPO_TUNNEL_SUBDOMAIN=my-macha-%RANDOM%
npx expo start --tunnel
```

(PowerShell の場合)

```powershell
$env:EXPO_TUNNEL_SUBDOMAIN = "my-macha-$((Get-Random))"
npx expo start --tunnel
```

## 4. ファイアウォール・セキュリティソフト

- Windows ファイアウォールやセキュリティソフトが **ngrok / Node の通信をブロック**していないか確認する
- 一時的に無効にして `npx expo start --tunnel` が通るか試す（通ったらルール追加で許可）

## 5. 時間をおいて再試行

ngrok 側の不調で一時的に失敗することがあります。  
数分後に再度 `npx expo start --tunnel` を試してください。

## 6. 状態確認

- Ngrok: https://status.ngrok.com/
- Expo: https://status.expo.dev/

---

**まとめ:** まずは `npm install -g @expo/ngrok@^4.1.0` のあと `npx expo start --tunnel` を試し、同じ Wi‑Fi のときは `npx expo start`（LAN）で十分です。
