# TypeScriptでユーザーIDを注文IDとして検索してしまう理由：構造的部分型を最小再現から理解する

## この記事で扱う問題

バックエンドのコードでは、`UserId` と `OrderId` のように、どちらも文字列として運ばれるが意味は異なる値を扱います。今回の教材では、ユーザーの注文を取得する処理が、ユーザーIDを注文ID検索へ渡してしまいます。TypeScriptの型チェックはこのコードを通しますが、実行結果は誤った注文を返します。

前提はNode.js 22系、TypeScript 5.7.2、Vitest 2.1.8です。結論を先に言うと、TypeScriptの型互換性は名前ではなく構造に基づくため、単に `type UserId = string` と `type OrderId = string` と書いても別の型にはなりません。意味の境界をコンパイル時に表現するには、ブランド型などの追加契約が必要です。

## 既存題材との差分

手元の既存資産には、Goのタスク管理API、SQLの部分更新、HTTP境界のDTO変換、WireMockのモック調査などがありました。一方、TypeScriptの型仕様そのものを中心に、**識別子の意味が構造的部分型によって消えること**を扱った題材は確認できませんでした。

今回の固有の契約は、HTTPやORMの不具合ではなく、バックエンド関数の引数境界で発火します。失敗条件は「二つの型が同じ `string` 表現であること」、原因の中心は「TypeScriptが構造的部分型であること」、修正の中心は「ブランド型と意味に対応した検索関数」です。

## 期待していた挙動と実際の挙動

`user-42` はユーザーIDです。注文IDとして `user-42` を持つ注文を返すのではなく、ユーザー `user-42` に紐づく `order-100` を返すのが期待した挙動です。

| 観点 | 期待値 | 実際の再現結果 |
|---|---|---|
| 入力 | `UserId("user-42")` | 文字列 `"user-42"` |
| 検索の意味 | ユーザーIDで注文を検索 | 注文IDとして検索 |
| レスポンス | `200 order-100 4800` | `200 user-42 999999` |
| 型チェック | 取り違えを検出 | 成功 |

## 最小再現プロジェクト

プロジェクトは次の構成です。

```text
src/order-service.ts       注文検索とレスポンス整形
test/order-service.test.ts 利用者視点の振る舞いテスト
test/type-contracts.ts     修正後のコンパイル時対照ケース
evidence/                  実行出力
```

修正前の `src/order-service.ts` では、次のように両方のIDを定義していました。

```ts
export type UserId = string;
export type OrderId = string;

export function findOrderById(id: OrderId): Order | undefined {
  return orders.find((order) => order.id === id);
}

export function getCurrentUsersOrder(currentUserId: UserId): Order | undefined {
  return findOrderById(currentUserId);
}
```

`UserId` と `OrderId` は別名に見えます。しかしコンパイラから見ると、どちらも `string` です。再現テストを実行します。

```bash
git checkout 8ab53ff
pnpm install
pnpm run repro
```

保存した失敗出力は `evidence/bug-test.txt` にあります。重要な部分は次の通りです。

```text
Expected: "404 Order Not Found"
Received: "200 user-42 999999"
```

ここで重要なのは、`tsc --noEmit` が成功していることです。これは「TypeScriptが壊れている」という意味ではなく、現在の型定義が「文字列として代入可能」という契約しか表していないことを示します。

## 調査：何を観測し、どの仮説を除外したか

まず、失敗は検索データの不在ではありません。`orders` には `order-100` と、意図的に混同を見えるようにした `user-42` という別の注文IDがあります。レスポンスが `200 user-42 999999` になったことから、検索関数が引数を文字列として比較し、注文ID列に対して検索したことが分かります。

次に、二つの仮説を比較しました。

| 仮説 | 予測 | 最小実験 | 結果 | 判定 |
|---|---|---|---|---|
| A：注文データが間違っている | `order-100` をユーザー検索しても返せない | 固定データを直接レスポンスへ渡す | `200 order-100 4800` | 棄却 |
| B：IDの型境界が消えている | `UserId` を `OrderId` 引数へ渡しても型チェックが通る | `pnpm run typecheck` と再現テストを実行 | 型チェック成功、実行時に誤注文 | 採用 |

TypeScript公式ドキュメントは、型互換性が構造的部分型に基づくと説明しています。[1] つまり、対象型が必要とするメンバーを持っていれば互換と判定されます。今回の `UserId` と `OrderId` はともに `string` なので、名前の違いは互換性を妨げません。

> Type compatibility in TypeScript is based on structural subtyping.
>
> — TypeScript Handbook, “Type Compatibility” [1]

さらに、TypeScriptの型注釈や型アサーションは実行時の値を変えません。[2] したがって、たとえば `currentUserId as OrderId` と書き換えても、文字列の意味は変わらず、問題の解決にはなりません。型アサーションはコンパイラへの主張であり、ランタイム検証ではありません。

## 修正：なぜこの変更で直るのか

修正は二つの意味を分けます。第一に、IDをブランド付きの型にします。

```ts
type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;
```

第二に、現在のユーザーの注文を取る処理が、注文ID検索ではなくユーザーID検索を呼ぶようにします。

```ts
export function findOrderByUserId(id: UserId): Order | undefined {
  return orders.find((order) => order.userId === id);
}

export function getCurrentUsersOrder(currentUserId: UserId): Order | undefined {
  return findOrderByUserId(currentUserId);
}
```

この修正で、`findOrderById(userId("user-42"))` はコンパイルエラーになります。教材では `test/type-contracts.ts` に次の対照ケースを残しています。

```ts
// @ts-expect-error UserId は OrderId と互換ではない。
findOrderById(userId("user-42"));
```

ブランド型の実体は、文字列にコンパイル時の目印を加えたものです。`userId()` と `orderId()` はその境界を作る関数ですが、データベースやHTTPから来た文字列が本当に正しい形式かを検証するものではありません。外部入力には、別途ランタイムバリデーションが必要です。

## 回帰テスト

修正後は、期待するユーザー注文の取得と、注文IDを使った内部検索の対照ケースをテストします。

```bash
git checkout ab2364f
pnpm run typecheck
pnpm test
```

検証結果は次の通りです。

```text
$ tsc --noEmit

✓ test/order-service.test.ts (2 tests)
Test Files  1 passed (1)
Tests       2 passed (2)
```

元の失敗テストは削除していません。テストの期待値を「ユーザーIDと同じ文字列の注文を返さない」から「ユーザーIDに紐づく注文を返す」へ整理し、同時にコンパイル時の取り違え検証を追加しました。これにより、実行時の回帰と型契約の回帰を別々に確認できます。

## まとめ

覚える判断規則は三つです。

第一に、`type UserId = string` と `type OrderId = string` は、別の意味を宣言しているだけで、別の型を作っているわけではありません。第二に、型アサーションは実行時の値を変えないため、IDの意味を保証する修正にはなりません。第三に、意味の異なるプリミティブを関数境界で混同したくない場合は、ブランド型でコンパイル時の契約を追加し、関数名も `findOrderById` と `findOrderByUserId` のように意味へ合わせます。

## 参考資料

[1]: https://www.typescriptlang.org/docs/handbook/type-compatibility.html "TypeScript Handbook: Type Compatibility"
[2]: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html "TypeScript Handbook: Everyday Types"

