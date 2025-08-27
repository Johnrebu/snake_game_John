// Friends-inspired Snake — Worms Zone style game logic
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let cw = canvas.width, ch = canvas.height;
const gridSize = 20;
let cols = Math.floor(cw / gridSize), rows = Math.floor(ch / gridSize);

let snake = [{x:Math.floor(cols/2), y:Math.floor(rows/2)}];
let dir = {x:1,y:0};
let nextDir = dir;
let food = [];
let powerups = [];
let obstacles = [];
let boosts = [];
let aiSnakes = [];
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

// AI snake colors
const aiColors = ['#e74c3c', '#9b59b6', '#f39c12', '#27ae60', '#e67e22', '#34495e'];

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
  do { cell = randCell(); } while(collidesWithSnake(cell) || cellInObstacles(cell) || collidesWithAnyAI(cell));
  food.push(cell);
}

function collidesWithSnake(cell, ignoreHead=false){
  for(let i = ignoreHead?1:0;i<snake.length;i++){
    if(snake[i].x===cell.x && snake[i].y===cell.y) return true;
  }
  return false;
}

function collidesWithAnyAI(cell){
  return aiSnakes.some(ai => ai.snake.some(segment => segment.x === cell.x && segment.y === cell.y));
}

function cellInObstacles(cell){
  return obstacles.some(o=>o.x===cell.x && o.y===cell.y);
}

function isOutOfBounds(cell){
  return cell.x < 0 || cell.x >= cols || cell.y < 0 || cell.y >= rows;
}

function spawnObstacles(n=6){
  obstacles = [];
  for(let i=0;i<n;i++){
    let cell;
    do { cell = randCell(); } while(collidesWithSnake(cell) || collidesWithAnyAI(cell) || food.some(f => f.x === cell.x && f.y === cell.y));
    obstacles.push(cell);
  }
}

function spawnPowerups(n=2){
  powerups = [];
  for(let i=0;i<n;i++){
    let cell;
    do { cell = randCell(); } while(collidesWithSnake(cell) || cellInObstacles(cell) || collidesWithAnyAI(cell) || food.some(f => f.x === cell.x && f.y === cell.y));
    powerups.push({pos:cell, value:5});
  }
}

function spawnBoosts(n=1){
  boosts = [];
  for(let i=0;i<n;i++){
    let cell;
    do{ cell = randCell(); } while(collidesWithSnake(cell) || cellInObstacles(cell) || collidesWithAnyAI(cell));
    boosts.push({pos:cell, time:8000});
  }
}

function createAISnake(){
  let startPos;
  do { startPos = randCell(); } while(
    collidesWithSnake(startPos) || 
    cellInObstacles(startPos) || 
    collidesWithAnyAI(startPos) ||
    food.some(f => f.x === startPos.x && f.y === startPos.y)
  );
  
  return {
    snake: [startPos, {x: startPos.x - 1, y: startPos.y}],
    dir: {x: 1, y: 0},
    nextDir: {x: 1, y: 0},
    color: aiColors[Math.floor(Math.random() * aiColors.length)],
    speedMultiplier: 1,
    boostTimer: 0
  };
}

function spawnFoodFromSnake(snakeBody){
  snakeBody.forEach(segment => {
    if(Math.random() < 0.7) { // 70% chance each segment becomes food
      food.push({x: segment.x, y: segment.y});
    }
  });
}

function findClosestTarget(aiSnake){
  const head = aiSnake.snake[0];
  let closest = null;
  let minDist = Infinity;
  
  // Check food
  food.forEach(f => {
    const dist = Math.abs(head.x - f.x) + Math.abs(head.y - f.y);
    if(dist < minDist){
      minDist = dist;
      closest = f;
    }
  });
  
  // Check powerups
  powerups.forEach(p => {
    const dist = Math.abs(head.x - p.pos.x) + Math.abs(head.y - p.pos.y);
    if(dist < minDist){
      minDist = dist;
      closest = p.pos;
    }
  });
  
  return closest;
}

function getValidDirections(aiSnake){
  const head = aiSnake.snake[0];
  const directions = [
    {x: 0, y: -1}, // up
    {x: 0, y: 1},  // down
    {x: -1, y: 0}, // left
    {x: 1, y: 0}   // right
  ];
  
  return directions.filter(d => {
    // Don't reverse direction
    if(d.x === -aiSnake.dir.x && d.y === -aiSnake.dir.y) return false;
    
    const newHead = {x: head.x + d.x, y: head.y + d.y};
    
    // Check boundaries
    if(isOutOfBounds(newHead)) return false;
    
    // Check obstacles
    if(cellInObstacles(newHead)) return false;
    
    // Check collision with own body (except tail which will move)
    for(let i = 0; i < aiSnake.snake.length - 1; i++){
      if(aiSnake.snake[i].x === newHead.x && aiSnake.snake[i].y === newHead.y) return false;
    }
    
    // Check collision with player snake
    if(collidesWithSnake(newHead)) return false;
    
    // Check collision with other AI snakes
    for(let otherAI of aiSnakes){
      if(otherAI === aiSnake) continue;
      for(let segment of otherAI.snake){
        if(segment.x === newHead.x && segment.y === newHead.y) return false;
      }
    }
    
    return true;
  });
}

function advanceAISnake(aiSnake){
  const head = aiSnake.snake[0];
  const target = findClosestTarget(aiSnake);
  const validDirs = getValidDirections(aiSnake);
  
  if(validDirs.length === 0){
    // AI snake is trapped, kill it
    return false;
  }
  
  // Choose direction towards target if possible
  if(target){
    const dx = target.x - head.x;
    const dy = target.y - head.y;
    
    let preferredDir = null;
    if(Math.abs(dx) > Math.abs(dy)){
      preferredDir = {x: dx > 0 ? 1 : -1, y: 0};
    } else {
      preferredDir = {x: 0, y: dy > 0 ? 1 : -1};
    }
    
    // Check if preferred direction is valid
    if(validDirs.some(d => d.x === preferredDir.x && d.y === preferredDir.y)){
      aiSnake.nextDir = preferredDir;
    } else {
      // Choose random valid direction
      aiSnake.nextDir = validDirs[Math.floor(Math.random() * validDirs.length)];
    }
  } else {
    // No target, choose random valid direction
    aiSnake.nextDir = validDirs[Math.floor(Math.random() * validDirs.length)];
  }
  
  aiSnake.dir = aiSnake.nextDir;
  const newHead = {x: head.x + aiSnake.dir.x, y: head.y + aiSnake.dir.y};
  
  aiSnake.snake.unshift(newHead);
  
  // Check if AI ate food
  let ateFood = false;
  for(let i = food.length - 1; i >= 0; i--){
    if(food[i].x === newHead.x && food[i].y === newHead.y){
      food.splice(i, 1);
      ateFood = true;
      break;
    }
  }
  
  // Check if AI ate powerup
  for(let i = powerups.length - 1; i >= 0; i--){
    const p = powerups[i];
    if(p.pos.x === newHead.x && p.pos.y === newHead.y){
      powerups.splice(i, 1);
      ateFood = true;
      break;
    }
  }
  
  // Check if AI ate boost
  for(let i = boosts.length - 1; i >= 0; i--){
    const b = boosts[i];
    if(b.pos.x === newHead.x && b.pos.y === newHead.y){
      aiSnake.speedMultiplier = 2.2;
      aiSnake.boostTimer = Date.now() + b.time;
      boosts.splice(i, 1);
      ateFood = true;
      break;
    }
  }
  
  if(!ateFood){
    aiSnake.snake.pop();
  }
  
  // Handle boost expiration
  if(aiSnake.boostTimer && Date.now() > aiSnake.boostTimer){
    aiSnake.speedMultiplier = 1;
    aiSnake.boostTimer = 0;
  }
  
  return true;
}

function resetGame(){
  snake = [{x:Math.floor(cols/2), y:Math.floor(rows/2)}];
  dir = {x:1,y:0}; nextDir = dir;
  score = 0; lives = 3; boostTimer=0;
  food = [];
  aiSnakes = [];
  
  const diff = difficulty.value;
  let numAI = 3;
  if(diff==='Easy'){ baseInterval=140; spawnObstacles(4); spawnPowerups(3); spawnBoosts(2); numAI = 2; }
  else if(diff==='Normal'){ baseInterval=120; spawnObstacles(6); spawnPowerups(2); spawnBoosts(1); numAI = 3; }
  else { baseInterval=90; spawnObstacles(10); spawnPowerups(1); spawnBoosts(1); numAI = 4; }
  
  // Create AI snakes
  for(let i = 0; i < numAI; i++){
    aiSnakes.push(createAISnake());
  }
  
  // Place initial food
  for(let i = 0; i < 8; i++){
    placeFood();
  }
  
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

function updateHUD(){ 
  scoreEl.textContent = score; 
  speedEl.textContent = (1 + (speedMultiplier-1)).toFixed(1)+'x'; 
  livesEl.textContent = lives; 
}

function advance(){
  dir = nextDir;
  const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
  
  // Check boundaries (no wraparound)
  if(isOutOfBounds(head)){
    lives = 0;
    running = false;
    alert('Game over! Hit the wall. Final Score: ' + score);
    resetGame();
    return;
  }
  
  // Check collision with obstacles
  if(cellInObstacles(head)){
    lives = 0;
    running = false;
    alert('Game over! Hit an obstacle. Final Score: ' + score);
    resetGame();
    return;
  }
  
  // Check collision with AI snakes
  for(let ai of aiSnakes){
    for(let segment of ai.snake){
      if(head.x === segment.x && head.y === segment.y){
        lives = 0;
        running = false;
        alert('Game over! Hit an AI snake. Final Score: ' + score);
        resetGame();
        return;
      }
    }
  }
  
  // Note: Player can pass through their own body (Worms Zone style)
  snake.unshift(head);
  
  // eat food
  let ateFood = false;
  for(let i = food.length - 1; i >= 0; i--){
    if(food[i].x === head.x && food[i].y === head.y){
      score += 1;
      food.splice(i, 1);
      ateFood = true;
      break;
    }
  }
  
  if(!ateFood){
    snake.pop();
  }
  
  // powerups
  for(let i=powerups.length-1;i>=0;i--){
    const p = powerups[i];
    if(head.x===p.pos.x && head.y===p.pos.y){
      score += p.value;
      powerups.splice(i,1);
      ateFood = true;
    }
  }
  
  // boosts
  for(let i=boosts.length-1;i>=0;i--){
    const b = boosts[i];
    if(head.x===b.pos.x && head.y===b.pos.y){
      speedMultiplier = 2.2;
      boostTimer = Date.now() + b.time;
      boosts.splice(i,1);
      ateFood = true;
    }
  }
  
  // slow down boost expiration
  if(boostTimer && Date.now()>boostTimer){ speedMultiplier = 1; boostTimer = 0; }

  // Spawn more food occasionally
  if(Math.random() < 0.1 && food.length < 15){
    placeFood();
  }

  updateHUD();
}

function draw(){
  // clear
  ctx.clearRect(0,0,cw,ch);
  
  // draw border
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, cw-2, ch-2);
  
  // draw obstacles
  obstacles.forEach(o=>drawRect(o.x,o.y, gridSize-2, gridSize-2, '#6b6b6b'));
  
  // draw food
  food.forEach(f => drawRect(f.x, f.y, gridSize-4, gridSize-4, '#f25c54', true));
  
  // draw powerups
  powerups.forEach(p=>drawRect(p.pos.x, p.pos.y, gridSize-6, gridSize-6, '#5cd6a9', true));
  
  // draw boosts
  boosts.forEach(b=>drawRect(b.pos.x, b.pos.y, gridSize-6, gridSize-6, '#ffd166', true));
  
  // draw AI snakes
  aiSnakes.forEach(ai => {
    ai.snake.forEach((s,i)=>{
      const isHead = i === 0;
      const size = isHead ? gridSize-2 : gridSize-4;
      drawRect(s.x, s.y, size, size, ai.color, true, isHead);
    });
  });
  
  // draw player snake
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
let aiLastTick = 0;
function loop(ts){
  if(!running) return;
  if(!lastTick) lastTick = ts;
  if(!aiLastTick) aiLastTick = ts;
  
  const interval = baseInterval / speedMultiplier;
  
  // Update player
  if(ts - lastTick >= interval){
    advance();
    lastTick = ts;
  }
  
  // Update AI snakes (slightly slower)
  if(ts - aiLastTick >= interval * 1.2){
    for(let i = aiSnakes.length - 1; i >= 0; i--){
      const ai = aiSnakes[i];
      const survived = advanceAISnake(ai);
      if(!survived){
        // AI snake died, turn it into food
        spawnFoodFromSnake(ai.snake);
        aiSnakes.splice(i, 1);
        
        // Spawn new AI snake after a delay
        setTimeout(() => {
          if(running && aiSnakes.length < 4){
            aiSnakes.push(createAISnake());
          }
        }, 3000);
      }
    }
    aiLastTick = ts;
  }
  
  draw();
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
  if(Math.random()<0.3 && food.length < 20) placeFood();
}, 8000);

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