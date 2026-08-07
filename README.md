# ジム会費、元とれてる？

直近3か月の利用回数と自分で確認した料金から、現在の月額プランと都度払い候補を比較するブラウザツールです。

このリポジトリはG1実装用のローカルリポジトリです。GitHub、Cloudflare、解析サービスには未接続です。

## G1でできること

- 現在月会費と、直近の完了3か月の来館回数を入力
- 都度払いの1回料金と比較
- 現在の1回あたり費用、直近3か月差、年間差を表示
- 月0～20回の料金表と、料金の低い側が変わる回数を表示
- 全月0回、空欄、負数、小数、上限超過を安全に処理

年会費、必須オプション、候補固定費、一時費用、別月額、共有、説明ページ、解析、公開設定はG2以後の対象です。

## 開発

Node.js 24以上を使用します。依存関係は`package-lock.json`どおりに再現するため、初回は`npm.cmd ci`を実行してください。PowerShellでは実行ポリシーの影響を避けるため`npm`ではなく`npm.cmd`を使います。

```powershell
npm.cmd ci
npm.cmd run dev
```

## 品質確認

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
```

`npm.cmd run check`で、上記の主要確認をまとめて実行できます。
