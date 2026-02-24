// Build minimal local "Three-like" runtime for offline mode.
// This is intentionally tiny and only exposes primitives required by view3d.js.
export class Vector3 {
  constructor(x = 0, y = 0, z = 0){ this.x = x; this.y = y; this.z = z; }
  set(x, y, z){ this.x = x; this.y = y; this.z = z; return this; }
  clone(){ return new Vector3(this.x, this.y, this.z); }
}

export class PerspectiveCamera {
  constructor(){
    this.position = new Vector3(22, 16, 22);
    this.target = new Vector3(0, 0, 0);
    this.yaw = -0.75;
    this.pitch = -0.48;
    this.distance = 42;
  }
}

export class Scene {
  constructor(){ this.objects = []; }
  clear(){ this.objects.length = 0; }
  add(obj){ this.objects.push(obj); }
}

export class WebGLRenderer {
  constructor({ canvas }){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;
    this.pickBuffer = [];
  }
  setSize(w, h){ this.width = w; this.height = h; this.canvas.width = Math.floor(w * devicePixelRatio); this.canvas.height = Math.floor(h * devicePixelRatio); this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
  project(v, camera){
    const cx = Math.cos(camera.yaw), sx = Math.sin(camera.yaw), cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
    const dx = v.x - camera.target.x;
    const dy = v.y - camera.target.y;
    const dz = v.z - camera.target.z;
    const x1 = dx * cx - dz * sx;
    const z1 = dx * sx + dz * cx;
    const y2 = dy * cp - z1 * sp;
    const z2 = dy * sp + z1 * cp + camera.distance;
    const f = 650 / Math.max(8, z2);
    return { x: this.width * 0.5 + x1 * f, y: this.height * 0.5 - y2 * f, z: z2 };
  }
  render(scene, camera){
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, this.width, this.height);
    this.pickBuffer = [];
    const drawList = [];
    scene.objects.forEach((obj) => {
      const p = this.project(obj.pos, camera);
      drawList.push({ ...obj, p, depth: p.z });
    });
    drawList.sort((a, b) => b.depth - a.depth);
    for(const item of drawList){
      if(item.type === 'plane'){
        ctx.fillStyle = item.color;
        ctx.globalAlpha = item.opacity ?? 1;
        ctx.fillRect(item.screen.x, item.screen.y, item.screen.w, item.screen.h);
        ctx.globalAlpha = 1;
        continue;
      }
      const scale = 620 / Math.max(8, item.p.z);
      const w = item.size.x * scale;
      const h = item.size.y * scale;
      const x = item.p.x - w * 0.5;
      const y = item.p.y - h;
      ctx.fillStyle = item.color;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.strokeRect(x, y, w, h);
      if(item.selected){ ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2; ctx.strokeRect(x - 2, y - 2, w + 4, h + 4); ctx.lineWidth = 1; }
      this.pickBuffer.push({ x, y, w, h, data: item.data });
    }
  }
  pick(x, y){
    for(let i = this.pickBuffer.length - 1; i >= 0; i--){
      const p = this.pickBuffer[i];
      if(x >= p.x && y >= p.y && x <= p.x + p.w && y <= p.y + p.h) return p.data;
    }
    return null;
  }
}
