export class OrbitControls {
  constructor(camera, domElement){
    this.camera = camera;
    this.domElement = domElement;
    this.enabled = true;
    this.state = null;
    this.onChange = () => {};
    domElement.addEventListener('pointerdown', (e) => this.pointerDown(e));
    domElement.addEventListener('pointermove', (e) => this.pointerMove(e));
    window.addEventListener('pointerup', () => this.state = null);
    domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.distance = Math.max(12, Math.min(120, this.camera.distance * (e.deltaY < 0 ? 0.92 : 1.08)));
      this.onChange();
    }, { passive: false });
  }
  pointerDown(e){ if(!this.enabled) return; this.state = { x: e.clientX, y: e.clientY, yaw: this.camera.yaw, pitch: this.camera.pitch }; }
  pointerMove(e){
    if(!this.enabled || !this.state) return;
    const dx = (e.clientX - this.state.x) * 0.006;
    const dy = (e.clientY - this.state.y) * 0.006;
    this.camera.yaw = this.state.yaw + dx;
    this.camera.pitch = Math.max(-1.2, Math.min(-0.15, this.state.pitch + dy));
    this.onChange();
  }
}
