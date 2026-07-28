// 最上位管理画面（/admin, /admin/venues）共通のパスワード認証ヘルパー。
// パスワードはsessionStorageに保持し、以降のAPI呼び出しに x-admin-password ヘッダーとして付与する。
// 会場ごとの画面（/v/:id/admin, /v/:id）はここを使わない（URLを知っていることが鍵のため無認証）。

function getStoredPassword(){ return sessionStorage.getItem('adminPassword') || ''; }
function setStoredPassword(pw){ sessionStorage.setItem('adminPassword', pw); }
function clearStoredPassword(){ sessionStorage.removeItem('adminPassword'); }

function showGate(){
  document.getElementById('gate').classList.remove('hidden');
  document.getElementById('appRoot').classList.add('hidden');
}
function hideGate(){
  document.getElementById('gate').classList.add('hidden');
  document.getElementById('appRoot').classList.remove('hidden');
}

async function adminFetch(url, options){
  options = options || {};
  const headers = Object.assign({}, options.headers, { 'x-admin-password': getStoredPassword() });
  if(options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, Object.assign({}, options, { headers }));
  if(res.status === 401){
    clearStoredPassword();
    showGate();
    throw new Error('unauthorized');
  }
  return res;
}

async function tryLogin(password){
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

async function checkPassword(){
  const val = document.getElementById('pwInput').value;
  const ok = await tryLogin(val);
  if(ok){
    setStoredPassword(val);
    hideGate();
    if(typeof onAuthed === 'function') onAuthed();
  } else {
    alert('パスワードが違います');
  }
}

async function initAuthGate(onAuthedCallback){
  window.onAuthed = onAuthedCallback;
  const pwInput = document.getElementById('pwInput');
  if(pwInput) pwInput.addEventListener('keydown', e=>{ if(e.key==='Enter') checkPassword(); });

  const stored = getStoredPassword();
  if(stored){
    const ok = await tryLogin(stored);
    if(ok){ hideGate(); onAuthedCallback(); return; }
    clearStoredPassword();
  }
  showGate();
}
