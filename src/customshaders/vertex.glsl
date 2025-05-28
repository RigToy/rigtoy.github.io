#version 300 es

uniform mat4 normalMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

in vec3 position;
in vec3 normal;

out vec3 vNormal;

void main() {
	vNormal = (normalMatrix * vec4(normal, 0)).xyz;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0f);
}
