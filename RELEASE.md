# 公開手順

この文書は`ジム会費、元とれてる？`をCloudflare Workers Static Assetsへ試験公開する手順です。公開候補の本番URLは`https://gym-fee-review.smallframe.workers.dev`です。

## 現在の停止点

- Microsoft Formsを`pad pc / hostmy@outlook.jp`で作成し、ログイン不要・氏名メール非収集・通知無効を外部Chromeで確認する。
- 実フォームURLを`src/releaseConfig.ts`へ設定し、3ページから安全に開けることを確認する。
- Cloudflareへ再ログインし、`smallframe.workers.dev`を所有するアカウントであることを確認する。
- D1 `gym-fee-review-events`を作成し、`wrangler.jsonc`のゼロ値IDを実IDへ置き換える。
- Cloudflare Web Analytics site tokenをビルド環境の`VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN`へ設定する。
- GitHub owner `padpc`のリポジトリを接続する。
- 利用者がローカル公開候補とフォームを確認し、本番公開を明示承認する。

上記が完了する前に`wrangler deploy`を実行しない。

## 1. 公開候補を固定する

1. `npm.cmd ci`でlockfileどおりに依存を復元する。
2. `npm.cmd run check`と`npm.cmd audit --audit-level=high`を実行する。
3. 公開前診断で`USER_ACTION`、`REQUIRED`、未説明の`WARN`がないことを確認する。
4. 差分、秘密情報、D1 ID、フォームURL、解析token設定方法をセルフレビューする。
5. Conventional Commitsで作業ブランチへコミットし、GitHubへpushしてPRを作る。CI合格後にsquash mergeする。

## 2. 外部資産を確認する

1. Microsoft Formsの回答URLをログアウト相当で開き、回答可能か確認する。
2. `npx.cmd wrangler whoami`でCloudflareアカウントを確認する。
3. D1を作成し、migrationをremoteへ適用する。remote migrationは対象DBとバックアップ不要な新規空DBであることを確認してから行う。
4. Web Analytics site tokenをCloudflareのビルド環境変数へ設定する。tokenはHTMLへ公開されるサイト識別子であり、API tokenやログイン資格情報を保存しない。
5. WorkersのPreview URLは無効のままにする。

## 3. 本番公開の直前確認

利用者へ次を提示して明示承認を得る。

- 公開対象コミットとPR
- 本番URL
- 意見フォームURLと匿名設定
- D1名、保存列、180日削除
- Web Analytics設定
- 直近の試験件数と監査結果
- 復旧対象となる直前Version IDまたは、初回公開であること

## 4. 承認後に公開する

1. 承認済みmainコミットをcheckoutする。
2. `npm.cmd ci`、`npm.cmd run check`、`npm.cmd audit --audit-level=high`を再実行する。
3. `npx.cmd wrangler deploy`を1回だけ実行する。
4. 出力されたVersion IDとURLを記録する。
5. `/`、`/check`、`/methodology`、`/robots.txt`、`/sitemap.xml`、`/og-card.png`、不明パス404、`/api/event`を確認する。
6. 外部Chromeで320px・390px・768px・1280px、キーボード、200%拡大、フォーム遷移を確認する。
7. Cloudflare Web AnalyticsとD1に、自分・AI確認を外部需要として混ぜない。

## 5. 検索登録と初期配布

1. Search Consoleの登録済みGoogleアカウントを確認する。
2. 本番プロパティの所有権、canonical、robots、sitemapを確認する。
3. sitemapを1回送信し、ホームURLのインデックス登録を1回リクエストする。
4. 承認済みの初期配布先へ1回だけ案内する。無差別DMや反復投稿は行わない。

## 6. 復旧

1. 障害が計測だけなら、診断本体を止めずイベント送信またはWeb Analyticsを無効化する。
2. Worker障害ならCloudflareの直前Version IDへrollbackする。
3. D1 migration障害では既存表を破壊せず、新規書込みを止めて原因を確認する。
4. 復旧後に本番URL、Version ID、原因、影響時間、再発防止を記録する。
