"use strict";

/* ============================================================
 * アイロンビーズ図案メーカー
 * 変換はすべてブラウザ内で完結（画像は送信されない）
 * 色データ: maxcleme/beadcolors (MIT)
 * ============================================================ */

const CFG = window.AFF_CONFIG || {};
const PAL = window.BEAD_PALETTES || {};

/* ---------- 言語 ---------- */

let LANG = "ja";
try {
  LANG = localStorage.getItem("beads_lang") ||
    ((navigator.language || "ja").toLowerCase().startsWith("ja") ? "ja" : "en");
} catch (e) { /* localStorage不可の環境でも動かす */ }

/* ---------- 購入リンク生成 ---------- */
/* 日本語表示: Amazon.co.jp / 楽天 / Artkal日本語ストア
 * 英語表示:   Amazon.com / Artkal英語ストア （海外ユーザー向け導線） */

function amazonSearch(q) {
  let u = "https://www.amazon.co.jp/s?k=" + encodeURIComponent(q);
  if (CFG.amazonTag) u += "&tag=" + encodeURIComponent(CFG.amazonTag);
  return u;
}
function amazonComSearch(q) {
  let u = "https://www.amazon.com/s?k=" + encodeURIComponent(q);
  if (CFG.amazonComTag) u += "&tag=" + encodeURIComponent(CFG.amazonComTag);
  return u;
}
function rakutenSearch(q) {
  const base = "https://search.rakuten.co.jp/search/mall/" + encodeURIComponent(q) + "/";
  if (CFG.rakutenId) {
    return "https://hb.afl.rakuten.co.jp/hgc/" + CFG.rakutenId +
      "/?pc=" + encodeURIComponent(base) + "&m=" + encodeURIComponent(base);
  }
  return base;
}
function artkalSearch(q) {
  const host = LANG === "ja" ? "https://ja.artkalfusebeads.com" : "https://www.artkalfusebeads.com";
  let u = host + "/search?q=" + encodeURIComponent(q);
  if (CFG.artkalRef) {
    u += "&" + (CFG.artkalRefParam || "sca_ref") + "=" + encodeURIComponent(CFG.artkalRef);
  }
  return u;
}

const hamaNum = (code) => code.replace(/^H/, "");

// 楽天の商品ページ直リンク（アフィリIDがあればhb.afl経由に変換）
// 形式は公式リンク作成ツールの実物に合わせる: /ichiba/{ID}/?pc={URL}&link_type=text
function rakutenDirect(url) {
  if (CFG.rakutenId) {
    return "https://hb.afl.rakuten.co.jp/ichiba/" + CFG.rakutenId +
      "/?pc=" + encodeURIComponent(url) + "&link_type=text";
  }
  return url;
}

// Artkal公式ストアのURL生成（アフィリの aff パラメータを付与）
function artkalUrl(path) {
  const host = LANG === "ja" ? "https://ja.artkalfusebeads.com" : "https://www.artkalfusebeads.com";
  let u = host + path;
  if (CFG.artkalRef) {
    u += (u.includes("?") ? "&" : "?") +
      (CFG.artkalRefParam || "aff") + "=" + encodeURIComponent(CFG.artkalRef);
  }
  return u;
}
// 色コード→商品ページ直リンク(ap)が無い色のための、シリーズ別売り場フォールバック
const ARTKAL_SINGLES = {
  artkal_s: "/collections/s-5mm-artkal-beads-1000-6000beads-single-pack",
  artkal_c: "/collections/c-2-6mm-mini-artkal-beads-2000-beads-single-pack",
  artkal_m: "/collections/mini-m-2000p-bag",
  artkal_a: "/collections/mini-a-2-6-soft-artkal-beads",
  artkal_r: "/collections/all",
};
const artkalLinksFor = (seriesKey) => (c) => [
  { label: LANG === "ja" ? "Artkal公式" : "Artkal Store",
    url: artkalUrl(c.ap || ARTKAL_SINGLES[seriesKey] || "/collections/all") },
];

/* 色エントリ c = {c:色番号, n:色名, s:記号, rgb, lab, lk:リンク種別, bl:ブランド表示名, u:直リンクURL} */
/* 実売品番の形式（現物調査に基づく）:
 *  - パーラービーズ 単色1000P: カワダ品番 + "K"（例: 80-15211K トマト）
 *  - ハマ ミディ 単色1000P: ボーネルンド扱い "MH207-xx"（xx = Hama色番号）
 *  - ハマ ミニ 単色2000P: "MH501-xx" */
const LINKS = {
  kawada: (c) => {
    if (LANG !== "ja") {
      return [{ label: "Amazon", url: amazonComSearch("Perler beads 1000 " + c.n) }];
    }
    // 検索クエリ: 80-系品番はK付き品番で、旧4桁品番の色は日本語色名で当てる
    const q = /^80-/.test(c.c) ? "パーラービーズ " + c.c + "K" : "パーラービーズ 単色 " + (c.nj || c.n);
    if (c.u) {
      return [
        { label: "楽天(直)", url: rakutenDirect(c.u) },
        { label: "Amazon", url: amazonSearch(q) },
      ];
    }
    return [
      { label: "Amazon", url: amazonSearch(q) },
      { label: "楽天", url: rakutenSearch(q) },
    ];
  },
  hama_midi: (c) => LANG === "ja"
    ? (c.u
      ? [
        { label: "楽天(直)", url: rakutenDirect(c.u) },
        { label: "Amazon", url: amazonSearch("ハマビーズ MH207-" + hamaNum(c.c)) },
      ]
      : [
        { label: "Amazon", url: amazonSearch("ハマビーズ MH207-" + hamaNum(c.c)) },
        { label: "楽天", url: rakutenSearch("ハマビーズ MH207-" + hamaNum(c.c)) },
      ])
    : [{ label: "Amazon", url: amazonComSearch("Hama beads H207-" + hamaNum(c.c)) }],
  // ハマ ミニの単色は日本ではボーネルンド公式ECのみ（Amazon/楽天に流通なし・実査済み）
  hama_mini: (c) => LANG === "ja"
    ? (c.u
      ? [{ label: "ボーネルンド公式", url: c.u }]
      : [{ label: "Amazon", url: amazonSearch("ハマビーズ ミニ " + (c.nj || c.n)) }])
    : [{ label: "Amazon", url: amazonComSearch("Hama mini beads H501-" + hamaNum(c.c)) }],
  hama_maxi: (c) => LANG === "ja"
    ? [
      { label: "Amazon", url: amazonSearch("ハマビーズ マキシ " + c.n) },
      { label: "楽天", url: rakutenSearch("ハマビーズ マキシ " + c.n) },
    ]
    : [{ label: "Amazon", url: amazonComSearch("Hama maxi beads " + c.n) }],
  // Perlerミニは日本ではカワダが販売しておらず輸入品のみ（公式DBで確認済み）
  perler_mini_us: (c) => LANG === "ja"
    ? [{ label: "Amazon", url: amazonSearch("Perler ミニビーズ " + c.n) }]
    : [{ label: "Amazon", url: amazonComSearch("Perler mini beads 2000 " + c.n) }],
  artkal_s: null, artkal_c: null, artkal_m: null, artkal_a: null, artkal_r: null, // 下で設定
  nanobeads: (c) => {
    const out = [];
    if (c.u) {
      // 楽天のカワダ直営系ショップの商品ページ直リンク
      out.push({ label: LANG === "ja" ? "楽天(直)" : "Rakuten", url: rakutenDirect(c.u) });
    }
    out.push({ label: "Amazon", url: LANG === "ja"
      ? amazonSearch("ナノビーズ 単色 " + c.n)
      : amazonComSearch("Kawada nanobeads " + c.n) });
    return out;
  },
};
LINKS.artkal_s = artkalLinksFor("artkal_s");
LINKS.artkal_c = artkalLinksFor("artkal_c");
LINKS.artkal_m = artkalLinksFor("artkal_m");
LINKS.artkal_a = artkalLinksFor("artkal_a");
LINKS.artkal_r = artkalLinksFor("artkal_r");

/* ---------- シリーズ定義 ---------- */
/* mixed: [元パレットkey, リンク種別, ブランド表示名] の配列。
 * 混合の採否は実際のアイロン互換性に基づく:
 *  - Artkal公式が S(硬質5mm) の Perler/Hama 互換を明言 → パーラー×S, ハマ×S を提供
 *  - パーラー×ハマは融点差で接合不良になりやすい → 不採用
 *  - ミニ帯はハマ2.5mm/他社2.6mmで直径不一致 → 不採用
 *  - Artkal R/A(軟質)はメーカーが単独使用推奨 → 不採用 */

const MIX_NOTE_COMMON =
  "混合できない組み合わせ（パーラー×ハマ＝融点差で接合不良／ミニ帯の異ブランド＝直径違い／" +
  "Artkal R・A＝軟質で単独使用推奨）の理由は<a href=\"#about-mixing\">「ブランド混合モードについて」</a>を参照。";
const MIX_NOTE_COMMON_EN =
  "Combinations we deliberately don't offer (Perler × Hama = melting-point mismatch / cross-brand minis = " +
  "different diameters / Artkal R·A = soft series, maker recommends solo use): see " +
  "<a href=\"#about-mixing-en\">About brand mixing mode</a>.";

const SERIES = [
  { key: "perler", group: "パーラービーズ（カワダ）", groupEn: "Perler (Kawada)",
    label: "標準 5mm（103色）", labelEn: "Midi 5mm (103 colors)", links: "kawada" },
  { key: "perler_mini", group: "パーラービーズ（カワダ）", groupEn: "Perler (Kawada)",
    label: "ミニ 2.6mm（41色・米国Perler/輸入品）", labelEn: "Mini 2.6mm (41 colors, US import)",
    links: "perler_mini_us" },
  { key: "nanobeads", group: "ナノビーズ（カワダ）", groupEn: "Nanobeads (Kawada)",
    label: "ナノビーズ 約2.6mm（55色）", labelEn: "Nanobeads ~2.6mm (55 colors)", links: "nanobeads" },
  { key: "hama", group: "ハマビーズ（Hama）", groupEn: "Hama",
    label: "ミディ 5mm（92色）", labelEn: "Midi 5mm (92 colors)", links: "hama_midi" },
  { key: "hama_mini", group: "ハマビーズ（Hama）", groupEn: "Hama",
    label: "ミニ 2.5mm（78色）", labelEn: "Mini 2.5mm (78 colors)", links: "hama_mini" },
  // マキシの単色は日本では販売されていないため英語UIのみ
  { key: "hama_maxi", group: "ハマビーズ（Hama）", groupEn: "Hama",
    label: "マキシ 10mm（25色）", labelEn: "Maxi 10mm (25 colors)", links: "hama_maxi", enOnly: true },
  { key: "artkal_s", group: "Artkal（アートカル）", groupEn: "Artkal",
    label: "Sシリーズ 5mm・硬質（199色）", labelEn: "S series 5mm hard (199 colors)", links: "artkal_s" },
  { key: "artkal_c", group: "Artkal（アートカル）", groupEn: "Artkal",
    label: "Cシリーズ 2.6mmミニ・硬質（174色）", labelEn: "C series 2.6mm mini hard (174 colors)", links: "artkal_c" },
  { key: "artkal_m", group: "Artkal（アートカル）", groupEn: "Artkal",
    label: "Mシリーズ 2.6mmミニ（220色）", labelEn: "M series 2.6mm mini (220 colors)", links: "artkal_m" },
  { key: "artkal_r", group: "Artkal（アートカル）", groupEn: "Artkal",
    label: "Rシリーズ 5mm・軟質（89色）", labelEn: "R series 5mm soft (89 colors)", links: "artkal_r" },
  { key: "artkal_a", group: "Artkal（アートカル）", groupEn: "Artkal",
    label: "Aシリーズ 2.6mmミニ・軟質（145色）", labelEn: "A series 2.6mm mini soft (145 colors)", links: "artkal_a" },
  {
    key: "mix_perler_s",
    group: "ブランド混合（5mm・硬質同士）", groupEn: "Brand mix (5mm, hard beads)",
    label: "パーラービーズ × Artkal S（302色）", labelEn: "Perler × Artkal S (302 colors)",
    mixed: [["perler", "kawada", "パーラー"], ["artkal_s", "artkal_s", "Artkal S"]],
    mixNote:
      "<strong>混合モード：パーラービーズ × Artkal Sシリーズ</strong><br>" +
      "どちらも硬質の5mmビーズで、Artkal公式がPerlerとの互換を明言している組み合わせです。" +
      "推奨アイロン温度に差（Perler高め・Artkal低め）があるため、<strong>本番前に小さなテストピースで試し焼き</strong>してください。<br>" +
      MIX_NOTE_COMMON,
    mixNoteEn:
      "<strong>Mixing mode: Perler × Artkal S series</strong><br>" +
      "Both are hard 5mm beads, and Artkal officially states S-series compatibility with Perler. " +
      "Their recommended ironing temperatures differ slightly (Perler runs hotter), so " +
      "<strong>iron a small test piece before the real project</strong>.<br>" + MIX_NOTE_COMMON_EN,
  },
  {
    key: "mix_hama_s",
    group: "ブランド混合（5mm・硬質同士）", groupEn: "Brand mix (5mm, hard beads)",
    label: "ハマビーズ ミディ × Artkal S（291色）", labelEn: "Hama midi × Artkal S (291 colors)",
    mixed: [["hama", "hama_midi", "ハマ"], ["artkal_s", "artkal_s", "Artkal S"]],
    mixNote:
      "<strong>混合モード：ハマビーズ ミディ × Artkal Sシリーズ</strong><br>" +
      "Artkal公式がHamaとの互換を明言している組み合わせです。ハマは比較的低温で溶けるので、" +
      "<strong>本番前に小さなテストピースで試し焼き</strong>し、アイロン時間を控えめから調整してください。<br>" +
      MIX_NOTE_COMMON,
    mixNoteEn:
      "<strong>Mixing mode: Hama midi × Artkal S series</strong><br>" +
      "Artkal officially states S-series compatibility with Hama. Hama melts at a relatively low temperature, so " +
      "<strong>iron a small test piece first</strong> and start with shorter ironing times.<br>" + MIX_NOTE_COMMON_EN,
  },
];

// 複数パレットをブランドタグ付きで結合する
function mergePalettes(parts) {
  const out = [];
  for (const [pal, lk, bl] of parts) {
    for (const c of pal) {
      out.push({ c: c.c, n: c.n, nj: c.nj, s: c.s, rgb: c.rgb, lab: c.lab, u: c.u, ap: c.ap, lk, bl });
    }
  }
  return out;
}

function prepPalettes() {
  for (const s of SERIES) {
    if (!s.mixed && PAL[s.key]) {
      for (const c of PAL[s.key]) { c.lk = s.links; c.bl = ""; }
    }
  }
  // 日本語UIのパーラー標準は「カワダ公式カラーリスト」を正とする
  // （ラメ・夜光等の特殊色も含む日本の全ラインナップ。米国基準のbeadcolors103色は英語UI用）
  if (LANG === "ja" && PAL.perler_jp && PAL.perler_jp.length) {
    PAL.perler = PAL.perler_jp;
    for (const c of PAL.perler) { c.lk = "kawada"; c.bl = ""; }
    const sp = SERIES.find((x) => x.key === "perler");
    if (sp) sp.label = sp.label.replace("）", "・日本公式ラインナップ）");
  }
  // ハマ ミニ: 日本ではボーネルンド公式ECで買える色だけに絞る
  if (LANG === "ja" && PAL.hama_mini) {
    PAL.hama_mini = PAL.hama_mini.filter((c) => c.u);
    const sh = SERIES.find((x) => x.key === "hama_mini");
    if (sh) sh.label = sh.label.replace("）", "・ボーネルンド公式のみ）");
  }
  // 混合パレットは（絞り込み後の）ベースから構築
  for (const s of SERIES) {
    if (s.mixed) {
      PAL[s.key] = mergePalettes(s.mixed.map(([src, lk, bl]) => [PAL[src] || [], lk, bl]));
    }
  }
  // ラベルの色数表記を実際のパレット数に合わせる
  for (const s of SERIES) {
    const n = (PAL[s.key] || []).length;
    if (!n) continue;
    s.label = s.label.replace(/（\d+色/, `（${n}色`);
    if (s.labelEn) s.labelEn = s.labelEn.replace(/\(\d+ colors?/, `(${n} colors`);
  }
}

const linksFor = (c) => (LINKS[c.lk] || (() => []))(c);

// 表示用の色名（日本語UIでは公式の日本語色名を優先）
const dispName = (c) => (LANG === "ja" && c.nj ? c.nj : c.n);

/* ---------- 色空間 (sRGB -> Lab, D65) ---------- */

function srgbToLab(r, g, b) {
  let rr = r / 255, gg = g / 255, bb = b / 255;
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
  const x = (rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375) / 0.95047;
  const y = (rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750);
  const z = (rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// CIEDE2000 知覚色差（Sharma 2005 準拠）。CIE76より人間の感覚に忠実で、
// 特に青〜紫・低彩度域でのビーズ色選びが改善する
function ciede2000(l1, l2, kL) {
  const L1 = l1[0], a1 = l1[1], b1 = l1[2];
  const L2 = l2[0], a2 = l2[1], b2 = l2[2];
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cb = (C1 + C2) / 2;
  const Cb7 = Math.pow(Cb, 7), P25 = Math.pow(25, 7);
  const G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + P25)));
  const ap1 = (1 + G) * a1, ap2 = (1 + G) * a2;
  const Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
  let hp1 = Cp1 === 0 ? 0 : Math.atan2(b1, ap1) * deg; if (hp1 < 0) hp1 += 360;
  let hp2 = Cp2 === 0 ? 0 : Math.atan2(b2, ap2) * deg; if (hp2 < 0) hp2 += 360;
  const dLp = L2 - L1, dCp = Cp2 - Cp1;
  let dhp = 0;
  if (Cp1 * Cp2 !== 0) {
    dhp = hp2 - hp1;
    if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dhp / 2) * rad);
  const Lbp = (L1 + L2) / 2, Cbp = (Cp1 + Cp2) / 2;
  let hbp = hp1 + hp2;
  if (Cp1 * Cp2 !== 0) {
    if (Math.abs(hp1 - hp2) > 180) hbp += (hp1 + hp2 < 360) ? 360 : -360;
    hbp /= 2;
  }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad)
    + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.20 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Cbp7 = Math.pow(Cbp, 7);
  const RC = 2 * Math.sqrt(Cbp7 / (Cbp7 + P25));
  const SL = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT = -Math.sin(2 * dTheta * rad) * RC;
  const dL = dLp / ((kL || 1) * SL), dC = dCp / SC, dH = dHp / SH;
  return Math.sqrt(dL * dL + dC * dC + dH * dH + RT * dC * dH);
}

// ビーズ選定用の色距離。測色的な最短(ΔE00)そのままではなく「人がビーズを選ぶ基準」に寄せる:
//  - 暗部だけ明度差を割り引く(kL: L≥45で1 → L≤15で2)。素のΔE00は暗い色同士だと明るさの
//    近さが支配的になり、「色相が合う暗い緑」より「明るさが近いだけの黒」が勝ってしまう。
//    一方、肌色などの中明度〜明部はキャラの見た目を決めるので素のΔE00のまま厳密に合わせる
//  - 無彩色⇔有彩色の取り違えに罰則(全明度域)。黒・グレー・白が色物のマスを吸う事故と、
//    グレーのマスに色付きビーズが乗る事故の両方向を抑える
// 肌色域の判定: 人物の顔・肌が取りうる色（明るめの暖色・中彩度）
function isSkinTone(lab) {
  const C = Math.hypot(lab[1], lab[2]);
  if (lab[0] < 55 || C < 8 || C > 35) return false;
  const h = Math.atan2(lab[2], lab[1]) * 180 / Math.PI;
  return h >= 25 && h <= 75;
}

// くすんだ黄土系ビーズ（タン・カーキ・モカ等）: 測色的に肌へ近くても、
// 顔に乗ると「汚れた肌」に見える色域
function isMuddyBead(lab) {
  const C = Math.hypot(lab[1], lab[2]);
  if (lab[0] >= 80 || C >= 30) return false; // L80以上の明るい暖色は正当な肌ビーズ
  const h = Math.atan2(lab[2], lab[1]) * 180 / Math.PI;
  return h > 60 && h < 100;
}

function beadDist(lab, plab) {
  const lBar = (lab[0] + plab[0]) / 2;
  const kL = 1 + Math.min(1, Math.max(0, (45 - lBar) / 30));
  let d = ciede2000(lab, plab, kL);
  const cs = Math.hypot(lab[1], lab[2]);
  const cc = Math.hypot(plab[1], plab[2]);
  const lo = Math.min(cs, cc), hi = Math.max(cs, cc);
  if (lo < 6 && hi > 12) d += (hi - 12) * 0.5;
  if (isSkinTone(lab)) {
    // 肌色のマスには黄土系を避ける補正。人は顔には多少色差があっても桃色寄りを選ぶ。
    // +6に留めることで、本当にタン色の物体（砂・ベージュの服等）は正確一致が勝つ
    if (isMuddyBead(plab)) d += 6;
  } else if (cs >= 15 && cc >= 15) {
    // 同点勝負の決め手は色相: ΔE00は「明度が少し近いカーキ」と「色相が合う緑」を
    // ほぼ同点にするが、人の目には色相のズレ（緑→黄土等）の方が「汚れ」に見える。
    // 15°以内は無罰＝正当な近縁色（エバーグリーン等）の選択には影響しない
    let dh = Math.abs(Math.atan2(lab[2], lab[1]) - Math.atan2(plab[2], plab[1])) * 180 / Math.PI;
    if (dh > 180) dh = 360 - dh;
    if (dh > 15) d += (dh - 15) * 0.35;
  }
  return d;
}

// 最近色: CIE76二乗距離で上位候補に絞ってからビーズ選定距離(beadDist)で精密比較（速度と精度の両立）
// K=16: beadDistはCIE76と順位が入れ替わりやすいため、候補は広めに残す
function nearestIndex(lab, palette) {
  const K = 16;
  const candIdx = new Int32Array(K).fill(-1);
  const candD = new Float64Array(K).fill(Infinity);
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i].lab;
    const dL = lab[0] - p[0], dA = lab[1] - p[1], dB = lab[2] - p[2];
    const d = dL * dL + dA * dA + dB * dB;
    if (d < candD[K - 1]) {
      let j = K - 1;
      while (j > 0 && candD[j - 1] > d) { candD[j] = candD[j - 1]; candIdx[j] = candIdx[j - 1]; j--; }
      candD[j] = d; candIdx[j] = i;
    }
  }
  let best = candIdx[0], bestD = Infinity;
  for (let k = 0; k < K; k++) {
    const i = candIdx[k];
    if (i < 0) break;
    const d = beadDist(lab, palette[i].lab);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/* ---------- セルのサンプリング ---------- */
/* 戻り値: [r, g, b, alpha平均] */

// 平均色（写真向け）: 領域全体のアルファ加重平均
function averageCell(src, sw, sx0, sx1, sy0, sy1) {
  let r = 0, g = 0, b = 0, a = 0, n = 0;
  for (let sy = sy0; sy < sy1; sy++) {
    let p = (sy * sw + sx0) * 4;
    for (let sx = sx0; sx < sx1; sx++, p += 4) {
      const al = src[p + 3] / 255;
      r += src[p] * al; g += src[p + 1] * al; b += src[p + 2] * al;
      a += al; n++;
    }
  }
  if (a <= 0) return [0, 0, 0, 0];
  return [r / a, g / a, b / a, a / n];
}

// 主要色（イラスト向け）: 領域内で最も面積の大きい色（16階調バケツの多数決）
// keepOutline時は、暗い画素（輪郭線）が一定割合を占めるマスを輪郭色にする
function dominantCell(src, sw, sx0, sx1, sy0, sy1, keepOutline) {
  const buckets = new Map(); // key -> [count, rSum, gSum, bSum]
  let aSum = 0, n = 0, opaque = 0;
  let darkCount = 0, darkR = 0, darkG = 0, darkB = 0;
  for (let sy = sy0; sy < sy1; sy++) {
    let p = (sy * sw + sx0) * 4;
    for (let sx = sx0; sx < sx1; sx++, p += 4) {
      const al = src[p + 3] / 255;
      aSum += al; n++;
      if (al < 0.5) continue;
      opaque++;
      const r = src[p], g = src[p + 1], b = src[p + 2];
      if (r < 80 && g < 80 && b < 90) {
        darkCount++; darkR += r; darkG += g; darkB += b;
      }
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      let e = buckets.get(key);
      if (!e) { e = [0, 0, 0, 0]; buckets.set(key, e); }
      e[0]++; e[1] += r; e[2] += g; e[3] += b;
    }
  }
  if (opaque === 0) return [0, 0, 0, aSum / n];
  if (keepOutline && darkCount / opaque >= 0.25) {
    return [darkR / darkCount, darkG / darkCount, darkB / darkCount, aSum / n];
  }
  let best = null;
  for (const e of buckets.values()) if (!best || e[0] > best[0]) best = e;
  return [best[1] / best[0], best[2] / best[0], best[3] / best[0], aSum / n];
}

// 細い輪郭線の保護（縮小前処理）:
// 「すでに暗い かつ エッジ上」の画素だけを検出して周囲へ膨張させる。
// 1〜2pxの主線はそのままだとセル内占有率が低すぎて多数決で消えるため、
// 縮小前に太らせて生き残らせる（NeSprite Studioの縮小前エッジ抽出と同じ発想。
// 明るい絵に新しい輪郭を描き足すことはしない）
function boostThinOutlines(src, sw, sh, cellPx) {
  const n = sw * sh;
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    gray[i] = src[p + 3] < 128 ? 255 : 0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2];
  }
  // 暗い画素のうち、周囲との輝度差が大きいもの＝主線
  const mask = new Uint8Array(n);
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const i = y * sw + x;
      if (gray[i] > 90) continue;
      const gx = gray[i + 1] - gray[i - 1];
      const gy = gray[i + sw] - gray[i - sw];
      if (gx * gx + gy * gy > 3600) mask[i] = 1; // 輝度差60相当
    }
  }
  // セル幅の約1/4だけ膨張（横→縦の2パス）
  const r = Math.max(1, Math.round(cellPx * 0.25));
  const tmp = new Uint8Array(n);
  for (let y = 0; y < sh; y++) {
    let acc = 0;
    for (let x = -r; x < sw; x++) {
      if (x + r < sw) acc += mask[y * sw + x + r];
      if (x - r - 1 >= 0) acc -= mask[y * sw + x - r - 1];
      if (x >= 0 && acc > 0) tmp[y * sw + x] = 1;
    }
  }
  const out = new Uint8ClampedArray(src);
  const dil = new Uint8Array(n);
  for (let x = 0; x < sw; x++) {
    let acc = 0;
    for (let y = -r; y < sh; y++) {
      if (y + r < sh) acc += tmp[(y + r) * sw + x];
      if (y - r - 1 >= 0) acc -= tmp[(y - r - 1) * sw + x];
      if (y >= 0 && acc > 0) dil[y * sw + x] = 1;
    }
  }
  // 膨張域を暗色化（元の主線色に寄せた濃い色）
  for (let i = 0; i < n; i++) {
    if (!dil[i]) continue;
    const p = i * 4;
    if (out[p + 3] < 128) continue;
    out[p] = Math.min(out[p], 45);
    out[p + 1] = Math.min(out[p + 1], 45);
    out[p + 2] = Math.min(out[p + 2], 50);
  }
  return out;
}

// 背景除去の対象マスを決める。
// 「白っぽい色」を全部消すと目や縁取りの白まで消えてしまうため、
// 背景候補（白 or 外周支配色に近い色）のうち「画像の外周と連結している領域」だけを
// 塗りつぶし探索(BFS)で特定して消す。キャラ内部に閉じた白はビーズとして残る
function computeBgRemoval(cellRgb, cellAlpha, W, H, bgColors) {
  const total = W * H;
  const cand = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (cellAlpha[i] < 0.5) continue;
    const r = cellRgb[i * 3], g = cellRgb[i * 3 + 1], b = cellRgb[i * 3 + 2];
    const lab = srgbToLab(r, g, b);
    let isCand = lab[0] > 92 && Math.abs(lab[1]) < 7 && Math.abs(lab[2]) < 7;
    if (!isCand) {
      for (const bc of bgColors) {
        const dr = r - bc[0], dg = g - bc[1], db = b - bc[2];
        if (dr * dr + dg * dg + db * db <= 1200) { isCand = true; break; }
      }
    }
    cand[i] = isCand ? 1 : 0;
  }
  const remove = new Uint8Array(total);
  const queue = [];
  const push = (i) => {
    if (cand[i] && !remove[i]) { remove[i] = 1; queue.push(i); }
  };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (queue.length) {
    const i = queue.pop();
    const x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W);
    if (y < H - 1) push(i + W);
  }
  return remove;
}

// 近い色のセルを多数派の色に統合する（JPEG圧縮やテクスチャの色ブレで
// 「元は同じ単色」だったドットがバラバラのビーズ色に割れるのを防ぐ）
function consolidateCellColors(cellRgb, cellAlpha, total, maxDE) {
  const counts = new Map();
  const keyOf = (i) =>
    (Math.round(cellRgb[i * 3]) << 16) |
    (Math.round(cellRgb[i * 3 + 1]) << 8) |
    Math.round(cellRgb[i * 3 + 2]);
  for (let i = 0; i < total; i++) {
    if (cellAlpha[i] < 0.5) continue;
    const key = keyOf(i);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const reps = [];
  const remap = new Map();
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [key] of sorted) {
    const r = (key >> 16) & 255, g = (key >> 8) & 255, b = key & 255;
    const lab = srgbToLab(r, g, b);
    let found = null;
    for (const rep of reps) {
      if (ciede2000(lab, rep.lab) <= maxDE) { found = rep; break; }
    }
    if (!found) { found = { lab, rgb: [r, g, b] }; reps.push(found); }
    remap.set(key, found);
  }
  for (let i = 0; i < total; i++) {
    if (cellAlpha[i] < 0.5) continue;
    const rep = remap.get(keyOf(i));
    if (rep) {
      cellRgb[i * 3] = rep.rgb[0];
      cellRgb[i * 3 + 1] = rep.rgb[1];
      cellRgb[i * 3 + 2] = rep.rgb[2];
    }
  }
}

/* ---------- ドット絵の格子検出 ---------- */

// 余白トリミング: 四隅の色（または透明）だけで構成される外周の行・列を削る
function cropBox(src, sw, sh) {
  const cornerOpaque = src[3] >= 128;
  const cr = src[0], cg = src[1], cb = src[2];
  const removable = (p) => {
    if (src[p + 3] < 128) return true;
    if (!cornerOpaque) return false;
    const dr = src[p] - cr, dg = src[p + 1] - cg, db = src[p + 2] - cb;
    return dr * dr + dg * dg + db * db <= 1200;
  };
  let x0 = 0, x1 = sw, y0 = 0, y1 = sh;
  const rowOk = (y) => { for (let x = x0; x < x1; x++) if (!removable((y * sw + x) * 4)) return false; return true; };
  const colOk = (x) => { for (let y = y0; y < y1; y++) if (!removable((y * sw + x) * 4)) return false; return true; };
  while (y0 < y1 - 1 && rowOk(y0)) y0++;
  while (y1 - 1 > y0 && rowOk(y1 - 1)) y1--;
  while (x0 < x1 - 1 && colOk(x0)) x0++;
  while (x1 - 1 > x0 && colOk(x1 - 1)) x1--;
  return { x0, y0, w: x1 - x0, h: y1 - y0 };
}

// 色の変化量プロファイル: E[i] = 位置iと1つ前の行/列の色差の平均
// （ドット境界・方眼線の位置で大きくなる。透明は白として比較）
function edgeProfile(src, sw, box, vertical) {
  const len = vertical ? box.w : box.h;
  const other = vertical ? box.h : box.w;
  const E = new Float64Array(len);
  for (let i = 1; i < len; i++) {
    let sum = 0;
    for (let j = 0; j < other; j++) {
      const x = vertical ? box.x0 + i : box.x0 + j;
      const y = vertical ? box.y0 + j : box.y0 + i;
      const p = (y * sw + x) * 4;
      const q = vertical ? p - 4 : p - sw * 4;
      const a1 = src[p + 3] / 255, a2 = src[q + 3] / 255;
      const d =
        Math.abs((src[p] * a1 + 255 * (1 - a1)) - (src[q] * a2 + 255 * (1 - a2))) +
        Math.abs((src[p + 1] * a1 + 255 * (1 - a1)) - (src[q + 1] * a2 + 255 * (1 - a2))) +
        Math.abs((src[p + 2] * a1 + 255 * (1 - a1)) - (src[q + 2] * a2 + 255 * (1 - a2)));
      if (d > 48) sum += Math.min(d, 300); // JPEGノイズは無視、強エッジは頭打ち
    }
    E[i] = sum / other;
  }
  return E;
}

// エッジが周期的に並ぶ間隔（=1ドットのpx数、小数対応）と位相を推定
// 採点は「格子位置(±1px)のエッジ強度 ÷ 格子以外のエッジ強度」。
// 真の周期なら境界にだけエッジが集中するので比が最大になり、
// 少数の強エッジだけ拾う巨大間隔の候補や倍音(2s,3s…)は分母が膨らんで自然に沈む
function bestPeriod(E) {
  const len = E.length;
  let total = 0;
  for (let i = 1; i < len; i++) total += E[i];
  const mean = total / Math.max(1, len - 1);
  if (mean <= 0) return null;
  const sMax = Math.min(128, len / 4);
  const eps = 0.05 * mean;
  const score = (s, o) => {
    const win = s >= 4 ? 1 : 0; // 幅±1の窓（間隔が狭い候補は窓なし＝全域被覆のズルを防ぐ）
    // 各格子位置は窓内の最大値で評価（平均だと窓が真の候補のスコアを薄めて
    // 半周期 s/2 の候補に負けることがある）。分母の除外は窓全体で行う
    let n = 0, exclSum = 0, exclCnt = 0, gmaxSum = 0, hits = 0;
    for (let k = o; k < len; k += s) {
      const i = Math.round(k);
      if (i < 1 || i >= len) continue;
      n++;
      let m = 0;
      for (let d = -win; d <= win; d++) {
        const j = i + d;
        if (j >= 1 && j < len) { exclSum += E[j]; exclCnt++; if (E[j] > m) m = E[j]; }
      }
      gmaxSum += m;
      // 窓中心（格子位置そのもの）にエッジが乗っているか。
      // 真周期の半分以下の間隔でエッジが並ぶとき、窓が隣の山を両取りする
      // 「窓またぎ」の偽候補は、中心が常に谷になるためここで落ちる
      if (m <= 0 || E[i] >= m * 0.5) hits++;
    }
    if (n < 4) return -1;
    if (hits / n < 0.3) return -1;
    const offCnt = Math.max(1, (len - 1) - exclCnt);
    const offMean = Math.max(0, total - exclSum) / offCnt;
    return (gmaxSum / n) / (offMean + eps);
  };
  // 走査は整数カウンタで行う（浮動小数の累積誤差で正解の s を素通りしないため）
  // 下限2.0px = 2倍表示で保存されたスプライトまで検出できる
  let best = null;
  for (let si = 20; si <= Math.floor(sMax * 10); si++) {
    const s = si / 10;
    for (let oj = 0; oj < s * 2; oj++) {
      const sc = score(s, oj / 2);
      if (sc >= 0 && (!best || sc > best.score)) best = { s, o: oj / 2, score: sc };
    }
  }
  if (!best) return null;
  // 微調整: ±0.1 の範囲を 0.01 刻みで詰める
  let fine = best;
  const base = Math.round(best.s * 100);
  for (let si = base - 10; si <= base + 10; si++) {
    const s = si / 100;
    if (s < 2) continue;
    for (let oj = 0; oj < s * 2; oj++) {
      const sc = score(s, oj / 2);
      if (sc > fine.score) fine = { s, o: oj / 2, score: sc };
    }
  }
  fine.ratio = fine.score;
  return fine;
}

// 固定の間隔 s に対して最良の位相を探し直す（片軸失敗時に他軸の間隔を借りる用）
function refitPeriod(E, s) {
  const len = E.length;
  let total = 0;
  for (let i = 1; i < len; i++) total += E[i];
  const mean = total / Math.max(1, len - 1);
  let best = { s, o: 0, score: 0, ratio: 0 };
  for (let oj = 0; oj < s * 2; oj++) {
    const o = oj / 2;
    let sum = 0, n = 0;
    for (let k = o; k < len; k += s) {
      const i = Math.round(k);
      if (i >= 1 && i < len) { sum += E[i]; n++; }
    }
    if (n > 0 && sum / n > best.score) best = { s, o, score: sum / n, ratio: mean > 0 ? (sum / n) / mean : 0 };
  }
  return best;
}

// 弾性カット列（Pixel Snapper方式・MIT: Hugo-Dz/spritefusion-pixel-snapper を参考）:
// 等間隔の目標位置 ±35% の窓内でエッジプロファイル最大点に吸着させる。
// 剛体格子と違い、AI生成ドット絵の「途中から半ドットずれる」累積ドリフトに追従できる
function buildElasticCuts(E, s, o, len) {
  const cuts = [0];
  // 窓は間隔の半分未満に制限（窓≥間隔だと吸着位置が後退し続けて無限ループになる）
  const win = Math.min(Math.max(s * 0.35, 2), s * 0.49);
  let mean = 0;
  for (let i = 1; i < len; i++) mean += E[i];
  mean /= Math.max(1, len - 1);
  let pos = o > s * 0.35 ? o : o + s; // 最初の内部境界
  while (pos < len - s * 0.4) {
    const lo = Math.max(1, Math.round(pos - win));
    const hi = Math.min(len - 1, Math.round(pos + win));
    let bi = -1, bv = -1;
    for (let i = lo; i <= hi; i++) if (E[i] > bv) { bv = E[i]; bi = i; }
    let cut = Math.round(pos);
    if (bi >= 0 && bv > mean * 0.5) cut = bi; // 十分強いエッジがあれば吸着
    if (cut - cuts[cuts.length - 1] >= 2) cuts.push(cut);
    pos = Math.max(cut + s, pos + Math.max(1, s * 0.5)); // 前進保証
  }
  if (len - cuts[cuts.length - 1] < s * 0.4 && cuts.length > 1) cuts.pop();
  cuts.push(len);
  return cuts;
}

// ドット絵の格子を検出。失敗時 null
// X/Y相互検証: 両軸の間隔比が1.8超なら細かい方を信用、片軸失敗なら他軸の間隔を借りる。
// 周期が見つからなくても「小さくて色数の少ない画像」は原寸スプライト（1ドット=1px）とみなす
function detectGrid(src, sw, sh) {
  const box = cropBox(src, sw, sh);
  const Ex = edgeProfile(src, sw, box, true);
  const Ey = edgeProfile(src, sw, box, false);
  let px = bestPeriod(Ex);
  let py = bestPeriod(Ey);
  const okx = !!(px && px.ratio >= 3);
  const oky = !!(py && py.ratio >= 3);
  if (okx || oky) {
    if (okx && oky) {
      const ratio = Math.max(px.s / py.s, py.s / px.s);
      if (ratio > 1.8) {
        if (px.s < py.s) py = refitPeriod(Ey, px.s);
        else px = refitPeriod(Ex, py.s);
      }
    } else if (!okx) {
      px = refitPeriod(Ex, py.s);
    } else {
      py = refitPeriod(Ey, px.s);
    }
    const cutsX = buildElasticCuts(Ex, px.s, px.o, box.w);
    const cutsY = buildElasticCuts(Ey, py.s, py.o, box.h);
    return { box, px, py, cutsX, cutsY, dw: cutsX.length - 1, dh: cutsY.length - 1 };
  }
  // 原寸スプライト判定: レトロゲームのドット絵等は1ドット=1pxで周期構造を持たない。
  // 小さい（ビーズ図案の上限200以下）かつ低色数（≤256色）なら1px=1ドットで採用。
  // 写真のサムネイルは数千色になるためここには落ちない
  if (sw <= 200 && sh <= 200) {
    const colors = new Set();
    for (let i = 0; i < sw * sh * 4; i += 4) {
      if (src[i + 3] < 128) continue;
      colors.add((src[i] << 16) | (src[i + 1] << 8) | src[i + 2]);
      if (colors.size > 256) break;
    }
    if (colors.size > 0 && colors.size <= 256) {
      const cutsX = Array.from({ length: sw + 1 }, (_, k) => k);
      const cutsY = Array.from({ length: sh + 1 }, (_, k) => k);
      return {
        box: { x0: 0, y0: 0, w: sw, h: sh },
        px: { s: 1, o: 0, ratio: 99 }, py: { s: 1, o: 0, ratio: 99 },
        cutsX, cutsY, dw: sw, dh: sh, native: true,
      };
    }
  }
  return null;
}

// 外周を支配する明るい色（=背景。透過チェッカー柄にも対応）を最大3色拾う
function borderBgColors(src, sw, box) {
  const buckets = new Map();
  let total = 0;
  const add = (p) => {
    if (src[p + 3] < 128) return;
    total++;
    const key = ((src[p] >> 4) << 8) | ((src[p + 1] >> 4) << 4) | (src[p + 2] >> 4);
    let e = buckets.get(key);
    if (!e) { e = [0, 0, 0, 0]; buckets.set(key, e); }
    e[0]++; e[1] += src[p]; e[2] += src[p + 1]; e[3] += src[p + 2];
  };
  const { x0, y0, w, h } = box;
  for (let x = x0; x < x0 + w; x++) { add((y0 * sw + x) * 4); add(((y0 + h - 1) * sw + x) * 4); }
  for (let y = y0; y < y0 + h; y++) { add((y * sw + x0) * 4); add((y * sw + x0 + w - 1) * 4); }
  const out = [];
  if (!total) return out;
  const sorted = [...buckets.values()].sort((a, b) => b[0] - a[0]);
  for (const e of sorted.slice(0, 3)) {
    if (e[0] / total < 0.15) break;
    const r = e[1] / e[0], g = e[2] / e[0], b = e[3] / e[0];
    if (srgbToLab(r, g, b)[0] > 75) out.push([r, g, b]);
  }
  return out;
}

/* ---------- 状態 ---------- */

const state = {
  img: null,
  grid: null,        // Int16Array (palette index / -1 = ビーズなし)
  W: 0, H: 0,
  palette: [],
  series: null,      // SERIESのエントリ
  symMap: new Map(), // palette index -> 図案記号（変換ごとに一意割当）
  highlight: -1,     // 色リストのホバーで該当色セルを強調表示
  pen: -2,           // -2:未選択 -1:消しゴム 0以上:palette index
  tool: "pen",       // "pen" | "fill"（塗りつぶし）
  penSize: 1,        // ペンの太さ 1/2/3
  undoStack: [],
  painting: null,
  editLog: new Map(), // 手直しログ: マス番号 -> {c:色コード, rgb} / null=消しゴム
  editW: 0, editH: 0, // ログが有効な図案サイズ（変わったらログは破棄）
  editSeries: null,   // 手直しを行ったブランド/サイズ（変わったら引き継ぎ通知を出す）
};

/* ---------- DOM ---------- */

const $ = (id) => document.getElementById(id);
const dropzone = $("dropzone");
const fileInput = $("file-input");
const srcPreviewWrap = $("src-preview-wrap");
const srcPreview = $("src-preview");
const detectBanner = $("detect-banner");
const detectMsg = $("detect-msg");
const stepSettings = $("step-settings");
const selSeries = $("sel-series");
const mixNote = $("mix-note");
const inpW = $("inp-width");
const inpH = $("inp-height");
const chkAspect = $("chk-aspect");
const selPlate = $("sel-plate");
const chkOutline = $("chk-outline");
const chkCleanup = $("chk-cleanup");
const chkSpecial = $("chk-special");
const chkShading = $("chk-shading");
const chkDitherMix = $("chk-dithermix");
const chkAddOutline = $("chk-addoutline");
const selOutlineColor = $("sel-outline-color");
const outlineSwatch = $("outline-swatch");
const outlineColorRow = $("outline-color-row");

// 選択シリーズの「実際に配色へ使うパレット」。
// ラメ・夜光・透明系(sp)は実物の見え方が別物なので、チェックONの時だけ含める
function activePalette(seriesKey, useSpecial) {
  const base = PAL[seriesKey] || [];
  if (useSpecial) return base;
  const filtered = base.filter((c) => !c.sp);
  return filtered.length ? filtered : base;
}

// 縁取り(アウトライン)色の選択肢を現在のパレットと同期させる。
// 選択は色コードで記憶し、無ければ純黒(くろ/Black)、それも無ければ最暗色を既定にする。
// option の並びはパレットと1:1なので、selectedIndex がそのまま palette の添字になる
let outlineCode = null;
function refreshOutlineOptions(palette) {
  selOutlineColor.innerHTML = "";
  // 先頭は「自動(selout)」、続けてパレット全色。ON/OFFはチェックボックス側が担当
  const auto = document.createElement("option");
  auto.value = "auto";
  auto.textContent = T("optOutlineAuto");
  selOutlineColor.appendChild(auto);
  let selVal = null, black = -1, darkest = 0;
  for (let i = 0; i < palette.length; i++) {
    const c = palette[i];
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = dispName(c);
    opt.dataset.rgb = c.rgb.join(",");
    opt.dataset.code = c.c;
    selOutlineColor.appendChild(opt);
    if (selVal == null && outlineCode != null && outlineCode !== "auto" && c.c === outlineCode) selVal = String(i);
    if (black < 0 && !c.rgb[0] && !c.rgb[1] && !c.rgb[2]) black = i;
    if (c.lab[0] < palette[darkest].lab[0]) darkest = i;
  }
  if (!palette.length) return;
  if (outlineCode === "auto") selVal = "auto";
  else if (selVal == null) selVal = String(black >= 0 ? black : darkest); // 既定・ブランド変更時はくろ
  selOutlineColor.value = selVal;
  outlineCode = selVal === "auto" ? "auto" : palette[+selVal].c;
  updateOutlineSwatch();
}
function updateOutlineSwatch() {
  const opt = selOutlineColor.selectedOptions[0];
  outlineSwatch.style.background = !opt ? "transparent" :
    (opt.value === "auto" ? "linear-gradient(135deg,#777,#1a1a1a)" : `rgb(${opt.dataset.rgb})`);
}
const chkDither = $("chk-dither");
const chkWhiteBg = $("chk-whitebg");
const rngColors = $("rng-colors");
const colorsLabel = $("colors-label");
// 色数スライダーの段階（左=少ない → 右=多い）。"auto"=そっくり色統合のみ、"0"=制限なし
const COLOR_STEPS = ["8", "12", "16", "24", "32", "auto", "0"];
const colorLimitValue = () => COLOR_STEPS[+rngColors.value] || "auto";
const btnConvert = $("btn-convert");
const stepResult = $("step-result");
const canvas = $("pattern-canvas");
const ctx = canvas.getContext("2d");
const rngZoom = $("rng-zoom");
const chkGrid = $("chk-grid");
const chkSymbols = $("chk-symbols");
const btnUndo = $("btn-undo");
const penSwatch = $("pen-swatch");
const penLabel = $("pen-label");
const legendTable = $("legend-table");
const legendBody = $("legend-body");
const statLine = $("stat-line");

/* ---------- 多言語辞書 ---------- */

const I18N = {
  docTitle: { ja: "アイロンビーズ図案メーカー｜写真・画像をドット絵図案に無料変換",
    en: "Fuse Bead Pattern Maker | Free photo-to-pattern converter for Perler / Hama / Artkal" },
  siteTitle: { ja: "アイロンビーズ図案メーカー", en: "Fuse Bead Pattern Maker" },
  tagline: { ja: "画像をドロップするだけ。実際に売っているビーズの色で図案化して、必要な色と個数、買える場所まで。",
    en: "Just drop an image. Get a bead pattern in real, purchasable colors — with counts and shopping links." },
  prHeader: { ja: "※購入リンクにはアフィリエイト広告を含みます",
    en: "Purchase links may earn us an affiliate commission." },
  guideLink: { ja: "使い方・FAQ", en: "Guide & FAQ" },
  step1: { ja: "画像を選ぶ", en: "Choose an image" },
  dzMain: { ja: "ここに画像をドラッグ＆ドロップ", en: "Drag & drop an image here" },
  dzSub: { ja: "クリックして選択・スクショの貼り付け（Ctrl+V）もOK", en: "Click to browse, or paste a screenshot (Ctrl+V)" },
  dzPrivacy: { ja: "🔒 画像はブラウザの中だけで処理されます。サーバーには送信されません。",
    en: "🔒 Your image is processed entirely in your browser. Nothing is uploaded." },
  btnChangeImage: { ja: "別の画像にする", en: "Change image" },
  btnRedetect: { ja: "再判定", en: "Re-detect" },
  step2: { ja: "ビーズを選ぶ", en: "Pick your beads" },
  autoNote: { ja: "変換はすべて自動。設定を変えると図案も自動で更新されます",
    en: "Everything is automatic — the pattern updates whenever you change a setting" },
  lblSizeSimple: { ja: "図案の大きさ", en: "Pattern size" },
  chipSizeS: { ja: "小 29ビーズ", en: "S · 29 beads" },
  chipSizeM: { ja: "中 58ビーズ", en: "M · 58 beads" },
  chipSizeL: { ja: "大 100ビーズ", en: "L · 100 beads" },
  helpSizePixel: { ja: "ドット絵は元の絵のドット数で原寸再現されます（サイズ指定は不要）",
    en: "Pixel art is reproduced at its original dot dimensions (no size needed)" },
  btnAdvanced: { ja: "詳細設定", en: "Advanced settings" },
  advHint: { ja: "画像タイプ・サイズの数値指定・変換品質など、通常は触らなくてよい設定",
    en: "Manual controls: image type, outlines, dithering, exact size, etc." },
  tbColors: { ja: "色数", en: "Colors" },
  mcAutoShort: { ja: "自動", en: "Auto" },
  mcNoneShort: { ja: "制限なし", en: "No limit" },
  mcAuto: { ja: "自動（そっくりな色を整理）", en: "Auto (merge near-identical colors)" },
  groupBeads: { ja: "使うビーズ", en: "Beads to use" },
  lblSeries: { ja: "ブランド・シリーズ", en: "Brand / series" },
  helpSeries: { ja: "図案の色はここで選んだシリーズで実際に売られている色だけから選ばれます",
    en: "Pattern colors are chosen only from colors actually sold in the selected series" },
  groupSize: { ja: "図案のサイズ", en: "Pattern size" },
  lblW: { ja: "横（ビーズ数）", en: "Width (beads)" },
  lblH: { ja: "縦（ビーズ数）", en: "Height (beads)" },
  lblAspect: { ja: "縦横比を画像に合わせる", en: "Keep image aspect ratio" },
  presetsLabel: { ja: "プリセット:", en: "Presets:" },
  chip2929: { ja: "29×29（プレート1枚）", en: "29×29 (1 pegboard)" },
  chip5858: { ja: "58×58（4枚）", en: "58×58 (4 pegboards)" },
  lblPlate: { ja: "プレート区切り線", en: "Pegboard divider lines" },
  plateNone: { ja: "表示しない", en: "None" },
  plate29: { ja: "29ペグごと（5mm定番プレート）", en: "Every 29 pegs (standard 5mm board)" },
  plate50: { ja: "50ペグごと（ミニ系プレート）", en: "Every 50 pegs (mini board)" },
  helpPlate: { ja: "複数プレートに分けて作るときの境界線（赤線）を図案に表示します",
    en: "Shows red boundary lines for projects spanning multiple pegboards" },
  groupTune: { ja: "変換の調整", en: "Conversion options" },
  lblImgType: { ja: "画像のタイプ", en: "Image type" },
  modePixel: { ja: "ドット絵", en: "Pixel art" },
  modeIllust: { ja: "イラスト", en: "Illustration" },
  modePhoto: { ja: "写真", en: "Photo" },
  helpPixel: { ja: "元絵の1ドット=1ビーズで原寸再現します（画像読み込み時に自動判定）",
    en: "Reproduces the source exactly, 1 dot = 1 bead (auto-detected on load)" },
  helpIllust: { ja: "マスごとに一番面積の大きい色を採用。キャラ絵・ロゴ向け",
    en: "Uses the dominant color per cell. Best for character art and logos" },
  helpPhoto: { ja: "マスの平均色でなめらかに変換。グラデーションの多い画像向け",
    en: "Uses average colors for smooth results. Best for photos and gradients" },
  optOutline: { ja: "輪郭線を残す", en: "Preserve outlines" },
  optDither: { ja: "ディザリング（2色を混ぜ打ちして中間色を表現）", en: "Dithering (mixes two colors to fake in-between tones)" },
  optWhitebg: { ja: "背景を透過する（白い余白をビーズなしに）", en: "Transparent background (no beads on white margins)" },
  optCleanup: { ja: "仕上げの整形（ノイズ粒・浮きビーズを整理）", en: "Cleanup pass (remove noise & stray beads)" },
  optSpecial: { ja: "特殊色も使う（ラメ・夜光・透明系。実物の見え方が大きく異なるため通常はOFF推奨）",
    en: "Use specialty colors (glitter / glow / clear — they look very different in real life, OFF recommended)" },
  optShading: { ja: "陰影を保持（明暗の段差を同系の別ビーズへ割り振る）",
    en: "Preserve shading (spread tones across similar beads)" },
  optDitherMix: { ja: "まざり色（2色を市松に並べて中間色を作る）",
    en: "Blend colors (checkerboard two beads to create in-between tones)" },
  optOutlineAuto: { ja: "自動（場所ごとの最暗色・おすすめ）", en: "Auto (darkest tone of each area)" },
  groupFinish: { ja: "🎨 しあがり", en: "🎨 Finishing" },
  optQualityTitle: { ja: "変換の品質（通常はONのまま）", en: "Conversion quality (leave ON normally)" },
  optAddOutline: { ja: "縁取りをつける", en: "Add outline" },
  optOutlineColor: { ja: "縁取りの色", en: "Outline color" },
  lblMaxColors: { ja: "使う色数の上限", en: "Max colors" },
  mcNone: { ja: "制限なし", en: "No limit" },
  mc8: { ja: "8色まで", en: "Up to 8" },
  mc12: { ja: "12色まで", en: "Up to 12" },
  mc16: { ja: "16色まで", en: "Up to 16" },
  mc24: { ja: "24色まで", en: "Up to 24" },
  mc32: { ja: "32色まで", en: "Up to 32" },
  btnConvert: { ja: "再変換する", en: "Reconvert" },
  step3: { ja: "図案", en: "Pattern" },
  tbView: { ja: "表示", en: "View" },
  tbZoom: { ja: "大きさ", en: "Zoom" },
  tbGrid: { ja: "グリッド", en: "Grid" },
  tbSymbols: { ja: "色記号", en: "Symbols" },
  tbEdit: { ja: "手直し", en: "Edit" },
  penPrefix: { ja: "ペン:", en: "Pen:" },
  btnEraser: { ja: "◻ 消しゴム", en: "◻ Eraser" },
  btnUndo: { ja: "↩ 元に戻す", en: "↩ Undo" },
  editHint: { ja: "図案をタップ/クリックで塗れます。色はビーズ一覧・🎨全色・右クリック（スポイト）で選択。「⇄色置換」はタップした色を図案全体でペンの色に置き換えます",
    en: "Tap/click the pattern to paint. Pick colors from the bead list, the 🎨 palette, or right-click to eyedrop. \"⇄ Replace\" swaps every cell of the tapped color to the pen color" },
  tbEditMode: { ja: "✏ 手直しする", en: "✏ Edit" },
  toolPen: { ja: "✎ ペン", en: "✎ Pen" },
  toolFill: { ja: "▧ 塗りつぶし", en: "▧ Fill" },
  toolReplace: { ja: "⇄ 色置換", en: "⇄ Replace" },
  btnPalette: { ja: "🎨 全色から選ぶ", en: "🎨 Pick from all colors" },
  lgSwapTip: { ja: "近い色に置き換える", en: "Swap to a similar color" },
  lgSwapTo: { ja: "近い色へ一括置き換え:", en: "Replace all with:" },
  lgInUse: { ja: "使用中", en: "in use" },
  carryMsg: { ja: "✏ 手直しの内容を、新しいビーズの近い色で引き継ぎました",
    en: "✏ Your manual edits were carried over using the closest colors in the new palette" },
  carryDiscard: { ja: "手直しを破棄して自動変換に戻す", en: "Discard edits & reconvert" },
  carryKeep: { ja: "このまま", en: "Keep them" },
  tbPenSize: { ja: "太さ", en: "Size" },
  mbSettings: { ja: "設定", en: "Settings" },
  mbBeads: { ja: "ビーズ一覧", en: "Beads" },
  btnDlPng: { ja: "図案PNGを保存", en: "Save pattern PNG" },
  btnDlCsv: { ja: "CSVを保存", en: "Save CSV" },
  legendTitle: { ja: "必要なビーズ", en: "Beads needed" },
  legendNote: { ja: "行をクリックするとその色がペンになります。", en: "Click a row to use that color as the pen. " },
  prInline: { ja: "※購入リンクはアフィリエイト広告を含みます。検索結果ページが開くので色番号を確認のうえ購入してください。",
    en: "Purchase links may earn us a commission. They open search results — check the color code before buying." },
  thColor: { ja: "色", en: "Color" },
  thSym: { ja: "記号", en: "Sym" },
  thCode: { ja: "色番号", en: "Code" },
  thName: { ja: "色名", en: "Name" },
  thBrand: { ja: "ブランド", en: "Brand" },
  thCount: { ja: "個数", en: "Count" },
  thBuy: { ja: "購入先", en: "Buy" },
  penNone: { ja: "未選択", en: "not selected" },
  penEraser: { ja: "消しゴム", en: "eraser" },
  nanoGroup: { ja: "ナノビーズ（カワダ）", en: "Nanobeads (Kawada)" },
  nanoSoon: { ja: "対応準備中", en: "coming soon" },
};

const T = (k) => (I18N[k] ? I18N[k][LANG] : k);

function applyLang() {
  document.documentElement.dataset.lang = LANG;
  document.documentElement.lang = LANG;
  try { localStorage.setItem("beads_lang", LANG); } catch (e) { /* no-op */ }
  document.title = T("docTitle");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n;
    if (I18N[k]) el.textContent = I18N[k][LANG];
  });
  document.querySelectorAll("[data-lang-btn]").forEach((b) =>
    b.classList.toggle("active", b.dataset.langBtn === LANG));
  rebuildSeriesOptions();
  updateMixNote();
  updateColorsLabel();
  if (lastBanner) showBanner(lastBanner.cls, lastBanner.kind, lastBanner.params);
  if (state.grid) { renderLegend(); updatePenStatus(); }
}

document.querySelectorAll("[data-lang-btn]").forEach((b) =>
  b.addEventListener("click", () => {
    if (LANG === b.dataset.langBtn) return;
    LANG = b.dataset.langBtn;
    applyLang();
  }));

/* ---------- モード ---------- */

function getMode() {
  const r = document.querySelector('input[name="mode"]:checked');
  return r ? r.value : "illust";
}
function setMode(v) {
  const r = document.querySelector(`input[name="mode"][value="${v}"]`);
  if (r) r.checked = true;
  stepSettings.dataset.mode = v;
}
document.querySelectorAll('input[name="mode"]').forEach((r) =>
  r.addEventListener("change", () => {
    stepSettings.dataset.mode = getMode();
    scheduleConvert();
  }));

/* ---------- 自動変換 ---------- */

let convTimer = null;
function scheduleConvert() {
  if (!state.img) return;
  clearTimeout(convTimer);
  convTimer = setTimeout(convert, 250);
}

/* ---------- 詳細設定の開閉 ---------- */

(function initAdvancedToggle() {
  let open = false;
  try { open = localStorage.getItem("beads_adv") === "1"; } catch (e) { /* no-op */ }
  document.body.classList.toggle("adv-open", open);
  $("btn-advanced").addEventListener("click", () => {
    const now = !document.body.classList.contains("adv-open");
    document.body.classList.toggle("adv-open", now);
    try { localStorage.setItem("beads_adv", now ? "1" : "0"); } catch (e) { /* no-op */ }
  });
})();

/* ---------- 画像に合わせた自動チューニング（シンプル運用の核） ---------- */

// 写真かイラストかを色数で推定し、背景の白余白があれば除去を自動ON。
// ユーザーが何も調整しなくても妥当な結果になるようにする
function autoTuneForImage() {
  if (!state.img) return;
  const { src, sw, sh } = readImageData(state.img, 512);
  const buckets = new Set();
  for (let i = 0; i < src.length; i += 16) { // 4pxおきにサンプル
    if (src[i + 3] < 128) continue;
    buckets.add(((src[i] >> 4) << 8) | ((src[i + 1] >> 4) << 4) | (src[i + 2] >> 4));
  }
  const photoLike = buckets.size > 700; // 写真はグラデで色バケツが桁違いに多い
  setMode(photoLike ? "photo" : "illust");
  if (photoLike) chkDither.checked = true;
  chkWhiteBg.checked = borderBgColors(src, sw, { x0: 0, y0: 0, w: sw, h: sh }).length > 0;
}

/* ---------- シリーズ選択 ---------- */

// 英語UIでのブランド表示順: Artkal（世界配送・色数最多）を先頭に
const EN_GROUP_ORDER = [
  "Artkal", "Perler (Kawada)", "Hama", "Nanobeads (Kawada)", "Brand mix (5mm, hard beads)",
];

function rebuildSeriesOptions() {
  const selected = selSeries.value;
  selSeries.innerHTML = "";
  let curGroup = null, og = null;
  let ordered = SERIES;
  if (LANG !== "ja") {
    ordered = [...SERIES].sort((a, b) =>
      EN_GROUP_ORDER.indexOf(a.groupEn || a.group) - EN_GROUP_ORDER.indexOf(b.groupEn || b.group));
  }
  for (const s of ordered) {
    if (!PAL[s.key] || !PAL[s.key].length) continue; // パレット未生成のシリーズは出さない
    if (s.enOnly && LANG === "ja") continue; // 日本で買えないシリーズは日本語UIに出さない
    const groupLabel = LANG === "ja" ? s.group : (s.groupEn || s.group);
    if (groupLabel !== curGroup) {
      curGroup = groupLabel;
      og = document.createElement("optgroup");
      og.label = groupLabel;
      selSeries.appendChild(og);
    }
    const op = document.createElement("option");
    op.value = s.key;
    // 閉じたセレクトではoptgroup名（ブランド）が見えないため、選択肢自体にブランド名を含める
    const gShort = groupLabel.replace(/（[^）]*）|\s*\([^)]*\)/g, "");
    const label = LANG === "ja" ? s.label : (s.labelEn || s.label);
    op.textContent = `${gShort}｜${label}`;
    og.appendChild(op);
  }
  if (!PAL.nanobeads || !PAL.nanobeads.length) {
    const ogNano = document.createElement("optgroup");
    ogNano.label = T("nanoGroup");
    const opNano = document.createElement("option");
    opNano.disabled = true;
    opNano.textContent = T("nanoSoon");
    ogNano.appendChild(opNano);
    selSeries.appendChild(ogNano);
  }
  if (selected && SERIES.some((s) => s.key === selected && PAL[s.key] && PAL[s.key].length)) {
    selSeries.value = selected;
  }
}

function initSeriesSelect() {
  rebuildSeriesOptions();
  selSeries.addEventListener("change", () => {
    updateMixNote();
    // 縁取りの色一覧を新ブランドに追従（画像未読み込みでもセレクトが正しくなるように）
    refreshOutlineOptions(activePalette(currentSeries().key, chkSpecial.checked));
    scheduleConvert();
  });
  updateMixNote();
}

function currentSeries() {
  return SERIES.find((s) => s.key === selSeries.value) || SERIES[0];
}

function updateMixNote() {
  const s = currentSeries();
  const note = LANG === "ja" ? s.mixNote : (s.mixNoteEn || s.mixNote);
  if (note) {
    mixNote.innerHTML = note;
    mixNote.hidden = false;
  } else {
    mixNote.hidden = true;
  }
}

/* ---------- 画像読み込み ---------- */

function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const url = URL.createObjectURL(file);
  // セッション復元用に元画像をdataURLでも保持（大きすぎる場合は後で再圧縮）
  state.imgDataUrl = null;
  const fr = new FileReader();
  fr.onload = () => { state.imgDataUrl = fr.result; };
  fr.readAsDataURL(file);
  const img = new Image();
  img.onload = () => {
    state.img = img;
    state.editLog.clear(); // 別画像の手直しを持ち越さない
    state.editW = state.editH = 0;
    state.editSeries = null;
    carryNote.hidden = true;
    srcPreview.src = url;
    srcPreviewWrap.hidden = false;
    dropzone.hidden = true;
    btnConvert.disabled = false;
    if (chkAspect.checked) syncHeightFromWidth();
    // ドット絵かどうかを自動判定 → そのまま自動変換
    detectBanner.hidden = true;
    lastBanner = null;
    setTimeout(() => {
      const isDotArt = runAutoDetect(true);
      if (!isDotArt) {
        // 非ドット絵: 写真/イラスト判定と背景除去を自動チューニング
        autoTuneForImage();
        chkAspect.checked = true;
        syncHeightFromWidth();
      }
      scheduleConvert();
    }, 30);
  };
  img.src = url;
}

function syncHeightFromWidth() {
  if (!state.img) return;
  const w = clampSize(+inpW.value);
  inpW.value = w;
  inpH.value = clampSize(Math.round(w * state.img.naturalHeight / state.img.naturalWidth));
}
function syncWidthFromHeight() {
  if (!state.img) return;
  const h = clampSize(+inpH.value);
  inpH.value = h;
  inpW.value = clampSize(Math.round(h * state.img.naturalWidth / state.img.naturalHeight));
}
function clampSize(v) {
  return Math.max(4, Math.min(200, Math.round(v || 29)));
}

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") fileInput.click(); });
fileInput.addEventListener("change", () => loadFile(fileInput.files[0]));
["dragover", "dragenter"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("dragover"); }));
["dragleave", "drop"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("dragover"); }));
dropzone.addEventListener("drop", (e) => loadFile(e.dataTransfer.files[0]));
document.addEventListener("paste", (e) => {
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
  if (item) loadFile(item.getAsFile());
});
$("btn-clear-image").addEventListener("click", () => {
  state.img = null;
  state.imgDataUrl = null;
  state.grid = null;
  state.editLog.clear();
  state.editW = state.editH = 0;
  state.editSeries = null;
  carryNote.hidden = true;
  srcPreviewWrap.hidden = true;
  detectBanner.hidden = true;
  lastBanner = null;
  dropzone.hidden = false;
  btnConvert.disabled = true;
  fileInput.value = "";
  stepResult.hidden = true;
  document.body.classList.remove("has-result");
  closeDrawers();
  placeUploadSection(); // ドロワー内に居たアップロード欄をメイン画面へ戻す
  try { sessionStorage.removeItem(SS_KEY); } catch (e) { /* no-op */ }
});

inpW.addEventListener("change", () => {
  if (chkAspect.checked) syncHeightFromWidth(); else inpW.value = clampSize(+inpW.value);
  scheduleConvert();
});
inpH.addEventListener("change", () => {
  if (chkAspect.checked) syncWidthFromHeight(); else inpH.value = clampSize(+inpH.value);
  scheduleConvert();
});
chkAspect.addEventListener("change", () => {
  if (chkAspect.checked) { syncHeightFromWidth(); scheduleConvert(); }
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    inpW.value = chip.dataset.w;
    if (chkAspect.checked && state.img) syncHeightFromWidth();
    else inpH.value = chip.dataset.h;
    scheduleConvert();
  });
});

[chkOutline, chkCleanup, chkSpecial, chkDither, chkWhiteBg, chkShading, chkDitherMix].forEach((el) =>
  el.addEventListener("change", scheduleConvert));
chkAddOutline.addEventListener("change", () => {
  outlineColorRow.hidden = !chkAddOutline.checked;
  scheduleConvert();
});
selOutlineColor.addEventListener("change", () => {
  const o = selOutlineColor.selectedOptions[0];
  outlineCode = !o ? null : (o.value === "auto" ? "auto" : o.dataset.code);
  updateOutlineSwatch();
  scheduleConvert();
});

function updateColorsLabel() {
  const v = colorLimitValue();
  colorsLabel.textContent =
    v === "auto" ? T("mcAutoShort") :
    v === "0" ? T("mcNoneShort") :
    (LANG === "ja" ? `${v}色まで` : `≤ ${v}`);
}
rngColors.addEventListener("input", () => {
  updateColorsLabel();
  scheduleConvert();
});

/* ---------- セッション復元（別ページから戻っても図案が消えないように） ---------- */

const SS_KEY = "beads_session_v1";

function gridToB64(grid) {
  const u8 = new Uint8Array(grid.buffer, grid.byteOffset, grid.byteLength);
  let bin = "";
  for (let i = 0; i < u8.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}
function b64ToGrid(b64, len) {
  try {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const g = new Int16Array(u8.buffer);
    return g.length === len ? g : null;
  } catch (e) { return null; }
}

// 保存用の画像dataURL。デカすぎる場合はJPEGに再圧縮（sessionStorageの容量対策）
function imageDataUrlForSave() {
  let d = state.imgDataUrl;
  if (d && d.length < 3500000) return d;
  if (!state.img) return null;
  try {
    const cap = 1600;
    const iw = state.img.naturalWidth, ih = state.img.naturalHeight;
    const sc = Math.min(1, cap / Math.max(iw, ih));
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(iw * sc));
    cv.height = Math.max(1, Math.round(ih * sc));
    cv.getContext("2d").drawImage(state.img, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", 0.9);
  } catch (e) { return null; }
}

function saveSession() {
  if (!state.img || !state.grid) return;
  try {
    const imgData = imageDataUrlForSave();
    if (!imgData) return;
    sessionStorage.setItem(SS_KEY, JSON.stringify({
      imgData,
      series: selSeries.value,
      W: state.W, H: state.H,
      aspect: chkAspect.checked,
      mode: getMode(),
      outline: chkOutline.checked,
      dither: chkDither.checked,
      whitebg: chkWhiteBg.checked,
      cleanup: chkCleanup.checked,
      special: chkSpecial.checked,
      shading: chkShading.checked,
      ditherMix: chkDitherMix.checked,
      addOutline: chkAddOutline.checked,
      outlineColor: outlineCode,
      plate: selPlate.value,
      colorsIdx: +rngColors.value,
      grid: gridToB64(state.grid),
      // 手直しログ（[i]=消しゴム / [i,コード,r,g,b]=塗り）。復元後の設定変更でも手直しが残るように
      edits: [...state.editLog].map(([i, e]) => (e ? [i, e.c, e.rgb[0], e.rgb[1], e.rgb[2]] : [i])),
      editSeries: state.editSeries,
      banner: lastBanner,
    }));
  } catch (e) { /* 容量超過などは黙って諦める（機能は劣化するが壊れない） */ }
}

function restoreSession() {
  let s = null;
  try { s = JSON.parse(sessionStorage.getItem(SS_KEY) || "null"); } catch (e) { return false; }
  if (!s || !s.imgData) return false;
  const img = new Image();
  img.onload = () => {
    state.img = img;
    state.imgDataUrl = s.imgData;
    srcPreview.src = s.imgData;
    srcPreviewWrap.hidden = false;
    dropzone.hidden = true;
    btnConvert.disabled = false;
    if (SERIES.some((x) => x.key === s.series)) selSeries.value = s.series;
    updateMixNote();
    inpW.value = s.W; inpH.value = s.H;
    chkAspect.checked = !!s.aspect;
    setMode(s.mode || "illust");
    chkOutline.checked = !!s.outline;
    chkDither.checked = !!s.dither;
    chkWhiteBg.checked = !!s.whitebg;
    chkCleanup.checked = s.cleanup !== false;
    chkSpecial.checked = !!s.special;
    chkShading.checked = s.shading !== false;
    chkDitherMix.checked = !!s.ditherMix;
    // 縁取り: 明示的にONで保存されていた場合だけON（既定は常にOFF）
    chkAddOutline.checked = s.addOutline === true;
    outlineColorRow.hidden = !chkAddOutline.checked;
    if (s.outlineColor && s.outlineColor !== "none") outlineCode = s.outlineColor;
    selPlate.value = s.plate || "0";
    rngColors.value = String(s.colorsIdx == null ? 5 : s.colorsIdx);
    updateColorsLabel();
    if (s.banner) showBanner(s.banner.cls, s.banner.kind, s.banner.params);
    // 保存時と同じ特殊色フィルタを適用したパレットで復元（グリッドの色番号が並びに依存するため）
    const palette = activePalette(s.series, !!s.special);
    refreshOutlineOptions(palette);
    state.editLog = new Map();
    if (Array.isArray(s.edits)) {
      for (const e of s.edits) {
        if (e.length >= 5) state.editLog.set(e[0], { c: e[1], rgb: [e[2], e[3], e[4]] });
        else state.editLog.set(e[0], null);
      }
    }
    state.editW = s.W; state.editH = s.H;
    state.editSeries = s.editSeries || s.series;
    const grid = s.grid && palette.length ? b64ToGrid(s.grid, s.W * s.H) : null;
    if (grid) {
      // 手直しの編集内容ごと復元
      state.grid = grid;
      state.W = s.W; state.H = s.H;
      state.palette = palette;
      state.series = currentSeries();
      state.pen = -2;
      state.highlight = -1;
      state.undoStack = [];
      assignSymbols();
      updatePenStatus();
      stepResult.hidden = false;
      document.body.classList.add("has-result");
      placeUploadSection();
      fitZoom();
      state.lastFitW = s.W;
      state.lastFitH = s.H;
      render();
      renderLegend();
      syncSizeChips();
    } else {
      scheduleConvert();
    }
  };
  img.src = s.imgData;
  return true;
}

/* ---------- ドット数の自動判定 ---------- */

// 画像をキャンバスに読む。cap超の高解像度は縮小して読む（比率は保たれるので判定に影響しない）
function readImageData(img, cap) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.min(1, cap / Math.max(iw, ih));
  const sw = Math.max(1, Math.round(iw * scale));
  const sh = Math.max(1, Math.round(ih * scale));
  const work = document.createElement("canvas");
  work.width = sw; work.height = sh;
  const wctx = work.getContext("2d", { willReadFrequently: true });
  wctx.drawImage(img, 0, 0, sw, sh);
  return { src: wctx.getImageData(0, 0, sw, sh).data, sw, sh };
}

let lastBanner = null;

function bannerText(kind, p) {
  if (LANG === "ja") {
    switch (kind) {
      case "noImage": return "先に画像を選んでください";
      case "failSilent": return "ドット絵の格子は検出されませんでした。イラスト／写真として変換します";
      case "fail": return "ドット絵の格子を検出できませんでした。ぼかしの強い画像は手動でマス数を設定してください";
      case "ok": {
        const cols = p.cols ? `・使用${p.cols}色` : "";
        return `ドット絵と判定: ${p.dw}×${p.dh}ドット（1ドット=${p.s}px${cols}）。マス数・モード・色数を自動設定しました`;
      }
    }
  } else {
    switch (kind) {
      case "noImage": return "Choose an image first";
      case "failSilent": return "No pixel-art grid detected — converting as illustration / photo";
      case "fail": return "Could not detect a pixel-art grid. For blurry images, set the size manually";
      case "ok": {
        const cols = p.cols ? `, ${p.cols} colors` : "";
        return `Pixel art detected: ${p.dw}×${p.dh} dots (1 dot = ${p.s}px${cols}). Size, mode and colors set automatically`;
      }
    }
  }
  return "";
}

function showBanner(cls, kind, params) {
  lastBanner = { cls, kind, params };
  detectBanner.className = "banner" + (cls ? " " + cls : "");
  detectMsg.textContent = bannerText(kind, params || {});
  detectBanner.hidden = false;
}

// 判定してUIに反映。silent=true は画像読み込み時の自動実行
function runAutoDetect(silent) {
  if (!state.img) {
    if (!silent) showBanner("warn", "noImage");
    return false;
  }
  const { src, sw, sh } = readImageData(state.img, 2048);
  const det = detectGrid(src, sw, sh);
  if (!det) {
    showBanner("", silent ? "failSilent" : "fail");
    return false;
  }
  inpW.value = clampSize(det.dw);
  inpH.value = clampSize(det.dh);
  chkAspect.checked = false; // 判定値を上書きさせない
  setMode("pixel");
  chkWhiteBg.checked = true; // 背景（余白・方眼柄）は通常ビーズにしない

  // 元絵の使用色数を数え、色数スライダーを「その色数を満たす最小の段階」に合わせる
  // （ノイズで色数が爆発している場合は「自動」= 近似色統合に任せる）
  const colorSet = new Set();
  outer:
  for (let y = det.box.y0; y < det.box.y0 + det.box.h; y++) {
    for (let x = det.box.x0; x < det.box.x0 + det.box.w; x++) {
      const p = (y * sw + x) * 4;
      if (src[p + 3] < 128) continue;
      colorSet.add((src[p] << 16) | (src[p + 1] << 8) | src[p + 2]);
      if (colorSet.size > 300) break outer;
    }
  }
  const nCols = colorSet.size;
  let sliderIdx = 5; // 自動
  if (nCols <= 300) {
    const steps = [8, 12, 16, 24, 32];
    const f = steps.findIndex((v) => v >= nCols);
    sliderIdx = f >= 0 ? f : 5;
  }
  rngColors.value = String(sliderIdx);
  updateColorsLabel();

  showBanner("ok", "ok", {
    dw: det.dw, dh: det.dh, s: det.px.s.toFixed(1),
    cols: nCols <= 300 ? nCols : 0,
  });
  return true;
}

$("btn-detect-dots").addEventListener("click", () => {
  runAutoDetect(false);
  scheduleConvert();
});

/* ---------- 変換 ---------- */

function convert() {
  if (!state.img) return;
  const W = clampSize(+inpW.value);
  const H = clampSize(+inpH.value);
  const series = currentSeries();
  const palette = activePalette(series.key, chkSpecial.checked);
  if (!palette.length) return;
  refreshOutlineOptions(palette);

  // 元画像を作業キャンバスへ
  const mode = getMode();
  const iw = state.img.naturalWidth, ih = state.img.naturalHeight;
  let src, sw, sh;
  if (mode === "pixel") {
    // ドット絵は可能な限り原寸で読む（判定時と同じ縮小条件に揃える）
    ({ src, sw, sh } = readImageData(state.img, 2048));
  } else {
    const scale = Math.min(1, 1200 / Math.max(iw, ih));
    sw = Math.max(W, Math.round(iw * scale));
    sh = Math.max(H, Math.round(ih * scale));
    const work = document.createElement("canvas");
    work.width = sw; work.height = sh;
    const wctx = work.getContext("2d", { willReadFrequently: true });
    wctx.drawImage(state.img, 0, 0, sw, sh);
    src = wctx.getImageData(0, 0, sw, sh).data;
  }

  // 各マスの代表色を決める（モードで方式が変わる）
  const cellRgb = new Float32Array(W * H * 3);
  const cellAlpha = new Float32Array(W * H);
  let bgColors = [];
  if (mode === "pixel") {
    const det = detectGrid(src, sw, sh);
    const box = det ? det.box : cropBox(src, sw, sh);
    if (chkWhiteBg.checked) bgColors = borderBgColors(src, sw, box);
    const exact = det && det.dw === W && det.dh === H;
    // 各ドットの中心領域（境界28%を除いた内側）を平均して読む。
    // 中心1点読みだとJPEG圧縮やテクスチャの色ブレをそのまま拾ってしまう。
    // 検出成功時は弾性カット列（エッジ吸着済み）をセル境界として使う
    const fx = (k) => (exact ? det.cutsX[k] : k * box.w / W);
    const fy = (k) => (exact ? det.cutsY[k] : k * box.h / H);
    const inner = (f0, f1, limit) => {
      const m = (f1 - f0) * 0.28;
      let a = Math.round(f0 + m), b = Math.round(f1 - m);
      a = Math.max(0, Math.min(limit - 1, a));
      b = Math.max(a + 1, Math.min(limit, b));
      return [a, b];
    };
    for (let y = 0; y < H; y++) {
      const [sy0, sy1] = inner(fy(y), fy(y + 1), box.h);
      for (let x = 0; x < W; x++) {
        const [sx0, sx1] = inner(fx(x), fx(x + 1), box.w);
        const cell = averageCell(src, sw, box.x0 + sx0, box.x0 + sx1, box.y0 + sy0, box.y0 + sy1);
        const i = y * W + x;
        cellRgb[i * 3] = cell[0]; cellRgb[i * 3 + 1] = cell[1]; cellRgb[i * 3 + 2] = cell[2];
        cellAlpha[i] = cell[3];
      }
    }
    // 色ブレで同色ドットが別のビーズ色に割れないよう、近い色を統合してから減色へ
    // （しきい値はCIEDE2000で5.5 ≒ 別配色と認識されない範囲）
    // 原寸スプライトは色ブレが原理的に無く、意図した近似色の陰影を守るためスキップ
    if (!det || !det.native) consolidateCellColors(cellRgb, cellAlpha, W * H, 5.5);
  } else {
    const illust = mode === "illust";
    const keepOutline = illust && chkOutline.checked;
    if (keepOutline) {
      // 細い主線を縮小前に太らせて、セル内多数決で消えないようにする
      src = boostThinOutlines(src, sw, sh, Math.min(sw / W, sh / H));
    }
    for (let y = 0; y < H; y++) {
      const sy0 = Math.floor(y * sh / H), sy1 = Math.max(sy0 + 1, Math.floor((y + 1) * sh / H));
      for (let x = 0; x < W; x++) {
        const sx0 = Math.floor(x * sw / W), sx1 = Math.max(sx0 + 1, Math.floor((x + 1) * sw / W));
        const cell = illust
          ? dominantCell(src, sw, sx0, sx1, sy0, sy1, keepOutline)
          : averageCell(src, sw, sx0, sx1, sy0, sy1);
        const i = y * W + x;
        cellRgb[i * 3] = cell[0]; cellRgb[i * 3 + 1] = cell[1]; cellRgb[i * 3 + 2] = cell[2];
        cellAlpha[i] = cell[3];
      }
    }
  }

  // 減色
  const grid = new Int16Array(W * H).fill(-1);
  const useDither = mode === "photo" && chkDither.checked;
  const dropWhite = chkWhiteBg.checked;
  const err = useDither ? new Float32Array(W * H * 3) : null;
  const cellLabArr = new Float64Array(W * H * 3); // 色数上限の再探索用に各セルのLabを保持
  // 背景除去: 外周と連結した背景領域だけを消す（目・縁取りの白は残す）
  const bgRemove = dropWhite ? computeBgRemoval(cellRgb, cellAlpha, W, H, bgColors) : null;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (cellAlpha[i] < 0.5) continue;
      if (bgRemove && bgRemove[i]) continue;
      let r = cellRgb[i * 3], g = cellRgb[i * 3 + 1], b = cellRgb[i * 3 + 2];
      if (useDither) {
        r = Math.max(0, Math.min(255, r + err[i * 3]));
        g = Math.max(0, Math.min(255, g + err[i * 3 + 1]));
        b = Math.max(0, Math.min(255, b + err[i * 3 + 2]));
      }
      const lab = srgbToLab(r, g, b);
      cellLabArr[i * 3] = lab[0]; cellLabArr[i * 3 + 1] = lab[1]; cellLabArr[i * 3 + 2] = lab[2];
      const idx = nearestIndex(lab, palette);
      grid[i] = idx;
      if (useDither) {
        const p = palette[idx].rgb;
        const er = r - p[0], eg = g - p[1], eb = b - p[2];
        const spread = (dx, dy, w) => {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= W || ny >= H) return;
          const j = (ny * W + nx) * 3;
          err[j] += er * w; err[j + 1] += eg * w; err[j + 2] += eb * w;
        };
        spread(1, 0, 7 / 16); spread(-1, 1, 3 / 16); spread(0, 1, 5 / 16); spread(1, 1, 1 / 16);
      }
    }
  }

  // 陰影の保持: 明暗の違う元色が同じビーズへ潰れていたら、同系ビーズのラダーへ振り直す
  // （ディザリング時は誤差拡散が階調を表現するので不要）
  if (chkShading.checked && !useDither) {
    preserveShading(grid, palette, cellLabArr, W, H);
  }

  // 色数の整理:
  //  自動 = 知覚的にそっくりな色(ΔE00<4)だけ統合して注文を簡素化（色数は固定しない）
  //  数値 = Ward法型の統合で指定色数まで削減（差し色保護つき）
  const mc = colorLimitValue();
  if (mc === "auto") {
    autoMergePalette(grid, palette, cellLabArr);
  } else {
    const limit = +mc;
    if (limit > 0) applyColorLimit(grid, palette, limit, cellLabArr);
  }

  // 仕上げの整形（ドット絵原寸再現モードでは元絵に忠実であるべきなので適用しない）
  if (mode !== "pixel" && chkCleanup.checked) {
    cleanupPattern(grid, W, H, palette);
  }

  // ディザ混色: パレットに無い中間色を2色の市松で擬似再現（詳細設定・任意ON）
  if (chkDitherMix.checked && !useDither) {
    applyDitherMix(grid, palette, cellLabArr, W, H);
  }

  // 縁取り: ビーズなしマス（図案の外周含む）に接する縁のマスをアウトライン色へ置き換える
  // （「自動」= selout: その場所の色の同系最暗色で縁取る）
  if (chkAddOutline.checked && selOutlineColor.value) {
    applyOutline(grid, W, H, selOutlineColor.value === "auto" ? -1 : +selOutlineColor.value, palette);
  }

  // 手直しの再適用: 設定を変えて再変換しても、手で塗った/消したマスは維持する。
  // パイプラインの最後に置くことで、縁取りや整形よりユーザーの修正が常に勝つ。
  // 図案サイズが変わったときだけ座標の意味が失われるためログを破棄
  if (state.editW !== W || state.editH !== H) state.editLog.clear();
  state.editW = W; state.editH = H;
  // ブランド/サイズ変更をまたぐ引き継ぎは通知し、ワンタップで破棄できるようにする
  // （元パレットの不足を補うための応急手直しは、新ブランドでは不要なことがある）
  if (state.editLog.size && state.editSeries && state.editSeries !== series.key) {
    carryNote.hidden = false;
  }
  if (state.editLog.size) state.editSeries = series.key;
  reapplyEdits(grid, palette, state.editLog);

  state.grid = grid;
  state.W = W; state.H = H;
  state.palette = palette;
  state.series = series;
  state.pen = -2;
  state.highlight = -1;
  state.undoStack = [];
  btnUndo.disabled = true;
  assignSymbols();
  updatePenStatus();

  const firstReveal = stepResult.hidden;
  stepResult.hidden = false;
  document.body.classList.add("has-result");
  placeUploadSection();
  // 図案サイズが変わったとき・初回は横幅フィットのズームにする（手動ズームは同サイズ内でのみ維持）
  if (!userZoomed || state.lastFitW !== W || state.lastFitH !== H) {
    fitZoom();
    userZoomed = false;
  }
  state.lastFitW = W;
  state.lastFitH = H;
  render();
  renderLegend();
  syncSizeChips();
  // PCの2カラム表示では図案が常に隣に見えているのでスクロールしない
  if (firstReveal && window.innerWidth < 1040) {
    stepResult.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  saveSession();
}

// 陰影の保持: 少色パレットで「明暗の違う元色が同じビーズに潰れる」のを防ぐ。
// 1色ずつの最近色マッチではなく、絵全体で「同じビーズに潰れた明暗の段」を検出し、
// その段数分のビーズを同系色の明度ラダーから順序を保ったまま確保し直す（DP最適割当）。
// 「マスごとに絶対的に一番近い色」より「元絵の相対的な明暗差」を優先する処理で、
// 例えばナノビーズには L44 エバーグリーンより暗い緑が無いため、服の中間緑も影も
// エバーグリーン1色に潰れる → 中間緑をみどりへ持ち上げて影との段差を残す
function preserveShading(grid, palette, cellLab, W, H) {
  const total = W * H;
  // 1) 使用セルをΔE00≤4のクラスタへ集約（多すぎる=写真的な連続階調なら何もしない）
  const clusters = [];
  const cellCl = new Int16Array(total).fill(-1);
  for (let i = 0; i < total; i++) {
    if (grid[i] < 0) continue;
    const lab = [cellLab[i * 3], cellLab[i * 3 + 1], cellLab[i * 3 + 2]];
    let hit = -1;
    for (let k = 0; k < clusters.length; k++) {
      const cl = clusters[k];
      if (Math.abs(cl.lab[0] - lab[0]) < 6 && ciede2000(cl.lab, lab) <= 4) { hit = k; break; }
    }
    if (hit < 0) {
      if (clusters.length >= 120) return;
      clusters.push({ lab: lab.slice(), n: 0 });
      hit = clusters.length - 1;
    }
    clusters[hit].n++;
    cellCl[i] = hit;
  }
  const cellsUsed = clusters.reduce((s, c) => s + c.n, 0);
  const minN = Math.max(4, Math.round(cellsUsed * 0.004));
  const hueOf = (lab) => Math.atan2(lab[2], lab[1]) * 180 / Math.PI;
  const chromaOf = (lab) => Math.hypot(lab[1], lab[2]);
  const hueDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  // 2) 「同じビーズに潰れた」クラスタ群だけを対象にする（collapse-triggered）。
  //    既に自分のビーズを持てている色（肌・差し色など）には一切触らない。
  //    色相だけで束ねると髪と赤マント、髪と肌のような別素材が混線するため
  const byBead = new Map();
  const usedBeads = new Set(); // 既に誰かの色になっているビーズ（そこへ逃がすと新たな潰れを生む）
  clusters.forEach((c, k) => {
    c.k = k;
    c.bead = nearestIndex(c.lab, palette);
    if (c.n >= minN) {
      if (!byBead.has(c.bead)) byBead.set(c.bead, []);
      byBead.get(c.bead).push(c);
      usedBeads.add(c.bead);
    }
  });
  const remap = new Map(); // クラスタ番号 -> 割り振り先 palette index
  for (const [bi, list] of byBead) {
    if (list.length < 2) continue;
    const bl = palette[bi].lab;
    if (chromaOf(bl) < 8) continue; // 黒・グレーへ落ちた影はここでは動かさない
    // 明度順に並べ、L差5未満の隣同士は同じ「段」として扱う（JPEGノイズ等の誤分割対策）
    const ms = list.slice().sort((a, b) => a.lab[0] - b.lab[0]);
    if (ms[ms.length - 1].lab[0] - ms[0].lab[0] < 6) continue; // 明暗の段差が無い＝陰影ではない
    const rungs = [];
    for (const m of ms) {
      const last = rungs[rungs.length - 1];
      if (last && m.lab[0] - last.top < 5) { last.members.push(m); last.n += m.n; last.top = m.lab[0]; }
      else rungs.push({ members: [m], n: m.n, top: m.lab[0] });
    }
    if (rungs.length < 2) continue;
    for (const r of rungs) {
      const lab = [0, 0, 0];
      for (const m of r.members) { lab[0] += m.lab[0] * m.n; lab[1] += m.lab[1] * m.n; lab[2] += m.lab[2] * m.n; }
      r.lab = [lab[0] / r.n, lab[1] / r.n, lab[2] / r.n];
    }
    // 3) 潰れたビーズと同系色で「空いている」ビーズ候補（明度順のラダー）。
    //    元のビーズは常に含める。使用中のビーズへ逃がすと別の色と潰れ直すだけなので除外。
    //    色相±24°: これ以上離れると「同じ素材の明暗」ではなく別の色に見える
    //    （例: 茶髪の影→ワインレッドの誤爆）
    const bh = hueOf(bl);
    const beads = [];
    for (let p = 0; p < palette.length; p++) {
      const pl = palette[p].lab;
      if (p === bi || (!usedBeads.has(p) && chromaOf(pl) >= 8 && hueDiff(hueOf(pl), bh) <= 24)) beads.push(p);
    }
    if (beads.length < 2) continue;
    beads.sort((a, b) => palette[a].lab[0] - palette[b].lab[0]);
    // 4) 順序を保つ割当をDPで選ぶ。段を潰す（同じビーズの使い回し）は1マスあたり
    //    ΔE10相当のペナルティ、かけ離れた色への飛び付きは最近色+14で禁止
    const PEN = 10, CAP = 14;
    const cost = rungs.map((r) => {
      const rc = chromaOf(r.lab);
      const near = beadDist(r.lab, palette[nearestIndex(r.lab, palette)].lab);
      return beads.map((p) => {
        const pl = palette[p].lab;
        // 明度がかけ離れたビーズは段として成立しない（影L46→ミントL90のような飛びを禁止）
        if (Math.abs(pl[0] - r.lab[0]) > 18) return Infinity;
        // 鮮やかさが大きく違うビーズへの飛び付きは追加コスト（くすんだ髪→ネオン色などの事故防止）
        const d = beadDist(r.lab, pl) + Math.max(0, Math.abs(chromaOf(pl) - rc) - 15) * 0.3;
        return d <= near + CAP ? d * r.n : Infinity;
      });
    });
    const nR = rungs.length, nB = beads.length;
    const dp = [], from = [];
    for (let i = 0; i < nR; i++) { dp.push(new Array(nB).fill(Infinity)); from.push(new Array(nB).fill(-1)); }
    for (let j = 0; j < nB; j++) dp[0][j] = cost[0][j];
    for (let i = 1; i < nR; i++) {
      for (let j = 0; j < nB; j++) {
        if (cost[i][j] === Infinity) continue;
        for (let j2 = 0; j2 <= j; j2++) {
          if (dp[i - 1][j2] === Infinity) continue;
          const v = dp[i - 1][j2] + cost[i][j] + (j2 === j ? PEN * rungs[i].n : 0);
          if (v < dp[i][j]) { dp[i][j] = v; from[i][j] = j2; }
        }
      }
    }
    let bj = -1, bv = Infinity;
    for (let j = 0; j < nB; j++) if (dp[nR - 1][j] < bv) { bv = dp[nR - 1][j]; bj = j; }
    if (bj < 0) continue;
    for (let i = nR - 1; i >= 0; i--) {
      if (beads[bj] !== bi) {
        for (const mem of rungs[i].members) remap.set(mem.k, beads[bj]);
        usedBeads.add(beads[bj]); // 確保済み: 後続の潰れグループが同じ色へ逃げないように
      }
      if (i > 0) bj = from[i][bj];
    }
  }
  // 色相の向きの整合: ソースの色相がほぼ同じ一族の中で、多数派（本体）と反対方向へ
  // 色相がズレたビーズになった少数派を、本体と同じ向きの空きビーズへ寄せる。
  // 例: フシギダネの体=パステルみどり(青側)なのに、くすんだ緑だけよもぎ(黄色側)
  //     → あおみどりへ。「影のズレは本体と同じ色相方向であるべき」という絵の原則。
  // 黄色側ズレは「汚れ」、本体と同方向のズレは「陰影」として知覚されるため
  const hueDelta = (a, b) => { let d = a - b; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };
  const MUD = 95; // オリーブ・黄土の中心色相。ここへ近づく色相ズレは「汚れ」に見える
  const sizable = clusters.filter((c) => c.n >= minN && chromaOf(c.lab) >= 15 && !isSkinTone(c.lab));
  for (const mc of sizable) {
    const mBead = remap.has(mc.k) ? remap.get(mc.k) : mc.bead;
    const mOff = hueDelta(hueOf(palette[mBead].lab), hueOf(mc.lab));
    if (Math.abs(mOff) < 12) continue; // ビーズの色相が素直な位置なら何もしない
    // 矯正するのは「黄土方向へのズレ」だけ。反対向き（影らしい寒色側）のズレは自然
    const mudward = Math.abs(hueDelta(hueOf(palette[mBead].lab), MUD)) < Math.abs(hueDelta(hueOf(mc.lab), MUD));
    if (!mudward) continue;
    // 同族（ソース色相±15°）で反対向きのビーズを持つ「本体」アンカーを探す
    let anchor = 0, domBead = -1, domN = 0, domSrcL = 0;
    for (const dc of sizable) {
      if (dc === mc || Math.abs(hueDelta(hueOf(dc.lab), hueOf(mc.lab))) > 15) continue;
      const b = remap.has(dc.k) ? remap.get(dc.k) : dc.bead;
      if (chromaOf(palette[b].lab) < 12) continue; // 無彩色寄りのビーズは向きの基準にしない
      const off = hueDelta(hueOf(palette[b].lab), hueOf(dc.lab));
      if (off * mOff < 0) {
        anchor += dc.n;
        if (Math.abs(hueDelta(hueOf(palette[b].lab), hueOf(palette[mBead].lab))) >= 25 && dc.n > domN) {
          domN = dc.n; domBead = b; domSrcL = dc.lab[0];
        }
      }
    }
    if (domBead < 0 || anchor < mc.n * 0.5) continue;
    // 影側かどうかは「基準にした本体クラスタ自身」との比較で決める
    // （アンカー全体の平均だと、同族の暗い段に引きずられて誤判定する）
    const darker = mc.lab[0] < domSrcL;
    const cur = beadDist(mc.lab, palette[mBead].lab);
    let best = -1, bd = Infinity;
    for (let p = 0; p < palette.length; p++) {
      // 空きビーズ限定。本体ビーズ自体も除外（合流させると段が消えて塗り分けが失われる）
      if (usedBeads.has(p)) continue;
      const pl = palette[p].lab;
      if (chromaOf(pl) < 15) continue;
      if (Math.abs(pl[0] - mc.lab[0]) > 18) continue; // 明度がかけ離れた矯正はしない
      const off = hueDelta(hueOf(pl), hueOf(mc.lab));
      if (off * mOff >= 0 || Math.abs(off) > 45) continue; // 本体と同じ向き・行き過ぎは除外
      // 影が本体より明るく（明部が本体より暗く）ならないように
      if (darker ? pl[0] > palette[domBead].lab[0] + 2 : pl[0] < palette[domBead].lab[0] - 2) continue;
      const d = beadDist(mc.lab, pl);
      if (d < bd) { bd = d; best = p; }
    }
    if (best >= 0 && bd <= cur + 20) {
      remap.set(mc.k, best);
      usedBeads.add(best);
    }
  }
  if (!remap.size) return;
  for (let i = 0; i < total; i++) {
    const k = cellCl[i];
    if (k >= 0 && remap.has(k)) grid[i] = remap.get(k);
  }
}

// ディザ混色: パレットに存在しない中間色を「近い2色ビーズの市松模様」で擬似再現する。
// Mr.ドットマン（小野浩）が実機で確立し、EGA時代（Mark Ferrari）に体系化された定石。
//  - 混色の見え方はガンマ補正した平均で評価する（単純なRGB平均は実際より明るく狂う）
//  - かけ離れた2色の混合はノイズに見えるため、ペアはΔE00≤24に限定
//  - 片割れは現在割当てられているビーズに固定 = 色相方針（寒色側の影など）を壊さない
//  - 市松が模様として読めない小さな領域（8マス未満）は対象外
function applyDitherMix(grid, palette, cellLab, W, H) {
  const total = W * H;
  const clusters = [];
  const cellCl = new Int16Array(total).fill(-1);
  for (let i = 0; i < total; i++) {
    if (grid[i] < 0) continue;
    const lab = [cellLab[i * 3], cellLab[i * 3 + 1], cellLab[i * 3 + 2]];
    let hit = -1;
    for (let k = 0; k < clusters.length; k++) {
      const cl = clusters[k];
      if (cl.bead === grid[i] && Math.abs(cl.lab[0] - lab[0]) < 6 && ciede2000(cl.lab, lab) <= 4) { hit = k; break; }
    }
    if (hit < 0) {
      if (clusters.length >= 160) return; // 写真的な連続階調は対象外
      clusters.push({ lab: lab.slice(), bead: grid[i], n: 0 });
      hit = clusters.length - 1;
    }
    clusters[hit].n++;
    cellCl[i] = hit;
  }
  const lin = (u) => Math.pow(u / 255, 2.2);
  const delin = (u) => Math.round(Math.pow(u, 1 / 2.2) * 255);
  for (const cl of clusters) {
    if (cl.n < 8) continue;
    const A = palette[cl.bead];
    const d0 = beadDist(cl.lab, A.lab);
    let best = -1, bd = d0 - 2; // 2以上の明確な改善がある時だけ混色する
    for (let p = 0; p < palette.length; p++) {
      if (p === cl.bead) continue;
      if (ciede2000(A.lab, palette[p].lab) > 24) continue;
      const B = palette[p];
      const mix = srgbToLab(
        delin((lin(A.rgb[0]) + lin(B.rgb[0])) / 2),
        delin((lin(A.rgb[1]) + lin(B.rgb[1])) / 2),
        delin((lin(A.rgb[2]) + lin(B.rgb[2])) / 2));
      const d = beadDist(cl.lab, mix);
      if (d < bd) { bd = d; best = p; }
    }
    if (best >= 0) cl.mix = best;
  }
  for (let i = 0; i < total; i++) {
    const k = cellCl[i];
    if (k < 0 || clusters[k].mix === undefined) continue;
    const x = i % W, y = (i / W) | 0;
    if ((x + y) & 1) grid[i] = clusters[k].mix;
  }
}

// 手直しログの再適用。ビーズは色コードでパレットに対応付け、
// パレットに無い色（ブランド変更後など）は記録時のRGBに最も近い色へフォールバックする
function reapplyEdits(grid, palette, log) {
  if (!log || !log.size) return;
  const codeIdx = new Map();
  for (let i = 0; i < palette.length; i++) {
    if (!codeIdx.has(palette[i].c)) codeIdx.set(palette[i].c, i);
  }
  for (const [i, e] of log) {
    if (i < 0 || i >= grid.length) continue;
    if (!e) { grid[i] = -1; continue; }
    let idx = codeIdx.get(e.c);
    if (idx === undefined) idx = nearestIndex(srgbToLab(e.rgb[0], e.rgb[1], e.rgb[2]), palette);
    grid[i] = idx;
  }
}

// 縁取り(アウトライン): ビーズなしマス・図案の外周に接している縁のマスを置き換える。
// 外側に1マス足す方式ではなく縁のマスを置き換える方式なので、プレートサイズからはみ出さない。
// colorIdx >= 0 は単色縁取り。colorIdx < 0 は selout（selective outlining）＝
// 一律の黒でなく「その場所の色の同系の最暗色」で縁取るドット絵の定石（Derek Yu / saint11）
function applyOutline(grid, W, H, colorIdx, palette) {
  const src = grid.slice();
  const empty = (x, y) => x < 0 || y < 0 || x >= W || y >= H || src[y * W + x] < 0;
  const cache = new Map();
  const seloutFor = (v) => {
    if (cache.has(v)) return cache.get(v);
    const c = palette[v].lab;
    const cC = Math.hypot(c[1], c[2]);
    const hue = Math.atan2(c[2], c[1]) * 180 / Math.PI;
    let best = -1;
    for (let p = 0; p < palette.length; p++) {
      const pl = palette[p].lab;
      if (pl[0] > c[0] - 6) continue; // 明確に暗い色だけが縁になれる
      const pC = Math.hypot(pl[1], pl[2]);
      if (cC >= 8) {
        if (pC < 8) continue; // 有彩色のマスは同系の有彩色で縁取る
        let dh = Math.abs(Math.atan2(pl[2], pl[1]) * 180 / Math.PI - hue);
        if (dh > 180) dh = 360 - dh;
        if (dh > 30) continue;
      } else if (pC >= 8) continue; // 無彩色のマスは無彩色で
      if (best < 0 || pl[0] < palette[best].lab[0]) best = p;
    }
    if (best < 0) { // 同系の暗色が無ければ全体の最暗色（多くは黒）
      best = 0;
      for (let p = 1; p < palette.length; p++) if (palette[p].lab[0] < palette[best].lab[0]) best = p;
    }
    cache.set(v, best);
    return best;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (src[i] < 0) continue;
      if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) {
        grid[i] = colorIdx >= 0 ? colorIdx : seloutFor(src[i]);
      }
    }
  }
}

// 色数上限: Ward法型の貪欲統合。
// 「統合コスト = 出現数 × 最近傍使用色とのΔE00²」が最小の色から消す。
// 出現数だけで決めると、少数でも色空間で孤立した差し色（目・ハイライト）が
// 真っ先に消えてしまうため、色の孤立度をコストに含める。
// cellLab があれば、統合時に各セルを「元の色に最も近い残存色」へ再探索する
// （消えた色の最近色への一括置換より誤差が小さい）
function applyColorLimit(grid, palette, limit, cellLab) {
  const counts = new Map();
  for (const v of grid) if (v >= 0) counts.set(v, (counts.get(v) || 0) + 1);
  // 職人の定石「ランプの端は絵の骨格」: 使用中の最暗色（締め色）と最明色（ハイライト）は
  // 数値制限でも最後まで残す。輪郭や光が消えると色数以上に絵が崩れるため
  // （渋谷員子「グラデ4〜5段+締め色1」/ Pixel Joint tutorial「最暗・最明は複数ランプで共有」）
  let dk = -1, lt = -1;
  for (const idx of counts.keys()) {
    if (dk < 0 || palette[idx].lab[0] < palette[dk].lab[0]) dk = idx;
    if (lt < 0 || palette[idx].lab[0] > palette[lt].lab[0]) lt = idx;
  }
  while (counts.size > limit) {
    let vic = -1, vicCost = Infinity, vicNear = -1;
    for (const [idx, cnt] of counts) {
      if (idx === dk || idx === lt) continue;
      let nd = Infinity, ni = -1;
      for (const other of counts.keys()) {
        if (other === idx) continue;
        const d = ciede2000(palette[idx].lab, palette[other].lab);
        if (d < nd) { nd = d; ni = other; }
      }
      const cost = cnt * nd * nd;
      if (cost < vicCost) { vicCost = cost; vic = idx; vicNear = ni; }
    }
    if (vic < 0 || vicNear < 0) break;
    counts.delete(vic);
    const remain = [...counts.keys()];
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] !== vic) continue;
      let tgt = vicNear;
      if (cellLab) {
        const lab = [cellLab[i * 3], cellLab[i * 3 + 1], cellLab[i * 3 + 2]];
        let bd = Infinity;
        for (const idx of remain) {
          const d = beadDist(lab, palette[idx].lab);
          if (d < bd) { bd = d; tgt = idx; }
        }
      }
      grid[i] = tgt;
      counts.set(tgt, (counts.get(tgt) || 0) + 1);
    }
  }
}

// 知覚的にそっくりな使用色（ΔE00 < 4）同士だけを統合する。
// 「青の微妙な違いが27色」のような、注文を無駄に複雑にする重複を自動で片付ける。
// 色数そのものは固定しないので、必要な色まで削られることはない
function autoMergePalette(grid, palette, cellLab) {
  const DE_DUP = 4;
  for (;;) {
    const counts = new Map();
    for (const v of grid) if (v >= 0) counts.set(v, (counts.get(v) || 0) + 1);
    let vic = -1, vicCost = Infinity;
    for (const [idx, cnt] of counts) {
      let nd = Infinity;
      for (const other of counts.keys()) {
        if (other === idx) continue;
        const d = ciede2000(palette[idx].lab, palette[other].lab);
        if (d < nd) nd = d;
      }
      if (nd >= DE_DUP) continue;
      const cost = cnt * nd * nd;
      if (cost < vicCost) { vicCost = cost; vic = idx; }
    }
    if (vic < 0) break;
    counts.delete(vic);
    const remain = [...counts.keys()];
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] !== vic) continue;
      const lab = [cellLab[i * 3], cellLab[i * 3 + 1], cellLab[i * 3 + 2]];
      let tgt = remain[0], bd = Infinity;
      for (const idx of remain) {
        const d = beadDist(lab, palette[idx].lab);
        if (d < bd) { bd = d; tgt = idx; }
      }
      grid[i] = tgt;
    }
  }
}

// 仕上げの整形パス: 機械的な縮小が生む「ドット絵らしくない」乱れを抑える
//  - 陰影ノイズ: 8近傍の大勢(5+)と色差が小さく、自色との連結が1以下の散らばりを吸収
//  - 浮きビーズ: 背景に完全孤立した1粒を除去（尖った先端は連結があるので守られる）
//  - 穴埋め: 単色領域の中の1マス欠けを埋める
//  ※目のハイライトのような「高コントラストの孤立点」は色差条件で保護される
function cleanupPattern(grid, W, H, palette) {
  const idx = (x, y) => y * W + x;
  for (let pass = 0; pass < 2; pass++) {
    let changed = 0;
    const next = grid.slice();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = grid[idx(x, y)];
        const counts = new Map();
        let same = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
            const u = grid[idx(nx, ny)];
            n++;
            counts.set(u, (counts.get(u) || 0) + 1);
            if (u === v) same++;
          }
        }
        if (n < 5) continue; // 図案の端は触らない
        let dom = -2, domC = 0;
        for (const [u, c] of counts) if (c > domC) { domC = c; dom = u; }
        if (dom === v) continue;
        const strong = Math.min(6, n); // 図案の端は近傍が少ないぶん基準を下げる
        if (v === -1) {
          if (dom >= 0 && domC >= strong) { next[idx(x, y)] = dom; changed++; }
        } else if (dom === -1) {
          if (same === 0 && domC >= strong) { next[idx(x, y)] = -1; changed++; }
        } else if (same <= 1 && domC >= 5 &&
          ciede2000(palette[v].lab, palette[dom].lab) < 18) {
          next[idx(x, y)] = dom; changed++;
        }
      }
    }
    grid.set(next);
    if (!changed) break;
  }
}

btnConvert.addEventListener("click", convert);

// シンプル表示のサイズチップの選択状態を現在のサイズに同期
function syncSizeChips() {
  document.querySelectorAll(".chip-size").forEach((chip) => {
    chip.classList.toggle("active", +chip.dataset.w === state.W || +chip.dataset.w === state.H);
  });
}

/* ---------- 図案記号（変換ごとに一意割当） ---------- */

const SYM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz+*#@%&=?!";

function assignSymbols() {
  state.symMap = new Map();
  const used = usedColors();
  used.forEach(({ idx }, i) => {
    state.symMap.set(idx, SYM_CHARS[i % SYM_CHARS.length]);
  });
}
const symOf = (idx) => state.symMap.get(idx) || "?";

/* ---------- 描画 ---------- */

function cellSize() { return +rngZoom.value; }

// 透過（ビーズなし）マス: 青みがかった下地 + 45°の斜線ハッチ。
// ビーズのマスは必ずベタ塗りなので、「色」ではなく「模様」で区別する
// （市松だとグレー系ビーズと見分けがつかなかった）。
// セル corner-to-corner の斜線は隣接セルとつながって連続ストライプに見える
let emptyTile = null, emptyTileSize = -1;
function getEmptyTile(s) {
  if (emptyTile && emptyTileSize === s) return emptyTile;
  const t = document.createElement("canvas");
  t.width = t.height = Math.max(2, Math.ceil(s));
  const g = t.getContext("2d");
  g.fillStyle = "#edf3f8";
  g.fillRect(0, 0, t.width, t.height);
  g.strokeStyle = "#b9cbdc";
  g.lineWidth = Math.max(1, s * 0.15);
  g.beginPath();
  g.moveTo(-s * 0.3, s * 1.3);
  g.lineTo(s * 1.3, -s * 0.3);
  g.stroke();
  emptyTile = t;
  emptyTileSize = s;
  return t;
}
function drawEmptyCell(c2, px, py, s) {
  c2.drawImage(getEmptyTile(s), px, py);
}

// 図案を表示領域の横幅にフィットさせる自動ズーム。
// ユーザーが手動でズームした後は、次の変換まで上書きしない
let userZoomed = false;
function fitZoom() {
  if (!state.W) return;
  const avail = Math.max(120, (canvasWrap.clientWidth || canvasWrap.parentElement.clientWidth || 320) - 24);
  const byW = Math.floor(avail / state.W);
  const byH = Math.floor((window.innerHeight * 0.58) / Math.max(1, state.H)); // 縦もはみ出さない
  const cs = Math.max(2, Math.min(24, byW, byH));
  rngZoom.value = String(cs);
}

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (state.grid && !userZoomed) { fitZoom(); render(); }
  }, 200);
});

function render() {
  if (!state.grid) return;
  const { W, H, grid, palette } = state;
  const cs = cellSize();
  canvas.width = W * cs + 1;
  canvas.height = H * cs + 1;

  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = grid[y * W + x];
      if (v < 0) {
        drawEmptyCell(ctx, x * cs, y * cs, cs);
        continue;
      }
      const c = palette[v].rgb;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(x * cs, y * cs, cs, cs);
    }
  }

  // 色リストのホバー中はその色以外を淡くし、該当マスを赤枠で縁取る
  // （白系の色でも「薄くなった他色」と見分けられるように枠が必須）
  if (state.highlight >= 0) {
    ctx.fillStyle = "rgba(244,241,234,0.78)";
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = grid[y * W + x];
        if (v >= 0 && v !== state.highlight) ctx.fillRect(x * cs, y * cs, cs, cs);
      }
    }
    ctx.strokeStyle = "rgba(232,68,58,.95)";
    ctx.lineWidth = Math.max(1.5, cs * 0.14);
    const inset = ctx.lineWidth / 2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (grid[y * W + x] === state.highlight) {
          ctx.strokeRect(x * cs + inset, y * cs + inset, cs - inset * 2, cs - inset * 2);
        }
      }
    }
  }

  if (chkGrid.checked && cs >= 5) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,.12)";
    drawLines(cs, 1);
    ctx.strokeStyle = "rgba(0,0,0,.32)";
    drawLines(cs, 10);
  }
  const plate = +selPlate.value;
  if (plate > 0) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(232,96,76,.85)";
    drawLines(cs, plate, true);
  }

  if (chkSymbols.checked && cs >= 12) {
    ctx.font = `${Math.floor(cs * 0.6)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = grid[y * W + x];
        if (v < 0) continue;
        const c = palette[v];
        const lum = 0.299 * c.rgb[0] + 0.587 * c.rgb[1] + 0.114 * c.rgb[2];
        ctx.fillStyle = lum > 140 ? "rgba(0,0,0,.75)" : "rgba(255,255,255,.85)";
        ctx.fillText(symOf(v), x * cs + cs / 2, y * cs + cs / 2 + 1);
      }
    }
  }
  renderMini();
  // PCで大きくズームしてパネルが画面に収まらないときは貼り付きを自動解除
  // （拡大した図案が邪魔でビーズ一覧が読めなくなるのを防ぐ）
  const pane = $("pattern-pane");
  pane.classList.toggle("pane-overflow", pane.offsetHeight > window.innerHeight * 0.72);
}

function drawLines(cs, step, skipEdge) {
  const { W, H } = state;
  ctx.beginPath();
  for (let x = 0; x <= W; x += step) {
    if (skipEdge && (x === 0 || x === W)) continue;
    ctx.moveTo(x * cs + 0.5, 0);
    ctx.lineTo(x * cs + 0.5, H * cs);
  }
  for (let y = 0; y <= H; y += step) {
    if (skipEdge && (y === 0 || y === H)) continue;
    ctx.moveTo(0, y * cs + 0.5);
    ctx.lineTo(W * cs, y * cs + 0.5);
  }
  ctx.stroke();
}

rngZoom.addEventListener("input", () => { userZoomed = true; render(); });
chkGrid.addEventListener("change", render);
chkSymbols.addEventListener("change", () => {
  document.body.classList.toggle("symbols-on", chkSymbols.checked);
  render();
});
selPlate.addEventListener("change", () => { if (state.grid) render(); });

/* ---------- ミニプレビュー（図案が画面外のときだけ右下に表示） ---------- */

const miniPreview = $("mini-preview");
const miniCanvas = $("mini-canvas");
const canvasWrap = $("canvas-wrap");
let canvasInView = true;

function updateMiniVisibility() {
  miniPreview.hidden = !state.grid || canvasInView || stepResult.hidden;
}

function renderMini() {
  if (!state.grid || canvas.width === 0) return;
  const maxSide = 110;
  const scale = Math.min(maxSide / canvas.width, maxSide / canvas.height);
  miniCanvas.width = Math.max(1, Math.round(canvas.width * scale));
  miniCanvas.height = Math.max(1, Math.round(canvas.height * scale));
  const mctx = miniCanvas.getContext("2d");
  mctx.imageSmoothingEnabled = false;
  mctx.drawImage(canvas, 0, 0, miniCanvas.width, miniCanvas.height);
  updateMiniVisibility();
}

if ("IntersectionObserver" in window) {
  new IntersectionObserver((entries) => {
    canvasInView = entries[0].isIntersecting;
    updateMiniVisibility();
  }, { threshold: 0.05 }).observe(canvasWrap);
}
miniPreview.addEventListener("click", () =>
  canvasWrap.scrollIntoView({ behavior: "smooth", block: "start" }));

/* ---------- スマホ用ドロワー（左=設定 / 右=ビーズ一覧） ---------- */

const drawerScrim = $("drawer-scrim");
const drawerSettings = stepSettings;          // 左ドロワー
const drawerBeads = $("legend-section");      // 右ドロワー
const isMobile = () => window.innerWidth < 1040;

function openDrawer(which) {
  if (!isMobile()) return;
  closeDrawers();
  (which === "settings" ? drawerSettings : drawerBeads).classList.add("drawer-open");
  drawerScrim.hidden = false;
  document.body.classList.add("drawer-active");
}
function closeDrawers() {
  drawerSettings.classList.remove("drawer-open");
  drawerBeads.classList.remove("drawer-open");
  drawerScrim.hidden = true;
  document.body.classList.remove("drawer-active");
}

// スマホで変換後は「画像を選ぶ」も設定ドロワー内に移す（メイン画面は図案に専念）
const stepUpload = $("step-upload");
const colLeft = document.querySelector(".col-left");
function placeUploadSection() {
  const inDrawer = isMobile() && document.body.classList.contains("has-result");
  if (inDrawer) {
    if (stepUpload.parentElement !== drawerSettings) {
      drawerSettings.insertBefore(stepUpload, drawerSettings.querySelector("h2"));
    }
  } else if (stepUpload.parentElement !== colLeft) {
    colLeft.insertBefore(stepUpload, drawerSettings);
  }
}

$("btn-drawer-settings").addEventListener("click", () => openDrawer("settings"));
$("btn-drawer-beads").addEventListener("click", () => openDrawer("beads"));
drawerScrim.addEventListener("click", closeDrawers);
document.querySelectorAll("[data-drawer-close]").forEach((b) =>
  b.addEventListener("click", closeDrawers));
window.addEventListener("resize", () => {
  if (!isMobile()) closeDrawers();
  placeUploadSection();
});

// 画面端からのスワイプで開く（左端→設定 / 右端→ビーズ一覧）。ドロワー表示中は逆方向で閉じる
let swipeStart = null;
document.addEventListener("touchstart", (e) => {
  if (!isMobile() || e.touches.length !== 1) { swipeStart = null; return; }
  const t = e.touches[0];
  swipeStart = { x: t.clientX, y: t.clientY, t: Date.now() };
}, { passive: true });
document.addEventListener("touchend", (e) => {
  if (!swipeStart || !isMobile()) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swipeStart.x;
  const dy = t.clientY - swipeStart.y;
  const fromLeft = swipeStart.x < 28;
  const fromRight = swipeStart.x > window.innerWidth - 28;
  const quick = Date.now() - swipeStart.t < 600;
  swipeStart = null;
  if (!quick || Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
  // ドロワー表示中はスワイプで閉じない（一覧内の横操作と衝突して誤クローズするため。
  // 閉じるのは ✕ボタン か 背景タップ のみ）
  if (document.body.classList.contains("drawer-active")) return;
  if (fromLeft && dx > 50) openDrawer("settings");
  else if (fromRight && dx < -50) openDrawer("beads");
}, { passive: true });

/* ---------- 色リスト ---------- */

function usedColors() {
  const counts = new Map();
  for (const v of state.grid) if (v >= 0) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()]
    .map(([idx, count]) => ({ idx, count }))
    .sort((a, b) => b.count - a.count);
}

// ビーズ一覧の行の下に「近い色への一括置き換え」候補を展開する。
// 候補は選択中パレット内の近色4種。既に図案で使っている色には「使用中」を明示
// （置き換えると既存のその色と統合される＝色数が1つ減ることが分かるように）
function toggleAltRow(tr, idx, usedSet) {
  const next = tr.nextElementSibling;
  const wasOpen = next && next.classList.contains("lg-alt");
  legendBody.querySelectorAll("tr.lg-alt").forEach((r) => r.remove());
  if (wasOpen) return;
  const cands = state.palette
    .map((c, i) => ({ i, d: beadDist(state.palette[idx].lab, c.lab) }))
    .filter((x) => x.i !== idx)
    .sort((a, b) => a.d - b.d)
    .slice(0, 4);
  const row = document.createElement("tr");
  row.className = "lg-alt";
  const td = document.createElement("td");
  td.colSpan = 8;
  const wrap = document.createElement("div");
  wrap.className = "lg-alt-wrap";
  const cap = document.createElement("span");
  cap.className = "lg-alt-label";
  cap.textContent = T("lgSwapTo");
  wrap.appendChild(cap);
  for (const { i } of cands) {
    const c = state.palette[i];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "lg-alt-btn";
    b.title = `${c.c} ${dispName(c)}`;
    const sw = document.createElement("span");
    sw.className = "legend-swatch";
    sw.style.background = `rgb(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]})`;
    b.appendChild(sw);
    const nm = document.createElement("span");
    nm.textContent = dispName(c);
    b.appendChild(nm);
    if (usedSet.has(i)) {
      const badge = document.createElement("span");
      badge.className = "lg-inuse";
      badge.textContent = T("lgInUse");
      b.appendChild(badge);
    }
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      replaceAllColor(idx, i);
    });
    wrap.appendChild(b);
  }
  td.appendChild(wrap);
  row.appendChild(td);
  tr.after(row);
}

function renderLegend() {
  const used = usedColors();
  const usedSet = new Set(used.map((u) => u.idx));
  const isMixed = !!(state.series && state.series.mixed);
  legendTable.classList.toggle("mixed", isMixed);
  legendBody.innerHTML = "";
  let total = 0;
  for (const { idx, count } of used) {
    total += count;
    const c = state.palette[idx];
    const tr = document.createElement("tr");
    tr.dataset.idx = idx;
    if (state.pen === idx) tr.classList.add("pen-active");

    const tdSw = document.createElement("td");
    tdSw.className = "td-sw";
    const sw = document.createElement("span");
    sw.className = "legend-swatch";
    sw.style.background = `rgb(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]})`;
    tdSw.appendChild(sw);
    tr.appendChild(tdSw);

    const tdSym = document.createElement("td"); tdSym.className = "col-sym"; tdSym.textContent = symOf(idx); tr.appendChild(tdSym);
    const tdCode = document.createElement("td"); tdCode.className = "col-code"; tdCode.textContent = c.c; tr.appendChild(tdCode);
    const tdName = document.createElement("td"); tdName.className = "td-name"; tdName.textContent = dispName(c); tr.appendChild(tdName);

    const tdBrand = document.createElement("td");
    tdBrand.className = "col-brand";
    if (c.bl) {
      const tag = document.createElement("span");
      tag.className = "brand-tag";
      tag.textContent = c.bl;
      tdBrand.appendChild(tag);
    }
    tr.appendChild(tdBrand);

    const tdCount = document.createElement("td");
    tdCount.className = "td-count";
    tdCount.textContent = LANG === "ja" ? count + " 個" : String(count);
    tr.appendChild(tdCount);

    const tdBuy = document.createElement("td");
    tdBuy.className = "td-buy";
    for (const link of linksFor(c)) {
      const a = document.createElement("a");
      a.className = "buy-link";
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener sponsored";
      a.textContent = link.label;
      a.addEventListener("click", (e) => {
        e.stopPropagation();
        // どの色・どの店の購入ボタンが押されたかを計測（GA設定時のみ）
        if (window.gtag) {
          window.gtag("event", "buy_click", {
            store: link.label,
            brand: c.lk || "",
            color_code: c.c,
            series: state.series ? state.series.key : "",
          });
        }
      });
      tdBuy.appendChild(a);
    }
    tr.appendChild(tdBuy);

    // 近い色への一括置き換え（同ブランド内の近色候補を展開）
    const tdSwap = document.createElement("td");
    tdSwap.className = "td-swap";
    const sb = document.createElement("button");
    sb.type = "button";
    sb.className = "lg-swap";
    sb.textContent = "⇄";
    sb.title = T("lgSwapTip");
    sb.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleAltRow(tr, idx, usedSet);
    });
    tdSwap.appendChild(sb);
    tr.appendChild(tdSwap);

    // 同じ色をもう一度タップ/クリックするとペン解除（スマホで塗りモードから抜けられるように）
    tr.addEventListener("click", () => {
      if (state.pen === idx) {
        setPen(-2);
        if (state.highlight !== -1) { state.highlight = -1; render(); }
      } else {
        setPen(idx);
        // スマホ: 色を選んだらドロワーを閉じて図案に戻る
        if (document.body.classList.contains("drawer-active")) closeDrawers();
      }
    });
    // ホバーでのハイライトは「ホバーが存在するデバイス」限定
    // （タッチだとmouseenterだけ発火してmouseleaveが来ず、ハイライトが固着する）
    if (CAN_HOVER) {
      tr.addEventListener("mouseenter", () => {
        if (state.highlight !== idx) { state.highlight = idx; render(); }
      });
    }
    legendBody.appendChild(tr);
  }
  statLine.textContent = LANG === "ja"
    ? `${state.W}×${state.H}マス ・ ビーズ ${total.toLocaleString()} 個 ・ ${used.length} 色`
    : `${state.W}×${state.H} cells · ${total.toLocaleString()} beads · ${used.length} colors`;
}

const CAN_HOVER = !!(window.matchMedia && matchMedia("(hover: hover)").matches);
if (CAN_HOVER) {
  legendBody.addEventListener("mouseleave", () => {
    if (state.highlight !== -1) { state.highlight = -1; render(); }
  });
}

/* ---------- 編集（ペン・スポイト・undo） ---------- */

function setPen(idx) {
  state.pen = idx;
  updatePenStatus();
  legendBody.querySelectorAll("tr").forEach((tr) =>
    tr.classList.toggle("pen-active", +tr.dataset.idx === idx));
  palettePop.querySelectorAll(".pp-sw").forEach((b) =>
    b.classList.toggle("pen-active", +b.dataset.idx === idx));
}

// 全色パレット: 使用中の色に限らず、選択中ブランド・サイズの全色からペンの色を選べる
const btnPalette = $("btn-palette");
const palettePop = $("palette-pop");
function buildPalettePop() {
  palettePop.innerHTML = "";
  const used = new Set();
  if (state.grid) for (const v of state.grid) if (v >= 0) used.add(v);
  // 表示は色相順（無彩色→色相30°刻み、各グループ内は明→暗）。カタログ順より目で探しやすい
  const order = state.palette.map((c, i) => ({ c, i }));
  const groupOf = (c) => {
    const C = Math.hypot(c.lab[1], c.lab[2]);
    if (C < 8) return -1; // 無彩色は先頭
    return Math.floor(((Math.atan2(c.lab[2], c.lab[1]) * 180 / Math.PI + 360) % 360) / 30);
  };
  order.sort((a, b) => {
    const ga = groupOf(a.c), gb = groupOf(b.c);
    if (ga !== gb) return ga - gb;
    return b.c.lab[0] - a.c.lab[0];
  });
  for (const { c, i } of order) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pp-sw" + (i === state.pen ? " pen-active" : "");
    b.style.background = `rgb(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]})`;
    b.title = `${c.c} ${dispName(c)}` +
      (used.has(i) ? "" : (LANG === "ja" ? "（未使用）" : " (unused)"));
    b.dataset.idx = i;
    b.addEventListener("click", () => { setPen(i); palettePop.hidden = true; });
    palettePop.appendChild(b);
  }
}
btnPalette.addEventListener("click", () => {
  if (!state.palette.length) return;
  palettePop.hidden = !palettePop.hidden;
  if (!palettePop.hidden) buildPalettePop();
});

// ブランド/サイズ変更時の手直し引き継ぎ通知（破棄はワンタップ）
const carryNote = $("carry-note");
$("btn-carry-discard").addEventListener("click", () => {
  state.editLog.clear();
  state.editSeries = null;
  carryNote.hidden = true;
  convert();
});
$("btn-carry-keep").addEventListener("click", () => { carryNote.hidden = true; });

function updatePenStatus() {
  $("btn-pen-erase").classList.toggle("active", state.pen === -1);
  if (state.pen === -2) {
    penSwatch.style.background = "#fff";
    penLabel.textContent = T("penNone");
  } else if (state.pen === -1) {
    penSwatch.style.background =
      "repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 10px 10px";
    penLabel.textContent = T("penEraser");
  } else {
    const c = state.palette[state.pen];
    penSwatch.style.background = `rgb(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]})`;
    penLabel.textContent = `${c.c} ${dispName(c)}`;
  }
}

$("btn-pen-erase").addEventListener("click", () => setPen(-1));

function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const cs = cellSize();
  const x = Math.floor((e.clientX - rect.left) / cs);
  const y = Math.floor((e.clientY - rect.top) / cs);
  if (x < 0 || x >= state.W || y < 0 || y >= state.H) return -1;
  return y * state.W + x;
}

// 同色でつながった領域のセル番号一覧（塗りつぶし用・4方向連結）
function floodIndices(grid, W, H, start) {
  const target = grid[start];
  const out = [];
  const seen = new Uint8Array(W * H);
  const queue = [start];
  seen[start] = 1;
  while (queue.length) {
    const i = queue.pop();
    out.push(i);
    const x = i % W, y = (i / W) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
      if (j >= 0 && !seen[j] && grid[j] === target) { seen[j] = 1; queue.push(j); }
    }
  }
  return out;
}

// 手直しログへ記録: ユーザーが選んだ内容を色コード+RGBで覚える（消しゴムはnull）。
// palette index ではなくコードで持つことで、再変換・ブランド変更後も対応付けできる
function logEdit(j, val) {
  if (!state.editLog.size && state.series) state.editSeries = state.series.key;
  const prev = state.editLog.has(j) ? state.editLog.get(j) : undefined;
  state.editLog.set(j, val >= 0 ? { c: state.palette[val].c, rgb: state.palette[val].rgb } : null);
  return prev; // undo用に「記録前の状態」を返す（undefined=未記録だった）
}

function paintCell(i) {
  if (i < 0 || state.pen === -2) return;
  const val = state.pen === -1 ? -1 : state.pen;
  const { W, H } = state;
  const x0 = i % W, y0 = (i / W) | 0;
  const size = state.penSize || 1;
  const off = size === 3 ? -1 : 0; // 太さ2は右下方向へ、3は中心に広げる
  let changed = false;
  for (let dy = off; dy < off + size; dy++) {
    for (let dx = off; dx < off + size; dx++) {
      const x = x0 + dx, y = y0 + dy;
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const j = y * W + x;
      if (state.grid[j] === val) continue;
      state.painting.push({ i: j, old: state.grid[j], oldLog: logEdit(j, val) });
      state.grid[j] = val;
      changed = true;
    }
  }
  if (changed) render();
}

// 塗りつぶし: タップしたマスと同色の連結領域を一括置換（1回で1バッチ=1回のundoで戻せる）
function fillAt(i) {
  if (i < 0 || state.pen === -2) return;
  const val = state.pen === -1 ? -1 : state.pen;
  if (state.grid[i] === val) return;
  state.painting = [];
  for (const j of floodIndices(state.grid, state.W, state.H, i)) {
    state.painting.push({ i: j, old: state.grid[j], oldLog: logEdit(j, val) });
    state.grid[j] = val;
  }
  render();
  commitPaint();
}

// 図案全体で from 色のマスを to 色へ一括置き換え（1回のundoで戻せる・手直しログに記録）
function replaceAllColor(from, to) {
  if (!state.grid || from < 0 || from === to) return; // 透過マスは対象外（背景の全置換事故を防ぐ）
  state.painting = [];
  for (let j = 0; j < state.grid.length; j++) {
    if (state.grid[j] !== from) continue;
    state.painting.push({ i: j, old: from, oldLog: logEdit(j, to) });
    state.grid[j] = to;
  }
  render();
  commitPaint();
}

// 色の一括置換ツール: タップしたマスの色を、図案全体でペンの色に置き換える
function replaceColorAt(i) {
  if (i < 0 || state.pen === -2) return;
  replaceAllColor(state.grid[i], state.pen === -1 ? -1 : state.pen);
}

// 手直しモード: チェックボックスでなくトグルボタン（ONで手直しパネルが開く）
const btnEditMode = $("btn-editmode");
let editModeOn = false;
const editingOn = () => editModeOn && state.pen !== -2;
btnEditMode.addEventListener("click", () => {
  editModeOn = !editModeOn;
  btnEditMode.classList.toggle("active", editModeOn);
  document.body.classList.toggle("edit-on", editModeOn);
  if (!editModeOn) palettePop.hidden = true;
});

// ツール切替（ペン / 塗りつぶし / 色置換）とペンの太さ
$("tool-pen").addEventListener("click", () => setTool("pen"));
$("tool-fill").addEventListener("click", () => setTool("fill"));
$("tool-replace").addEventListener("click", () => setTool("replace"));
function setTool(t) {
  state.tool = t;
  $("tool-pen").classList.toggle("active", t === "pen");
  $("tool-fill").classList.toggle("active", t === "fill");
  $("tool-replace").classList.toggle("active", t === "replace");
}
document.querySelectorAll(".pen-size-btn").forEach((b) =>
  b.addEventListener("click", () => {
    state.penSize = +b.dataset.size;
    document.querySelectorAll(".pen-size-btn").forEach((x) =>
      x.classList.toggle("active", x === b));
  }));

canvas.addEventListener("mousedown", (e) => {
  if (e.button !== 0 || !state.grid) return;
  if (!editingOn()) return;
  if (state.tool === "replace") {
    replaceColorAt(cellFromEvent(e));
    return;
  }
  if (state.tool === "fill") {
    fillAt(cellFromEvent(e));
    return;
  }
  state.painting = [];
  paintCell(cellFromEvent(e));
});
canvas.addEventListener("mousemove", (e) => {
  if (state.painting && (e.buttons & 1) && state.tool === "pen") paintCell(cellFromEvent(e));
});
function commitPaint() {
  if (state.painting && state.painting.length) {
    state.undoStack.push(state.painting);
    if (state.undoStack.length > 100) state.undoStack.shift();
    btnUndo.disabled = false;
    renderLegend();
    saveSession();
  }
  state.painting = null;
}
window.addEventListener("mouseup", commitPaint);

// タッチ編集: 手直しモードON かつ ペン選択中のみ塗る（それ以外は通常のスクロール）
canvas.addEventListener("touchstart", (e) => {
  if (!state.grid || !editingOn()) return;
  e.preventDefault();
  if (state.tool === "replace") {
    replaceColorAt(cellFromEvent(e.touches[0]));
    return;
  }
  if (state.tool === "fill") {
    fillAt(cellFromEvent(e.touches[0]));
    return;
  }
  state.painting = [];
  paintCell(cellFromEvent(e.touches[0]));
}, { passive: false });
canvas.addEventListener("touchmove", (e) => {
  if (!state.painting || state.tool !== "pen") return;
  e.preventDefault();
  paintCell(cellFromEvent(e.touches[0]));
}, { passive: false });
canvas.addEventListener("touchend", commitPaint);
canvas.addEventListener("touchcancel", commitPaint);

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (!state.grid) return;
  const i = cellFromEvent(e);
  if (i < 0) return;
  setPen(state.grid[i] >= 0 ? state.grid[i] : -1);
});

btnUndo.addEventListener("click", () => {
  const batch = state.undoStack.pop();
  if (!batch) return;
  for (let k = batch.length - 1; k >= 0; k--) {
    const e = batch[k];
    state.grid[e.i] = e.old;
    // 手直しログも巻き戻す（undefined=この操作の前は記録が無かった）
    if (e.oldLog === undefined) state.editLog.delete(e.i);
    else state.editLog.set(e.i, e.oldLog);
  }
  btnUndo.disabled = state.undoStack.length === 0;
  render();
  renderLegend();
  saveSession();
});

/* ---------- ダウンロード ---------- */

$("btn-dl-png").addEventListener("click", () => {
  if (!state.grid) return;
  const { W, H, grid, palette } = state;
  const cs = 24, margin = 30;
  const used = usedColors();
  const legendRow = 26, legendPad = 20;
  const gridW = margin + W * cs + 1;
  const gridH = margin + H * cs + 1;
  const cw = Math.max(gridW + 10, 560);
  const ch = gridH + legendPad + used.length * legendRow + 46;

  const cv = document.createElement("canvas");
  cv.width = cw; cv.height = ch;
  const c2 = cv.getContext("2d");
  c2.fillStyle = "#ffffff";
  c2.fillRect(0, 0, cw, ch);

  // グリッド
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = grid[y * W + x];
      if (v < 0) {
        drawEmptyCell(c2, margin + x * cs, margin + y * cs, cs);
        continue;
      }
      c2.fillStyle = `rgb(${palette[v].rgb.join(",")})`;
      c2.fillRect(margin + x * cs, margin + y * cs, cs, cs);
    }
  }
  // 罫線
  c2.lineWidth = 1;
  for (let x = 0; x <= W; x++) {
    c2.strokeStyle = x % 10 === 0 ? "rgba(0,0,0,.45)" : "rgba(0,0,0,.15)";
    c2.beginPath();
    c2.moveTo(margin + x * cs + 0.5, margin);
    c2.lineTo(margin + x * cs + 0.5, margin + H * cs);
    c2.stroke();
  }
  for (let y = 0; y <= H; y++) {
    c2.strokeStyle = y % 10 === 0 ? "rgba(0,0,0,.45)" : "rgba(0,0,0,.15)";
    c2.beginPath();
    c2.moveTo(margin, margin + y * cs + 0.5);
    c2.lineTo(margin + W * cs, margin + y * cs + 0.5);
    c2.stroke();
  }
  const plate = +selPlate.value;
  if (plate > 0) {
    c2.lineWidth = 2.5;
    c2.strokeStyle = "rgba(232,96,76,.9)";
    for (let x = plate; x < W; x += plate) {
      c2.beginPath();
      c2.moveTo(margin + x * cs, margin);
      c2.lineTo(margin + x * cs, margin + H * cs);
      c2.stroke();
    }
    for (let y = plate; y < H; y += plate) {
      c2.beginPath();
      c2.moveTo(margin, margin + y * cs);
      c2.lineTo(margin + W * cs, margin + y * cs);
      c2.stroke();
    }
  }
  // 座標数字（10ごと）
  c2.fillStyle = "#555";
  c2.font = "12px sans-serif";
  c2.textAlign = "center"; c2.textBaseline = "middle";
  for (let x = 10; x <= W; x += 10) c2.fillText(x, margin + x * cs, margin / 2);
  for (let y = 10; y <= H; y += 10) c2.fillText(y, margin / 2, margin + y * cs);

  // 記号
  c2.font = "14px monospace";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = grid[y * W + x];
      if (v < 0) continue;
      const col = palette[v];
      const lum = 0.299 * col.rgb[0] + 0.587 * col.rgb[1] + 0.114 * col.rgb[2];
      c2.fillStyle = lum > 140 ? "rgba(0,0,0,.75)" : "rgba(255,255,255,.85)";
      c2.fillText(symOf(v), margin + x * cs + cs / 2, margin + y * cs + cs / 2 + 1);
    }
  }

  // 凡例
  let ly = gridH + legendPad + 8;
  c2.textAlign = "left";
  c2.fillStyle = "#333";
  c2.font = "bold 14px sans-serif";
  c2.fillText(T("legendTitle"), margin, ly);
  ly += 10;
  c2.font = "13px sans-serif";
  for (const { idx, count } of used) {
    ly += legendRow;
    const col = palette[idx];
    c2.fillStyle = `rgb(${col.rgb.join(",")})`;
    c2.fillRect(margin, ly - 14, 18, 18);
    c2.strokeStyle = "rgba(0,0,0,.4)";
    c2.lineWidth = 1;
    c2.strokeRect(margin + 0.5, ly - 13.5, 18, 18);
    c2.fillStyle = "#333";
    const brand = col.bl ? `〔${col.bl}〕` : "";
    c2.fillText(`${symOf(idx)}  ${col.c}  ${dispName(col)} ${brand} ×${count}`, margin + 28, ly);
  }

  // 保存: スマホは <a download>+dataURL が失敗しやすい（特にiOS Safari）ため、
  // OSの共有シート（→「画像を保存」）を優先し、非対応環境はBlobダウンロードにフォールバック
  const fname = `beads_${W}x${H}.png`;
  cv.toBlob(async (blob) => {
    if (!blob) return;
    if (!CAN_HOVER && navigator.canShare) {
      try {
        const file = new File([blob], fname, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: fname });
          return;
        }
      } catch (err) {
        if (err && err.name === "AbortError") return; // ユーザーがキャンセルしただけ
        // 共有に失敗したら通常ダウンロードへ
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = fname;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, "image/png");
});


/* ---------- 起動 ---------- */

prepPalettes();
initSeriesSelect();
applyLang();
refreshOutlineOptions(activePalette(currentSeries().key, chkSpecial.checked)); // 縁取りセレクトの初期表示
restoreSession(); // 別ページから戻ってきたとき、図案と設定をそのまま復元
