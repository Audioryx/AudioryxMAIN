
// Audioryx demo script — advanced interactive UI (static-only demo).
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const sections = $$('.section');
const menuItems = $$('.menu-item');
const audio = $('#audio');
const playBtn = $('#play');
const prevBtn = $('#prev');
const nextBtn = $('#next');
const seek = $('#seek');
let library = [];
let currentIndex = -1;
let isPlaying = false;

// Simple sample data (user will upload/replace media in /media)
const demoTracks = [
  {id:'t1', title:'Aurora Drift', artist:'Audioryx', src:'media/aurora-drift.mp3'},
  {id:'t2', title:'Glass Nights', artist:'Audioryx', src:'media/glass-nights.mp3'},
  {id:'t3', title:'Neon Tide', artist:'Audioryx', src:'media/neon-tide.mp3'},
];

// Populate featured cards
function makeCard(track){
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = `<div class="art" style="height:68px;border-radius:8px;background:linear-gradient(135deg,var(--accent), rgba(0,0,0,0.15))"></div>
                   <div class="title">${track.title}</div>
                   <div class="sub">${track.artist}</div>`;
  div.addEventListener('click', ()=> {
    const idx = library.findIndex(t=>t.id===track.id);
    if(idx>=0) playAt(idx);
  });
  return div;
}

function loadDemo(){
  library = demoTracks.slice();
  const featured = $('#featured');
  featured.innerHTML = '';
  library.forEach(t=> featured.appendChild(makeCard(t)));
  renderPlaylists();
}
loadDemo();

// Menu navigation
menuItems.forEach(mi=>{
  mi.addEventListener('click', ()=>{
    menuItems.forEach(m=>m.classList.remove('active'));
    mi.classList.add('active');
    const sec = mi.dataset.section;
    sections.forEach(s=> s.id===sec ? s.classList.remove('hidden') : s.classList.add('hidden'));
  });
});

// Audio controls
function playAt(i){
  if(i<0||i>=library.length) return;
  currentIndex = i;
  const track = library[i];
  $('#trackTitle').textContent = track.title;
  $('#trackArtist').textContent = track.artist;
  // If file missing, we inform user to add media/mediafile.mp3
  audio.src = track.src;
  audio.play().then(()=> {
    isPlaying = true; playBtn.textContent='⏸';
  }).catch(e=>{
    isPlaying = false; playBtn.textContent='▶️';
    alert('Could not play "'+track.title+'". Add valid audio files to /media or upload them via Upload button.');
  });
}
playBtn.addEventListener('click', ()=>{
  if(!audio.src){ playAt(0); return; }
  if(isPlaying){ audio.pause(); playBtn.textContent='▶️'; isPlaying=false; }
  else{ audio.play(); playBtn.textContent='⏸'; isPlaying=true; }
});
prevBtn.addEventListener('click', ()=> {
  if(currentIndex>0) playAt(currentIndex-1);
});
nextBtn.addEventListener('click', ()=> {
  if(currentIndex<library.length-1) playAt(currentIndex+1);
});

// Update progress
audio.addEventListener('timeupdate', ()=>{
  if(audio.duration) seek.value = Math.round((audio.currentTime / audio.duration) * 100);
});
seek.addEventListener('input', ()=>{
  if(audio.duration) audio.currentTime = (seek.value/100) * audio.duration;
});

// Upload handling
$('#upload').addEventListener('change', (e)=>{
  const files = Array.from(e.target.files);
  files.forEach((f, idx)=>{
    const id = 'u'+Date.now()+idx;
    const url = URL.createObjectURL(f);
    const track = {id,title:f.name,artist:'Local File',src:url};
    library.push(track);
  });
  // refresh UI
  $('#featured').innerHTML = '';
  library.forEach(t=> $('#featured').appendChild(makeCard(t)));
  renderPlaylists();
});

// Playlists (local-only demo)
const playlists = [];
function renderPlaylists(){
  const wrap = $('#playlistsWrap'); wrap.innerHTML='';
  playlists.forEach((pl, i)=>{
    const el = document.createElement('div');
    el.className='card';
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
                      <div><strong>${pl.name}</strong><div style="font-size:0.85rem;color:rgba(255,255,255,0.6)">${pl.tracks.length} tracks</div></div>
                      <div><button class="button play-pl" data-i="${i}">Play</button></div>
                    </div>`;
    wrap.appendChild(el);
  });
}
$('#newPlaylistBtn').addEventListener('click', ()=>{
  const name = prompt('Playlist name');
  if(!name) return;
  playlists.push({name,tracks:[]});
  renderPlaylists();
});
document.addEventListener('click', (e)=>{
  if(e.target.matches('.play-pl')){
    const i = parseInt(e.target.dataset.i,10);
    if(!playlists[i] || playlists[i].tracks.length===0) return alert('Playlist empty');
    const firstId = playlists[i].tracks[0];
    const idx = library.findIndex(x=>x.id===firstId);
    if(idx>=0) playAt(idx);
  }
});

// Accent & blur customization
const accentInput = $('#accentColor');
const blurInput = $('#blurRange');
accentInput.addEventListener('input', ()=> document.documentElement.style.setProperty('--accent', accentInput.value));
blurInput.addEventListener('input', ()=> document.documentElement.style.setProperty('--blur', blurInput.value + 'px'));

// Simple search
$('#searchBox').addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.card .title').forEach(el=>{
    const card = el.closest('.card');
    card.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

// Init small UX tweaks
document.body.classList.add('ios-like');
