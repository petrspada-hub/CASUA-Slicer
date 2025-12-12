
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
    easy:   { tolerancePct:0.10, speed:1, acc:0.05 },
    medium: { tolerancePct:0.05, speed:2, acc:0.125 },
    hard:   { tolerancePct:0.025, speed:3, acc:0.25 }
  };

  const LS = "CasuaSlicerBest";
  let best = { easy:0, medium:0, hard:0 };
  try {
    const s = JSON.parse(localStorage.getItem(LS));
    if (s && typeof s === "object") best = { ...best, ...s };
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

    // Výřez (řez) správně přepočítaný na originální výšku obrázku
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

    // UI
    drawText(mode.toUpperCase(),10,10,"#fff",16,"left");
    drawText(`Score: ${score}`,W-10,10,"#fff",16,"right");
    drawText(`Best: ${best[mode]}`,W-10,28,"#fff",16,"right");

    if(first){
      drawText("Stiskni mezerník / TAP",W/2,10,"#fff",18,"center");
    } else if(cut !== null){
      drawText(hit ? "PERFECT!" : "FAIL!", W/2,10, hit?"#0f0":"#f00",20,"center");
    }
  }
  function loop(){
    update();
    render();
    requestAnimationFrame(loop);
  }

  // --- Společná akce řezu: mezerník / TAP ---
  function handleSlice(){
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

  // --- Mezerník (PC) ---
  window.addEventListener("keydown", e=>{
    if(e.code==="Space"){
      e.preventDefault();
      handleSlice();
    }
  });

  // Pomocná: je tap uvnitř tlačítka obtížnosti?
  function isInDiffButton(clientX, clientY){
    const r = c.getBoundingClientRect();
    const mx = clientX - r.left;
    const my = clientY - r.top;
    // mimo plátno => určitě to není tlačítko
    if (mx < 0 || my < 0 || mx > r.width || my > r.height) return false;
    // přepočet z CSS pixelů (po škálování) na vnitřní 700×300
    const mxCanvas = mx * (W / r.width);
    const myCanvas = my * (H / r.height);
    return (mxCanvas >= 10 && mxCanvas <= 140 && myCanvas >= 10 && myCanvas <= 40);
  }

  // --- TAP/klik kdekoli (mobil + desktop) mimo tlačítko obtížnosti ---
  document.addEventListener("pointerdown", e=>{
    // levé tlačítko / primární kontakt
    if(e.button !== undefined && e.button !== 0) return;
    // Pokud je to tap na tlačítko obtížnosti, neprováděj řez
    if(isInDiffButton(e.clientX, e.clientY)) return;
    e.preventDefault();
    handleSlice();
  }, { passive: false });

  // --- Přepínač obtížnosti: klik na tlačítko v plátně ---
  c.addEventListener("pointerdown", e=>{
    const r = c.getBoundingClientRect();
    // přepočítané souřadnice na vnitřní 700×300
    const mxCanvas = (e.clientX - r.left) * (W / r.width);
    const myCanvas = (e.clientY - r.top) * (H / r.height);

    if(mxCanvas >= 10 && mxCanvas <= 140 && myCanvas >= 10 && myCanvas <= 40){
      saveBest();
      mi = (mi + 1) % modes.length;
      mode = modes[mi];
      setMode(mode);
      reset(true);
      // zabrání „propadnutí“ události do globálního TAPu
      e.preventDefault();
      e.stopPropagation();
    }
  }, { passive: false });

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
