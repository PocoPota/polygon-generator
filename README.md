# POLY SCATTER

参考画像の背景に使われているような多面体素材を、ブラウザ上でランダム生成するジェネレーターです。

## 起動

外部ビルドは不要です。`index.html` をブラウザで開くか、任意の静的サーバーで配信してください。

```sh
python3 -m http.server 8000
```

`http://localhost:8000` で利用できます。

## GitHub Pages

このディレクトリをリポジトリのルートとしてGitHubへ配置し、次の設定を行います。

1. リポジトリの `Settings` → `Pages` を開く
2. `Build and deployment` の `Source` を `GitHub Actions` にする
3. `main` ブランチへpushする

`.github/workflows/deploy-pages.yml` が静的ファイルを自動で公開します。

## 機能

- 正方形・横長・ストーリー用のサイズプリセット
- ポリゴン数、サイズ、外周への配置傾向を調整
- 5色のカスタムパレット
- 背景透過または任意の背景色
- シード付きの再現可能なランダム生成
- 生成した各ポリゴンを個別の透過PNG（512 × 512px）でダウンロード
