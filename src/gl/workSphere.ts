import * as THREE from "three";

// A sphere of the works: the background of the final black section.
// The tiles are flat planes tangent to the sphere, spread evenly over it; 23 different works,
// none repeated. Uses the same WebGLRenderer and the textures already loaded.

const vert = /* glsl */ `
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * normal);
    vFacing = dot(n, normalize(cameraPosition - wp.xyz));
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const frag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uFade;
  uniform float uFront;
  uniform float uBack;
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    // seen from inside (the far wall) the work isn't mirrored
    vec2 uv = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);
    vec3 c = texture2D(uMap, uv).rgb;
    // the facing tiles are brighter; toward the rim and on the far wall they fade to black
    float f = gl_FrontFacing ? mix(uBack, uFront, smoothstep(0.0, 0.85, vFacing)) : uBack * 0.8;
    gl_FragColor = vec4(c * f * uFade, 1.0);
    #include <colorspace_fragment>
  }
`;

export interface PointerN {
  x: number;
  y: number;
}

export class WorkSphere {
  readonly group = new THREE.Group();
  readonly inner = new THREE.Group();
  private readonly materials: THREE.ShaderMaterial[];
  private readonly plane: THREE.PlaneGeometry;
  private R = 1;
  private readonly base = new THREE.Vector3();
  private rot = 0;
  private readonly tilt = new THREE.Vector2();
  private readonly shift = new THREE.Vector2();

  constructor(textures: THREE.Texture[]) {
    this.group.add(this.inner);
    this.materials = textures.map(
      (t) =>
        new THREE.ShaderMaterial({
          vertexShader: vert,
          fragmentShader: frag,
          side: THREE.DoubleSide,
          uniforms: { uMap: { value: t }, uFade: { value: 0 }, uFront: { value: 0.4 }, uBack: { value: 0.07 } },
        }),
    );

    // The tiles cover the whole sphere evenly, poles included (Fibonacci lattice).
    // Each tile is a flat 16:10 tangent plane (the work isn't bent), oriented "up" along
    // its meridian so the works read straight.
    const N = this.materials.length;
    const tileW = 0.48; // in shares of the radius, leaving room for the gaps
    const tileH = tileW / 1.6;
    this.plane = new THREE.PlaneGeometry(tileW, tileH);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const worldUp = new THREE.Vector3(0, 1, 0);
    const n = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const basis = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const y = 1 - ((i + 0.5) / N) * 2; // pole to pole
      const r = Math.sqrt(1 - y * y);
      const a = i * golden;
      n.set(Math.cos(a) * r, y, Math.sin(a) * r).normalize();
      right.crossVectors(worldUp, n);
      if (right.lengthSq() < 1e-4) right.set(1, 0, 0);
      right.normalize();
      up.crossVectors(n, right).normalize();
      basis.makeBasis(right, up, n);
      const m = new THREE.Mesh(this.plane, this.materials[i]);
      m.quaternion.setFromRotationMatrix(basis);
      m.position.copy(n);
      this.inner.add(m);
    }
    this.group.visible = false;
  }

  layout(W: number, H: number, portrait: boolean) {
    this.R = portrait ? Math.min(H * 0.62, W * 1.05) : H * 0.62;
    this.group.scale.setScalar(this.R);
    this.base.set(0, 0, -H * 0.6); // screen centre
    this.group.position.copy(this.base);
  }

  /**
   * @param fade  0..1, the reveal when the final section opens
   * @param mouse the normalised cursor (-1..1), or null
   */
  update(dt: number, fade: number, mouse: PointerN | null, W: number, H: number) {
    this.group.visible = fade > 0.001;
    if (!this.group.visible) return false;
    this.materials.forEach((m) => {
      m.uniforms.uFade.value = fade;
    });
    // constant slow spin
    this.rot += dt * 0.09;
    // the cursor: tilt and a little parallax, with inertia
    const tx = mouse ? mouse.y * 0.28 : 0;
    const ty = mouse ? mouse.x * 0.45 : 0;
    // a soft lag behind the cursor (time constant ~1.2 s)
    const k = 1 - Math.exp(-dt * 0.85);
    this.tilt.x += (tx - this.tilt.x) * k;
    this.tilt.y += (ty - this.tilt.y) * k;
    const sx = mouse ? mouse.x * W * 0.025 : 0;
    const sy = mouse ? -mouse.y * H * 0.025 : 0;
    this.shift.x += (sx - this.shift.x) * k;
    this.shift.y += (sy - this.shift.y) * k;
    this.inner.rotation.set(0.32 + this.tilt.x, this.rot + this.tilt.y, 0.12);
    // rises from below with the reveal
    this.group.position.set(this.base.x + this.shift.x, this.base.y + this.shift.y - (1 - fade) * H * 0.18, this.base.z);
    return true;
  }

  dispose() {
    this.plane.dispose();
    this.materials.forEach((m) => m.dispose());
  }
}
