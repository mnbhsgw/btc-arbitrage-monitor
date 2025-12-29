# ビットコイン・アービトラージ監視ツール（仕様書）

## 目的
日本の取引所間におけるビットコイン現物のアービトラージ機会を監視し、Webダッシュボードで表示する。自動売買は行わず、監視と表示のみを行う。

## 対象範囲
- **取引所**: bitFlyer / Coincheck / bitbank
- **市場**: BTC/JPY 現物のみ
- **データ取得**: 公開APIのみ（APIキー不要）
- **手数料**: 売買手数料のみ（公開情報の固定値）
- **アラート**: 画面表示のみ（Webダッシュボード）
- **更新間隔**: 約10秒
- **データ保存**: なし（DB/ログ/履歴は持たない）
- **実行環境**: ローカルPC
- **費用**: 無料枠のみ

## 機能要件
- 3取引所のBTC/JPY現物価格を取得する。
- 価格を比較可能な形（同一単位・同一基準）に正規化する。
- 取引所ごとの**固定手数料率**を用いて、実質的な買値/売値を算出する。
- **利益率1%以上**のアービトラージ機会を検出する。
- 現在価格・手数料考慮後価格・機会の有無をWebダッシュボードに表示する。
- データ更新は約10秒ごとに行う。

## 非機能要件
- ローカルで簡単に動作すること。
- 公開APIのみで動作すること。
- 一時的なAPIエラーに対しては、UI上でエラー表示を行い、処理を継続できること。
- 将来的な拡張がしやすい構成であること。

## エラー時の扱い
- 取引所APIが失敗した場合は、その取引所の行を**エラー表示**し価格は空欄にする。
- 機会判定は**取得に成功した取引所の組み合わせのみ**で実施する。
- 連続失敗の特別扱いは行わない（都度エラー表示のみ）。

## データ定義
- **生価格**: Best Bid/Ask（買いはAsk、売りはBid）
- **手数料考慮後買値**: `buy_price * (1 + buy_fee_rate)`
- **手数料考慮後売値**: `sell_price * (1 - sell_fee_rate)`
- **利益率**: `(sell_net - buy_net) / buy_net`
- **機会あり**: 利益率が1%以上

## 手数料設定
- 取引所ごとに**固定値**で設定する。
- 設定ファイルまたは定数として保持する。
- **固定値（公式情報ベース）**:
  - bitFlyer: 0.15%（Lightning 現物、直近30日取引量「10万円未満」帯の手数料率を固定値として採用）
  - Coincheck: 0.00%（BTCのMaker/Takerともに0.000%）
  - bitbank: Taker 0.12%（BTC/JPY）
- **計算上の扱い**: Best Bid/Ask前提のため、売買ともにTaker手数料として扱う。

## 公開API（BTC/JPY・Best Bid/Ask）
- **bitFlyer**
  - Base: `https://api.bitflyer.com/v1/`
  - Ticker: `GET /getticker?product_code=BTC_JPY`（best_bid / best_ask を使用）
- **Coincheck**
  - Base: `https://coincheck.com`
  - Ticker: `GET /api/ticker`（bid / ask を使用）
  - Order Book: `GET /api/order_books`（bids / asks から最良気配を抽出）
- **bitbank**
  - Base: `https://public.bitbank.cc`
  - Ticker: `GET /btc_jpy/ticker`（data.buy = Best Bid, data.sell = Best Ask として使用）

## UI要件（Webダッシュボード）
- **1画面**に全情報を表示する。
- **レイアウト案A**: 上段「全体ステータス＋最終更新時刻」→ 中段「取引所一覧」→ 下段「裁定機会トップ5」。
- 表示項目（取引所ごと）:
  - Best Bid / Best Ask
  - 手数料考慮後の買値 / 売値
  - 直近更新時刻
  - ステータス（OK / エラー）
- アービトラージ機会は**利益率降順の上位5件**を表示する。
- 機会がない場合は**グレー表示**で示す。
- **自動更新**（約10秒）で画面を更新する。
- 画面全体の**最終更新時刻**を表示する。

## UI詳細（ワイヤー）
- 上段（ヘッダ）:
  - タイトル
  - 全体ステータス（「全取引所OK」/「一部エラー」）
  - 最終更新時刻
- 中段（取引所一覧・表形式）:
  - 列: 取引所名 / Best Ask / Best Bid / 手数料考慮後買値 / 手数料考慮後売値 / 直近更新 / ステータス
  - 行: bitFlyer / Coincheck / bitbank
- 下段（裁定機会トップ5・表形式）:
  - 列: 買い取引所 / 売り取引所 / 期待利益率 / 手数料考慮後買値 / 手数料考慮後売値 / 価格差
  - 行: 利益率降順で最大5件
  - 0件の場合はグレーの「機会なし」を表示

## 未確定事項（後で決める）
- 取引所APIが一部失敗した際の扱い
  - Best Bid/Askが取得できない取引所は、その更新周期では機会判定から除外する

## 対象外
- 自動売買
- 資産移動やウォレット管理
- 履歴分析・バックテスト
- Webダッシュボード以外の通知

## 実装方針（標準案）
- **技術スタック**: Node.js + Express
- **表示**: ブラウザ表示（ローカルWebサーバ）
- **フロント**: HTML + JavaScript の軽量ダッシュボード
- **更新方式**: フロントが10秒ごとにAPIをポーリングして更新
- **設定**: `config.json` に手数料率などを保持

## 構成（ディレクトリ案）
- `server/` : APIサーバ（Express）
- `server/exchanges/` : 取引所ごとのAPIクライアント
- `server/core/` : 価格正規化・手数料計算・機会判定ロジック
- `web/` : フロント（HTML/CSS/JS）
- `config/` : 設定ファイル（`config.json`）

## API設計（案）
- `GET /api/health`
  - 返却: サーバ稼働中の簡易ステータス
- `GET /api/quotes`
  - 返却: 取引所ごとのBest Bid/Askと手数料考慮後価格
- `GET /api/opportunities`
  - 返却: 利益率降順の上位5件
- `GET /api/overview`
  - 返却: 画面表示に必要な集約情報（推奨）

## 設定ファイル仕様（案）
`config/config.json`
- `refreshIntervalSec`: 10
- `minProfitRate`: 0.01
- `exchanges`: 取引所配列
  - `id`: `bitflyer` / `coincheck` / `bitbank`
  - `feeRate`: 取引所の固定手数料率（例: 0.0015 / TBD）
  - `enabled`: true/false

## /api/overview レスポンス仕様（案）
- `timestamp`: ISO8601（サーバ時刻）
- `overallStatus`: `ok` / `partial_error`
- `exchanges`: 取引所配列
  - `id`: `bitflyer` / `coincheck` / `bitbank`
  - `status`: `ok` / `error`
  - `bestAsk`: number | null
  - `bestBid`: number | null
  - `feeAdjustedBuy`: number | null
  - `feeAdjustedSell`: number | null
  - `lastUpdated`: ISO8601 | null
  - `errorMessage`: string | null
- `opportunities`: 裁定機会配列（利益率降順、最大5件）
  - `buyExchange`: 取引所ID
  - `sellExchange`: 取引所ID
  - `profitRate`: number
  - `feeAdjustedBuy`: number
  - `feeAdjustedSell`: number
  - `priceSpread`: number

## 取引所API取得仕様（案）
- **共通**: Best Ask / Best Bid を取得し、数値化して使用する。
- **bitFlyer**: `getticker` の `best_ask` / `best_bid` を使用。
- **Coincheck**: `ticker` の `ask` / `bid` を使用。
- **bitbank**: `ticker` の `data.sell`（Best Ask）/ `data.buy`（Best Bid）を使用。

## Git運用ルール（AIエージェント向け）
- ブランチ方針: 小さな変更は `main` 直、機能追加は `feature/*` で作業
- AIは **明示の指示がない限り `git push` してはいけない**
- 原則の流れ:
  1. `git status` で差分確認（必要なら `git diff` の要点も提示）
  2. `git add <files>`
  3. `git commit -m "<動詞で始まる短い英語1行>"`
  4. （指示がある場合のみ）`git push` またはPR作成
- コミット粒度: 1コミット=1変更目的（UI変更・API変更などで分ける）
- 仕様変更がある場合は AGENTS.md も更新し、実装と同じコミットに含める
- PR運用: 仕様/計算/レスポンス変更はPR推奨、軽微なら省略可
- マージ基準: CIがあれば成功必須、なければローカル起動確認
- 破壊的変更（設定名/APIレスポンス変更など）は事前に合意してから実施
- リリースタグ: 主要な機能追加時に `v0.x.y` を付与

## Codex簡易レビュー運用（単発）
- 目的: 実装者と同一モデルでも、視点を切り替えてレビューを強制する
- 実施タイミング: 重要な変更（計算/仕様/UI）を入れた直後
- 手順:
  1. `git status` と `git diff` の要点を提示
  2. read-only前提でレビュー依頼（修正はせず指摘のみ）
  3. 指摘に対応したら再度レビューを依頼
- 出力方針: バグ/リスク/抜け漏れを優先し、軽微な指摘は後回し
