
<script>
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

  function setMode(m){
    const d = diff[m];
    base = d.speed;
    spd = base - d.acc;
    co = base - 1;
    TOL = Math.floor(ih * d.tolerancePct);
  }

  function reset(full=false){
    cut = null;
    hit = false;
    ly = iy;
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
    x.fillStyle = "#1e1e1e";
    x.fillRect(0,0,W,H);

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
    drawText(`Score: ${score}`,W-10,10,"#fff",16,"right");
    drawText(`Best: ${best[mode]}`,W-10,28,"#fff",16,"right");
    if(first){
      drawText("Stiskni mezerník nebo klikni/tapni do obrázku",W/2,10,"#fff",18,"center");
    } else if(cut !== null){
      drawText(hit ? "PERFECT!" : "FAIL!", W/2,10, hit?"#0f0":"#f00",20,"center");
    }
  }

  function loop(){
    update();
    render();
    requestAnimationFrame(loop);
  }

  // --- Jednotné provedení řezu ---
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

  // Klávesnice (Space)
  window.addEventListener("keydown", e=>{
    if(e.code==="Space") triggerCut();
  });

  // --- Obrázek jako tlačítko: pointerdown uvnitř obrázku => řez ---
  //   Pointer Events fungují pro myš, dotyk i stylus.
  c.addEventListener("pointerdown", (e)=>{
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;

    // 1) přepínač režimu (uvnitř canvasu)
    if (mx>=10 && mx<=140 && my>=10 && my<=40){
      saveBest();
      mi = (mi+1) % modes.length;
      mode = modes[mi];
      setMode(mode);
      reset(true);
      return;
    }

    // 2) klik/tap do obrázku => spustit řez
    const inImage = (mx>=ix && mx<=ix+iw && my>=iy && my<=iy+ih);
    if (inImage){
      // potlačíme double-tap zoom/scroll na mobilech
      e.preventDefault?.();
      triggerCut();
    }
  }, {passive:false});

  img.onload = ()=>{
    const ow = img.naturalWidth;
    const oh = img.naturalHeight;
    const nw = 600;
    const sc = nw / ow;
    const nh = Math.round(oh * sc);
    iw = nw;
    ih = nh;
    ix = Math.floor((W - iw) / 2);
    iy = 100;
    SV = Math.floor(ih * 0.334);
    setMode(mode);
    reset(true);
    requestAnimationFrame(loop);
  };

  img.onerror = ()=>{
    x.fillStyle="#1e1e1e";
    x.fillRect(0,0,W,H);
    drawText("Chybí soubor obrazek.png",W/2,H/2-10,"#f88",18,"center");
  };
})();
</script>
``
