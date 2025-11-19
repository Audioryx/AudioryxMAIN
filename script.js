// Audioryx Pro — frontend behavior (professional starter)
// Requires backend with endpoints: /api/auth/register, /api/auth/login, /api/employee-login, /api/tracks, /api/settings

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

const splash = $('#splash'), app = $('#app');
const loginModal = $('#loginModal'), signupModal = $('#signupModal');

$('#openLogin').addEventListener('click', ()=>{ show(loginModal); });
$('#closeLogin').addEventListener('click', ()=>{ hide(loginModal); });
$('#closeSignup').addEventListener('click', ()=>{ hide(signupModal); });

$('#showSignup').addEventListener('click', (e)=>{ e.preventDefault(); hide(loginModal); show(signupModal); });
$('#showLoginFromSignup').addEventListener('click', (e)=>{ e.preventDefault(); hide(signupModal); show(loginModal); });

// Signup flow
$('#signupForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = $('#signupEmail').value.trim();
  const password = $('#signupPassword').value;
  if(!email||!password) return alert('Provide email and password');
  const res = await fetch((API_BASE||'') + '/api/auth/register', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if(data && data.token){
    localStorage.setItem('ax_token', data.token); afterLogin(data.user);
  } else alert('Signup failed: ' + (data.error || 'Unknown'));
});

// Login flow
$('#loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  if(!email||!password) return alert('Provide email and password');
  const res = await fetch((API_BASE||'') + '/api/auth/login', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if(data && data.token){
    localStorage.setItem('ax_token', data.token); afterLogin(data.user);
  } else alert('Login failed: ' + (data.error || 'Unknown'));
});

async function afterLogin(user){
  hide(splash);
  show(app);
  if(user && user.display_name) $('#userBadge').textContent = user.display_name;
  await loadFeatured();
}

async function authFetch(path, opts={}){
  opts.headers = opts.headers || {};
  const token = localStorage.getItem('ax_token');
  if(token) opts.headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch((API_BASE||'') + path, opts);
  return res.json();
}

async function loadFeatured(){
  // try to fetch user's tracks; fallback to demo cards
  try{
    const tracks = await authFetch('/api/tracks');
    const featured = $('#featured'); featured.innerHTML = '';
    if(Array.isArray(tracks) && tracks.length){
      tracks.forEach(t=>{
        const c = document.createElement('div'); c.className='card';
        c.innerHTML = `<div style="height:120px;border-radius:12px;background:linear-gradient(135deg,var(--accent),rgba(0,0,0,0.18))"></div>
                       <div class="title">${t.title||t.filename}</div>`;
        featured.appendChild(c);
      });
    } else {
      // demo
      for(let i=0;i<6;i++){
        const c = document.createElement('div'); c.className='card';
        c.innerHTML = `<div style="height:120px;border-radius:12px;background:linear-gradient(135deg,var(--accent),rgba(0,0,0,0.18))"></div>
                       <div class="title">Demo Track ${i+1}</div>`;
        featured.appendChild(c);
      }
    }
  }catch(e){ console.warn('loadFeatured err', e); }
}

// Hidden employee login shortcut: Command + Option + Shift + E (works with external keyboard on iPad)
document.addEventListener('keydown', async (e)=>{
  if(e.metaKey && e.altKey && e.shiftKey && e.key === 'E'){
    try{
      const res = await fetch((API_BASE||'') + '/api/employee-login', { method:'POST' });
      const j = await res.json();
      if(j && j.token){
        localStorage.setItem('ax_token', j.token);
        alert('Employee login OK');
        // fetch user info if provided
        if(j.user) afterLogin(j.user);
        else afterLogin({ display_name: 'Employee' });
      } else alert('Employee login failed');
    }catch(err){ alert('Employee login error'); console.error(err); }
  }
});

// Upload handler (requires authenticated backend)
$('#upload').addEventListener('change', async (e)=>{
  const files = Array.from(e.target.files);
  if(files.length===0) return;
  const token = localStorage.getItem('ax_token');
  if(!token) return alert('Login to upload');
  for(const f of files){
    const fd = new FormData(); fd.append('file', f);
    await fetch((API_BASE||'') + '/api/tracks/upload', { method:'POST', body: fd, headers: { 'Authorization': 'Bearer ' + token }});
  }
  await loadFeatured();
});

// theme presets
$$('.preset').forEach(p=>{
  p.addEventListener('click', ()=>{
    const color = p.dataset.color;
    document.documentElement.style.setProperty('--accent', color);
    // save setting
    const token = localStorage.getItem('ax_token');
    if(token) fetch((API_BASE||'') + '/api/settings', { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + token }, body: JSON.stringify({ accent: color })});
    else localStorage.setItem('ax_accent', color);
  });
});

// initial local settings
(function init(){
  const acc = localStorage.getItem('ax_accent'); if(acc) document.documentElement.style.setProperty('--accent', acc);
})();
