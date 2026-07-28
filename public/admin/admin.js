const LETTERS = ["R","I","A","S","E","C"];
const LETTER_LABELS = {R:"現実的(R)", I:"研究的(I)", A:"芸術的(A)", S:"社会的(S)", E:"企業的(E)", C:"慣習的(C)"};

let config = null;

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
    const val = getPath(config, el.dataset.path);
    if(el.type === 'number') el.value = (val ?? 0);
    else el.value = val ?? '';
  });
}

function onFieldChange(e){
  const el = e.target;
  const path = el.dataset.path;
  if(!path) return;
  let value = el.value;
  if(el.type === 'number') value = Number(value) || 0;
  setPath(config, path, value);
}

document.getElementById('appRoot').addEventListener('input', onFieldChange);
document.getElementById('appRoot').addEventListener('change', onFieldChange);

// ---------- 質問セクション ----------
function renderQuestions(){
  document.getElementById('qCount').textContent = config.questions.length;
  const list = document.getElementById('questionsList');
  list.innerHTML = config.questions.map((q, i)=>`
    <details open>
      <summary>Q${i+1}. ${escapeHtmlForDisplay(q.q || '(未入力)')}</summary>
      <label>質問文</label>
      <textarea data-path="questions.${i}.q"></textarea>
      <div class="row6">
        ${LETTERS.map((L, li)=>`
          <div>
            <div class="letter-label">${LETTER_LABELS[L]}</div>
            <input type="text" data-path="questions.${i}.opts.${li}">
          </div>`).join('')}
      </div>
      <button class="action-btn danger" style="margin-top:10px;" onclick="removeQuestion(${i})">この質問を削除</button>
    </details>
  `).join('');
  bindInputs(list);
}
function addQuestion(){
  config.questions.push({ q:"", opts:["","","","","",""] });
  renderQuestions();
}
function removeQuestion(i){
  if(config.questions.length <= 1){ alert('質問は最低1問必要です'); return; }
  config.questions.splice(i,1);
  renderQuestions();
}

// ---------- コースセクション ----------
function blankCourse(){
  return {
    key: "course_" + Math.random().toString(36).slice(2,8),
    label: "新しいコース",
    desc: "",
    weights: { R:0,I:0,A:0,S:0,E:0,C:0 },
    hot:  { icon:"⭐", imageUrl:"", name:"", quote:"", desc:"" },
    cool: { icon:"⭐", imageUrl:"", name:"", quote:"", desc:"" },
    gallery: [
      { mediaType:"none", mediaUrl:"", icon:"📷", kind:"画像", title:"", caption:"" },
      { mediaType:"none", mediaUrl:"", icon:"🎬", kind:"動画", title:"", caption:"" },
      { mediaType:"none", mediaUrl:"", icon:"📷", kind:"画像", title:"", caption:"" }
    ]
  };
}

function renderCourses(){
  document.getElementById('cCount').textContent = config.courses.length;
  const list = document.getElementById('coursesList');
  list.innerHTML = config.courses.map((c, i)=>`
    <details>
      <summary>${escapeHtmlForDisplay(c.label || '(未入力)')}</summary>

      <label>コース名</label>
      <input type="text" data-path="courses.${i}.label">
      <label>コース紹介文</label>
      <textarea data-path="courses.${i}.desc"></textarea>

      <label>RIASECの重み（0〜3）</label>
      <div class="row6">
        ${LETTERS.map(L=>`
          <div>
            <div class="letter-label">${LETTER_LABELS[L]}</div>
            <input type="number" min="0" max="3" step="1" data-path="courses.${i}.weights.${L}">
          </div>`).join('')}
      </div>

      <div class="flavor-box">
        <div class="flavor-title">🔥 熱血タイプ（対人・行動力が高い回答者向け）</div>
        <div class="row2">
          <div><label>アイコン（絵文字・画像URL未設定の時に表示）</label><input type="text" data-path="courses.${i}.hot.icon"></div>
          <div><label>タイプ名</label><input type="text" data-path="courses.${i}.hot.name"></div>
        </div>
        <label>キャラ画像URL（任意・入れると絵文字より優先して表示されます）</label>
        <input type="url" data-path="courses.${i}.hot.imageUrl" placeholder="https://...">
        <label>キャッチコピー</label>
        <input type="text" data-path="courses.${i}.hot.quote">
        <label>タイプ説明</label>
        <textarea data-path="courses.${i}.hot.desc"></textarea>
      </div>

      <div class="flavor-box">
        <div class="flavor-title">🌙 クールタイプ（分析・秩序が高い回答者向け）</div>
        <div class="row2">
          <div><label>アイコン（絵文字・画像URL未設定の時に表示）</label><input type="text" data-path="courses.${i}.cool.icon"></div>
          <div><label>タイプ名</label><input type="text" data-path="courses.${i}.cool.name"></div>
        </div>
        <label>キャラ画像URL（任意・入れると絵文字より優先して表示されます）</label>
        <input type="url" data-path="courses.${i}.cool.imageUrl" placeholder="https://...">
        <label>キャッチコピー</label>
        <input type="text" data-path="courses.${i}.cool.quote">
        <label>タイプ説明</label>
        <textarea data-path="courses.${i}.cool.desc"></textarea>
      </div>

      <label style="margin-top:14px;">先輩作品ギャラリー（3件）</label>
      ${c.gallery.map((g, gi)=>`
        <div class="gallery-item">
          <div class="row3">
            <div>
              <label>種類</label>
              <select data-path="courses.${i}.gallery.${gi}.mediaType">
                <option value="none">アイコンのみ（プレースホルダー）</option>
                <option value="image">画像URL</option>
                <option value="video">動画URL（YouTube可）</option>
              </select>
            </div>
            <div><label>ラベル（例：画像／動画）</label><input type="text" data-path="courses.${i}.gallery.${gi}.kind"></div>
            <div><label>アイコン（絵文字・種類がアイコンのみの時に表示）</label><input type="text" data-path="courses.${i}.gallery.${gi}.icon"></div>
          </div>
          <label>画像・動画のURL（種類が画像/動画の時のみ使用）</label>
          <input type="url" data-path="courses.${i}.gallery.${gi}.mediaUrl" placeholder="https://...">
          <label>タイトル</label>
          <input type="text" data-path="courses.${i}.gallery.${gi}.title">
          <label>キャプション</label>
          <input type="text" data-path="courses.${i}.gallery.${gi}.caption">
        </div>
      `).join('')}

      <button class="action-btn danger" style="margin-top:14px;" onclick="removeCourse(${i})">このコースを削除</button>
    </details>
  `).join('');
  bindInputs(list);
  list.querySelectorAll('select[data-path]').forEach(sel=>{
    sel.value = getPath(config, sel.dataset.path) || 'none';
  });
}
function addCourse(){
  config.courses.push(blankCourse());
  renderCourses();
}
function removeCourse(i){
  if(config.courses.length <= 1){ alert('コースは最低1つ必要です'); return; }
  if(!confirm('「' + (config.courses[i].label || '(名称未設定)') + '」を削除します。よろしいですか？')) return;
  config.courses.splice(i,1);
  renderCourses();
}

function escapeHtmlForDisplay(str){
  return String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function renderAll(){
  bindInputs(document.getElementById('appRoot'));
  renderQuestions();
  renderCourses();
}

// ---------- サーバーとの読み込み・保存 ----------
async function loadConfig(){
  const res = await adminFetch('/api/config');
  const data = await res.json();
  config = data.config;
  renderAll();
}

async function saveConfig(){
  const res = await adminFetch('/api/config', {
    method: 'PUT',
    body: JSON.stringify({ ui: config.ui, questions: config.questions, courses: config.courses }),
  });
  const status = document.getElementById('saveStatus');
  if(res.ok){
    status.textContent = '保存しました（' + new Date().toLocaleTimeString('ja-JP') + '）';
  } else {
    status.textContent = '保存に失敗しました';
  }
}

function exportConfigJson(){
  const blob = new Blob([JSON.stringify(config, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'shindan_config_backup.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function importConfigJson(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const obj = JSON.parse(reader.result);
      if(!obj || !Array.isArray(obj.questions) || !Array.isArray(obj.courses) || !obj.ui){
        alert('設定の形式が正しくないため読み込めませんでした');
        return;
      }
      config = obj;
      renderAll();
      alert('読み込みました（画面上の内容が変わります。保存を押すまでサーバーには反映されません）');
    } catch(e){
      alert('JSONの読み込みに失敗しました: ' + e.message);
    }
  };
  reader.readAsText(file);
}

initAuthGate(loadConfig);
