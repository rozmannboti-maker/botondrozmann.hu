// Custom hero background renderer.
//
// The vendored CoreRenderer (23279_core-renderer.js) + blob-URL project loading never
// actually renders anything — it silently fails to resolve the image layer's relative
// path when the project JSON is passed in as a Blob URL, so the canvas stays fully
// transparent. Rather than debug a minified, undocumented loader, this reads the exact
// same compiled GLSL shader source straight out of window._heroProjectDataV2 (it's
// plain, readable shader code, pulled from the live Unicorn Studio embed's own project
// JSON) and runs it through a small, self-contained multi-pass WebGL2 pipeline:
// gradient background -> portrait image (composited over the gradient) -> chromatic
// aberration -> voronoi dissolve. The free-plan watermark layer is intentionally
// dropped.
//
// The canvas renders at the hero section's real pixel size (not a fixed design
// resolution scaled via CSS), so the portrait's on-screen size is computed relative to
// the actual viewport rather than being at the mercy of object-fit: cover cropping —
// on a very wide (ultrawide) viewport that would otherwise zoom the cover-cropped
// design in vertically, making the subject look larger and tighter-cropped the wider
// the screen gets. Instead, the portrait's width/position (originally baked into the
// image layer's fragment shader as absolute-pixel literals for a 1440x900 artboard) are
// exposed as uniforms and recomputed on every resize: sized relative to viewport
// height, then shrunk and shifted upward further once the aspect ratio passes a
// widescreen threshold.
//
// The composite pass intentionally does NOT reuse the image layer's own "mouse tilt"
// vertex shader (which computes an unused rotation matrix into vVertexPosition) —
// pairing that vertex shader with the composite fragment shader reliably corrupts the
// interpolated vTextureCoord varying on this GPU/driver (ANGLE), even though the same
// vertex shader works fine for the image layer's own pass. A plain passthrough vertex
// shader avoids the bug entirely, and the tilt has no visible effect anyway (its output
// is never actually sampled by any fragment shader in this project).
(function () {
  function start() {
    const data = window._heroProjectDataV2;
    if (!data) return;

    const container = document.getElementById('hero-canvas');
    if (!container) return;

    const gradientLayer = data.layers.find((l) => l.type === 'gradient');
    const imageLayer = data.layers.find((l) => l.layerType === 'image');
    const chromabLayer = data.layers.find((l) => l.type === 'chromab');
    const voronoiLayer = data.layers.find((l) => l.type === 'voronoi');
    if (!gradientLayer || !imageLayer || !chromabLayer || !voronoiLayer) return;
    const compositeShader = imageLayer.data.compositeShader;

    // Parametrize the image layer's baked-in artboard literals so its size/position
    // can be recomputed per-resize instead of being fixed to a 1440x900 design.
    let imageFragSrc = imageLayer.compiledFragmentShaders[0];
    imageFragSrc = imageFragSrc
      .replace('uniform vec2 uMousePos;', 'uniform vec2 uMousePos;uniform float uImgWidthPx;uniform float uImgLeftFrac;uniform float uImgTopFrac;')
      .replace('float absWidth = 797.2443037974682;', 'float absWidth = uImgWidthPx;')
      .replace('vec2(0.5062908755274261, 0.5956438947781703)', 'vec2(uImgLeftFrac, uImgTopFrac)');

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; display:block;';
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl2');
    if (!gl) return;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(s));
      }
      return s;
    }

    function makeProgram(vertSrc, fragSrc) {
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vertSrc));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragSrc));
      gl.bindAttribLocation(p, 0, 'aVertexPosition');
      gl.bindAttribLocation(p, 1, 'aTextureCoord');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(p));
      }
      return p;
    }

    // full-screen quad, positions in NDC (-1..1), uv in (0..1)
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      // x, y, z,   u, v
      -1, -1, 0, 0, 0,
       1, -1, 0, 1, 0,
      -1,  1, 0, 0, 1,
      -1,  1, 0, 0, 1,
       1, -1, 0, 1, 0,
       1,  1, 0, 1, 1,
    ]), gl.STATIC_DRAW);

    function bindQuad() {
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
    }

    const identity = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

    const PASSTHROUGH_VERT = `#version 300 es
      precision highp float;
      in vec3 aVertexPosition;
      in vec2 aTextureCoord;
      uniform mat4 uMVMatrix;
      uniform mat4 uPMatrix;
      out vec2 vTextureCoord;
      void main() {
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
        vTextureCoord = aTextureCoord;
      }
    `;

    const gradientProgram = makeProgram(gradientLayer.compiledVertexShaders[0], gradientLayer.compiledFragmentShaders[0]);
    const imageProgram = makeProgram(imageLayer.compiledVertexShaders[0], imageFragSrc);
    const compositeProgram = makeProgram(PASSTHROUGH_VERT, compositeShader.fragmentShader);
    const chromabProgram = makeProgram(chromabLayer.compiledVertexShaders[0], chromabLayer.compiledFragmentShaders[0]);
    const voronoiProgram = makeProgram(voronoiLayer.compiledVertexShaders[0], voronoiLayer.compiledFragmentShaders[0]);

    function makeFBO(w, h) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { fbo, tex, w, h };
    }

    // Original design baseline: on a 1440x900 artboard the portrait was authored at
    // left=0.5063, top=0.5956 (fractions of the artboard), width=797.24px (0.886x the
    // artboard height). We keep that as the baseline look up to BASE_ASPECT, then
    // shrink + shift the portrait upward further for wider-than-that viewports.
    const BASE_LEFT_FRAC = 0.5062908755274261;
    const BASE_TOP_FRAC = 0.5956438947781703;
    const BASE_WIDTH_OF_HEIGHT = 797.2443037974682 / 900;
    const BASE_ASPECT = 1.8;
    const MIN_SHRINK = 0.62;
    const UPSHIFT_AMOUNT = 0.34;

    let canvasW = 0, canvasH = 0;
    let imgLeftFrac = BASE_LEFT_FRAC, imgTopFrac = BASE_TOP_FRAC, imgWidthPx = 0;
    let gradientFBO, imageFBO, compositeFBO, chromabFBO;

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasW = Math.max(1, Math.round(rect.width * dpr));
      canvasH = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = canvasW;
      canvas.height = canvasH;

      gradientFBO = makeFBO(canvasW, canvasH);
      imageFBO = makeFBO(canvasW, canvasH);
      compositeFBO = makeFBO(canvasW, canvasH);
      chromabFBO = makeFBO(canvasW, canvasH);

      const aspect = canvasW / canvasH;
      const shrink = aspect > BASE_ASPECT ? Math.max(MIN_SHRINK, BASE_ASPECT / aspect) : 1.0;
      imgWidthPx = BASE_WIDTH_OF_HEIGHT * canvasH * shrink;
      imgLeftFrac = BASE_LEFT_FRAC;
      imgTopFrac = BASE_TOP_FRAC - (1 - shrink) * UPSHIFT_AMOUNT;
    }

    resize();
    window.addEventListener('resize', resize);

    const sourceTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, sourceTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const img = new Image();
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, sourceTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    };
    img.src = 'assets/images/Hero-portre.png';

    let mouse = [0.5, 0.5], targetMouse = [0.5, 0.5];
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      targetMouse = [(e.clientX - rect.left) / rect.width, 1.0 - (e.clientY - rect.top) / rect.height];
    });

    function drawFullscreen(program, setUniforms, targetFBO, w, h) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
      gl.viewport(0, 0, w, h);
      gl.useProgram(program);
      bindQuad();
      setUniforms(program);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    const startTime = performance.now();

    function frame() {
      mouse[0] += (targetMouse[0] - mouse[0]) * 0.06;
      mouse[1] += (targetMouse[1] - mouse[1]) * 0.06;
      const time = (performance.now() - startTime) / 1000;

      // 1) gradient background layer
      drawFullscreen(gradientProgram, (p) => {
        gl.uniform1f(gl.getUniformLocation(p, 'uTime'), time * gradientLayer.speed);
        gl.uniform2f(gl.getUniformLocation(p, 'uMousePos'), mouse[0], mouse[1]);
        gl.uniformMatrix4fv(gl.getUniformLocation(p, 'uMVMatrix'), false, identity);
        gl.uniformMatrix4fv(gl.getUniformLocation(p, 'uPMatrix'), false, identity);
      }, gradientFBO.fbo, canvasW, canvasH);

      // 2) portrait image, sized/positioned relative to the real viewport
      drawFullscreen(imageProgram, (p) => {
        gl.uniform1i(gl.getUniformLocation(p, 'uSourceImage'), 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sourceTex);
        gl.uniform2f(gl.getUniformLocation(p, 'uArtboardResolution'), canvasW, canvasH);
        gl.uniform2f(gl.getUniformLocation(p, 'uMousePos'), mouse[0], mouse[1]);
        gl.uniform1f(gl.getUniformLocation(p, 'uImgWidthPx'), imgWidthPx);
        gl.uniform1f(gl.getUniformLocation(p, 'uImgLeftFrac'), imgLeftFrac);
        gl.uniform1f(gl.getUniformLocation(p, 'uImgTopFrac'), imgTopFrac);
        gl.uniformMatrix4fv(gl.getUniformLocation(p, 'uMVMatrix'), false, identity);
        gl.uniformMatrix4fv(gl.getUniformLocation(p, 'uPMatrix'), false, identity);
      }, imageFBO.fbo, canvasW, canvasH);

      // 3) composite the portrait over the gradient background
      drawFullscreen(compositeProgram, (p) => {
        gl.uniform1i(gl.getUniformLocation(p, 'uTexture'), 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imageFBO.tex);
        gl.uniform1i(gl.getUniformLocation(p, 'uBgTexture'), 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, gradientFBO.tex);
        gl.uniformMatrix4fv(gl.getUniformLocation(p, 'uMVMatrix'), false, identity);
        gl.uniformMatrix4fv(gl.getUniformLocation(p, 'uPMatrix'), false, identity);
      }, compositeFBO.fbo, canvasW, canvasH);

      // 4) chromatic aberration
      drawFullscreen(chromabProgram, (p) => {
        gl.uniform1i(gl.getUniformLocation(p, 'uTexture'), 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, compositeFBO.tex);
        gl.uniform1f(gl.getUniformLocation(p, 'uTime'), time * chromabLayer.speed);
        gl.uniform2f(gl.getUniformLocation(p, 'uMousePos'), mouse[0], mouse[1]);
        gl.uniform2f(gl.getUniformLocation(p, 'uResolution'), canvasW, canvasH);
        gl.uniformMatrix4fv(gl.getUniformLocation(p, 'uMVMatrix'), false, identity);
        gl.uniformMatrix4fv(gl.getUniformLocation(p, 'uPMatrix'), false, identity);
        const tm = gl.getUniformLocation(p, 'uTextureMatrix');
        if (tm) gl.uniformMatrix4fv(tm, false, identity);
      }, chromabFBO.fbo, canvasW, canvasH);

      // 5) voronoi dissolve — renders straight to the visible canvas
      drawFullscreen(voronoiProgram, (p) => {
        gl.uniform1i(gl.getUniformLocation(p, 'uTexture'), 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, chromabFBO.tex);
        gl.uniform1f(gl.getUniformLocation(p, 'uTime'), time * voronoiLayer.speed);
        gl.uniform2f(gl.getUniformLocation(p, 'uMousePos'), mouse[0], mouse[1]);
        gl.uniform2f(gl.getUniformLocation(p, 'uResolution'), canvasW, canvasH);
        gl.uniformMatrix4fv(gl.getUniformLocation(p, 'uMVMatrix'), false, identity);
        gl.uniformMatrix4fv(gl.getUniformLocation(p, 'uPMatrix'), false, identity);
        const tm = gl.getUniformLocation(p, 'uTextureMatrix');
        if (tm) gl.uniformMatrix4fv(tm, false, identity);
      }, null, canvasW, canvasH);

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
