// Audioryx Pro — frontend logic (template)
// Uses API endpoints at /api/... (same origin) or set API_BASE to your backend origin.

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

let useCircles = true; // default, toggled by settings (saved server-side)

// --- Small UI helpers ---
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

// Auth UI
const authScreen = $('#authScreen');
const appEl = $('#app');
const loginModal = $('#loginModal');
const userName = $('#userName');

$('#showLogin').addEventListener('click', ()=> {
  show(loginModal);
  hide(authScreen);
});
$('#closeLogin').addEventListener('click', ()=> {
  hide(loginModal);
  show(authScreen);
});

async function apiFetch(path, opts={}){
  const base = (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE : '';
  opts.headers = opts.headers || {};
  const token = localStorage.getItem('ax_token');
  if(token) opts.headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(base + path, opts);
  return res.json();
}

// Login form
$('#loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = $('#email').value;
  const password = $('#password').value;
  const res = await fetch((API_BASE||'') + '/api/auth/login', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password})
  });
  const d = await res.json();
  if(d.token){
    localStorage.setItem('ax_token', d.token);
    await afterLogin(d.user);
    hide(loginModal);
    hide(authScreen);
    show(appEl);
  } else {
    alert('Login failed: ' + (d.error || 'unknown'));
  }
});

// After login: load user info & tracks
async function afterLogin(user){
  userName.textContent = user.display_name || user.email;
  // load tracks and playlists
  await loadFeatured();
}

async function loadFeatured(){
  // call API to get user's tracks or demo data
  try{
    const json = await apiFetch('/api/tracks');
    const arr = Array.isArray(json) ? json : [];
    const featured = $('#featured');
    featured.innerHTML = '';
    arr.forEach(t=>{
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="art" style="height:120px;border-radius:12px;background-image:linear-gradient(135deg,var(--accent),rgba(0,0,0,0.18))"></div>
        <div class="title">${t.title || t.filename}</div>
        <div class="sub">${t.artist || 'Local'}</div>
      `;
      // apply circle if enabled
      const art = card.querySelector('.art');
      if(useCircles) art.classList.add('circle');
      card.addEventListener('click', ()=> {
        playUrl(t.url);
      });
      featured.appendChild(card);
    });
  }catch(e){
    console.warn('loadFeatured error', e);
  }
}

// Play logic
const audio = new Audio();
const playBtn = $('#play');
const prevBtn = $('#prev');
const nextBtn = $('#next');
const seek = $('#seek');
let currentSrc = '';

function playUrl(url){
  audio.src = (API_BASE||'') + url;
  audio.play();
  $('#trackTitle').textContent = url.split('/').pop();
}

playBtn.addEventListener('click', ()=>{
  if(audio.paused) audio.play(); else audio.pause();
});
audio.addEventListener('play', ()=> playBtn.textContent = '⏸');
audio.addEventListener('pause', ()=> playBtn.textContent = '▶️');

audio.addEventListener('timeupdate', ()=>{
  if(audio.duration) seek.value = Math.round((audio.currentTime / audio.duration) * 100);
});
seek.addEventListener('input', ()=>{
  if(audio.duration) audio.currentTime = (seek.value/100) * audio.duration;
});

// Upload (sends to backend /api/tracks/upload)
$('#upload').addEventListener('change', async (e)=>{
  const files = Array.from(e.target.files);
  const token = localStorage.getItem('ax_token');
  if(!token){ alert('Please log in to upload'); return; }
  for(const f of files){
    const fd = new FormData();
    fd.append('file', f);
    const res = await fetch((API_BASE||'') + '/api/tracks/upload', { method:'POST', body: fd, headers: { 'Authorization': 'Bearer ' + token }});
    const json = await res.json();
    if(json && json.url){
      console.log('Uploaded', json.url);
    } else {
      console.warn('Upload response', json);
    }
  }
  await loadFeatured();
});

// theme presets
$$('.preset').forEach(p=>{
  p.addEventListener('click', ()=>{
    const color = p.dataset.color;
    document.documentElement.style.setProperty('--accent', color);
    // Save to settings on server (if logged in)
    const token = localStorage.getItem('ax_token');
    if(token){
      fetch((API_BASE||'') + '/api/settings', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer ' + token}, body: JSON.stringify({accent:color,useCircles})});
    } else {
      localStorage.setItem('ax_accent', color);
    }
  });
});

// toggle circle setting (example UI hook - here saved locally)
function toggleCircles(v){
  useCircles = !!v;
  localStorage.setItem('ax_useCircles', useCircles ? '1' : '0');
  loadFeatured();
}
// load local saved state
(function init(){
  const savedAccent = localStorage.getItem('ax_accent');
  const savedCir = localStorage.getItem('ax_useCircles');
  if(savedAccent) document.documentElement.style.setProperty('--accent', savedAccent);
  if(savedCir) useCircles = savedCir === '1';
})();
// Hidden Employee Login
document.addEventListener("keydown", async (e) => {
  if (e.ctrlKey && e.shiftKey && e.code === "KeyE") {
    try {
      const res = await fetch(`${API_BASE}/api/employee-login`, { method: "POST" });
      const data = await res.json();
      if (data && data.token) {
        localStorage.setItem("token", data.token);
        alert("Employee login successful");
        window.location.href = "/"; // or /dashboard
      } else {
        alert("Employee login failed");
      }
    } catch (err) {
      console.error(err);
    }
  }
});
