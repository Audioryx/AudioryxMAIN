/* Audioryx Pro frontend logic */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

const splash = $('#splash'), app = $('#app');
const loginModal = $('#loginModal'), signupModal = $('#signupModal');

$('#openLogin').addEventListener('click', ()=> show(loginModal));
$('#closeLogin').addEventListener('click', ()=> hide(loginModal));
$('#closeSignup').addEventListener('click', ()=> hide(signupModal));
$('#signupBtn').addEventListener('click', ()=> show(signupModal));

$('#guestBtn').addEventListener('click', ()=> {
  localStorage.removeItem('ax_token');
  enterGuest();
});

function enterGuest(){
  hide(splash); show(app);
  $('#userBadge').textContent = 'Guest';
  loadFeaturedDemo();
}

async function apiFetch(path, opts={}){
  opts.headers = opts.headers || {};
  const token = localStorage.getItem('ax_token');
  if(token) opts.headers['Authorization'] = 'Bearer ' + token;
  const base = (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE : '';
  const res = await fetch(base + path, opts);
  return res.json();
}

$('#signupForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = $('#signupEmail').value.trim();
  const password = $('#signupPassword').value;
  const res = await fetch((API_BASE||'') + '/api/auth/register',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
  const j = await res.json();
  if(j && j.token){ localStorage.setItem('ax_token', j.token); afterLogin(j.user); } else alert('Signup failed: ' + (j.error || 'unknown'));
});

$('#loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  const res = await fetch((API_BASE||'') + '/api/auth/login',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
  const j = await res.json();
  if(j && j.token){ localStorage.setItem('ax_token', j.token); afterLogin(j.user); } else alert('Login failed: ' + (j.error || 'unknown'));
});

function afterLogin(user){
  hide(splash); show(app);
  $('#userBadge').textContent = user && user.display_name ? user.display_name : (user && user.email ? user.email : 'User');
  loadFeatured();
}

async function loadFeatured(){
  try{
    const tracks = await apiFetch('/api/tracks');
    const featured = $('#featured'); featured.innerHTML = '';
    if(Array.isArray(tracks) && tracks.length){
      tracks.forEach(t=>{
        const c=document.createElement('div'); c.className='card';
        c.innerHTML = `<div style="height:120px;border-radius:12px;background:linear-gradient(135deg,var(--ax-primary),rgba(0,0,0,0.18))"></div><div class="title">${t.title||t.filename}</div>`;
        featured.appendChild(c);
      });
    } else loadFeaturedDemo();
  }catch(e){ loadFeaturedDemo(); }
}

function loadFeaturedDemo(){
  const featured = $('#featured'); featured.innerHTML='';
  for(let i=0;i<6;i++){
    const c=document.createElement('div'); c.className='card';
    c.innerHTML = `<div style="height:120px;border-radius:12px;background:linear-gradient(135deg,var(--ax-primary),rgba(0,0,0,0.18))"></div><div class="title">Daily Mix ${i+1}</div>`;
    featured.appendChild(c);
  }
}

$('#upload').addEventListener('change', async (e)=>{
  const files = Array.from(e.target.files);
  if(files.length===0) return;
  const token = localStorage.getItem('ax_token');
  if(!token) return alert('Please login to upload');
  for(const f of files){
    const fd=new FormData(); fd.append('file', f);
    await fetch((API_BASE||'') + '/api/tracks/upload', { method:'POST', body: fd, headers: { 'Authorization': 'Bearer ' + token } });
  }
  await loadFeatured();
});

const audio = document.getElementById('audio'); const playBtn = document.getElementById('play');
playBtn.addEventListener('click', ()=> audio.paused ? audio.play() : audio.pause());
audio.addEventListener('play', ()=> playBtn.textContent='⏸');
audio.addEventListener('pause', ()=> playBtn.textContent='▶️');

document.addEventListener('keydown', async (e)=>{
  if(e.metaKey && e.altKey && e.shiftKey && e.key === 'E'){
    try{
      const res = await fetch((API_BASE||'') + '/api/employee-login', { method:'POST' });
      const j = await res.json();
      if(j && j.token){ localStorage.setItem('ax_token', j.token); alert('Employee login OK'); afterLogin(j.user || { display_name: 'Employee' }); }
      else alert('Employee login failed');
    }catch(err){ alert('Employee login error'); console.error(err); }
  }
});

$$('.preset').forEach(p=> p.addEventListener('click', ()=> { const color = p.dataset.color; document.documentElement.style.setProperty('--ax-primary', color); }));

(async function init(){ const t = localStorage.getItem('ax_token'); if(t){ try{ const me = await apiFetch('/api/me'); if(me && me.user) afterLogin(me.user); else enterGuest(); }catch(e){ enterGuest(); } } else enterGuest(); })();
