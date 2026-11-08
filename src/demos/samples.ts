/**
 * What the (simulated) model says in the demos. Slides pick one by id
 * (`<JsxStreamDemo sample="product" />`) or pass their own `source`.
 *
 * - `jsx`: raw JSX for the parser demos.
 * - `messages`: ingenui messages — Markdown with ```ui+jsx fences.
 * - `specs`: json-render SpecStreams (JSONL of RFC 6902 patches), each the
 *   same UI as the `jsx` sample with the same id.
 */

export const jsx = {
  product: `<Card>
  <CardHeader>
    <Title>Aurora ワイヤレスヘッドホン</Title>
    <Badge tone="success">在庫あり</Badge>
  </CardHeader>
  <CardBody>
    <Text>
      ノイズキャンセリング搭載のオーバーイヤー型。
      バッテリーは最大30時間持ちます。
    </Text>
    <Row>
      <Stat label="価格" value="¥24,800" />
      <Stat label="評価" value={4.8} />
      <Stat label="レビュー" value={1284} />
    </Row>
    <Button variant="primary" onClick={actions.addToCart}>カートに入れる</Button>
  </CardBody>
</Card>`,

  dashboard: `<Card>
  <Title>今週のアクセス</Title>
  <Row>
    <Stat label="訪問者" value={9320} />
    <Stat label="登録" value={418} />
    <Stat label="解約率" value="1.2%" />
  </Row>
  <Callout tone="info">
    先週より訪問者が <Badge tone="success">+12%</Badge> 増えました。
  </Callout>
  <List>
    <Item>流入元のトップは <b>検索</b>（54%）</Item>
    <Item>モバイル比率は <b>68%</b></Item>
  </List>
</Card>`,
} satisfies Record<string, string>;

export const specs = {
  product: `{"op":"add","path":"/root","value":"card"}
{"op":"add","path":"/elements/card","value":{"type":"Card","props":{},"children":["header","body"]}}
{"op":"add","path":"/elements/header","value":{"type":"CardHeader","props":{},"children":["title","badge"]}}
{"op":"add","path":"/elements/title","value":{"type":"Title","props":{"text":"Aurora ワイヤレスヘッドホン"},"children":[]}}
{"op":"add","path":"/elements/badge","value":{"type":"Badge","props":{"label":"在庫あり","tone":"success"},"children":[]}}
{"op":"add","path":"/elements/body","value":{"type":"CardBody","props":{},"children":["text","stats","button"]}}
{"op":"add","path":"/elements/text","value":{"type":"Text","props":{"text":"ノイズキャンセリング搭載のオーバーイヤー型。バッテリーは最大30時間持ちます。"},"children":[]}}
{"op":"add","path":"/elements/stats","value":{"type":"Row","props":{},"children":["price","rating","reviews"]}}
{"op":"add","path":"/elements/price","value":{"type":"Stat","props":{"label":"価格","value":"¥24,800"},"children":[]}}
{"op":"add","path":"/elements/rating","value":{"type":"Stat","props":{"label":"評価","value":4.8},"children":[]}}
{"op":"add","path":"/elements/reviews","value":{"type":"Stat","props":{"label":"レビュー","value":1284},"children":[]}}
{"op":"add","path":"/elements/button","value":{"type":"Button","props":{"label":"カートに入れる","variant":"primary"},"on":{"press":{"action":"addToCart"}},"children":[]}}
`,
} satisfies Record<string, string>;

export const messages = {
  product: `ご要望に合いそうなヘッドホンを見つけました。

\`\`\`ui+jsx
${jsx.product}
\`\`\`

ほかの候補も見たい場合は **お気軽にどうぞ**。

\`\`\`ui+jsx
<Row>
  <Button variant="ghost" onClick={actions.showCheaper}>もっと安いもの</Button>
  <Button variant="ghost" onClick={actions.showWireless}>完全ワイヤレス</Button>
</Row>
\`\`\`
`,

  // A message with mistakes, to show issues and the feedback report.
  broken: `今週のレポートです。

\`\`\`ui+jsx
<Card>
  <Title>今週のアクセス</Title>
  <Row>
    <Stat label="訪問者" value={9320} />
    <Stat label="登録" value={signups} />
  </Row>
  <Chart data={weekly} />
  <Button onClick="alert(1)">詳細</Button>
</Card>
\`\`\`
`,
} satisfies Record<string, string>;

export type JsxSampleId = keyof typeof jsx;
export type SpecSampleId = keyof typeof specs;
export type MessageSampleId = keyof typeof messages;

export function pick<T extends Record<string, string>>(
  samples: T,
  id: string | undefined,
  source: string | undefined,
): string {
  if (source !== undefined) return source;
  if (id !== undefined && id in samples) return samples[id as keyof T]!;
  throw new Error(`Unknown sample "${id}". Available: ${Object.keys(samples).join(", ")}`);
}
