attribute vec4 a_position;
attribute vec2 a_texCoord;
attribute vec4 a_color;

#ifdef GL_ES
varying lowp vec4 v_fragmentColor;
varying mediump vec2 uv;
#else
varying vec4 v_fragmentColor;
varying vec2 uv;
#endif

void main()
{
	gl_Position = a_position;
	v_fragmentColor = a_color;
	uv = a_texCoord;
}