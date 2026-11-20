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
layout: demo
---

# デモ: 同じUIを並べてストリーミング

<CompareDemo sample="product" />


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
layout: section
---

# 比較実験

---

# 比較実験

json-renderとingenuiのそれぞれで、<br />Claudeに同じUIを生成させた。

<br />

- 8種類のUI × 4つのモデル設定で実験
- 同じコンポーネント定義・同じ依頼文<br /><small>（プロンプトはそれぞれのライブラリが提供するものを使用）</small>

<!--
- コンポーネント13種類。依頼は商品カード、ダッシュボード、プロフィール、注文状況、天気予報、料金プラン比較、メンバー一覧、障害レポート
- モデル設定: Haiku 5.5（思考なし / effort: low）× 20回、Sonnet 5.5・Opus 5.5（effort: low）× 5回
- カタログはパラメータを揃えている: tone/variant は両方 string（ingenuiの型にenumがないため）
- json-render は catalog.prompt()（デフォルトの standalone モード）、ingenui は formatGenUiPrompt
- 依頼文にデータを全部書いておき、描画結果にそれが出ているかで判定
- コードと生データ: experiments/ （pnpm exp:run / exp:count / exp:report）
-->

---
layout: demo
---

# 結果: UIのトークン数

<ExperimentResults view="actual-ui" />

<!--
- 同じ依頼に対する、それぞれの形式の実際の応答（成功したもの）のUI部分を数えた
- 平均で json-render は ingenui の約2.8倍のトークン
- メンバー一覧だけ差が小さい（×1.5）: json-render は repeat + state で「1人分のテンプレート + データ配列」と書けるため。JSXにはループがないので5人分を書き下す。json-render の応答の約3分の1が state を使っていた
- 「完全に同じUI」でも比べた: ingenuiの出力を同じ画面を描くSpecStreamに機械的に変換すると ×2.8（実際の応答との差は、変換のキーが短いことと、repeat を使わないこと）
- トークン数は count_tokens API（Haiku 5.5 のトークナイザ）
-->

---
layout: demo
---

# 結果: その他の数値（入出力関連）

<ExperimentResults view="per-request" condition="haiku-low" />

<!--
- 出力トークンが約3倍 → 応答時間も約3倍、料金も約3.5倍
- システムプロンプトもjson-renderは約4倍（state, repeat, visible, watch…の説明が入る）
- 他のモデル条件でも傾向は同じ（experiments/results/summary.md）
-->

---

# 結果: 成功率

<ExperimentResults view="success" />

<br />

UIを正しく出力できた割合。どちらもほぼ100%。

<!--
- Haiku は 8種類 × 20回、Sonnet / Opus は 8種類 × 5回
- 安いモデル・低effortでも、どちらの形式もちゃんと書ける
- 差がでたのは「コスト」のほう
-->

---

# 失敗の例

<Columns>
<div>

**ingenui**: コンポーネントの仕様を誤解する<small>（`value="1.2%"`が正解）</small>

```jsx
<Stat label="解約率" value={1.2} />
```

</div>
<div>

**json-render**: ない型を<br />作る

```json
{"type":"member-list", …}
```

</div>
</Columns>

方式の問題というよりプロンプトの書き方の範疇か。

<!--
- ingenui側の失敗は、ほぼ全部ダッシュボードの「解約率 1.2%」（Haiku・思考なしで 6/20回）。value={1.2} と数値リテラルで書いてしまう
  （一度は value={1.2%} という不正な式も）。valueの説明を工夫すれば減らせそう
- json-render側は、カタログにない member-list 型を作る、repeat の子要素がない、children の欠落など
-->

---

# 仮説の検証

- **文字数効率（出力）**: JSXは約2.8倍少ない<br />→ 時間・料金も約3倍の差
- **成功率**: 差は見られず

<br />

システムプロンプトはjson-renderが4倍くらい<br />長いので、JSXのほうがAIが書き慣れていると言えなくもないかも？

<!--
- 書き慣れについては、成功率では差が出なかった。ただし json-render は約4倍長いシステムプロンプトで書き方を教えている
- つまり「同じ成功率を、ずっと少ないプロンプトと出力で達成できる」というのが結論
-->

---

# 前半のまとめ

- AIに**JSXを出力**してもらうことで、効率よくUIを生成できる
- **インクリメンタルJSXパーサー**を実装することで、この方式を実現できた

---
layout: section
---

# JSXパーサーを取り巻く<br />フレームワーク

---
layout: center
---

<img src="./ingenui-hero.png" />

---

# フレームワークの役割

- Markdownのレンダリングとその中の<br />**ui+jsx**ブロックのサポート
- 会話サイクルの制御<small>（インタラクション・エラー処理）</small>
- プロンプト類の提供

---
layout: center
---

<img src="./ingenui-overview-light.svg" />

---

# サーバーの役割

LLMから送られてきたストリームを、**検証**しつつ、クライアントに流す。

**検証:** 構文エラーやスキーマ違反などをチェック。

問題があれば、サーバーからLLMにフィードバックして会話を継続する。

---

# 構成要素: 共有スキーマ

コンポーネント定義の名前やpropsなど。

- プロンプトに含まれ、AIにコンポーネントを<br />認識させる
- サーバーでのエラー処理にも使用される

---

# 構成要素: JSXパーサー

- クライアント側: Reactコンポーネントツリーに変換し、描画
- サーバー側: ストリームの検証だけ行う

---

# インタラクション

ボタンなどに `onClick={actions.buy}` のように<br />**アクション**が設定されている。

ユーザーが操作すると、どのアクションが呼ばれたのかがLLMに通知され、会話が継続。

---
layout: demo
---

# デモ: ingenuiのメッセージ（再掲）

<GenUiMessageDemo sample="product" />

---

# エラーリカバリー

JSX部分に問題があった場合、フレームワークがエラーメッセージを生成。

それをLLMに送ることでリトライする。

クライアント側ではError Boundaryによりエラー表示となり、AIが自主的に修正したように見える。

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
layout: section
---

# FAQ

---

# AIが&lt;script&gt;とかを出力してしまう危険はないの？

**A.** AIが出力するのはあくまでJSXであり、生のHTMLではありません。

あらかじめこちらで定義したコンポーネントのみがレンダリングされるため、予期せずスクリプトが実行されることはありません。

---

# これはReact専用なの？

**A.** ingenuiはReact専用ですが、アイデア自体は<br />どこでも応用可能です。

JSXはあくまで構文なので、それをパースして、<br />お使いの言語/ライブラリのコンポーネントに変換する仕組みを作れば応用可能です。

---
layout: section
---

# まとめ:<br />このトークで学んだこと

---

# まとめ: AIにJSXを書かせるアイデア

- JSONとかよりも文字列効率がいい
- AIもUIの表現方法として慣れているはず
- 既存技術の寄せ集めではなく、<br />インクリメンタルJSXパーサーが必要

---

# まとめ: Generative UIフレームワークの概観

- ワイヤーフォーマットの整備
  - `ui+jsx`ブロック（ingenuiの場合）
  - プロンプト類の提供
- 会話サイクルの制御
  - アクションによる返答
  - サーバーでの割り込みエラー処理

---

# まとめ: みなさんができること

- ingenuiでGenerative UIを実践してもいい
  - https://github.com/uhyo/ingenui
- JSXというアイデアを活かして独自のGenerative UIフレームワークを作ってもいい
- AI時代の良いUXについて考えたい