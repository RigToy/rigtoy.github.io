precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec4 tangent;

// Uniforms
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;

// Varyings
varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying mat3 vTBN;

void main() {
	vUv = uv;
	vNormal = normalize(normalMatrix * normal);

    // Tangent space matrix
	vec3 tangentNormalized = normalize(normalMatrix * tangent.xyz);
	vec3 bitangent = cross(vNormal, tangentNormalized) * tangent.w;
	vTBN = mat3(tangentNormalized, bitangent, vNormal);

	vec4 worldPosition = modelMatrix * vec4(position, 1.0);
	vWorldPosition = worldPosition.xyz;

	vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
	vViewPosition = -mvPosition.xyz;

	gl_Position = projectionMatrix * mvPosition;
}
