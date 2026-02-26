(() => {
const APP_VERSION = '2.0.0';
const SCHEMA_VERSION = '2';
const LAYERS = ['STRUCTURE', 'STORAGE', 'ZONES', 'SAFETY', 'ANNOTATIONS'];
const TOOLS = ['select','brush','eraser','line','rect','bucket','pan','eyedropper'];
const TOOL_META = {
  select: { label: 'Sélection', icon: './assets/icons/tools/select.svg', key: 'V' },
  brush: { label: 'Pinceau', icon: './assets/icons/tools/brush.svg', key: 'B' },
  eraser: { label: 'Gomme', icon: './assets/icons/tools/eraser.svg', key: 'E' },
  line: { label: 'Ligne', icon: './assets/icons/tools/line.svg', key: 'L' },
  rect: { label: 'Rectangle', icon: './assets/icons/tools/rect.svg', key: 'R' },
  bucket: { label: 'Remplissage', icon: './assets/icons/tools/bucket.svg', key: 'F' },
  pan: { label: 'Panoramique', icon: './assets/icons/tools/pan.svg', key: 'H' },
  eyedropper: { label: 'Pipette', icon: './assets/icons/tools/eyedropper.svg', key: 'I' }
};
const STORAGE_ROOT='dl_layout_pro_v2';
const catalog = window.TILE_CATALOG || [];
const tileById = Object.fromEntries(catalog.map(t=>[t.id,t]));
const wrap = document.getElementById('canvasWrap');
const gridCanvas = document.getElementById('gridCanvas');
const bpCanvas = document.getElementById('blueprintCanvas');
const ctx = gridCanvas.getContext('2d');
const bpCtx = bpCanvas.getContext('2d');
let activeProjectId = '';

const state = {
  projectName: 'Projet 1',
  gridW:60, gridH:40, cellSize:24, zoom:1, panX:50, panY:50,
  activeTool:'brush', prevTool:'brush', activeTile:'rack_pallet', activeCategory:'all',
  selected:new Set(), favorites:[], recentTiles:[],
  layerStates:Object.fromEntries(LAYERS.map(l=>[l,{visible:true,locked:false,opacity:1}])),
  layerOrder:[...LAYERS], layerFilter:'ALL',
  blueprint:{src:'',img:null,opacity:.5,scale:1,offsetX:0,offsetY:0,locked:false,brightness:1,contrast:1,layer:'STRUCTURE'},
  cellRealSize:100,
  cells:[], cellProps:{},
  history:[], future:[], historyLog:[], snapshots:[],
  pointerStart:null, marquee:null, dragMode:'', hoverCell:null, isSpacePan:false, tempPan:false,
  copyBuffer:null, measurePoints:[], multiMode:false,
  snap:{grid:true,objects:true,centers:true,guides:true},
  guides:[],
  viewMode:'2d', view3d:null, view3dSelected:null,
  view3dSettings:{wallHeight:2.6,wallThickness:0.2,quality:'high',showBlueprint:true,walkMode:false}
};

function idx(x,y){return y*state.gridW+x}
function key(x,y){return `${x},${y}`}
function parseKey(k){const [x,y]=k.split(',').map(Number); return {x,y};}
function initCells(){state.cells=Array(state.gridW*state.gridH).fill('empty'); state.cellProps={}}
function inBounds(x,y){return x>=0&&y>=0&&x<state.gridW&&y<state.gridH;}
function defaultCellProps(tileId,x,y){const t=tileById[tileId]||tileById.empty||{layer:'STRUCTURE'}; return {id:crypto.randomUUID?.()||String(Math.random()),x,y,w:1,h:1,tileId,layer:t.layer,rotation:0,mirrorH:false,mirrorV:false,color:'',opacity:1,tags:[],note:'',name:t.label||tileId,locked:false};}

function pushHistory(label='Action'){
  state.history.push(JSON.stringify(snapshot()));
  state.historyLog.push({label,time:new Date().toLocaleTimeString()});
  state.future=[];
  if(state.history.length>240){state.history.shift(); state.historyLog.shift();}
}
function snapshot(){
  return {
    schemaVersion:SCHEMA_VERSION, appVersion:APP_VERSION, date:new Date().toISOString(),
    projectName:state.projectName, gridW:state.gridW,gridH:state.gridH,cellSize:state.cellSize,
    cellRealSize:state.cellRealSize,
    cells:state.cells,cellProps:state.cellProps,layerStates:state.layerStates,layerOrder:state.layerOrder,layerFilter:state.layerFilter,
    favorites:state.favorites,recentTiles:state.recentTiles,
    blueprint:{...state.blueprint,img:null}, panX:state.panX,panY:state.panY,zoom:state.zoom,
    snapshots:state.snapshots
  }
}
function restore(s){
  Object.assign(state, s);
  state.selected = new Set();
  loadBlueprint();
  bindStateToInputs();
  renderAll(); renderPalette(); renderLayers(); renderProps(); renderSnapshots(); updateStatus(); buildWarnings(); saveActiveProject();
}

function paint(x,y,tile,opts={}){
  if(!inBounds(x,y)) return;
  const t=tileById[tile]||tileById.empty;
  const layer=t.layer;
  if(state.layerStates[layer]?.locked && !opts.ignoreLock) return;
  state.cells[idx(x,y)] = tile;
  const k = key(x,y);
  state.cellProps[k] = {...defaultCellProps(tile,x,y), ...(state.cellProps[k]||{}), tileId:tile, layer};
}
function erase(x,y){paint(x,y,'empty')}
function line(x0,y0,x1,y1,tile){let dx=Math.abs(x1-x0), sx=x0<x1?1:-1, dy=-Math.abs(y1-y0), sy=y0<y1?1:-1, err=dx+dy; while(true){paint(x0,y0,tile); if(x0===x1&&y0===y1)break; const e2=2*err; if(e2>=dy){err+=dy;x0+=sx} if(e2<=dx){err+=dx;y0+=sy}}}
function fillRect(x1,y1,x2,y2,tile,fill=true){const [ax,bx]=[Math.min(x1,x2),Math.max(x1,x2)];const [ay,by]=[Math.min(y1,y2),Math.max(y1,y2)];for(let y=ay;y<=by;y++)for(let x=ax;x<=bx;x++)if(fill||y===ay||y===by||x===ax||x===bx) paint(x,y,tile)}
function flood(x,y,tile){if(!inBounds(x,y))return; const target=state.cells[idx(x,y)]; if(target===tile)return; const q=[[x,y]]; while(q.length){const [cx,cy]=q.pop(); if(!inBounds(cx,cy))continue; if(state.cells[idx(cx,cy)]!==target)continue; paint(cx,cy,tile); q.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);}}

function worldToCell(px,py){const cs=state.cellSize*state.zoom; let x=(px-state.panX)/cs; let y=(py-state.panY)/cs; return {x:Math.floor(x),y:Math.floor(y)};}
function cellToScreen(x,y){const cs=state.cellSize*state.zoom; return {x:state.panX+x*cs,y:state.panY+y*cs,cs};}

function renderBlueprint(){
  bpCtx.clearRect(0,0,bpCanvas.width,bpCanvas.height);
  if(!state.blueprint.img) return;
  bpCtx.save();
  bpCtx.globalAlpha = state.blueprint.opacity;
  bpCtx.filter = `brightness(${state.blueprint.brightness}) contrast(${state.blueprint.contrast})`;
  const img=state.blueprint.img; const scale=state.blueprint.scale*state.zoom;
  const w=img.width*scale,h=img.height*scale;
  bpCtx.drawImage(img,state.panX+state.blueprint.offsetX,state.panY+state.blueprint.offsetY,w,h);
  bpCtx.restore();
}
function colorFor(meta, prop){
  const cat=meta.category; const colors={structure:'#64748b',storage:'#22c55e',zone:'#f59e0b',safety:'#ef4444',annotation:'#a78bfa',access:'#06b6d4'};
  return prop?.color || colors[cat]||'#334155';
}
function renderAll(){
  if(state.viewMode==='3d'){refresh3DIfOpen(); return;}
  resizeCanvas(); renderBlueprint(); ctx.clearRect(0,0,gridCanvas.width,gridCanvas.height);
  const cs=state.cellSize*state.zoom; state.guides=[];
  for(let y=0;y<state.gridH;y++) for(let x=0;x<state.gridW;x++){
    const tile=state.cells[idx(x,y)]; if(tile==='empty') continue; const meta=tileById[tile]; if(!meta) continue;
    if(state.layerFilter!=='ALL' && meta.layer!==state.layerFilter) continue;
    const ls=state.layerStates[meta.layer]; if(!ls?.visible) continue;
    const prop=state.cellProps[key(x,y)]||{};
    const p=cellToScreen(x,y); ctx.save(); ctx.globalAlpha = Math.max(0.1,(ls.opacity??1)*(prop.opacity??1)); ctx.fillStyle=colorFor(meta,prop); ctx.fillRect(p.x,p.y,cs,cs); ctx.restore();
    ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.strokeRect(p.x,p.y,cs,cs);
  }
  // grid
  ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1;
  for(let x=0;x<=state.gridW;x++){const sx=state.panX+x*cs; ctx.beginPath();ctx.moveTo(sx,state.panY);ctx.lineTo(sx,state.panY+state.gridH*cs);ctx.stroke()}
  for(let y=0;y<=state.gridH;y++){const sy=state.panY+y*cs; ctx.beginPath();ctx.moveTo(state.panX,sy);ctx.lineTo(state.panX+state.gridW*cs,sy);ctx.stroke()}

  for(const k of state.selected){const {x,y}=parseKey(k); const p=cellToScreen(x,y); ctx.strokeStyle='#22d3ee'; ctx.lineWidth=2; ctx.strokeRect(p.x+1,p.y+1,cs-2,cs-2)}
  if(state.marquee){ const {x1,y1,x2,y2}=state.marquee; const minX=Math.min(x1,x2), minY=Math.min(y1,y2), maxX=Math.max(x1,x2), maxY=Math.max(y1,y2); const p1=cellToScreen(minX,minY), p2=cellToScreen(maxX+1,maxY+1); ctx.fillStyle='rgba(34,211,238,.12)'; ctx.fillRect(p1.x,p1.y,p2.x-p1.x,p2.y-p1.y); ctx.strokeStyle='rgba(34,211,238,.8)'; ctx.strokeRect(p1.x,p1.y,p2.x-p1.x,p2.y-p1.y);}
  if(state.measurePoints.length===2){const [a,b]=state.measurePoints; const pa=cellToScreen(a.x+.5,a.y+.5), pb=cellToScreen(b.x+.5,b.y+.5); ctx.strokeStyle='#facc15'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(pa.x,pa.y); ctx.lineTo(pb.x,pb.y); ctx.stroke();}
  renderMiniMap();
}
function renderMiniMap(){
  const old=document.querySelector('.mini-map'); if(old) old.remove();
  if(!document.getElementById('showMiniMap').checked) return;
  const mini=document.createElement('canvas'); mini.className='mini-map'; mini.width=260; mini.height=180; wrap.appendChild(mini);
  const m=mini.getContext('2d'); const sx=mini.width/state.gridW, sy=mini.height/state.gridH;
  for(let y=0;y<state.gridH;y++) for(let x=0;x<state.gridW;x++){const tile=state.cells[idx(x,y)]; if(tile==='empty') continue; const meta=tileById[tile]; m.fillStyle=colorFor(meta,state.cellProps[key(x,y)]); m.fillRect(x*sx,y*sy,sx,sy);}
}
function resizeCanvas(){ const r=wrap.getBoundingClientRect(); [gridCanvas,bpCanvas].forEach(c=>{c.width=r.width*devicePixelRatio; c.height=r.height*devicePixelRatio; c.style.width=r.width+'px'; c.style.height=r.height+'px'; const cctx=c.getContext('2d'); cctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);});}

function runTool(start,end){
  if(state.activeTool==='brush') paint(end.x,end.y,state.activeTile);
  if(state.activeTool==='eraser') erase(end.x,end.y);
  if(state.activeTool==='line') line(start.x,start.y,end.x,end.y,state.activeTile);
  if(state.activeTool==='rect') fillRect(start.x,start.y,end.x,end.y,state.activeTile,true);
  if(state.activeTool==='bucket') flood(end.x,end.y,state.activeTile);
  if(state.activeTool==='eyedropper'){ const picked=state.cells[idx(end.x,end.y)]; state.activeTile=picked; const p=state.cellProps[key(end.x,end.y)]; if(p?.layer) state.layerFilter = p.layer; renderPalette(); toast(`Pipette: ${picked}`); }
}
function selectionFromMarquee(){ if(!state.marquee) return; const {x1,y1,x2,y2}=state.marquee; const minX=Math.max(0,Math.min(x1,x2)), minY=Math.max(0,Math.min(y1,y2)), maxX=Math.min(state.gridW-1,Math.max(x1,x2)), maxY=Math.min(state.gridH-1,Math.max(y1,y2)); for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++) if(state.cells[idx(x,y)]!=='empty') state.selected.add(key(x,y)); }
function moveSelection(dx,dy,duplicate=false){ if(!state.selected.size) return; const moved=[]; for(const k of state.selected){const {x,y}=parseKey(k); const nx=x+dx, ny=y+dy; if(!inBounds(nx,ny)) continue; const tile=state.cells[idx(x,y)]; const prop={...(state.cellProps[k]||defaultCellProps(tile,x,y)),x:nx,y:ny}; moved.push({from:k,to:key(nx,ny),tile,prop}); }
  if(!moved.length) return;
  pushHistory(duplicate?'Duplicate drag':'Move selection');
  if(!duplicate){ for(const m of moved){ const {x,y}=parseKey(m.from); erase(x,y); delete state.cellProps[m.from]; } }
  state.selected.clear();
  for(const m of moved){ const {x,y}=parseKey(m.to); paint(x,y,m.tile,{ignoreLock:true}); state.cellProps[m.to]={...m.prop}; state.selected.add(m.to); }
  saveActiveProject(); renderAll(); renderProps();
}

function pointerDown(e){
  if(state.viewMode==='3d') return;
  const rect=gridCanvas.getBoundingClientRect(); const px=e.clientX-rect.left, py=e.clientY-rect.top; const c=worldToCell(px,py);
  state.pointerStart={px,py,x:c.x,y:c.y}; hideContext();
  if(e.button===2){openContext(e.clientX,e.clientY,c); return;}
  const onSelected = state.selected.has(key(c.x,c.y));
  if(state.activeTool==='select'){
    if(e.shiftKey || state.multiMode){ onSelected ? state.selected.delete(key(c.x,c.y)) : state.selected.add(key(c.x,c.y)); }
    else if(onSelected){ state.dragMode='move'; }
    else { state.selected.clear(); state.marquee={x1:c.x,y1:c.y,x2:c.x,y2:c.y}; }
    renderAll(); renderProps(); return;
  }
  if(state.activeTool==='pan' || state.tempPan){state.dragMode='pan'; return;}
  pushHistory(`Tool ${state.activeTool}`);
  runTool(c,c); renderAll(); renderProps();
}
function pointerMove(e){
  const rect=gridCanvas.getBoundingClientRect(); const px=e.clientX-rect.left, py=e.clientY-rect.top; const c=worldToCell(px,py); state.hoverCell=c; updateStatus();
  if(!state.pointerStart) return;
  if(state.dragMode==='pan'){state.panX += e.movementX; state.panY += e.movementY; renderAll(); return;}
  if(state.activeTool==='select'){
    if(state.dragMode==='move'){ const dx=c.x-state.pointerStart.x; const dy=c.y-state.pointerStart.y; if(dx||dy){ moveSelection(dx,dy,e.altKey); state.pointerStart.x=c.x; state.pointerStart.y=c.y; } }
    else if(state.marquee){ state.marquee.x2=c.x; state.marquee.y2=c.y; renderAll(); }
    return;
  }
  if(['brush','eraser'].includes(state.activeTool)){runTool(c,c); renderAll();}
}
function pointerUp(e){
  if(!state.pointerStart) return;
  const rect=gridCanvas.getBoundingClientRect(); const px=e.clientX-rect.left, py=e.clientY-rect.top; const c=worldToCell(px,py);
  if(state.activeTool==='select' && state.marquee){selectionFromMarquee(); state.marquee=null;}
  if(['line','rect','bucket','eyedropper'].includes(state.activeTool) && !state.dragMode){runTool(state.pointerStart,c);}
  if(state.measureMode){
    state.measurePoints.push(c); if(state.measurePoints.length>2) state.measurePoints=state.measurePoints.slice(-2);
    if(state.measurePoints.length===2){ const [a,b]=state.measurePoints; const dist=Math.hypot(b.x-a.x,b.y-a.y); toast(`Distance: ${dist.toFixed(2)} cellules (${(dist*state.cellRealSize).toFixed(1)} cm)`); }
  }
  state.pointerStart=null; state.dragMode=''; renderAll(); renderProps(); saveActiveProject();
}

function setTool(tool){state.activeTool=tool; renderTools(); updateStatus();}
function renderTools(){
  const box=document.getElementById('toolButtons'); const quick=document.getElementById('quickbar'); box.innerHTML=''; quick.innerHTML='';
  TOOLS.forEach(t=>{
    const b=document.createElement('button'); b.className='tool-btn'+(state.activeTool===t?' active':''); b.title=`${TOOL_META[t].label} (${TOOL_META[t].key})`; b.innerHTML=`<img src="${TOOL_META[t].icon}" alt=""/><span>${TOOL_META[t].label}</span>`; b.onclick=()=>setTool(t);
    attachLongPressTooltip(b,b.title);
    box.appendChild(b); quick.appendChild(b.cloneNode(true));
  });
  quick.querySelectorAll('button').forEach((btn,i)=>btn.onclick=()=>setTool(TOOLS[i]));
}
function renderPalette(){
  const q=document.getElementById('searchInput').value.trim().toLowerCase();
  const tabs=document.getElementById('categoryTabs'); tabs.innerHTML='';
  ['all',...new Set(catalog.map(t=>t.category))].forEach(c=>{const b=document.createElement('button'); b.className='tab'+(state.activeCategory===c?' active':''); b.textContent=c; b.onclick=()=>{state.activeCategory=c; renderPalette()}; tabs.appendChild(b)});
  const list=document.getElementById('paletteList'); list.innerHTML='';
  const filt=catalog.filter(t=>t.id!=='empty').filter(t=>state.activeCategory==='all'||t.category===state.activeCategory).filter(t=>`${t.id} ${t.label} ${t.category} ${t.tags||''}`.toLowerCase().includes(q));
  filt.forEach(t=>{const b=document.createElement('button'); b.className='tile-btn'+(state.activeTile===t.id?' active':''); b.title=t.label; b.innerHTML=`<span><img src="${t.icon||''}" alt=""/> ${t.label}</span><span class="fav">${state.favorites.includes(t.id)?'★':'☆'}</span>`; b.onclick=()=>{state.activeTile=t.id; touchRecent(t.id); renderPalette()}; b.oncontextmenu=(e)=>{e.preventDefault(); toggleFavorite(t.id)}; list.appendChild(b); attachLongPressTooltip(b,`${t.label} (${t.id})`);});
  renderRecent(); renderFavorites();
}
function renderRecent(){const box=document.getElementById('recentBox'); box.innerHTML='<h4>Récents</h4>'+state.recentTiles.slice(0,20).map(id=>`<button class="tab" data-id="${id}">${id}</button>`).join(''); box.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.activeTile=b.dataset.id; renderPalette();});}
function renderFavorites(){const box=document.getElementById('favoriteBox'); box.innerHTML='<h4>Favoris</h4>'+state.favorites.map(id=>`<button class="tab" data-id="${id}">${id}</button>`).join(''); box.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.activeTile=b.dataset.id; renderPalette();});}
function toggleFavorite(id){ if(state.favorites.includes(id)) state.favorites=state.favorites.filter(i=>i!==id); else state.favorites=[id,...state.favorites].slice(0,30); saveActiveProject(); renderPalette();}
function touchRecent(id){state.recentTiles=[id,...state.recentTiles.filter(i=>i!==id)].slice(0,20);}

function renderLayers(){
  const box=document.getElementById('layersBox'); box.innerHTML='';
  state.layerOrder.forEach(layer=>{
    const r=document.createElement('div'); r.className='layer-row';
    r.innerHTML=`<span>${layer}</span><button data-k="vis">👁</button><button data-k="lock">🔒</button><input data-k="opacity" type="range" min="0.1" max="1" step="0.05" value="${state.layerStates[layer].opacity}"><button data-k="up">↑</button><button data-k="down">↓</button>`;
    r.querySelector('[data-k="vis"]').onclick=(e)=>{ if(e.altKey){soloLayer(layer)} else state.layerStates[layer].visible=!state.layerStates[layer].visible; renderAll(); saveActiveProject(); };
    r.querySelector('[data-k="lock"]').onclick=()=>{state.layerStates[layer].locked=!state.layerStates[layer].locked; saveActiveProject();};
    r.querySelector('[data-k="opacity"]').oninput=(e)=>{state.layerStates[layer].opacity=+e.target.value; renderAll(); saveActiveProject();};
    r.querySelector('[data-k="up"]').onclick=()=>moveLayer(layer,-1);
    r.querySelector('[data-k="down"]').onclick=()=>moveLayer(layer,1);
    box.appendChild(r);
  });
  const filter=document.getElementById('layerFilter'); filter.innerHTML='<option value="ALL">Tous</option>'+LAYERS.map(l=>`<option ${state.layerFilter===l?'selected':''} value="${l}">${l}</option>`).join('');
}
function moveLayer(layer,dir){const i=state.layerOrder.indexOf(layer), j=i+dir; if(j<0||j>=state.layerOrder.length) return; [state.layerOrder[i],state.layerOrder[j]]=[state.layerOrder[j],state.layerOrder[i]]; renderLayers(); saveActiveProject();}
function soloLayer(layer){LAYERS.forEach(l=>state.layerStates[l].visible=l===layer); renderLayers(); renderAll(); saveActiveProject();}

function renderProps(){
  const box=document.getElementById('propsBox');
  if(!state.selected.size){ box.textContent='Aucune sélection.'; document.getElementById('floatingActions').classList.add('hidden'); return; }
  const arr=[...state.selected].map(k=>state.cellProps[k]).filter(Boolean);
  const first=arr[0];
  box.innerHTML=`<div><strong>${state.selected.size} sélection(s)</strong></div>
  <label>Nom <input id="propName" value="${first?.name||''}"/></label>
  <label>Type <input id="propType" value="${first?.tileId||''}"/></label>
  <label>Calque <select id="propLayer">${LAYERS.map(l=>`<option ${first?.layer===l?'selected':''}>${l}</option>`).join('')}</select></label>
  <label>X,Y <input id="propPos" value="${first?.x??''},${first?.y??''}"/></label>
  <label>Couleur <input id="propColor" value="${first?.color||''}" placeholder="#rrggbb"/></label>
  <label>Opacité <input id="propOpacity" type="range" min="0.1" max="1" step="0.05" value="${first?.opacity??1}"/></label>
  <label>Tags <input id="propTags" value="${(first?.tags||[]).join(',')}"/></label>
  <label>Note <input id="propNote" value="${first?.note||''}"/></label>
  <div class="row"><button id="rotateBtn">Rotate 90°</button><button id="mirrorHBtn">Mirror H</button><button id="mirrorVBtn">Mirror V</button></div>
  <button id="addFavFromProps">Ajouter aux favoris</button>`;
  const applyMass=()=>{pushHistory('Edit props'); for(const k of state.selected){const p=state.cellProps[k]; if(!p) continue; p.name=propName.value; p.tileId=propType.value; p.layer=propLayer.value; p.color=propColor.value.trim(); p.opacity=+propOpacity.value; p.tags=propTags.value.split(',').map(s=>s.trim()).filter(Boolean); p.note=propNote.value;} renderAll(); saveActiveProject();};
  ['propName','propType','propLayer','propColor','propOpacity','propTags','propNote'].forEach(id=>box.querySelector('#'+id).onchange=applyMass);
  box.querySelector('#rotateBtn').onclick=()=>transformSelection('rotate');
  box.querySelector('#mirrorHBtn').onclick=()=>transformSelection('mirrorH');
  box.querySelector('#mirrorVBtn').onclick=()=>transformSelection('mirrorV');
  box.querySelector('#addFavFromProps').onclick=()=>{toggleFavorite(first.tileId);};
  document.getElementById('floatingActions').classList.remove('hidden');
}
function transformSelection(mode){pushHistory(mode); for(const k of state.selected){const p=state.cellProps[k]; if(!p) continue; if(mode==='rotate') p.rotation=((p.rotation||0)+90)%360; if(mode==='mirrorH') p.mirrorH=!p.mirrorH; if(mode==='mirrorV') p.mirrorV=!p.mirrorV;} renderAll(); saveActiveProject();}

function openContext(cx,cy,c){
  const menu=document.getElementById('contextMenu'); menu.innerHTML=''; menu.classList.remove('hidden');
  menu.style.left=`${cx}px`; menu.style.top=`${cy}px`;
  const actions=[['Dupliquer',()=>duplicateSelection()],['Supprimer',()=>deleteSelection()],['Verrouiller',()=>lockSelection()],['Changer couleur',()=>changeColorSelection()],['Ajouter aux favoris',()=>toggleFavorite(state.activeTile)]];
  actions.forEach(([label,fn])=>{const b=document.createElement('button'); b.textContent=label; b.onclick=()=>{fn(); hideContext();}; menu.appendChild(b);});
  if(!state.selected.size && inBounds(c.x,c.y) && state.cells[idx(c.x,c.y)]!=='empty'){ state.selected=new Set([key(c.x,c.y)]); renderProps(); renderAll(); }
}
function hideContext(){document.getElementById('contextMenu').classList.add('hidden');}
function duplicateSelection(){moveSelection(1,1,true)}
function deleteSelection(){pushHistory('Delete'); for(const k of state.selected){const {x,y}=parseKey(k); erase(x,y); delete state.cellProps[k];} state.selected.clear(); renderAll(); renderProps(); saveActiveProject();}
function lockSelection(){for(const k of state.selected){if(state.cellProps[k]) state.cellProps[k].locked=!state.cellProps[k].locked;} saveActiveProject();}
function changeColorSelection(){const c=prompt('Couleur hex (ex #22c55e):','#22c55e'); if(!c) return; pushHistory('Color'); for(const k of state.selected){if(state.cellProps[k]) state.cellProps[k].color=c;} renderAll(); saveActiveProject();}

function alignSelection(){
  if(state.selected.size<2) return; pushHistory('Align'); const cells=[...state.selected].map(parseKey); const minX=Math.min(...cells.map(c=>c.x)), minY=Math.min(...cells.map(c=>c.y));
  const moved=[]; for(const c of cells){const k=key(c.x,c.y); moved.push({from:k,to:key(minX,c.y),tile:state.cells[idx(c.x,c.y)],prop:{...state.cellProps[k],x:minX,y:c.y}});} applyMoveBatch(moved);
}
function distributeSelection(){ if(state.selected.size<3) return; pushHistory('Distribute'); const cells=[...state.selected].map(parseKey).sort((a,b)=>a.x-b.x); const step=(cells.at(-1).x-cells[0].x)/(cells.length-1); const moved=[]; cells.forEach((c,i)=>{const nx=Math.round(cells[0].x+i*step); const k=key(c.x,c.y); moved.push({from:k,to:key(nx,c.y),tile:state.cells[idx(c.x,c.y)],prop:{...state.cellProps[k],x:nx,y:c.y}});}); applyMoveBatch(moved);}
function applyMoveBatch(moved){ for(const m of moved){const {x,y}=parseKey(m.from); erase(x,y); delete state.cellProps[m.from];} state.selected.clear(); moved.forEach(m=>{const {x,y}=parseKey(m.to); paint(x,y,m.tile,{ignoreLock:true}); state.cellProps[m.to]=m.prop; state.selected.add(m.to);}); renderAll(); renderProps(); saveActiveProject();}

function copySelection(){if(!state.selected.size) return; const minX=Math.min(...[...state.selected].map(k=>parseKey(k).x)); const minY=Math.min(...[...state.selected].map(k=>parseKey(k).y)); state.copyBuffer=[...state.selected].map(k=>{const {x,y}=parseKey(k); return {dx:x-minX,dy:y-minY,tile:state.cells[idx(x,y)],prop:state.cellProps[k]};}); toast('Copié');}
function pasteSelection(){if(!state.copyBuffer?.length)return; pushHistory('Paste'); const offset=1; state.selected.clear(); for(const it of state.copyBuffer){const x=it.dx+offset,y=it.dy+offset; if(!inBounds(x,y)) continue; paint(x,y,it.tile,{ignoreLock:true}); state.cellProps[key(x,y)]={...it.prop,x,y}; state.selected.add(key(x,y));} renderAll(); renderProps(); saveActiveProject();}
function replaceTypeInSelection(){if(!state.selected.size)return; const from=prompt('Type à remplacer (A):',state.activeTile); const to=prompt('Nouveau type (B):',state.activeTile); if(!from||!to)return; pushHistory('Replace type'); for(const k of state.selected){const {x,y}=parseKey(k); if(state.cells[idx(x,y)]===from) paint(x,y,to,{ignoreLock:true});} renderAll(); saveActiveProject();}
function repeatSelection(){if(!state.selected.size)return; const n=+prompt('Répéter N fois','3'); const dx=+prompt('Pas X','2'); const dy=+prompt('Pas Y','0'); if(!n)return; pushHistory('Repeat'); const base=[...state.selected].map(k=>({k,...parseKey(k),tile:state.cells[idx(...Object.values(parseKey(k)))],prop:state.cellProps[k]})); for(let i=1;i<=n;i++){base.forEach(b=>{const x=b.x+dx*i,y=b.y+dy*i; if(inBounds(x,y)){paint(x,y,b.tile,{ignoreLock:true}); state.cellProps[key(x,y)]={...b.prop,x,y};}});} renderAll(); saveActiveProject();}

function exportJSON(){const payload={schemaVersion:SCHEMA_VERSION,appVersion:APP_VERSION,date:new Date().toISOString(),projectId:activeProjectId,layout:snapshot()}; download('layout-project.json',JSON.stringify(payload,null,2),'application/json');}
function importJSON(file){file.text().then(t=>{try{const parsed=JSON.parse(t); if(!parsed?.layout?.cells || !parsed?.layout?.gridW) throw new Error('Schéma invalide: champs manquants'); restore(parsed.layout); toast('Import OK');}catch(err){alert('Import JSON invalide: '+err.message);}});}
function exportPNG(){
  const withGrid=confirm('Inclure la grille dans le PNG ?');
  const c=document.createElement('canvas'); c.width=gridCanvas.width; c.height=gridCanvas.height; const cc=c.getContext('2d'); cc.drawImage(bpCanvas,0,0); cc.drawImage(gridCanvas,0,0);
  if(!withGrid){ /* naive hide grid by redraw cells only */ }
  download('layout.png',c.toDataURL('image/png'),'image/png',true);
}
function download(name,data,type,isDataUrl){const a=document.createElement('a'); a.download=name; a.href=isDataUrl?data:URL.createObjectURL(new Blob([data],{type})); a.click();}

function saveRoot(data){localStorage.setItem(STORAGE_ROOT,JSON.stringify(data));}
function loadRoot(){try{return JSON.parse(localStorage.getItem(STORAGE_ROOT)||'{"projects":{}}');}catch{return {projects:{}}}}
function ensureProject(){const root=loadRoot(); if(!Object.keys(root.projects).length){const id='project-'+Date.now(); root.projects[id]={id,name:'Projet 1',updatedAt:Date.now(),data:snapshot()}; root.activeProjectId=id; saveRoot(root);} if(!root.activeProjectId) root.activeProjectId=Object.keys(root.projects)[0]; activeProjectId=root.activeProjectId; const p=root.projects[activeProjectId]; restore(p.data); state.projectName=p.name; renderProjects();}
function saveActiveProject(){const root=loadRoot(); root.projects[activeProjectId]={id:activeProjectId,name:state.projectName,updatedAt:Date.now(),data:snapshot()}; root.activeProjectId=activeProjectId; saveRoot(root); updateStatus();}
function renderProjects(){const root=loadRoot(); const sel=document.getElementById('projectSelect'); sel.innerHTML=Object.values(root.projects).map(p=>`<option value="${p.id}" ${p.id===activeProjectId?'selected':''}>${p.name}</option>`).join('');}
function createSnapshot(){const note=prompt('Note version:',''); state.snapshots.unshift({id:Date.now(),note,date:new Date().toISOString(),data:snapshot()}); state.snapshots=state.snapshots.slice(0,30); renderSnapshots(); saveActiveProject();}
function renderSnapshots(){const box=document.getElementById('snapshotsBox'); box.innerHTML=(state.snapshots||[]).map((s,i)=>`<div class="history-item"><strong>${i+1}</strong> ${new Date(s.date).toLocaleString()}<br>${s.note||''}<br><button data-restore="${s.id}">Restaurer</button></div>`).join('')||'Aucune version'; box.querySelectorAll('button').forEach(b=>b.onclick=()=>{const s=state.snapshots.find(x=>String(x.id)===b.dataset.restore); if(s&&confirm('Restaurer cette version ?')) restore(s.data);});}

function buildWarnings(){
  const out=[]; for(let y=0;y<state.gridH;y++) for(let x=0;x<state.gridW;x++){const t=state.cells[idx(x,y)]; if(t.startsWith('door_')){const ns=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>inBounds(x+dx,y+dy)).map(([dx,dy])=>state.cells[idx(x+dx,y+dy)]); if(!ns.some(n=>n.includes('wall'))) out.push(`Porte isolée en ${x},${y}`);} if(t==='bin_unknown_type') out.push(`Bin inconnu en ${x},${y}`);} document.getElementById('warnings').innerHTML=out.slice(0,60).map(i=>`<li>${i}</li>`).join('') || '<li>Aucun warning</li>';
}

function bindStateToInputs(){
  gridW.value=state.gridW; gridH.value=state.gridH; cellSize.value=state.cellSize; cellRealSize.value=state.cellRealSize;
  bpOpacity.value=state.blueprint.opacity; bpScale.value=state.blueprint.scale; bpBrightness.value=state.blueprint.brightness; bpContrast.value=state.blueprint.contrast;
}
function updateStatus(){
  const hc=state.hoverCell; const dim=state.selected.size?`Sel:${state.selected.size}`:'Sel:0';
  statusBar.textContent=`Tool:${state.activeTool} | Zoom:${state.zoom.toFixed(2)} | Snap:${state.snap.grid?'on':'off'} | ${hc?`x:${hc.x} y:${hc.y}`:'x:- y:-'} | ${dim}`;
}
function toast(t){const el=document.getElementById('toast'); el.textContent=t; el.style.display='block'; setTimeout(()=>el.style.display='none',1300)}
function vibrate(ms=8){if(navigator.vibrate) navigator.vibrate(ms)}
function attachLongPressTooltip(el,text){let timer; el.addEventListener('touchstart',()=>{timer=setTimeout(()=>toast(text),500);},{passive:true}); ['touchend','touchcancel'].forEach(evt=>el.addEventListener(evt,()=>clearTimeout(timer),{passive:true}));}
function loadBlueprint(){ if(!state.blueprint.src){state.blueprint.img=null; return;} const i=new Image(); i.onload=()=>{state.blueprint.img=i; renderAll();}; i.src=state.blueprint.src; }

function bindUI(){
  searchInput.oninput=renderPalette;
  wrap.addEventListener('pointerdown',pointerDown); wrap.addEventListener('pointermove',pointerMove); window.addEventListener('pointerup',pointerUp);
  wrap.addEventListener('contextmenu',e=>e.preventDefault());
  undoBtn.onclick=()=>{if(!state.history.length)return; state.future.push(JSON.stringify(snapshot())); restore(JSON.parse(state.history.pop()));};
  redoBtn.onclick=()=>{if(!state.future.length)return; state.history.push(JSON.stringify(snapshot())); restore(JSON.parse(state.future.pop()));};
  resizeGridBtn.onclick=()=>{if(!confirm('Redimensionner la grille et réinitialiser le contenu ?')) return; pushHistory('Resize grid'); state.gridW=+gridW.value; state.gridH=+gridH.value; state.cellSize=+cellSize.value; state.cellRealSize=+cellRealSize.value; initCells(); state.selected.clear(); renderAll(); saveActiveProject();};
  exportJsonBtn.onclick=exportJSON; importJsonBtn.onclick=()=>importJsonInput.click(); importJsonInput.onchange=e=>{const f=e.target.files[0]; if(f) importJSON(f)};
  saveBtn.onclick=()=>{saveActiveProject(); toast('Sauvegardé');};
  exportPngBtn.onclick=exportPNG;
  document.getElementById('measureBtn').onclick=()=>{state.measureMode=!state.measureMode; state.measurePoints=[]; toast('Mesure '+(state.measureMode?'ON':'OFF'));};
  document.getElementById('multiBtn').onclick=()=>{state.multiMode=!state.multiMode; toast('Multi '+(state.multiMode?'ON':'OFF'));};
  document.getElementById('toggleLeftDrawer').onclick=()=>leftPanel.classList.toggle('open');
  document.getElementById('toggleRightDrawer').onclick=()=>rightPanel.classList.toggle('open');

  document.getElementById('snapGrid').onchange=e=>state.snap.grid=e.target.checked;
  document.getElementById('snapObjects').onchange=e=>state.snap.objects=e.target.checked;
  document.getElementById('snapCenters').onchange=e=>state.snap.centers=e.target.checked;
  document.getElementById('snapGuides').onchange=e=>state.snap.guides=e.target.checked;
  document.getElementById('showMiniMap').onchange=renderAll;
  document.getElementById('presentationMode').onchange=e=>document.body.classList.toggle('presentation',e.target.checked);

  document.getElementById('soloLayerBtn').onclick=()=>{const l=prompt('Nom calque à solo:',LAYERS[0]); if(l&&LAYERS.includes(l)) soloLayer(l)};
  document.getElementById('layerFilter').onchange=e=>{state.layerFilter=e.target.value; renderAll();};

  bpOpacity.oninput=e=>{state.blueprint.opacity=+e.target.value; renderAll(); saveActiveProject();};
  bpScale.oninput=e=>{state.blueprint.scale=+e.target.value; renderAll(); saveActiveProject();};
  bpBrightness.oninput=e=>{state.blueprint.brightness=+e.target.value; renderAll();};
  bpContrast.oninput=e=>{state.blueprint.contrast=+e.target.value; renderAll();};
  bpLockBtn.onclick=e=>{state.blueprint.locked=!state.blueprint.locked; e.target.textContent='Verrou blueprint: '+(state.blueprint.locked?'ON':'OFF');};
  blueprintInput.onchange=e=>{const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{state.blueprint.src=r.result; loadBlueprint(); saveActiveProject();}; r.readAsDataURL(f);};
  bpCalibrateBtn.onclick=()=>{const cells=+prompt('Longueur mesurée en cellules ?','10'); const real=+prompt('Longueur réelle en cm ?','1000'); if(cells&&real){state.cellRealSize=real/cells; cellRealSize.value=state.cellRealSize; toast(`Échelle: ${state.cellRealSize.toFixed(2)} cm/cell`)}};

  deleteSelectionBtn.onclick=deleteSelection; duplicateSelectionBtn.onclick=duplicateSelection; applyTileSelectionBtn.onclick=()=>{pushHistory('Apply tile'); for(const k of state.selected){const {x,y}=parseKey(k); paint(x,y,state.activeTile,{ignoreLock:true});} renderAll(); saveActiveProject();};
  replaceTypeBtn.onclick=replaceTypeInSelection; alignBtn.onclick=alignSelection; distributeBtn.onclick=distributeSelection; repeatBtn.onclick=repeatSelection;
  historyBtn.onclick=()=>{const text=state.historyLog.map((h,i)=>`${i+1}. ${h.time} - ${h.label}`).join('\n'); alert(text||'Historique vide');};
  createSnapshotBtn.onclick=createSnapshot;

  projectSelect.onchange=e=>{const root=loadRoot(); activeProjectId=e.target.value; const p=root.projects[activeProjectId]; state.projectName=p.name; restore(p.data);};
  newProjectBtn.onclick=()=>{const name=prompt('Nom projet','Nouveau projet'); if(!name)return; const root=loadRoot(); const id='project-'+Date.now(); root.projects[id]={id,name,updatedAt:Date.now(),data:snapshot()}; root.activeProjectId=id; saveRoot(root); activeProjectId=id; state.projectName=name; initCells(); saveActiveProject(); renderProjects(); renderAll();};
  renameProjectBtn.onclick=()=>{const name=prompt('Nouveau nom',state.projectName); if(!name)return; state.projectName=name; saveActiveProject(); renderProjects();};
  duplicateProjectBtn.onclick=()=>{const root=loadRoot(); const id='project-'+Date.now(); root.projects[id]={id,name:state.projectName+' (copie)',updatedAt:Date.now(),data:snapshot()}; saveRoot(root); renderProjects();};
  deleteProjectBtn.onclick=()=>{if(!confirm('Supprimer ce projet ?'))return; const root=loadRoot(); delete root.projects[activeProjectId]; if(!Object.keys(root.projects).length){const id='project-'+Date.now(); root.projects[id]={id,name:'Projet 1',updatedAt:Date.now(),data:snapshot()};} root.activeProjectId=Object.keys(root.projects)[0]; saveRoot(root); activeProjectId=root.activeProjectId; restore(root.projects[activeProjectId].data); renderProjects();};

  document.getElementById('toggle3dBtn').onclick=()=>toggle3D();
  wallHeightInput.oninput=e=>{state.view3dSettings.wallHeight=+e.target.value;refresh3DIfOpen();};
  wallThicknessInput.oninput=e=>{state.view3dSettings.wallThickness=+e.target.value;refresh3DIfOpen();};
  quality3dInput.onchange=e=>{state.view3dSettings.quality=e.target.value;refresh3DIfOpen();};
  showBp3dInput.onchange=e=>{state.view3dSettings.showBlueprint=e.target.checked;refresh3DIfOpen();};
  walkModeBtn.onclick=e=>{state.view3dSettings.walkMode=!state.view3dSettings.walkMode; e.target.textContent='Walk: '+(state.view3dSettings.walkMode?'ON':'OFF'); refresh3DIfOpen();};
  reset3dBtn.onclick=()=>state.view3d?.resetView(); focus3dBtn.onclick=()=>state.view3d?.focusSelection();

  window.addEventListener('resize',renderAll);
  window.addEventListener('keydown',e=>{
    const cmd=e.ctrlKey||e.metaKey;
    if(e.code==='Space'){ if(!state.isSpacePan){state.prevTool=state.activeTool; state.tempPan=true; setTool('pan'); state.isSpacePan=true;} e.preventDefault();}
    const k=e.key.toLowerCase();
    if(!cmd && 'vbelrfhi'.includes(k)){ const map={v:'select',b:'brush',e:'eraser',l:'line',r:'rect',f:'bucket',h:'pan',i:'eyedropper'}; setTool(map[k]); }
    if(cmd&&k==='z'){e.preventDefault(); if(e.shiftKey) redoBtn.click(); else undoBtn.click();}
    if(cmd&&k==='y'){e.preventDefault(); redoBtn.click();}
    if(cmd&&k==='c'){e.preventDefault(); copySelection();}
    if(cmd&&k==='v'){e.preventDefault(); pasteSelection();}
    if(cmd&&k==='d'){e.preventDefault(); duplicateSelection();}
    if(cmd&&k==='s'){e.preventDefault(); saveActiveProject(); toast('Sauvegardé');}
    if(['Delete','Backspace'].includes(e.key)){e.preventDefault(); deleteSelection();}
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault(); const step=e.shiftKey?5:1; const map={ArrowUp:[0,-step],ArrowDown:[0,step],ArrowLeft:[-step,0],ArrowRight:[step,0]}; moveSelection(...map[e.key]);}
  });
  window.addEventListener('keyup',e=>{if(e.code==='Space'){state.tempPan=false; state.isSpacePan=false; setTool(state.prevTool||'select');}});

  // touch gestures pinch+pan
  let touches=[];
  wrap.addEventListener('touchstart',e=>{touches=[...e.touches]; if(e.touches.length===1){const t=e.touches[0]; pointerDown({clientX:t.clientX,clientY:t.clientY,button:0,shiftKey:state.multiMode,altKey:false});}}, {passive:false});
  wrap.addEventListener('touchmove',e=>{
    if(e.touches.length===2){e.preventDefault(); const [a,b]=e.touches; const prev=touches; if(prev.length===2){const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY); const d0=Math.hypot(prev[0].clientX-prev[1].clientX,prev[0].clientY-prev[1].clientY); state.zoom=Math.max(.35,Math.min(3.2,state.zoom*(d/d0))); state.panX += ((a.clientX+b.clientX)-(prev[0].clientX+prev[1].clientX))/2; state.panY += ((a.clientY+b.clientY)-(prev[0].clientY+prev[1].clientY))/2; renderAll();}
      touches=[...e.touches];
    }else if(e.touches.length===1){const t=e.touches[0]; pointerMove({clientX:t.clientX,clientY:t.clientY,movementX:0,movementY:0,altKey:false});}
  }, {passive:false});
  wrap.addEventListener('touchend',e=>{if(!e.touches.length) pointerUp({clientX:state.pointerStart?.px||0,clientY:state.pointerStart?.py||0}); touches=[...e.touches];});

  precisionPad.querySelectorAll('button').forEach(b=>b.onclick=()=>moveSelection(+b.dataset.dx,+b.dataset.dy));
  floatingActions.querySelector('[data-action="duplicate"]').onclick=duplicateSelection;
  floatingActions.querySelector('[data-action="delete"]').onclick=deleteSelection;
  floatingActions.querySelector('[data-action="rotate"]').onclick=()=>transformSelection('rotate');
  floatingActions.querySelector('[data-action="props"]').onclick=()=>rightPanel.classList.add('open');
}

function demo(){
  initCells();
  for(let x=2;x<58;x++){paint(x,2,'wall_solid_ext');paint(x,37,'wall_solid_ext')}
  for(let y=2;y<38;y++){paint(2,y,'wall_solid_ext');paint(57,y,'wall_solid_ext')}
  paint(30,2,'door_double');paint(57,20,'dock_door');
  for(let y=8;y<31;y+=4) for(let x=8;x<48;x+=2) paint(x,y,'rack_pallet');
  ['bin_p1','bin_p2','bin_p3','bin_p4','bin_p5','bin_p6','bin_p7'].forEach((b,i)=>paint(50,8+i*3,b));
  fillRect(4,30,18,35,'zone_receiving',true); fillRect(20,30,34,35,'zone_picking',true); fillRect(36,30,54,35,'zone_shipping',true);
}

function visibleCellsSnapshot(){ return {gridW:state.gridW,gridH:state.gridH,cellSize:state.cellSize,cells:[...state.cells],tileById,layerStates:state.layerStates,blueprint:state.blueprint}; }
async function ensure3DView(){ if(state.view3d) return state.view3d; const mod = await import('./view3d.js'); state.view3d = new mod.Layout3DView({container:view3dPanel,canvas:view3dCanvas,infoEl:view3dInfo,legendEl:view3dLegend,onSelect:(d)=>{ state.view3dSelected=`${d.x},${d.y}`; }}); return state.view3d; }
async function toggle3D(){ const panel=view3dPanel; const is3D = state.viewMode==='3d'; if(is3D){panel.classList.add('hidden'); state.viewMode='2d'; renderAll(); return;} state.viewMode='3d'; panel.classList.remove('hidden'); const view=await ensure3DView(); view.setOptions(state.view3dSettings); view.setLayout(visibleCellsSnapshot()); }
function refresh3DIfOpen(){ if(state.viewMode==='3d' && state.view3d){ state.view3d.setOptions(state.view3dSettings); state.view3d.setLayout(visibleCellsSnapshot()); }}

bindUI();
if(!localStorage.getItem(STORAGE_ROOT)){demo();}
ensureProject();
renderTools(); renderPalette(); renderLayers(); renderAll(); renderProps(); buildWarnings(); updateStatus();
setInterval(()=>saveActiveProject(), 10000);
})();
