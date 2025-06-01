attribute vec3 position;
attribute float skinIndex;

uniform mat4 boneMatrices[20];
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

void main() {
	int idx = int(skinIndex);
	vec4 worldPos = boneMatrices[idx] * vec4(position, 1.0);
	gl_Position = projectionMatrix * viewMatrix * worldPos;
}
