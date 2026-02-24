(() => {
const LAYERS = ['STRUCTURE', 'STORAGE', 'ZONES', 'SAFETY', 'ANNOTATIONS'];
const TOOLS = ['select','brush','eraser','line','rect','bucket','pan','eyedropper'];
const CATS = ['all','structure','access','storage','zone','safety','service','annotation','wms'];
const STORAGE_KEY='dl_layout_pro_v1';
const gridCanvas = document.getElementById('gridCanvas');
const bpCanvas = document.getElementById('blueprintCanvas');
const ctx = gridCanvas.getContext('2d');
const bpCtx = bpCanvas.getContext('2d');
const wrap = document.getElementById('canvasWrap');

const state = {
  gridW:60, gridH:40, cellSize:24, zoom:1, panX:50, panY:50,
  activeTool:'brush', activeTile:'rack_pallet', activeCategory:'all',
  rectFill:true, selected:new Set(), favorites:[],
  layerStates:Object.fromEntries(LAYERS.map(l=>[l,{visible:true,locked:false}])),
  blueprint:{src:'',img:null,opacity:.5,scale:1,offsetX:0,offsetY:0,locked:false},
  cells:[], cellProps:{}, history:[], future:[], pointerStart:null, longPressTimer:null,
  viewMode:'2d', view3d:null, view3dSelected:null,
  view3dSettings:{wallHeight:2.6,wallThickness:0.2,quality:'high',showBlueprint:true,walkMode:false}
};
const catalog = window.TILE_CATALOG;
const tileById = Object.fromEntries(catalog.map(t=>[t.id,t]));

function idx(x,y){return y*state.gridW+x}
function initCells(){state.cells=Array(state.gridW*state.gridH).fill('empty'); state.cellProps={}}
function demo(){
  initCells();
  for(let x=2;x<58;x++){paint(x,2,'wall_solid_ext');paint(x,37,'wall_solid_ext')}
  for(let y=2;y<38;y++){paint(2,y,'wall_solid_ext');paint(57,y,'wall_solid_ext')}
  paint(30,2,'door_double');paint(57,20,'dock_door');
  for(let y=8;y<31;y+=4) for(let x=8;x<48;x+=2) paint(x,y,'rack_pallet');
  ['bin_p1','bin_p2','bin_p3','bin_p4','bin_p5','bin_p6','bin_p7'].forEach((b,i)=>paint(50,8+i*3,b));
  fillRect(4,30,18,35,'zone_receiving',true); fillRect(20,30,34,35,'zone_picking',true); fillRect(36,30,54,35,'zone_shipping',true);
}
function paint(x,y,tile,opts={}){
  if(x<0||y<0||x>=state.gridW||y>=state.gridH) return;
  const t=tileById[tile]||tileById.empty; const ls=state.layerStates[t.layer]; if(ls && ls.locked && !opts.ignoreLock) return;
  state.cells[idx(x,y)] = tile;
  const key = `${x},${y}`;
  state.cellProps[key] = {...(state.cellProps[key]||{}), tileId:tile, layer:t.layer, rotation:0, note:'', tags:[]};
}
function erase(x,y){paint(x,y,'empty')}
function fillRect(x1,y1,x2,y2,tile,fill=true){ const [ax,bx]=[Math.min(x1,x2),Math.max(x1,x2)]; const [ay,by]=[Math.min(y1,y2),Math.max(y1,y2)];
  for(let y=ay;y<=by;y++)for(let x=ax;x<=bx;x++){ if(fill || y===ay||y===by||x===ax||x===bx) paint(x,y,tile); }
}
function line(x0,y0,x1,y1,tile){let dx=Math.abs(x1-x0), sx=x0<x1?1:-1, dy=-Math.abs(y1-y0), sy=y0<y1?1:-1, err=dx+dy;
  while(true){paint(x0,y0,tile); if(x0===x1 && y0===y1) break; const e2=2*err; if(e2>=dy){err+=dy;x0+=sx} if(e2<=dx){err+=dx;y0+=sy}}
}
function flood(x,y,tile){ const target=state.cells[idx(x,y)]; if(target===tile)return; const q=[[x,y]];
  while(q.length){const [cx,cy]=q.pop(); if(cx<0||cy<0||cx>=state.gridW||cy>=state.gridH) continue; if(state.cells[idx(cx,cy)]!==target) continue;
    paint(cx,cy,tile); q.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]); }
}
function pushHistory(){ state.history.push(JSON.stringify(snapshot())); state.future=[]; if(state.history.length>150) state.history.shift(); save(); }
function snapshot(){return {gridW:state.gridW,gridH:state.gridH,cellSize:state.cellSize,cells:state.cells,cellProps:state.cellProps,layerStates:state.layerStates,favorites:state.favorites,blueprint:{...state.blueprint,img:null},panX:state.panX,panY:state.panY,zoom:state.zoom}}
function restore(s){Object.assign(state,s); state.selected=new Set(); loadBlueprint(); renderAll(); buildWarnings(); renderProps();}
function worldToCell(px,py){const x=Math.floor((px-state.panX)/(state.cellSize*state.zoom)); const y=Math.floor((py-state.panY)/(state.cellSize*state.zoom)); return {x,y}}
function cellToScreen(x,y){const cs=state.cellSize*state.zoom; return {x:state.panX+x*cs,y:state.panY+y*cs,cs}}

function renderAll(){if(state.viewMode==='3d'){refresh3DIfOpen(); return;} resizeCanvas(); renderBlueprint(); ctx.clearRect(0,0,gridCanvas.width,gridCanvas.height); const cs=state.cellSize*state.zoom;
  for(let y=0;y<state.gridH;y++) for(let x=0;x<state.gridW;x++){
    const tile=state.cells[idx(x,y)]; if(tile==='empty') continue; const meta=tileById[tile]; if(!meta) continue; if(!state.layerStates[meta.layer]?.visible) continue;
    const p=cellToScreen(x,y); ctx.fillStyle=colorFor(meta); ctx.fillRect(p.x,p.y,cs,cs);
    ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.strokeRect(p.x,p.y,cs,cs);
  }
  ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1;
  for(let x=0;x<=state.gridW;x++){const sx=state.panX+x*cs; ctx.beginPath();ctx.moveTo(sx,state.panY);ctx.lineTo(sx,state.panY+state.gridH*cs);ctx.stroke()}
  for(let y=0;y<=state.gridH;y++){const sy=state.panY+y*cs; ctx.beginPath();ctx.moveTo(state.panX,sy);ctx.lineTo(state.panX+state.gridW*cs,sy);ctx.stroke()}
  for(const k of state.selected){const [x,y]=k.split(',').map(Number); const p=cellToScreen(x,y); ctx.strokeStyle='#22d3ee'; ctx.lineWidth=2; ctx.strokeRect(p.x+1,p.y+1,cs-2,cs-2)}
}
function renderBlueprint(){bpCtx.clearRect(0,0,bpCanvas.width,bpCanvas.height); if(!state.blueprint.img) return; bpCtx.globalAlpha=state.blueprint.opacity;
  const img=state.blueprint.img, sc=state.blueprint.scale*state.zoom; bpCtx.drawImage(img,state.panX+state.blueprint.offsetX,state.panY+state.blueprint.offsetY,img.width*sc,img.height*sc); bpCtx.globalAlpha=1;
}
function colorFor(m){const map={STRUCTURE:'#64748b',STORAGE:'#d97706',ZONES:'#1d4ed8',SAFETY:'#dc2626',ANNOTATIONS:'#a855f7'}; return map[m.layer]||'#334155'}
function resizeCanvas(){[gridCanvas,bpCanvas].forEach(c=>{c.width=wrap.clientWidth*devicePixelRatio;c.height=wrap.clientHeight*devicePixelRatio;c.style.width=wrap.clientWidth+'px';c.style.height=wrap.clientHeight+'px';const cx=c.getContext('2d');cx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)})}

function setTool(t){state.activeTool=t; renderTools();}
function renderTools(){const box=document.getElementById('toolButtons'); box.innerHTML=''; TOOLS.forEach(t=>{const b=document.createElement('button'); b.textContent=t; if(state.activeTool===t)b.classList.add('active'); b.onclick=()=>setTool(t); box.appendChild(b)});
  const qb=document.getElementById('quickbar'); qb.innerHTML=''; ['brush','eraser','pan','eyedropper'].forEach(t=>{const b=document.createElement('button');b.textContent=t;b.onclick=()=>setTool(t);qb.appendChild(b)})
}
function renderPalette(){const tabs=document.getElementById('categoryTabs'); tabs.innerHTML=''; CATS.forEach(c=>{const b=document.createElement('button');b.className='tab'+(c===state.activeCategory?' active':'');b.textContent=c;b.onclick=()=>{state.activeCategory=c;renderPalette()};tabs.appendChild(b)});
  const q=document.getElementById('searchInput').value.toLowerCase(); const list=document.getElementById('paletteList'); list.innerHTML='';
  catalog.filter(t=>t.id!=='empty').filter(t=>(state.activeCategory==='all'||t.category===state.activeCategory)&&(`${t.id} ${t.label}`.toLowerCase().includes(q))).forEach(t=>{
    const b=document.createElement('button'); b.className='tile-btn'+(state.activeTile===t.id?' active':''); b.innerHTML=`<img src="${t.icon}" alt=""/><span>${t.label}</span><span class="fav">${state.favorites.includes(t.id)?'★':'☆'}</span>`;
    b.onclick=(e)=>{if(e.offsetX>b.clientWidth-35){toggleFav(t.id);return;} state.activeTile=t.id;renderPalette();toast(`Tile actif: ${t.label}`)}; list.appendChild(b);
  });
  document.getElementById('favoriteBox').innerHTML='<small>Favoris: '+state.favorites.join(', ')+'</small>';
}
function toggleFav(id){state.favorites = [id, ...state.favorites.filter(f=>f!==id)].slice(0,10); save(); renderPalette();}
function renderLayers(){const box=document.getElementById('layersBox'); box.innerHTML=''; LAYERS.forEach(l=>{const r=document.createElement('div');r.className='layer-row';
  r.innerHTML=`<span>${l}</span><label><input type="checkbox" ${state.layerStates[l].visible?'checked':''}/> visible</label><button>${state.layerStates[l].locked?'🔒':'🔓'}</button>`;
  const cb=r.querySelector('input'); cb.onchange=()=>{state.layerStates[l].visible=cb.checked; renderAll(); refresh3DIfOpen(); save()}; r.querySelector('button').onclick=()=>{state.layerStates[l].locked=!state.layerStates[l].locked; renderLayers(); save()}; box.appendChild(r)
  })
}
function renderProps(){const box=document.getElementById('propsBox'); if(!state.selected.size){box.textContent='Aucune sélection.';return}
  const first=[...state.selected][0], p=state.cellProps[first]; if(!p){box.textContent='Cellule vide';return}
  box.innerHTML=`<div>tileId: ${p.tileId}</div><div>layer: ${p.layer}</div><div>rotation: <select id="rotSel"><option>0</option><option>90</option><option>180</option><option>270</option></select></div><div>note:<input id="noteIn" value="${p.note||''}"/></div><div>tags:<input id="tagsIn" value="${(p.tags||[]).join(',')}"/></div>`;
  box.querySelector('#rotSel').value=p.rotation||0;
  box.querySelector('#rotSel').onchange=e=>applyToSelection(c=>c.rotation=Number(e.target.value));
  box.querySelector('#noteIn').onchange=e=>applyToSelection(c=>c.note=e.target.value);
  box.querySelector('#tagsIn').onchange=e=>applyToSelection(c=>c.tags=e.target.value.split(',').map(t=>t.trim()).filter(Boolean));
}
function applyToSelection(mut){pushHistory(); state.selected.forEach(k=>{state.cellProps[k]=state.cellProps[k]||{tileId:state.cells[idx(...k.split(',').map(Number))],layer:'STRUCTURE',rotation:0,note:'',tags:[]}; mut(state.cellProps[k])}); save(); renderProps(); }

function doTool(x,y,isEnd=false){ if(x<0||y<0||x>=state.gridW||y>=state.gridH) return;
  if(state.activeTool==='brush') paint(x,y,state.activeTile);
  if(state.activeTool==='eraser') erase(x,y);
  if(state.activeTool==='bucket') flood(x,y,state.activeTile);
  if(state.activeTool==='eyedropper'){state.activeTile=state.cells[idx(x,y)]; toast('Pipette: '+state.activeTile); renderPalette();}
  if(state.activeTool==='select'){const key=`${x},${y}`; if(state.multiSelect||state.selected.has(key)){state.selected.add(key)} else {state.selected=new Set([key]);} renderProps();}
  if(isEnd && state.pointerStart){ const s=state.pointerStart; if(state.activeTool==='line') line(s.x,s.y,x,y,state.activeTile); if(state.activeTool==='rect') fillRect(s.x,s.y,x,y,state.activeTile,state.rectFill); }
}

function pointerDown(e){const p=getPoint(e); state.pointerStart=worldToCell(p.x,p.y); if(e.shiftKey) state.multiSelect=true;
  if(e.pointerType==='touch'){ state.longPressTimer=setTimeout(()=>{state.multiSelect=true;vibrate();toast('Multi-sélection activée');},420) }
  if(state.activeTool==='pan'){state.draggingPan={x:p.x,y:p.y,panX:state.panX,panY:state.panY};return}
  if(state.blueprint.img && !state.blueprint.locked && e.altKey){state.draggingBlueprint={x:p.x,y:p.y,ox:state.blueprint.offsetX,oy:state.blueprint.offsetY};return}
  pushHistory(); doTool(state.pointerStart.x,state.pointerStart.y,false); renderAll();
}
function pointerMove(e){const p=getPoint(e); if(state.draggingPan){state.panX=state.draggingPan.panX+(p.x-state.draggingPan.x);state.panY=state.draggingPan.panY+(p.y-state.draggingPan.y);renderAll();return}
  if(state.draggingBlueprint){state.blueprint.offsetX=state.draggingBlueprint.ox+(p.x-state.draggingBlueprint.x);state.blueprint.offsetY=state.draggingBlueprint.oy+(p.y-state.draggingBlueprint.y);renderAll();return}
  if(e.buttons===1 && ['brush','eraser'].includes(state.activeTool)){const c=worldToCell(p.x,p.y); doTool(c.x,c.y,false); renderAll()}
}
function pointerUp(e){clearTimeout(state.longPressTimer); const p=getPoint(e); const c=worldToCell(p.x,p.y); doTool(c.x,c.y,true); state.pointerStart=null; state.draggingPan=null; state.draggingBlueprint=null; state.multiSelect=false; renderAll(); buildWarnings(); renderProps(); save();}
function getPoint(e){const r=wrap.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}

wrap.addEventListener('pointerdown',pointerDown);wrap.addEventListener('pointermove',pointerMove);window.addEventListener('pointerup',pointerUp);
wrap.addEventListener('wheel',e=>{e.preventDefault(); const k=e.deltaY<0?1.1:0.9; state.zoom=Math.max(.3,Math.min(4,state.zoom*k)); renderAll()},{passive:false});
let pinch=null; wrap.addEventListener('touchmove',e=>{if(e.touches.length===2){e.preventDefault();const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY); if(!pinch){pinch=d;return;} state.zoom=Math.max(.3,Math.min(4,state.zoom*(d/pinch))); pinch=d; renderAll();}}, {passive:false});
wrap.addEventListener('touchend',()=>pinch=null);

function buildWarnings(){const out=[];
  for(let y=0;y<state.gridH;y++) for(let x=0;x<state.gridW;x++){
    const t=state.cells[idx(x,y)]; if(t.startsWith('door_')||t==='dock_door'){const n=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>(tileById[state.cells[idx(Math.min(state.gridW-1,Math.max(0,x+dx)),Math.min(state.gridH-1,Math.max(0,y+dy)) )]]||{}).id?.startsWith('wall_')); if(!n) out.push(`Porte isolée en ${x},${y}`)}
    if(t==='bin_unknown_type') out.push(`Bin inconnu en ${x},${y}`);
  }
  const w=document.getElementById('warnings'); w.innerHTML = out.slice(0,60).map(i=>`<li>${i}</li>`).join('') || '<li>Aucun warning</li>';
}
function save(){localStorage.setItem(STORAGE_KEY, JSON.stringify({version:'1.0',timestamp:Date.now(),...snapshot()}));}
function load(){const raw=localStorage.getItem(STORAGE_KEY); if(!raw) return false; try{restore(JSON.parse(raw)); toast('Session restaurée'); return true;}catch{return false}}
function toast(t){const el=document.getElementById('toast');el.textContent=t;el.style.display='block';setTimeout(()=>el.style.display='none',1300)}
function vibrate(){if(navigator.vibrate) navigator.vibrate(8)}
function loadBlueprint(){ if(!state.blueprint.src){state.blueprint.img=null; return;} const i=new Image(); i.onload=()=>{state.blueprint.img=i; renderAll();}; i.src=state.blueprint.src; }

function bindUI(){
  document.getElementById('searchInput').oninput=renderPalette;
  document.getElementById('undoBtn').onclick=()=>{if(!state.history.length)return; state.future.push(JSON.stringify(snapshot())); restore(JSON.parse(state.history.pop()));};
  document.getElementById('redoBtn').onclick=()=>{if(!state.future.length)return; state.history.push(JSON.stringify(snapshot())); restore(JSON.parse(state.future.pop()));};
  document.getElementById('resizeGridBtn').onclick=()=>{pushHistory(); state.gridW=+gridW.value; state.gridH=+gridH.value; state.cellSize=+cellSize.value; initCells(); renderAll(); save()};
  document.getElementById('exportJsonBtn').onclick=()=>download('layout-project.json',JSON.stringify({version:'1.0',timestamp:Date.now(),...snapshot()},null,2),'application/json');
  document.getElementById('importJsonBtn').onclick=()=>importJsonInput.click();
  importJsonInput.onchange=e=>{const f=e.target.files[0]; if(!f) return; f.text().then(t=>{restore(JSON.parse(t)); save();})};
  document.getElementById('exportPngBtn').onclick=()=>{const c=document.createElement('canvas'); c.width=gridCanvas.width;c.height=gridCanvas.height;const cctx=c.getContext('2d'); cctx.drawImage(bpCanvas,0,0); cctx.drawImage(gridCanvas,0,0); download('layout.png',c.toDataURL('image/png'),'image/png',true)};
  document.getElementById('toggle3dBtn').onclick=()=>toggle3D();
  document.getElementById('wallHeightInput').oninput=e=>{state.view3dSettings.wallHeight=+e.target.value;refresh3DIfOpen();};
  document.getElementById('wallThicknessInput').oninput=e=>{state.view3dSettings.wallThickness=+e.target.value;refresh3DIfOpen();};
  document.getElementById('quality3dInput').onchange=e=>{state.view3dSettings.quality=e.target.value;refresh3DIfOpen();};
  document.getElementById('showBp3dInput').onchange=e=>{state.view3dSettings.showBlueprint=e.target.checked;refresh3DIfOpen();};
  document.getElementById('walkModeBtn').onclick=e=>{state.view3dSettings.walkMode=!state.view3dSettings.walkMode; e.target.textContent='Walk: '+(state.view3dSettings.walkMode?'ON':'OFF'); refresh3DIfOpen();};
  document.getElementById('reset3dBtn').onclick=()=>state.view3d?.resetView();
  document.getElementById('focus3dBtn').onclick=()=>state.view3d?.focusSelection();
  document.getElementById('bpOpacity').oninput=e=>{state.blueprint.opacity=+e.target.value;renderAll();save()};
  document.getElementById('bpScale').oninput=e=>{state.blueprint.scale=+e.target.value;renderAll();save()};
  document.getElementById('bpLockBtn').onclick=e=>{state.blueprint.locked=!state.blueprint.locked; e.target.textContent='Verrou blueprint: '+(state.blueprint.locked?'ON':'OFF');save()};
  document.getElementById('blueprintInput').onchange=e=>{const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{state.blueprint.src=r.result;loadBlueprint();save()}; r.readAsDataURL(f)};
  document.getElementById('deleteSelectionBtn').onclick=()=>{pushHistory(); state.selected.forEach(k=>{const [x,y]=k.split(',').map(Number); erase(x,y)}); state.selected.clear(); renderAll(); renderProps(); save()};
  document.getElementById('applyTileSelectionBtn').onclick=()=>{pushHistory(); state.selected.forEach(k=>{const [x,y]=k.split(',').map(Number); paint(x,y,state.activeTile)}); renderAll(); save()};
  window.addEventListener('keydown',e=>{if(e.key===' ') setTool('pan'); if(e.ctrlKey&&e.key==='z'){e.preventDefault();undoBtn.click();} if(e.ctrlKey&&e.key==='y'){e.preventDefault();redoBtn.click();} if(e.key==='Delete') deleteSelectionBtn.click();});
}
function download(name,data,type,isDataUrl){const a=document.createElement('a');a.download=name;a.href=isDataUrl?data:URL.createObjectURL(new Blob([data],{type}));a.click()}

function visibleCellsSnapshot(){
  return {
    gridW:state.gridW,
    gridH:state.gridH,
    cellSize:state.cellSize,
    cells:[...state.cells],
    tileById,
    layerStates:state.layerStates,
    blueprint:state.blueprint
  };
}
async function ensure3DView(){
  if(state.view3d) return state.view3d;
  const mod = await import('./view3d.js');
  state.view3d = new mod.Layout3DView({
    container:document.getElementById('view3dPanel'),
    canvas:document.getElementById('view3dCanvas'),
    infoEl:document.getElementById('view3dInfo'),
    legendEl:document.getElementById('view3dLegend'),
    onSelect:(data)=>{ state.view3dSelected=`${data.x},${data.y}`; }
  });
  return state.view3d;
}
async function toggle3D(){
  const panel=document.getElementById('view3dPanel');
  const is3D = state.viewMode === '3d';
  if(is3D){
    panel.classList.add('hidden');
    state.viewMode='2d';
    if(state.view3dSelected){ state.selected = new Set([state.view3dSelected]); renderProps(); }
    renderAll();
    return;
  }
  state.viewMode='3d';
  panel.classList.remove('hidden');
  const view = await ensure3DView();
  view.setOptions(state.view3dSettings);
  view.setLayout(visibleCellsSnapshot());
}
function refresh3DIfOpen(){ if(state.viewMode==='3d' && state.view3d){ state.view3d.setOptions(state.view3dSettings); state.view3d.setLayout(visibleCellsSnapshot()); } }

if(!load()){demo(); save();}
bindUI(); renderTools(); renderPalette(); renderLayers(); renderAll(); buildWarnings();
})();
