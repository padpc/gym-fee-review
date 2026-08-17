# 公開手順

この文書は`ジム会費、元とれてる？`をCloudflare Workers Static Assetsへ試験公開する手順です。公開候補の本番URLは`https://gym-fee-review.smallframe.workers.dev`です。

## 現在の停止点

- Cloudflare Web Analytics site tokenをビルド環境の`VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN`へ設定する。
- GitHubのPRを品質確認後に`main`へsquash mergeし、Cloudflare Workers Buildsを`main`へ接続する。
- 利用者がローカル公開候補とフォームを確認し、本番公開を明示承認する。

上記が完了する前に`wrangler deploy`を実行しない。

## 完了した外部準備

- Cloudflare OAuthで`Hostmy@outlook.jp's Account`（Workers subdomain `smallframe`）を確認した。
- 新規D1 `gym-fee-review-events`（APAC）へ`0001_events.sql`を適用し、`events`表が空であることを確認した。
- Web Analyticsへ`gym-fee-review.smallframe.workers.dev`を登録した。site tokenは公開識別子だが、リポジトリには保存しない。
- GitHub owner `padpc`に公開リポジトリ`gym-fee-review`を作成し、`origin`へ接続した。
- Microsoft Formsを`pad pc / hostmy@outlook.jp`で作成した。
- 公開URLは`https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=DQSIkWdsW0yxEjajBLZtrQAAAAAAAAAAAAMAAByk0FNUNEhQSzJXRVhDSTBDNE5NSzIwWkRaU1UwNC4u`である。
- 外部Chromeでログイン要求なし、氏名・メールアドレスの自動取得なし、Q1～Q3必須、Q4任意、Q3複数選択、通知無効、質問順シャッフル無効を確認した。
- 3ページのフッターから同じURLを`target="_blank" rel="noopener noreferrer"`で開き、入力値・結果・内部IDを付加しないことを自動試験で確認した。

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
