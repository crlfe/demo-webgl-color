/**
 * @author Chris Wolfe (https://crlfe.ca)
 * @license MIT
 */

export function webglHelper(canvas, options) {
  const gl = canvas.getContext("webgl");
  const api = { gl, buildProgram, buildShader };
  let state;
  let animationFrameId = 0;
  let lastCanvasWidth = 0;
  let lastCanvasHeight = 0;

  canvas.addEventListener("webglcontextlost", stop);
  canvas.addEventListener("webglcontextrestored", start);
  start();

  function stop(event) {
    if (event) {
      event.preventDefault();
    }
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
    lastCanvasWidth = 0;
    lastCanvasHeight = 0;
  }

  async function start() {
    state = {};
    animationFrameId = 0;
    lastCanvasWidth = 0;
    lastCanvasHeight = 0;
    if (options.setup) {
      await options.setup(api, state);
    }
    scheduleFrame();
  }

  function scheduleFrame() {
    animationFrameId = window.requestAnimationFrame(frame);
  }

  async function frame(elapsedMillis) {
    animationFrameId = 0;
    if (
      canvas.clientWidth !== lastCanvasWidth ||
      canvas.clientHeight !== lastCanvasHeight
    ) {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;

      // Render at the same resolution as the canvas.
      canvas.width = width;
      canvas.height = height;

      if (options.aspect) {
        // Preserve aspect ratio and center the viewport.
        const vw = Math.min(width, height / options.aspect);
        const vh = Math.min(width * options.aspect, height);
        gl.viewport((width - vw) / 2, (height - vh) / 2, vw, vh);
      }

      lastCanvasWidth = canvas.clientWidth;
      lastCanvasHeight = canvas.clientHeight;
    }
    if (options.paint) {
      await options.paint(api, state, elapsedMillis / 1000.0);
    }
    scheduleFrame();
  }

  function buildProgram(vert, frag) {
    const program = gl.createProgram();
    gl.attachShader(program, buildShader(gl.VERTEX_SHADER, vert));
    gl.attachShader(program, buildShader(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (!gl.isContextLost()) {
        throw new Error(gl.getProgramInfoLog(program));
      }
    }
    return program;
  }

  function buildShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      if (!gl.isContextLost()) {
        throw new Error(gl.getShaderInfoLog(shader));
      }
    }
    return shader;
  }
}
