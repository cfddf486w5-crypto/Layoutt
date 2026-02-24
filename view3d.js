import { OrbitControls } from './vendor/OrbitControls.js';
import { Scene, PerspectiveCamera, WebGLRenderer } from './vendor/three.module.js';

const TYPE_COLOR = {
  wall: '#6b7280', door: '#f59e0b', rack: '#ea580c', bin: '#60a5fa', zone: '#2563eb', safety: '#dc2626', default: '#8b5cf6'
};
const BIN_COLORS = { bin_p1:'#1d4ed8', bin_p2:'#0284c7', bin_p3:'#0d9488', bin_p4:'#16a34a', bin_p5:'#ca8a04', bin_p6:'#dc2626', bin_p7:'#9333ea' };

function tileType(id){
  if(id.startsWith('wall_')) return 'wall';
  if(id.startsWith('door_') || id === 'dock_door') return 'door';
  if(id.startsWith('rack_')) return 'rack';
  if(id.startsWith('bin_')) return 'bin';
  if(id.startsWith('zone_')) return 'zone';
  if(id.includes('hazard') || id.includes('no_entry')) return 'safety';
  return 'default';
}

export class Layout3DView {
  constructor(opts){
    this.container = opts.container;
    this.canvas = opts.canvas;
    this.infoEl = opts.infoEl;
    this.legendEl = opts.legendEl;
    this.onSelect = opts.onSelect;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera();
    this.renderer = new WebGLRenderer({ canvas: this.canvas });
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.onChange = () => this.render();
    this.selection = null;
    this.layout = null;
    this.options = { wallHeight: 2.6, wallThickness: 0.2, quality: 'high', showBlueprint: true, walkMode: false };
    this.walkState = { vx: 0, vz: 0, keys: new Set() };
    this.canvas.addEventListener('click', (e) => this.pick(e));
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.handleWalkKey(e, true));
    window.addEventListener('keyup', (e) => this.handleWalkKey(e, false));
    this.resize();
    this.animate();
  }
  resize(){ this.renderer.setSize(this.container.clientWidth, this.container.clientHeight); this.render(); }
  setOptions(partial){ Object.assign(this.options, partial); this.buildScene(); }
  setLayout(data){ this.layout = data; this.buildScene(); }
  focusSelection(){
    if(!this.selection) return;
    this.camera.target.set(this.selection.worldX, this.selection.height * 0.5, this.selection.worldZ);
    this.render();
  }
  resetView(){ this.camera.yaw = -0.75; this.camera.pitch = -0.48; this.camera.distance = 42; this.camera.target.set(0,0,0); this.render(); }
  handleWalkKey(e, pressed){
    if(!this.options.walkMode) return;
    const key = e.key.toLowerCase();
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){
      if(pressed) this.walkState.keys.add(key); else this.walkState.keys.delete(key);
      e.preventDefault();
    }
  }
  animate(){
    if(this.options.walkMode){
      const speed = 0.18;
      const forward = (this.walkState.keys.has('w') || this.walkState.keys.has('arrowup')) ? 1 : (this.walkState.keys.has('s') || this.walkState.keys.has('arrowdown') ? -1 : 0);
      const strafe = (this.walkState.keys.has('d') || this.walkState.keys.has('arrowright')) ? 1 : (this.walkState.keys.has('a') || this.walkState.keys.has('arrowleft') ? -1 : 0);
      const c = Math.cos(this.camera.yaw), s = Math.sin(this.camera.yaw);
      this.camera.target.x += (forward * s + strafe * c) * speed;
      this.camera.target.z += (forward * c - strafe * s) * speed;
      this.render();
    }
    requestAnimationFrame(() => this.animate());
  }
  pick(event){
    const r = this.canvas.getBoundingClientRect();
    const data = this.renderer.pick(event.clientX - r.left, event.clientY - r.top);
    if(!data) return;
    this.selection = data;
    this.infoEl.innerHTML = `<strong>Infos</strong><div>tileId: ${data.tileId}</div><div>label: ${data.label}</div><div>coords: ${data.x},${data.y}</div>`;
    this.onSelect?.(data);
    this.render();
  }
  buildScene(){
    this.scene.clear();
    this.legendEl.innerHTML = ['wall','door','rack','bin','zone','safety'].map((k) => `<span><i style="background:${TYPE_COLOR[k]}"></i>${k}</span>`).join('');
    if(!this.layout){ this.render(); return; }
    const { gridW, gridH, cellSize, cells, tileById, layerStates, blueprint } = this.layout;
    const world = Math.max(gridW, gridH) * (cellSize / 100);
    this.scene.add({ type: 'plane', color: '#0f172a', opacity: 1, screen: { x: 0, y: this.renderer.height * 0.62, w: this.renderer.width, h: this.renderer.height * 0.38 }, pos: {x:0,y:0,z:0} });
    if(this.options.showBlueprint && blueprint?.src){ this.scene.add({ type:'plane', color:'rgba(59,130,246,.25)', opacity:0.5, screen:{x:12,y:12,w:160,h:44}, pos:{x:0,y:0,z:0} }); }
    const step = this.options.quality === 'low' ? 2 : 1;
    for(let y = 0; y < gridH; y += step){
      for(let x = 0; x < gridW; x += step){
        const tileId = cells[y * gridW + x];
        if(!tileId || tileId === 'empty') continue;
        const meta = tileById[tileId];
        if(!meta || !layerStates[meta.layer]?.visible) continue;
        const kind = tileType(tileId);
        const h = kind === 'wall' ? this.options.wallHeight : kind === 'rack' ? 2.2 : kind === 'bin' ? 0.6 : kind === 'door' ? 2.2 : kind === 'zone' ? 0.04 : 0.08;
        const baseSize = (cellSize / 100) * (kind === 'wall' ? (this.options.wallThickness + 0.8) : 0.85);
        this.scene.add({
          type:'box',
          pos: { x: (x - gridW * 0.5) * (cellSize / 100), y: h, z: (y - gridH * 0.5) * (cellSize / 100) },
          size: { x: baseSize, y: h * 1.2, z: baseSize },
          color: BIN_COLORS[tileId] || TYPE_COLOR[kind] || TYPE_COLOR.default,
          selected: this.selection?.x === x && this.selection?.y === y,
          data: { tileId, label: meta.label, x, y, worldX: (x - gridW * 0.5) * (cellSize / 100), worldZ: (y - gridH * 0.5) * (cellSize / 100), height: h }
        });
      }
    }
    this.camera.target.set(0, 0, 0);
    this.camera.distance = Math.max(26, world * 1.9);
    this.render();
  }
  render(){ this.renderer.render(this.scene, this.camera); }
}
