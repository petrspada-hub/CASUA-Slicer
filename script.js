(() => {

const W = 700, H = 300;
const c = document.getElementById("game");
const x = c.getContext("2d");

const img = new Image();
img.src = "obrazek.png";

const colors = [
  [0,255,255],[0,255,0],[255,255,0],[255,127,0],
  [255,0,0],[255,0,255],[127,0,255],[0,0,255]
];

const modes = ["easy","medium","hard"];
let mi = 0, mode = modes[mi];

const diff = {
  easy:{tolerancePct:0.10,speed:1,acc:0.05},
  medium:{tolerancePct:0.05,speed:2,acc:0.125},
  hard:{tolerancePct:0.025,speed:3,acc:0.25}
};

const LS = "CasuaSlicerBest";
let best = { easy:0, medium:0, hard:0 };

try {
  const s = JSON.parse(localStorage.getItem(LS));
  if (s && typeof s === "object") best = {...best, ...s};
} catch {}

let iw=0, ih=0, ix=0, iy=100;
let SV=0, TOL=0, base=0, spd=0, co=0;
let ly=iy, dir=1, cut=null, hit=false, score=0, first=true;

let zoom = 1;
let lastDist = null;

const isMobile = /Mobi|Android/i.test(navigator.userAgent);

function setMode(m){
  const d = diff[m];
  base = d.speed;
  spd  = base - d.acc;
  co   = base - 1;
  TOL  = Math.floor(ih * d.tolerancePct);
}

function reset(full=false){
  cut = null;
  hit = false;
  ly  = iy;
  dir = 1;
  if(full){
    score = 0;
    first = true;
    spd = base - diff[mode].acc;
  }
}

function saveBest(){
  if(score > best[mode]){
    best[mode] = score;
    localStorage.setItem(LS, JSON.stringify(best));
  }
}

function drawText(t,xp,yp,col="#fff",s=18,a="left"){
  x.font = `${s}px system-ui,-apple-system,Segoe UI,Roboto,Arial`;
  x.textBaseline = "top";
  x.textAlign = a;
  x.fillStyle = col;
  x.fillText(t,xp,yp);
}

function drawLine(y,col,w=2){
  x.strokeStyle=`rgb(${col[0]},${col[1]},${col[2]})`;
  x.lineWidth=w;
  x.beginPath();
  x.moveTo(ix,y);
  x.lineTo(ix+iw,y);
  x.stroke();
}

function clamp(v,l,h){ return Math.max(l, Math.min(h, v)); }

function update(){
  if(cut===null){
    ly += spd * dir;
    if(ly <= iy){ ly = iy; dir = 1; }
    if(ly >= iy+ih){ ly = iy+ih; dir = -1; }
  }
}

function render(){
  x.save();

  if(isMobile){
    x.clearRect(0,0,c.width,c.height);
    x.scale(zoom, zoom);
  } else {
    x.fillStyle = "#1e1e1e";
    x.fillRect(0,0,c.width,c.height);
  }

  if(cut === null){
    x.drawImage(img, ix, iy, iw, ih);
  } else {
    const srcH = img.naturalHeight;
    const scale = ih / srcH;
    const realCut = Math.round(cut / scale);

    x.drawImage(
      img,
      0, realCut,
      img.naturalWidth, srcH - realCut,
      ix, iy + cut,
      iw, ih - cut
    );
  }

  if(cut === null){
    const step = Math.trunc((spd - base) / 0.5);
    const idx = clamp(co + step, 0, colors.length - 1);
    drawLine(Math.round(ly), colors[idx], 2);
  }

  drawText(mode.toUpperCase(),10,10,"#fff",16,"left");
  drawText(`Score: ${score}`,c.width-10,10,"#fff",16,"right");
  drawText(`Best: ${best[mode]}`,c.width-10,28,"#fff",16,"right");

  if(first){
    drawText("Stiskni mezerník nebo tap",c.width/2,10,"#fff",18,"center");
  } else if(cut !== null){
    drawText(hit ? "PERFECT!" : "FAIL!", c.width/2,10, hit?"#0f0":"#f00",20,"center");
  }

  x.restore();
}

function loop(){
  update();
  render();
  requestAnimationFrame(loop);
}

function triggerCut(){
  first=false;
  if(cut===null){
    let r = Math.round(ly - iy);
    r = clamp(r, 0, ih - 1);

    if(Math.abs(r - SV) <= TOL){
      hit=true;
      score++;
      spd += diff[mode].acc;
      r = SV;
    } else {
      hit=false;
      saveBest();
      spd = base - diff[mode].acc;
    }

    cut = r;
  } else {
    cut = null;
    if(!hit) score = 0;
    hit=false;
    ly=iy;
    dir=1;
  }
}

// PC klávesnice
window.addEventListener("keydown", e=>{
  if(e.code==="Space") triggerCut();
});

// PC myš
c.addEventListener("mousedown", e=>{
  const r = c.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;

  if(mx>=10 && mx<=140 && my>=10 && my<=40){
    saveBest();
    mi = (mi+1) % modes.length;
    mode = modes[mi];
    setMode(mode);
    reset(true);
    return;
  }

  triggerCut();
});

// Mobilní dotyk
c.addEventListener("touchstart", e=>{
  e.preventDefault();
  if(e.touches.length === 1){
    const t = e.touches[0];
    if(t.clientX>=10 && t.clientX<=140 && t.clientY>=10 && t.clientY<=40){
      saveBest();
      mi = (mi+1) % modes.length;
      mode = modes[mi];
      setMode(mode);
      reset(true);
      return;
    }
    triggerCut();
  } else if(e.touches.length === 2){
    lastDist = getDistance(e.touches);
  }
});

c.addEventListener("touchmove", e=>{
  if(e.touches.length === 2 && lastDist){
    const newDist = getDistance(e.touches);
    zoom *= newDist / lastDist;
    lastDist = newDist;
  }
});

c.addEventListener("touchend", e=>{
  if(e.touches.length < 2) lastDist = null;
});

function getDistance(touches){
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx*dx + dy*dy);
}

img.onload = ()=>{
  if(!isMobile){
    c.width = W;
    c.height = H;
    iw = 600;
    ih = Math.round(img.naturalHeight * (iw / img.naturalWidth));
    ix = Math.floor((W - iw)/2);
    iy = 100;
    SV = Math.floor(ih * 0.334);
  } else {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const maxWidth = c.width * 0.9;
    const scale = (maxWidth / img.naturalWidth);
    iw = img.naturalWidth * scale;
    ih = img.naturalHeight * scale;
    ix = (c.width - iw)/2;
    iy = c.height*0.2;
    SV = Math.floor(ih * 0.334);
  }

  setMode(mode);
  reset(true);
  requestAnimationFrame(loop);
};

img.onerror = ()=>{
  x.fillStyle="#1e1e1e";
  x.fillRect(0,0,c.width,c.height);
  drawText("Chybí soubor obrazek.png",c.width/2,c.height/2-10,"#f88",18,"center");
};

})();
