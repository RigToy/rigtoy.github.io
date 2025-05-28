import { Geometry, Material, Mesh, PerspectiveCamera, WebGPURenderer } from "./core"

const renderer = new WebGPURenderer()
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
	vertex: /* wgsl */     struct Uniforms {
      projectionMatrix: mat4x4<f32>,
      modelViewMatrix: mat4x4<f32>,
    };
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn main(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
      return uniforms.projectionMatrix * uniforms.modelViewMatrix * vec4(position, 1);
    }
  `,
	fragment: /* wgsl */     @fragment
    fn main() -> @location(0) vec4<f32> {
      return vec4(1, 0, 0, 1);
    }
  `,
})

const mesh = new Mesh(geometry, material)

renderer.render(mesh, camera)
