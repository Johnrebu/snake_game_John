// Friends-inspired Snake — single-file game logic
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let cw = canvas.width, ch = canvas.height;
const gridSize = 20;
let cols = Math.floor(cw / gridSize), rows = Math.floor(ch / gridSize);

let snake = [{x:Math.floor(cols/2), y:Math.floor(rows/2)}];
let dir = {x:1,y:0};
let nextDir = dir;
let food = null;
let powerups = [];
let obstacles = [];
let boosts = [];
let score = 0;
let lives = 3;
let baseInterval = 120; // ms
let speedMultiplier = 1;
let running = false;
let boostTimer = 0;

const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const livesEl = document.getElementById('lives');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const difficulty = document.getElementById('difficulty');

// responsive resizing
function resize() {
  cw = canvas.width = Math.min(800, window.innerWidth - 320);
  ch = canvas.height = Math.min(600, window.innerHeight - 160);
  cols = Math.floor(cw / gridSize);
  rows = Math.floor(ch / gridSize);
}
window.addEventListener('resize', () => { resize(); draw(); });
resize();

function randCell() { return {x: Math.floor(Math.random()*cols), y: Math.floor(Math.random()*rows)}; }

function placeFood(){
  let cell;
  do { cell = randCell(); } while(collidesWithSnake(cell) || cellInObstacles(cell));
  food = cell;
}

function collidesWithSnake(cell, ignoreHead=false){
  for(let i = ignoreHead?1:0;i<snake.length;i++){
    if(snake[i].x===cell.x && snake[i].y===cell.y) return true;
  }
  return false;
}

function cellInObstacles(cell){
  return obstacles.some(o=>o.x===cell.x && o.y===cell.y);
}

function spawnObstacles(n=6){
  obstacles = [];
  for(let i=0;i<n;i++){
    let cell;
    do { cell = randCell(); } while(collidesWithSnake(cell) || (food && cell.x===food.x && cell.y===food.y));
    obstacles.push(cell);
  }
}

function spawnPowerups(n=2){
  powerups = [];
  for(let i=0;i<n;i++){
    let cell;
    do { cell = randCell(); } while(collidesWithSnake(cell) || cellInObstacles(cell) || (food && cell.x===food.x && cell.y===food.y));
    powerups.push({pos:cell, value:5});
  }
}

function spawnBoosts(n=1){
  boosts = [];
  for(let i=0;i<n;i++){
    let cell;
    do{ cell = randCell(); } while(collidesWithSnake(cell) || cellInObstacles(cell));
    boosts.push({pos:cell, time:8000});
  }
}

function resetGame(){
  snake = [{x:Math.floor(cols/2), y:Math.floor(rows/2)}];
  dir = {x:1,y:0}; nextDir = dir;
  score = 0; lives = 3; boostTimer=0;
  const diff = difficulty.value;
  if(diff==='Easy'){ baseInterval=140; spawnObstacles(4); spawnPowerups(3); spawnBoosts(2); }
  else if(diff==='Normal'){ baseInterval=120; spawnObstacles(6); spawnPowerups(2); spawnBoosts(1); }
  else { baseInterval=90; spawnObstacles(10); spawnPowerups(1); spawnBoosts(1); }
  placeFood();
  running = false;
  updateHUD();
  draw();
}

startBtn.addEventListener('click', ()=>{ if(!running){ running=true; loop(); } });
pauseBtn.addEventListener('click', ()=>{ running=false; });

document.addEventListener('keydown', e=>{
  const key = e.key;
  if(key==='ArrowUp' && dir.y!==1) nextDir={x:0,y:-1};
  if(key==='ArrowDown' && dir.y!==-1) nextDir={x:0,y:1};
  if(key==='ArrowLeft' && dir.x!==1) nextDir={x:-1,y:0};
  if(key==='ArrowRight' && dir.x!==-1) nextDir={x:1,y:0};
  // restart on space
  if(key===' '){ if(!running){ resetGame(); running=true; loop(); } else { running=false; } }
});

canvas.addEventListener('click', ()=>{ if(!running){ running=true; loop(); } });

function updateHUD(){ scoreEl.textContent = score; speedEl.textContent = (1 + (speedMultiplier-1)).toFixed(1)+'x'; livesEl.textContent = lives; }

function advance(){
  dir = nextDir;
  const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
  // wraparound
  head.x = (head.x + cols) % cols;
  head.y = (head.y + rows) % rows;
  // collisions
  if(collidesWithSnake(head) || cellInObstacles(head)){
    lives -= 1;
    if(lives<=0){ running=false; alert('Game over! Score: '+score); resetGame(); return; }
    // shrink snake a bit and continue
    snake = snake.slice(0, Math.max(1, Math.floor(snake.length/2)));
    placeFood();
    updateHUD();
    return;
  }
  snake.unshift(head);
  // eat food
  if(food && head.x===food.x && head.y===food.y){
    score += 1;
    placeFood();
    // chance to spawn extra powerup
    if(Math.random()<0.25) spawnPowerups(1);
  } else {
    snake.pop();
  }
  // powerups
  for(let i=powerups.length-1;i>=0;i--){
    const p = powerups[i];
    if(head.x===p.pos.x && head.y===p.pos.y){
      score += p.value;
      powerups.splice(i,1);
    }
  }
  // boosts
  for(let i=boosts.length-1;i>=0;i--){
    const b = boosts[i];
    if(head.x===b.pos.x && head.y===b.pos.y){
      speedMultiplier = 2.2;
      boostTimer = Date.now() + b.time;
      boosts.splice(i,1);
    }
  }
  // slow down boost expiration
  if(boostTimer && Date.now()>boostTimer){ speedMultiplier = 1; boostTimer = 0; }

  updateHUD();
}

function draw(){
  // clear
  ctx.clearRect(0,0,cw,ch);
  // draw grid background subtle
  // draw obstacles
  obstacles.forEach(o=>drawRect(o.x,o.y, gridSize-2, gridSize-2, '#6b6b6b'));
  // draw food
  if(food) drawRect(food.x, food.y, gridSize-4, gridSize-4, '#f25c54', true);
  // draw powerups
  powerups.forEach(p=>drawRect(p.pos.x, p.pos.y, gridSize-6, gridSize-6, '#5cd6a9', true));
  // draw boosts
  boosts.forEach(b=>drawRect(b.pos.x, b.pos.y, gridSize-6, gridSize-6, '#ffd166', true));
  // draw snake
  snake.forEach((s,i)=>{
    const col = i===0 ? '#236b8e' : (i%2? '#79c0d1' : '#b9e6f0');
    drawRect(s.x, s.y, gridSize-2, gridSize-2, col, true, i===0);
  });
}

function drawRect(cx,cy,w,h,color,fill=true,rounded=false){
  const x = cx * gridSize + (gridSize - w)/2;
  const y = cy * gridSize + (gridSize - h)/2;
  ctx.beginPath();
  if(rounded){
    const r = 6;
    roundRect(ctx, x, y, w, h, r);
  } else {
    ctx.rect(x,y,w,h);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function roundRect(ctx,x,y,w,h,r){
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
}

let lastTick = 0;
function loop(ts){
  if(!running) return;
  if(!lastTick) lastTick = ts;
  const interval = baseInterval / speedMultiplier;
  if(ts - lastTick >= interval){
    advance();
    draw();
    lastTick = ts;
  }
  requestAnimationFrame(loop);
}

// initial placement
resetGame();

// touchscreen swipe support (very simple)
let touchStart = null;
canvas.addEventListener('touchstart', e=>{ const t = e.touches[0]; touchStart = {x:t.clientX, y:t.clientY}; });
canvas.addEventListener('touchend', e=>{ if(!touchStart) return; const t = e.changedTouches[0]; const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y; if(Math.abs(dx)>Math.abs(dy)){ if(dx>10 && dir.x!==-1) nextDir={x:1,y:0}; else if(dx<-10 && dir.x!==1) nextDir={x:-1,y:0}; } else { if(dy>10 && dir.y!==-1) nextDir={x:0,y:1}; else if(dy<-10 && dir.y!==1) nextDir={x:0,y:-1}; } touchStart=null; });

// spawn some extras occasionally
setInterval(()=>{
  if(Math.random()<0.35) spawnPowerups(1);
  if(Math.random()<0.2) spawnBoosts(1);
}, 10000);

// simple in-browser generated background music using WebAudio
class BGMusic {
  constructor(){
    this.ctx = null; this.master=null; this.isPlaying=false; this.pattern = [0,2,4,5,7,9,11,12];
  }
  start(){
    if(this.isPlaying) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.06;
    this.master.connect(this.ctx.destination);
    this.isPlaying = true;
    this._schedule();
  }
  _playNote(freq, dur, time, type='sine'){
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(0.12, time+0.01); g.gain.exponentialRampToValueAtTime(0.0001, time+dur);
    o.connect(g); g.connect(this.master);
    o.start(time); o.stop(time+dur+0.02);
  }
  _schedule(){
    if(!this.isPlaying) return;
    const now = this.ctx.currentTime;
    const tempo = 90; // bpm
    for(let i=0;i<8;i++){
      const note = this.pattern[(Math.floor(Math.random()*this.pattern.length))];
      const freq = 220 * Math.pow(2, note/12);
      this._playNote(freq, 0.4, now + i*0.5, i%2? 'sine':'triangle');
    }
    // light bass
    const b = this.ctx.createOscillator(); const gb = this.ctx.createGain();
    b.type='sawtooth'; b.frequency.value = 55; gb.gain.value = 0.02;
    b.connect(gb); gb.connect(this.master); b.start(now); b.stop(now + 4.2);
    // schedule next
    setTimeout(()=>this._schedule(), 4000);
  }
  stop(){ if(!this.isPlaying) return; this.ctx.close(); this.isPlaying=false; this.ctx=null; }
}

const music = new BGMusic();
// auto-start when user interacts to satisfy autoplay policies
['click','keydown','touchstart'].forEach(ev=>window.addEventListener(ev, ()=>{ if(!music.isPlaying) music.start(); }, {once:true}));

// small helper to let user change difficulty mid-session
difficulty.addEventListener('change', ()=> resetGame());
