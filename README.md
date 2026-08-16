# TypeScript Backend Type Contract Lab

バックエンドTypeScriptで、`UserId` と `OrderId` のように**値の表現は同じでも意味が異なる識別子**を安全に扱うためのデバッグ教材です。TypeScriptの構造的部分型が、なぜ一見正しいコードを通してしまうのかを、失敗テスト、観測、最小修正、回帰テストの順に追体験できます。

## 前提環境

Node.js 22系、pnpm 11系、TypeScript 5.7.2、Vitest 2.1.8を前提にしています。依存関係は `pnpm-lock.yaml` に固定しています。

## セットアップ

```bash
pnpm install
```

## 再現

修正前の状態はGitコミット `8ab53ff` です。次のコマンドで、ユーザーIDを注文IDとして検索してしまう失敗を確認できます。

```bash
git checkout 8ab53ff
pnpm run repro
```

期待値は `404 Order Not Found` ですが、実際には `200 user-42 999999` が返ります。`user-42` というユーザーIDと同じ文字列を持つ注文IDが、誤って注文として返されます。

## 修正後の確認

```bash
git checkout ab2364f
pnpm run typecheck
pnpm test
```

修正後は、ユーザー検索に `findOrderByUserId` を使い、`UserId` と `OrderId` をブランド型で分離しています。`test/type-contracts.ts` の `@ts-expect-error` は、`UserId` を `OrderId` 用の関数へ渡すコードがコンパイル時に拒否されることを検証します。

## 構成

| パス | 役割 |
|---|---|
| `src/order-service.ts` | 再現対象の注文検索と修正後の型境界 |
| `test/order-service.test.ts` | HTTPレスポンスに近い利用者視点の振る舞いテスト |
| `test/type-contracts.ts` | IDの取り違えをコンパイル時に検証する対照ケース |
| `evidence/` | 失敗時・修正後の実行結果 |
| `docs/article.md` | 調査過程を解説する日本語記事 |

## Git履歴

教材の意図的な不具合と修正は分離しています。

| コミット | 内容 |
|---|---|
| `8ab53ff` | 構造的部分型によりIDが混同される再現状態 |
| `ab2364f` | ブランド型と正しい検索メソッドによる最小修正 |

## 学習上の注意

ブランド型のブランドはコンパイル時の契約です。`userId()` と `orderId()` は文字列をブランド付きの型として扱わせますが、実行時に文字列へ検証を追加するものではありません。外部HTTP入力の形式検証や認証認可は、別途ランタイムで実装する必要があります。

