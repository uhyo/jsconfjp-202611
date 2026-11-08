---
layout: cover
deckTitle: ingenui — LLMにJSXを書かせるGenerative UI
---

# LLMにJSXを書かせよう

## ～Generative UIフレームワーク ingenui～

2026-11 JSConf JP 2026

<!--
（これはスピーカーノートの例です。HTMLコメントがノートになります。p キーで発表者ビューを開けます）
-->

---

# 発表者紹介

<b>uhyo</b>

株式会社カオナビ　フロントエンドエキスパート

TypeScriptとReactにとても詳しい。

<img src="./uhyo.jpg" alt="" className="speaker-avatar" />

---

# Generative UI

LLMが**文章の代わりにUIを返す**アプローチ。

- チャットの返答に、ボタンやカードなど操作できるUIが混ざる
- UIを操作すると、それが次のリクエストになる
- ストリーミングで**少しずつ届く**UIをどう描画するかが課題

---
layout: section
---

# ingenuiの紹介

---
class: code-sm
---

# ingenui

LLMは**JSXをそのまま書けばいい**。

````md
ご要望に合いそうなヘッドホンを見つけました。

```ui+jsx
<Card>
  <Title>Aurora ワイヤレスヘッドホン</Title>
  <Button onClick={actions.addToCart}>カートに入れる</Button>
</Card>
```

ほかの候補も見たい場合はお気軽にどうぞ。
````

Markdownの中に ` ```ui+jsx ` のコードフェンスでUIを埋め込む。

<!--
コードブロックの中に ``` を書くときは、外側のフェンスを長くする（ここでは ```` で囲っている）。
-->

---
layout: demo
---

# デモ: JSXのインクリメンタルパース

<JsxStreamDemo sample="product" />

<!--
▶で開始、↺で最初から、⏭で最後まで。速度も変えられます。
-->

---
layout: demo
---

# デモ: ingenuiのメッセージ

<GenUiMessageDemo sample="product" />

---
layout: demo
---

# デモ: 問題のフィードバック

<GenUiMessageDemo sample="broken" />

---
layout: demo
---

# デモ: 本物のClaudeと会話

<ClaudeChatDemo />

<!--
ingenuiのデモアプリのサーバー（INGENUI_DEMO_URL）経由でClaudeを呼ぶ。
返信はサーバーのpipeGenUiで検証されながら流れてくる。ボタンを押すと次のリクエストになる。
-->

---

# スキーマはサーバーとクライアントで共有

<Columns>
<div>

```ts
// サーバー
const pipe = pipeGenUi(
  modelStream,
  schema, // [!code highlight]
  { onIssue },
);
return new Response(pipe.stream);
```

</div>
<div>

```tsx
// クライアント
const genUi = bindGenUi(schema, { // [!code highlight]
  components: { Card, Button },
});
const { node } = useGenUiMessage(
  stream,
  genUi,
);
```

</div>
</Columns>

サーバー側でも**同じ検証**をストリームの途中で行える。

<!--
コードブロックでは `// [!code highlight]` で行をハイライトできる（focus / ++ / -- も可）。
-->

---
layout: section
---

# json-renderとの比較

---

# json-render

UIを**JSONのspec**で表現する。ストリーミング時はJSON Patch（JSONL）。

```jsonl
{"op":"add","path":"/root","value":"card"}
{"op":"add","path":"/elements/card","value":{"type":"Card","props":{},"children":["title","button"]}}
{"op":"add","path":"/elements/title","value":{"type":"Title","props":{"text":"Aurora"},"children":[]}}
```

<Box tone="orange" title="ポイント">1行（パッチ1つ）が届くまでUIに反映されない</Box>

---
layout: demo
---

# デモ: 同じUIを並べてストリーミング

<CompareDemo sample="product" />

---
layout: demo
---

# デモ: json-render単体

<JsonRenderDemo sample="product" />

---
layout: demo
---

# モデルへのプロンプト

<PromptCompare />

---

# まとめ

- LLMは**JSXが得意**。わざわざJSONで書かせる必要はない
- ingenuiは**ストリーミング中のJSX**をそのままReactツリーにする
- スキーマを共有して、**サーバーでもクライアントでも同じ検証**

---
layout: center
pageNumber: false
---

# ありがとうございました

https://github.com/uhyo/ingenui
