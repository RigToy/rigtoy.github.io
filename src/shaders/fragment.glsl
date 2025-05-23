#version 300 es
precision lowp float;

uniform vec3 color;
in vec3 vNormal;
out vec4 pc_fragColor;

void main() {
	float lighting = dot(vNormal, normalize(vec3(10)));
	pc_fragColor = vec4(color + lighting * 0.1f, 1.0f);
}
