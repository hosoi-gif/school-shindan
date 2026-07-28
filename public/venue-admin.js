let venue = null;
let sharedQuestionCount = 0;
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
  return { q:"", opts:["",""], afterQuestion:0 };
}

function renderBonusQuestions(){
  document.getElementById('bqCount').textContent = venue.bonusQuestions.length;
  document.getElementById('sharedQCount').textContent = sharedQuestionCount;
  const list = document.getElementById('bonusList');
  list.innerHTML = venue.bonusQuestions.map((bq, qi)=>`
    <div class="gallery-item">
      <label>質問文</label>
      <textarea data-path="bonusQuestions.${qi}.q"></textarea>
      <label>挿入位置（0=最初の質問より前／Nを指定するとN問目の直後に表示。全${sharedQuestionCount}問中）</label>
      <input type="number" min="0" max="${sharedQuestionCount}" step="1" data-path="bonusQuestions.${qi}.afterQuestion">
      <label>選択肢（診断には影響しません。何を選んでも次に進むだけ）</label>
      ${bq.opts.map((opt, oi)=>`
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
          <input type="text" style="flex:1;" data-path="bonusQuestions.${qi}.opts.${oi}">
          <button class="action-btn danger small" style="margin:0;" onclick="removeBonusChoice(${qi},${oi})">削除</button>
        </div>
      `).join('')}
      <button class="action-btn secondary small" onclick="addBonusChoice(${qi})">＋ 選択肢を追加</button>
      <button class="action-btn danger small" onclick="removeBonusQuestion(${qi})">この質問を削除</button>
    </div>
  `).join('');
  bindInputs(list);
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
  sharedQuestionCount = quizConfigData.config.questions.length;

  document.getElementById('venueTitle').textContent = venue.name + ' の設定';
  document.getElementById('participantUrl').textContent = participantUrl();
  document.getElementById('previewLink').href = participantUrl();
  document.getElementById('mainContent').classList.remove('hidden');
  bindInputs(document.getElementById('mainContent'));
  renderBonusQuestions();
}

async function saveVenue(){
  const res = await fetch('/api/venues/' + VENUE_ID, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: venue.name, bonusQuestions: venue.bonusQuestions }),
  });
  const status = document.getElementById('saveStatus');
  if(res.ok){
    status.textContent = '保存しました（' + new Date().toLocaleTimeString('ja-JP') + '）';
    document.getElementById('venueTitle').textContent = venue.name + ' の設定';
  } else {
    status.textContent = '保存に失敗しました';
  }
}

load();
