---
layout: cover
deckTitle: AIフレンドリーなGenerative UIをJSXで
---

# AIフレンドリーなGenerative UIを<br />JSXで

2026-11-23 JSConf JP 2026

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

LLMが**動的にUIを生成する**こと。

このトークでは特に、リアルタイム性が<br />あるものを扱う。AIとのチャットで<br />AIが返答にUIを混ぜてくるものとか。

---

# Generative UIの例

<div className="columns columns--left-main">

Claudeが料理のレシピを教えてくれるときのUI→

<img src="./claude-genui-sample.jpg" width="360" />

</div>

---

# 典型的な構成

あらかじめ**コンポーネント**が用意されており、AIは返答内でコンポーネントを使用することができる。

Claudeの場合、調理手順コンポーネント、地図コンポーネントなど。


---

# This Talk

AIがコンポーネントを出力する方法として、<br />**JSXを使う**方法を考えたので、解説します。

---
layout: section
---

# 作ったもの

---
layout: center
---

<img src="./ingenui-hero.png" />

---

# ingenui: Generative UIフレームワーク

「AIがJSXでUIを表現する」というコンセプト<br />を中心に、LLMとの繋ぎこみを担当するフレームワーク。

---
layout: demo
---

# デモ: ショップアシスタントAI

<GenUiMessageDemo sample="product" />

---
class: code-sm
---

# デモで見たもの

LLMが出力したテキストの中に**ui+jsxブロック**があり、そこがUIとして描画される。

````md
ご要望に合いそうなヘッドホンを見つけました。

```ui+jsx
<Card>
  ...
</Card>
```
````

---

# デモで見たもの

JSXのストリーミングが、徐々に組み上がるUIとして描画される。

<div>
  <img src="./screenshot1.png" width="700" />
</div>

---
layout: section
---

# これは何を解決するのか

---

# LLMのストリーミング

LLMは徐々にテキストを生成するため、<br />リアルタイムチャットでは**ストリーミング**で<br />返答が表示される。

もちろん、コンポーネント呼び出しも<br />ストリーミングされる。

---
class: code-xs
---

# UIのストリーミングの問題

<div className="columns columns--left-main">

<div>
UI定義は、ただのテキストとは<br />異なり、**構造を持つ**。

どうストリーミングする？

<small>（UI定義JSONの一部が中途半端に届いていても<br />意味をなさない）</small>
</div>

```
{
  "root": "card",
  "state": {
    "chartData": [
      {
        "label": "Mon",
        "value": 12
      },
      {
        "label": "Tue",
        "value": 28
      },
      {
        "label": "Wed",
        "value": 19
      },
      {
        "label": "Thu",
        "value": 34
      },
      {
        "label": "Fri",
        "value": 45
      },
      {
        "label": "Sat",
        "value": 38
      },
      {
        "label": "Sun",
        "value": 52
      }
    ]
  }
}
```

</div>

---

# 既存手法の例: json-render

Vercelが開発しているGenerative UI<br />フレームワーク。

ストリーミングモードでは、**JSON Patchの列**で徐々に組み上がるUIを表現する。

```
{"op":"add","path":"/root","value":"root"}
{"op":"add","path":"/elements/root","value":{"type":"Card","props":{"title":"Dashboard"},"children":["metric-1","metric-2"]}}
{"op":"add","path":"/elements/metric-1","value":{"type":"Metric","props":{"label":"Revenue"}}}
{"op":"add","path":"/elements/metric-2","value":{"type":"Metric","props":{"label":"Users"}}}
```

---
layout: demo
---

# json-renderのデモ

<JsonRenderDemo sample="product" />

---

# json-renderの特徴

- ingenuiと同じところ: **コンポーネントベース**
- 違うところ: 徐々に組み上がるコンポーネントツリーをどう表現するか

---

# json-renderの特徴

LLMに、UIをJSON Patchの列で出力してもらうことで、徐々に組み上がるUIを表現する。

---

# json-renderの特徴

LLMに、UIをJSON Patchの列で出力してもらうことで、徐々に組み上がるUIを表現する。

<br />

**ほんまか？**　AIにこれ毎回出力してもらうの？

---

# json-renderの問題

文字数効率が悪い。UIを表現する方法として、<br />AIにとって慣れない方法である。

<div>
  <img src="./screenshot2.png" width="700" />
</div>

---
layout: section
---

# インクリメンタルJSXパーサーによる解決

---

# JSXを使うアイデア

JSXなら、文字数効率がよく、UIの表現方法としてAIも書き慣れているのでは（仮説）

<div>
  <img src="./screenshot1.png" width="700" />
</div>

---

# 必要なもの

中途半端なJSXをパースし、コンポーネントツリーとしてレンダリングする仕組みが必要。

---
layout: demo
---

# デモ: パーサーが返すReactツリー

<JsxTreeDemo sample="product" />

---

# JSXパーサーの挙動

途中までの入力でも、そこまでのパース結果を<br />出力できる。

<div>
  <img src="./screenshot3.png" width="700" />
</div>

---

# JSXパーサーの挙動

コンポーネントツリーへの変換時、パース途中の箇所に`<Pending />`を配置。

<div>
  <img src="./screenshot3.png" width="700" />
</div>

---

# JSXパーサーの挙動

ノードはイミュータブルで、変更があった<br />箇所のみ作り直し。

<div>
  <img src="./screenshot3.png" width="700" />
</div>

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
