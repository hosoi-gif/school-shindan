// 診断ツールのクライアント側ロジック。
// venueId は URL (/v/:venueId) から取り、その会場の合成済みCONFIG（共通の質問・コース + その会場のボーナス質問）
// をサーバーから取得してから診断を開始する。

const RIASEC_LETTERS = ["R","I","A","S","E","C"];
let CONFIG = null;
let VENUE_ID = null;

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function getVenueIdFromPath(){
  const m = window.location.pathname.match(/^\/v\/([^\/]+)/);
  return m ? m[1] : null;
}

async function init(){
  VENUE_ID = getVenueIdFromPath();
  if(!VENUE_ID){
    showError();
    return;
  }
  try{
    const res = await fetch(`/api/venues/${VENUE_ID}/quiz-config`);
    if(!res.ok){ showError(); return; }
    const data = await res.json();
    CONFIG = data.config;
    document.getElementById("screen-loading").classList.add("hidden");
    document.getElementById("screen-start").classList.remove("hidden");
    applyStaticUi();
  } catch(e){
    showError();
  }
}

function showError(){
  document.getElementById("screen-loading").classList.add("hidden");
  document.getElementById("screen-error").classList.remove("hidden");
}

function applyStaticUi(){
  document.getElementById('startTitle').innerHTML = CONFIG.ui.startTitle;
  document.getElementById('startLead').textContent = CONFIG.ui.startLead;
  document.getElementById('startBtn').textContent = CONFIG.ui.startButton;
  document.getElementById('restartBtn').textContent = CONFIG.ui.restartButton;
  document.getElementById('ctaMessage').innerHTML = CONFIG.ui.cta.message;
  document.getElementById('ctaSub').textContent = CONFIG.ui.cta.sub;
  renderQrSlot();
}

function renderQrSlot(){
  const el = document.getElementById('qrSlot');
  const qr = CONFIG.ui.qr || {};
  if(!qr.imageUrl && !qr.linkUrl){
    el.textContent = "［ここにQRコード・URLを貼り付け］";
    return;
  }
  let html = "";
  if(qr.imageUrl) html += `<img src="${escapeHtml(qr.imageUrl)}" alt="QRコード" style="max-width:100%;border-radius:8px;margin-bottom:8px;">`;
  if(qr.linkUrl) html += `<a href="${escapeHtml(qr.linkUrl)}" target="_blank" rel="noopener" style="color:#fff;font-weight:700;text-decoration:underline;">${escapeHtml(qr.linkText || qr.linkUrl)}</a>`;
  el.innerHTML = html;
}

let current = 0;
let riasec = {};
let sequence = [];

// 診断（RIASEC採点）とは無関係な「ボーナス質問」を、指定された位置に挟み込んだ
// 出題順を組み立てる。afterQuestion:0 = 最初の質問より前、N = 元のN問目の直後。
// スコアには一切影響しない（answer()ではなくadvance()だけを呼ぶ）。
function buildSequence(){
  const seq = [];
  const byPosition = {};
  (CONFIG.bonusQuestions||[]).forEach(bq=>{
    const pos = Math.max(0, Math.min(CONFIG.questions.length, Number(bq.afterQuestion)||0));
    (byPosition[pos] = byPosition[pos] || []).push(bq);
  });
  (byPosition[0]||[]).forEach(bq=> seq.push({ type:"bonus", data:bq }));
  CONFIG.questions.forEach((q, idx)=>{
    seq.push({ type:"real", data:q });
    (byPosition[idx+1]||[]).forEach(bq=> seq.push({ type:"bonus", data:bq }));
  });
  return seq;
}

function startQuiz(){
  current = 0;
  riasec = {}; RIASEC_LETTERS.forEach(l=> riasec[l]=0);
  sequence = buildSequence();
  document.getElementById("screen-start").classList.add("hidden");
  document.getElementById("screen-result").classList.add("hidden");
  document.getElementById("screen-quiz").classList.remove("hidden");
  renderQuestion();
}

function renderQuestion(){
  const item = sequence[current];
  document.getElementById("qnum").textContent = "Q" + (current+1) + " / " + sequence.length;
  document.getElementById("progressBar").style.width = ((current)/sequence.length*100) + "%";
  const choicesEl = document.getElementById("choices");
  choicesEl.innerHTML = "";

  if(item.type === "bonus"){
    document.getElementById("qtext").textContent = item.data.q;
    (item.data.opts||[]).forEach(text=>{
      const btn = document.createElement("div");
      btn.className = "choice";
      btn.textContent = text;
      btn.onclick = ()=> advance();
      choicesEl.appendChild(btn);
    });
    return;
  }

  const q = item.data;
  document.getElementById("qtext").textContent = q.q;
  q.opts.forEach((text, i)=>{
    const letter = RIASEC_LETTERS[i];
    const btn = document.createElement("div");
    btn.className = "choice";
    btn.textContent = text;
    btn.onclick = ()=> answer(letter);
    choicesEl.appendChild(btn);
  });
}

function advance(){
  current++;
  if(current >= sequence.length){
    showResult();
  } else {
    renderQuestion();
  }
}

function answer(letter){
  riasec[letter]++;
  advance();
}

function toEmbeddableVideoUrl(url){
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([\w-]{6,})/);
  if(yt) return "https://www.youtube.com/embed/" + yt[1];
  return null;
}

function showResult(){
  document.getElementById("progressBar").style.width = "100%";

  // コース別スコア = 回答者のRIASEC得点 × 各コースの重み の内積
  const courseScore = {};
  CONFIG.courses.forEach(c=>{
    let s = 0;
    RIASEC_LETTERS.forEach(letter=>{ s += (riasec[letter]||0) * (c.weights[letter]||0); });
    courseScore[c.key] = s;
  });

  let best = CONFIG.courses[0];
  CONFIG.courses.forEach(c=>{ if(courseScore[c.key] > courseScore[best.key]) best = c; });

  // フレーバー軸：E+S(対人・行動力寄り) vs C+I(分析・秩序寄り)
  const hotScore = (riasec.E||0) + (riasec.S||0);
  const coolScore = (riasec.C||0) + (riasec.I||0);
  const style = hotScore >= coolScore ? "hot" : "cool";
  const t = best[style];

  const iconEl = document.getElementById("resultIcon");
  if(t.imageUrl){
    iconEl.innerHTML = `<img src="${escapeHtml(t.imageUrl)}" alt="${escapeHtml(t.name||'')}">`;
  } else {
    iconEl.textContent = t.icon;
  }
  document.getElementById("resultType").textContent = t.name;
  document.getElementById("resultQuote").textContent = t.quote;
  document.getElementById("resultCourseTag").textContent = "おすすめ: " + best.label + "コース";
  document.getElementById("resultDesc").textContent = t.desc;
  document.getElementById("resultCourseDesc").textContent = best.desc;

  // 適性%グラフ：理論上の満点ではなく「今回の回答での最高得点」を基準に正規化。
  // 一番近いコースが常に説得力のある高い%で表示され、他のコースはその相対差で決まる。15〜99%でクリップ。
  const ranked = [...CONFIG.courses].sort((x,y)=> courseScore[y.key]-courseScore[x.key]);
  const maxScore = Math.max(1, ...CONFIG.courses.map(c=> courseScore[c.key]));
  const chartEl = document.getElementById("chartRows");
  chartEl.innerHTML = "";
  ranked.forEach(c=>{
    const pct = Math.min(99, Math.max(15, Math.round(courseScore[c.key]/maxScore*99)));
    const row = document.createElement("div");
    row.className = "chart-row" + (c.key===best.key ? " top" : "");
    row.innerHTML = `
      <div class="chart-labels"><span>${escapeHtml(c.label)}</span><span class="pct">${pct}%</span></div>
      <div class="chart-track"><div class="chart-fill" style="width:${pct}%"></div></div>`;
    chartEl.appendChild(row);
  });

  // 先輩作品ギャラリー
  const galEl = document.getElementById("galleryScroll");
  galEl.innerHTML = "";
  (best.gallery||[]).forEach(item=>{
    const card = document.createElement("div");
    card.className = "gallery-card";
    let mediaHtml;
    if(item.mediaType === "image" && item.mediaUrl){
      mediaHtml = `<img src="${escapeHtml(item.mediaUrl)}" alt="${escapeHtml(item.title||'')}" style="width:100%;height:100%;object-fit:cover;">`;
    } else if(item.mediaType === "video" && item.mediaUrl){
      const embed = toEmbeddableVideoUrl(item.mediaUrl);
      mediaHtml = embed
        ? `<iframe src="${escapeHtml(embed)}" style="width:100%;height:100%;border:0;" allowfullscreen></iframe>`
        : `<video src="${escapeHtml(item.mediaUrl)}" controls style="width:100%;height:100%;object-fit:cover;"></video>`;
    } else {
      mediaHtml = escapeHtml(item.icon || "🎬");
    }
    card.innerHTML = `
      <div class="gallery-media">${mediaHtml}<span class="gallery-kind">${escapeHtml(item.kind||"")}</span></div>
      <div class="gallery-body">
        <p class="gallery-title">${escapeHtml(item.title||"")}</p>
        <p class="gallery-caption">${escapeHtml(item.caption||"")}</p>
      </div>`;
    galEl.appendChild(card);
  });

  // メンター紹介：診断結果と同じタイプ（コース×熱血/クール）の人だけを、
  // 「この会場のメンター」「そのほかのメンター」の2つの枠に分けて表示する。
  renderMentorGroup("venueMentorsWrap", "venueMentorsList", CONFIG.venueMentors, best.key, style);
  renderMentorGroup("otherMentorsWrap", "otherMentorsList", CONFIG.mentors, best.key, style);

  document.getElementById("screen-quiz").classList.add("hidden");
  document.getElementById("screen-result").classList.remove("hidden");
}

function renderMentorGroup(wrapId, listId, mentors, courseKey, style){
  const wrap = document.getElementById(wrapId);
  const listEl = document.getElementById(listId);
  const matched = (mentors||[]).filter(m => m.courseKey === courseKey && m.style === style);
  wrap.classList.remove("hidden");
  if(matched.length === 0){
    listEl.innerHTML = `<p class="mentor-empty">同じタイプのメンターはまだ登録されていません。気になる人はスタッフに聞いてみてね！</p>`;
    return;
  }
  listEl.innerHTML = matched.map(m => `
    <div class="mentor-card">
      <div class="mentor-photo">${m.photoUrl ? `<img src="${escapeHtml(m.photoUrl)}" alt="${escapeHtml(m.name||'')}">` : "🧑"}</div>
      <div>
        <p class="mentor-name">${escapeHtml(m.name||"")}</p>
        <p class="mentor-bio">${escapeHtml(m.bio||"")}</p>
      </div>
    </div>
  `).join('');
}

function scrollGallery(dir){
  const el = document.getElementById("galleryScroll");
  el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior:"smooth" });
}

function restartQuiz(){
  document.getElementById("screen-quiz").classList.add("hidden");
  document.getElementById("screen-result").classList.add("hidden");
  document.getElementById("screen-start").classList.remove("hidden");
}

init();
