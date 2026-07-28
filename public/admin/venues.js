let venues = [];

function escapeHtmlForDisplay(str){
  return String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function venueAdminUrl(id){ return window.location.origin + '/v/' + id + '/admin'; }
function venueParticipantUrl(id){ return window.location.origin + '/v/' + id; }

async function loadVenues(){
  const res = await adminFetch('/api/venues');
  const data = await res.json();
  venues = data.venues;
  renderVenues();
}

function renderVenues(){
  document.getElementById('vCount').textContent = venues.length;
  const list = document.getElementById('venuesList');
  if(venues.length === 0){
    list.innerHTML = '<p class="hint">まだ会場がありません。上の「＋ 会場を追加」から作成してください。</p>';
    return;
  }
  list.innerHTML = venues.map(v => `
    <div class="venue-row" style="display:block;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div class="venue-name">${escapeHtmlForDisplay(v.name)}</div>
          <div class="venue-meta">作成日: ${new Date(v.createdAt).toLocaleString('ja-JP')} ／ ボーナス質問: ${v.bonusQuestionCount}件</div>
        </div>
        <button class="action-btn danger" onclick="removeVenue('${v.id}')">削除</button>
      </div>
      <div class="url-box">
        <span class="hint" style="flex:0 0 auto;">設定URL:</span>
        <code>${venueAdminUrl(v.id)}</code>
        <button class="action-btn small" onclick="copyText('${venueAdminUrl(v.id)}')">コピー</button>
      </div>
      <div class="url-box">
        <span class="hint" style="flex:0 0 auto;">参加者URL:</span>
        <code>${venueParticipantUrl(v.id)}</code>
        <button class="action-btn small" onclick="copyText('${venueParticipantUrl(v.id)}')">コピー</button>
      </div>
    </div>
  `).join('');
}

async function createVenue(){
  const nameInput = document.getElementById('newVenueName');
  const res = await adminFetch('/api/venues', {
    method: 'POST',
    body: JSON.stringify({ name: nameInput.value }),
  });
  if(res.ok){
    nameInput.value = '';
    await loadVenues();
  } else {
    alert('会場の作成に失敗しました');
  }
}

async function removeVenue(id){
  const venue = venues.find(v => v.id === id);
  if(!confirm('「' + (venue ? venue.name : id) + '」を削除します。この会場のボーナス質問設定も失われます。よろしいですか？')) return;
  const res = await adminFetch('/api/venues/' + id, { method: 'DELETE' });
  if(res.ok){
    await loadVenues();
  } else {
    alert('削除に失敗しました');
  }
}

function copyText(text){
  navigator.clipboard.writeText(text).then(()=>{
    alert('コピーしました:\n' + text);
  }).catch(()=>{
    prompt('コピーできませんでした。手動でコピーしてください:', text);
  });
}

initAuthGate(loadVenues);
