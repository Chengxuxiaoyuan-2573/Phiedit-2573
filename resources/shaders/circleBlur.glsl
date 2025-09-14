#version 100
// Adapted from https://godotshaders.com/shader/artsy-circle-blur-type-thingy/
precision mediump float;

varying lowp vec2 uv;
uniform vec2 screenSize;
uniform sampler2D screenTexture;

uniform float size; // %10.0%

void main() {
  vec4 c = texture2D(screenTexture, uv);
  float length = dot(c, c);
  vec2 pixel_size = 1.0 / screenSize;
  for (float x = 0.0; x >= 0.0; x++) {
    if(x >= size * 2.0) break;
    for (float y = 0.0; y >= 0.0; ++y) {
      if(y >= size * 2.0) break;
      float new_x = x - size;
      float new_y = y - size;
      if (new_x * new_x + new_y * new_y > size * size) continue;
      vec4 new_c = texture2D(screenTexture, uv + pixel_size * vec2(new_x, new_y));
      float new_length = dot(new_c, new_c);
      if (new_length > length) {
        length = new_length;
        c = new_c;
      }
    }
  }
  gl_FragColor = c;
}