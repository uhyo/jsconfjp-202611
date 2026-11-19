/**
 * The UI requests of the experiments. Each gives the model all the data, so
 * both formats show the same content and the rendered text can be checked:
 * `expect` lists facts that must appear in the rendered UI (any one
 * spelling of each), `actions` the actions some button must be wired to.
 */
export interface Task {
  id: string;
  prompt: string;
  expect: readonly (readonly string[])[];
  actions: readonly string[];
}

export const tasks: readonly Task[] = [
  {
    id: "product",
    prompt:
      "Aurora ワイヤレスヘッドホンの商品カードを表示して。在庫ありのバッジ、" +
      "「ノイズキャンセリング搭載のオーバーイヤー型。バッテリーは最大30時間」という説明、" +
      "価格 ¥24,800・評価 4.8・レビュー 1284件 の数値、カートに入れるボタン。",
    expect: [["Aurora"], ["24,800", "24800"], ["4.8"], ["1284", "1,284"], ["30時間"]],
    actions: ["addToCart"],
  },
  {
    id: "dashboard",
    prompt:
      "今週のアクセスのダッシュボードを表示して。訪問者 9320、登録 418、解約率 1.2%。" +
      "先週より訪問者が12%増えたことを info の注記で。流入元は 検索 54%、SNS 23%、" +
      "広告 15%、その他 8% をリストで。",
    expect: [["9320", "9,320"], ["418"], ["1.2%"], ["12%"], ["54%"], ["23%"], ["15%"], ["8%"]],
    actions: [],
  },
  {
    id: "profile",
    prompt:
      "ユーザー 佐藤 花子（イニシャル HS）のプロフィールカードを表示して。役職は" +
      "「フロントエンドエンジニア」、認証済みのバッジ。フォロワー 1520・フォロー 230・" +
      "投稿 87 の統計と、詳細を見るボタン。",
    expect: [["佐藤"], ["HS"], ["フロントエンドエンジニア"], ["1520", "1,520"], ["230"], ["87"]],
    actions: ["showDetails"],
  },
  {
    id: "order",
    prompt:
      "注文 #A-10293 の状況を表示して。ステータスは「配送中」。商品は USB-C ケーブル ×2、" +
      "充電器 65W ×1、ノートPCスタンド ×1。台風の影響で配送が1日遅れる見込みであることを" +
      "警告として表示。サポートに問い合わせるボタン。",
    expect: [["A-10293"], ["配送中"], ["USB-C"], ["65W"], ["スタンド"], ["台風"]],
    actions: ["contactSupport"],
  },
  {
    id: "weather",
    prompt:
      "東京の3日間の天気予報を横並びのカードで表示して。明日: 晴れ 最高24℃/最低15℃、" +
      "明後日: くもり 21℃/14℃、3日後: 雨 18℃/13℃。雨の日には傘が必要という注記も。",
    expect: [["晴"], ["くもり", "曇"], ["雨"], ["24"], ["21"], ["18"], ["傘"]],
    actions: [],
  },
  {
    id: "plans",
    prompt:
      "料金プランを3つ並べて比較表示して。Free: 月額0円、プロジェクト3つ、コミュニティサポート。" +
      "Pro: 月額1,200円、プロジェクト無制限、メールサポート、おすすめバッジ付き。" +
      "Team: 月額4,800円、Pro の全機能、SSO、優先サポート。それぞれにプランを選ぶボタン。",
    expect: [["Free"], ["Pro"], ["Team"], ["1,200", "1200"], ["4,800", "4800"], ["SSO"], ["無制限"]],
    actions: ["choosePlan"],
  },
  {
    id: "team",
    prompt:
      "チームメンバー5人の一覧を表示して。田中 健（TK, リード）、鈴木 美咲（SM, デザイナー）、" +
      "高橋 翔（TS, バックエンド）、伊藤 彩（IA, フロントエンド）、渡辺 大輔（WD, QA）。" +
      "それぞれにアバターと役割のバッジ。",
    expect: [["田中"], ["鈴木"], ["高橋"], ["伊藤"], ["渡辺"], ["TK"], ["WD"], ["デザイナー"], ["QA"]],
    actions: [],
  },
  {
    id: "incident",
    prompt:
      "決済APIの障害レポートを表示して。ステータスは「調査中」。影響: カード決済の失敗、" +
      "注文確定の遅延、管理画面のタイムアウト。エラー率 37%、影響ユーザー 約2,400人、" +
      "復旧見込み 30分。警告の注記と、再試行ボタン。",
    expect: [["決済"], ["調査中"], ["カード"], ["タイムアウト"], ["37%"], ["2,400", "2400"], ["30分"]],
    actions: ["retry"],
  },
];
