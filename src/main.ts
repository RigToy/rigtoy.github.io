// import { WebGLRenderer, PerspectiveCamera, Geometry, Material, Mesh } from 'four'

import { Geometry, Material, Mesh, PerspectiveCamera, WebGLRenderer } from "./core"


const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight)
camera.position.z = 5

const geometry = new Geometry({
	position: {
		size: 3,
		data: new Float32Array([
			0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
			-0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
			0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5,
			0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
			-0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5,
			-0.5, -0.5, -0.5, 0.5, -0.5,
		]),
	},
})
const material = new Material({
	vertex: /* glsl */ `#version 300 es
    uniform mat4 projectionMatrix;
    uniform mat4 modelViewMatrix;
    in vec3 position;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
    }
  `,
	fragment: /* glsl */ `#version 300 es
    out lowp vec4 color;
    void main() {
      color = vec4(1, 0, 0, 1);
    }
  `,
})
const mesh = new Mesh(geometry, material)

renderer.render(mesh, camera)

console.log("object")
