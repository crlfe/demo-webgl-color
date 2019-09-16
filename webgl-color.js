/**
 * @author Chris Wolfe (https://crlfe.ca)
 * @license MIT
 */

import { webglHelper } from "./webgl-helper.js";

const VERTEX_SHADER = `
    precision lowp float;

    attribute vec2 aPosition;
    attribute vec2 aCoord;
    attribute vec4 aParam;

    varying vec2 vCoord;
    varying vec4 vParam;

    void main(void) {
      gl_Position = vec4(aPosition, 0.0, 1.0);
      vCoord = aCoord;
      vParam = aParam;
    }
  `;

const FRAGMENT_SHADER = `
    precision mediump float;

    uniform float uSeconds;
    uniform float uChroma;

    varying vec2 vCoord;
    varying vec4 vParam;

    const float PI = 3.14159265359;
    const vec3 BT709 = vec3(0.2126, 0.7162, 0.0722);

    vec3 rgbFromHue(float hue) {
      vec3 wrapped = mod(6.0 * hue - vec3(0.0, 2.0, 4.0), 6.0);
      return clamp(abs(wrapped - 3.0) - 1.0, 0.0, 1.0);
    }

    void main(void) {
      float value = length(vCoord.xy) * 1.1;
      if (value > 1.0) { discard; }

      float luma = 1.0 - value;
      float chroma = uChroma;
      float hue = atan(vCoord.y, vCoord.x) / PI / 2.0 + uSeconds / 5.0;

      vec3 color = rgbFromHue(hue);
      vec3 rgb;
      if (vParam.x < 0.5) {
        // Biconic HSL
        rgb = mix(vec3(luma), color, chroma * (1.0 - abs(2.0 * luma - 1.0)));
      } else if (vParam.x < 1.5) {
        // Spherical HSL
        rgb = mix(vec3(luma), color, chroma * sin(luma * PI));
      } else if (vParam.x < 2.5) {
        // Simple LCh
        rgb = chroma * (color - dot(color, BT709)) + luma;
      } else {
        rgb = chroma * (color - dot(color, BT709)) * sin(luma * PI) + luma;
      }

      rgb = clamp(rgb, 0.0, 1.0);

      if (vParam.y > 0.5) {
        float error = dot(rgb, BT709) - luma;
        rgb = (2.0 * error + 0.5) * vec3(1.0, 1.0, 1.0) ;
      }

      gl_FragColor = vec4(rgb, 1.0);
    }
  `;

function drawBall(x, y, w, h, renderMode, renderLuma) {
  return [
    [x + 0, y + 0, -1.0, -1.0, renderMode, renderLuma, 0.0, 0.0],
    [x + w, y + 0, +1.0, -1.0, renderMode, renderLuma, 0.0, 0.0],
    [x + w, y + h, +1.0, +1.0, renderMode, renderLuma, 0.0, 0.0],
    [x + 0, y + 0, -1.0, -1.0, renderMode, renderLuma, 0.0, 0.0],
    [x + w, y + h, +1.0, +1.0, renderMode, renderLuma, 0.0, 0.0],
    [x + 0, y + h, -1.0, +1.0, renderMode, renderLuma, 0.0, 0.0]
  ];
}

const VERTICES = new Float32Array(
  [
    drawBall(-1.0, -1.0, 0.5, 1.0, 0.0, 1.0),
    drawBall(-1.0, 0.0, 0.5, 1.0, 0.0, 0.0),
    drawBall(-0.5, -1.0, 0.5, 1.0, 1.0, 1.0),
    drawBall(-0.5, 0.0, 0.5, 1.0, 1.0, 0.0),
    drawBall(0.0, -1.0, 0.5, 1.0, 2.0, 1.0),
    drawBall(0.0, 0.0, 0.5, 1.0, 2.0, 0.0),
    drawBall(0.5, -1.0, 0.5, 1.0, 3.0, 1.0),
    drawBall(0.5, 0.0, 0.5, 1.0, 3.0, 0.0)
  ].flat(10)
);

document.querySelectorAll("[data-webgl-color]").forEach(target => {
  const canvas = document.createElement("canvas");
  target.appendChild(canvas);

  const chroma = document.querySelector("input[name=chroma]");

  webglHelper(canvas, {
    aspect: 1.0 / 2.0,
    setup({ gl, buildProgram }, state) {
      state.program = buildProgram(VERTEX_SHADER, FRAGMENT_SHADER);
      const pi = (state.programInfo = {
        uSeconds: gl.getUniformLocation(state.program, "uSeconds"),
        uChroma: gl.getUniformLocation(state.program, "uChroma"),
        aPosition: gl.getAttribLocation(state.program, "aPosition"),
        aCoord: gl.getAttribLocation(state.program, "aCoord"),
        aParam: gl.getAttribLocation(state.program, "aParam")
      });

      gl.useProgram(state.program);

      state.vertices = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, state.vertices);
      gl.bufferData(gl.ARRAY_BUFFER, VERTICES, gl.STATIC_DRAW);
      gl.vertexAttribPointer(pi.aPosition, 2, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(pi.aCoord, 2, gl.FLOAT, false, 32, 8);
      gl.vertexAttribPointer(pi.aParam, 4, gl.FLOAT, false, 32, 16);
      gl.enableVertexAttribArray(pi.aPosition);
      gl.enableVertexAttribArray(pi.aCoord);
      gl.enableVertexAttribArray(pi.aParam);
    },
    paint({ gl }, state, elapsedSeconds) {
      gl.uniform1f(state.programInfo.uChroma, chroma.value);
      gl.uniform1f(state.programInfo.uSeconds, elapsedSeconds);
      gl.drawArrays(gl.TRIANGLES, 0, VERTICES.length / 8);
    }
  });
});
