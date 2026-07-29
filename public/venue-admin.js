let venue = null;
let sharedQuestions = [];
let sharedCourses = [];
const VENUE_ID = window.location.pathname.match(/^\/v\/([^\/]+)\/admin/)[1];

function escapeHtmlForDisplay(str){
  return String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function setPath(obj, path, value){
  const parts = path.split('.');
  let cur = obj;
  for(let i=0;i<parts.length-1;i++) cur = cur[parts[i]];
  cur[parts[parts.length-1]] = value;
}
function getPath(obj, path){
  return path.split('.').reduce((o,k)=> (o==null? o : o[k]), obj);
}

function bindInputs(container){
  container.querySelectorAll('[data-path]').forEach(el=>{
    const val = getPath(venue, el.dataset.path);
    if(el.type === 'number') el.value = (val ?? 0);
    else el.value = val ?? '';
  });
}
function onFieldChange(e){
  const path = e.target.dataset.path;
  if(!path) return;
  let value = e.target.value;
  if(e.target.type === 'number') value = Number(value) || 0;
  setPath(venue, path, value);
}
document.getElementById('mainContent').addEventListener('input', onFieldChange);
document.getElementById('mainContent').addEventListener('change', onFieldChange);

function participantUrl(){ return window.location.origin + '/v/' + VENUE_ID; }

function blankBonusQuestion(){
  return { q:"", opts:["",""], afterQuestion: sharedQuestions.length };
}

// 共通質問（編集不可）とこの会場のボーナス質問を、実際に出題される順で合成した一覧を作る。
// buildSequence()（quiz-engine.js）と同じ並べ方のロジック。
function buildDisplayOrder(){
  const byPosition = new Map();
  venue.bonusQuestions.forEach(bq=>{
    const pos = Math.max(0, Math.min(sharedQuestions.length, Number(bq.afterQuestion)||0));
    if(!byPosition.has(pos)) byPosition.set(pos, []);
    byPosition.get(pos).push(bq);
  });
  const order = [];
  (byPosition.get(0)||[]).forEach(bq=> order.push({ type:'bonus', data:bq }));
  sharedQuestions.forEach((q, qi)=>{
    order.push({ type:'shared', qIndex:qi, text:q.q });
    (byPosition.get(qi+1)||[]).forEach(bq=> order.push({ type:'bonus', data:bq }));
  });
  return order;
}

let draggedBonusRef = null;

function renderBonusQuestions(){
  document.getElementById('bqCount').textContent = venue.bonusQuestions.length;
  document.getElementById('sharedQCount').textContent = sharedQuestions.length;
  const order = buildDisplayOrder();
  const list = document.getElementById('bonusList');
  list.innerHTML = order.map((item, orderIdx)=>{
    if(item.type === 'shared'){
      return `<div class="qcard shared-q" ondragover="onOrderDragOverAllow(event)" ondrop="onOrderDrop(event,${orderIdx})">
        <span class="shared-badge">共通・編集不可</span>Q${item.qIndex+1}. ${escapeHtmlForDisplay(item.text)}
      </div>`;
    }
    const bq = item.data;
    const bi = venue.bonusQuestions.indexOf(bq);
    return `<div class="qcard gallery-item" draggable="true"
                 ondragstart="onBonusDragStart(event,${bi})"
                 ondragover="onOrderDragOverAllow(event)"
                 ondrop="onOrderDrop(event,${orderIdx})"
                 ondragend="onOrderDragEnd(event)">
      <div class="drag-handle">⠿ ボーナス質問（ドラッグでこの一覧内の好きな位置に移動）</div>
      <label>質問文</label>
      <textarea data-path="bonusQuestions.${bi}.q"></textarea>
      <label>選択肢（診断には影響しません。何を選んでも次に進むだけ）</label>
      ${bq.opts.map((opt, oi)=>`
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
          <input type="text" style="flex:1;" data-path="bonusQuestions.${bi}.opts.${oi}">
          <button class="action-btn danger small" style="margin:0;" onclick="removeBonusChoice(${bi},${oi})">削除</button>
        </div>
      `).join('')}
      <button class="action-btn secondary small" onclick="addBonusChoice(${bi})">＋ 選択肢を追加</button>
      <button class="action-btn danger small" onclick="removeBonusQuestion(${bi})">この質問を削除</button>
    </div>`;
  }).join('') + `
    <div class="drop-end" ondragover="onOrderDragOverAllow(event)" ondrop="onOrderDropAtEnd(event)">ここにドラッグすると一番最後（結果直前）に移動</div>
  `;
  bindInputs(list);
}

function onOrderDragOverAllow(e){ e.preventDefault(); }
function onOrderDragEnd(){ draggedBonusRef = null; }
function onBonusDragStart(e, bi){
  draggedBonusRef = venue.bonusQuestions[bi];
  e.dataTransfer.effectAllowed = 'move';
}

function commitNewOrder(filtered){
  const newBonusList = [];
  let sharedSeen = 0;
  filtered.forEach(item=>{
    if(item.type === 'shared'){ sharedSeen++; }
    else { item.data.afterQuestion = sharedSeen; newBonusList.push(item.data); }
  });
  venue.bonusQuestions = newBonusList;
  draggedBonusRef = null;
  renderBonusQuestions();
}

function onOrderDrop(e, targetOrderIdx){
  e.preventDefault();
  if(!draggedBonusRef) return;
  const order = buildDisplayOrder();
  const targetItem = order[targetOrderIdx];
  if(targetItem && targetItem.type === 'bonus' && targetItem.data === draggedBonusRef) return;
  const filtered = order.filter(item => !(item.type === 'bonus' && item.data === draggedBonusRef));
  const insertAt = targetItem ? filtered.indexOf(targetItem) : filtered.length;
  filtered.splice(insertAt, 0, { type:'bonus', data: draggedBonusRef });
  commitNewOrder(filtered);
}
function onOrderDropAtEnd(e){
  e.preventDefault();
  if(!draggedBonusRef) return;
  const order = buildDisplayOrder();
  const filtered = order.filter(item => !(item.type === 'bonus' && item.data === draggedBonusRef));
  filtered.push({ type:'bonus', data: draggedBonusRef });
  commitNewOrder(filtered);
}

function addBonusQuestion(){
  venue.bonusQuestions.push(blankBonusQuestion());
  renderBonusQuestions();
}
function removeBonusQuestion(qi){
  venue.bonusQuestions.splice(qi,1);
  renderBonusQuestions();
}
function addBonusChoice(qi){
  venue.bonusQuestions[qi].opts.push("");
  renderBonusQuestions();
}
function removeBonusChoice(qi, oi){
  const opts = venue.bonusQuestions[qi].opts;
  if(opts.length <= 2){ alert('選択肢は最低2つ必要です'); return; }
  opts.splice(oi,1);
  renderBonusQuestions();
}

// ---------- この会場のメンター ----------
function blankMentor(){
  return { name:"", photoUrl:"", courseKey: (sharedCourses[0] && sharedCourses[0].key) || "", style:"hot", bio:"" };
}

function renderMentors(){
  if(!Array.isArray(venue.mentors)) venue.mentors = [];
  document.getElementById('mCount').textContent = venue.mentors.length;
  const list = document.getElementById('mentorsList');
  const courseOptions = sharedCourses.map(c=>`<option value="${c.key}">${escapeHtmlForDisplay(c.label)}</option>`).join('');
  list.innerHTML = venue.mentors.map((m, i)=>`
    <div class="gallery-item">
      <div class="row2">
        <div><label>名前</label><input type="text" data-path="mentors.${i}.name"></div>
        <div><label>写真URL（任意・空欄なら人型アイコン表示）</label><input type="url" data-path="mentors.${i}.photoUrl" placeholder="https://..."></div>
      </div>
      <div class="row2">
        <div>
          <label>コース</label>
          <select data-path="mentors.${i}.courseKey">${courseOptions}</select>
        </div>
        <div>
          <label>タイプ</label>
          <select data-path="mentors.${i}.style">
            <option value="hot">熱血タイプ</option>
            <option value="cool">クールタイプ</option>
          </select>
        </div>
      </div>
      <label>一言紹介</label>
      <textarea data-path="mentors.${i}.bio"></textarea>
      <button class="action-btn danger small" style="margin-top:10px;" onclick="removeMentor(${i})">このメンターを削除</button>
    </div>
  `).join('');
  bindInputs(list);
  list.querySelectorAll('select[data-path]').forEach(sel=>{
    sel.value = getPath(venue, sel.dataset.path) || sel.querySelector('option').value;
  });
}
function addMentor(){
  venue.mentors.push(blankMentor());
  renderMentors();
}
function removeMentor(i){
  if(!confirm('「' + (venue.mentors[i].name || '(名称未設定)') + '」を削除します。よろしいですか？')) return;
  venue.mentors.splice(i,1);
  renderMentors();
}

function copyParticipantUrl(){
  const url = participantUrl();
  navigator.clipboard.writeText(url).then(()=>{
    alert('コピーしました:\n' + url);
  }).catch(()=>{
    prompt('コピーできませんでした。手動でコピーしてください:', url);
  });
}

async function load(){
  const [venueRes, quizConfigRes] = await Promise.all([
    fetch('/api/venues/' + VENUE_ID),
    fetch('/api/venues/' + VENUE_ID + '/quiz-config'),
  ]);
  if(!venueRes.ok || !quizConfigRes.ok){
    document.getElementById('loadError').classList.remove('hidden');
    return;
  }
  const venueData = await venueRes.json();
  const quizConfigData = await quizConfigRes.json();
  venue = venueData.venue;
  if(!Array.isArray(venue.bonusQuestions)) venue.bonusQuestions = [];
  if(!Array.isArray(venue.mentors)) venue.mentors = [];
  sharedQuestions = quizConfigData.config.questions;
  sharedCourses = quizConfigData.config.courses;

  document.getElementById('venueTitle').textContent = venue.name + ' の設定';
  document.getElementById('participantUrl').textContent = participantUrl();
  document.getElementById('previewLink').href = participantUrl();
  document.getElementById('mainContent').classList.remove('hidden');
  bindInputs(document.getElementById('mainContent'));
  renderBonusQuestions();
  renderMentors();
}

async function saveVenue(){
  const res = await fetch('/api/venues/' + VENUE_ID, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: venue.name, bonusQuestions: venue.bonusQuestions, mentors: venue.mentors }),
  });
  const status = document.getElementById('saveStatus');
  if(res.ok){
    status.textContent = '保存しました（' + new Date().toLocaleTimeString('ja-JP') + '）';
    document.getElementById('venueTitle').textContent = venue.name + ' の設定';
    alert('保存しました！');
  } else {
    status.textContent = '保存に失敗しました';
    alert('保存に失敗しました。もう一度お試しください。');
  }
}

load();
