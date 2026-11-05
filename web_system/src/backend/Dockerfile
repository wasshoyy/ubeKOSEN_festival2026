FROM node:26-bookworm-slim

WORKDIR /app

# バックエンドの依存関係をコピー
COPY src/backend/package*.json ./

# パッケージをインストール
RUN npm ci

# バックエンドのソースコードをコピー
COPY src/backend/ ./

# フロントエンドをコピー
COPY src/frontend/ /frontend/

# TypeScriptをコンパイル
RUN npm run build

# ポート3000を使用
EXPOSE 3000

# サーバー起動
CMD ["npm", "start"]
