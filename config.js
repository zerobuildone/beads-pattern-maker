// ============================================================
// アフィリエイト設定（ここだけ自分のIDに書き換える）
// 空文字のままでも動く（通常リンクとして出力される）
// ============================================================
window.AFF_CONFIG = {
  // Amazonアソシエイト トラッキングID（例: "xxxxxx-22"）
  amazonTag: "exs0601-22",

  // 米Amazon (amazon.com) 用アソシエイトタグ（例: "xxxxx-20"）
  // 英語表示のとき購入リンクがamazon.comになる。米国側の登録が必要（未登録なら空でOK）
  amazonComTag: "",

  // 楽天アフィリエイトID（リンク作成ツールが生成するURLの /ichiba/～/ 部分の4節ID）
  // 空なら通常の楽天リンクになる
  rakutenId: "55ceabca.002ebfdf.55ceabcb.c355ac42",

  // Artkal公式アフィリエイトの紹介コード（登録後に発行される値）
  // リンク先: artkalfusebeads.com（報酬10%・Cookie 30日）
  artkalRef: "461",
  // 紹介コードのURLパラメータ名（Artkal公式はAffiliatly運営のため "aff"）
  artkalRefParam: "aff",

  // Google Analytics 4 測定ID（例: "G-XXXXXXXXXX"）
  // analytics.google.com でプロパティ作成 → データストリーム追加で発行される。空なら計測なし
  gaId: "G-L8L3LJ2P45",
};
