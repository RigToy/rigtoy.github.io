import vertexShader from "./vert.glsl"
import fragmentShader from "./frag.glsl"

class WebGLRenderEngine {
	constructor(canvasId = "scene") {
		this.canvas = document.getElementById(canvasId)
		this.gl = this.canvas.getContext("webgl")
		if (!this.gl) throw new Error("WebGL not supported")

		this.NUM_BONES = 5
		this.SEGMENT_HEIGHT = 1.0

		this.vsSource = vertexShader
		this.fsSource = fragmentShader

		this._init()
	}

	_init() {
		const gl = this.gl

		// Compile shaders & create program
		const compile = (src, type) => {
			const shader = gl.createShader(type)
			gl.shaderSource(shader, src)
			gl.compileShader(shader)
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				throw new Error(gl.getShaderInfoLog(shader))
			}
			return shader
		}

		const vs = compile(this.vsSource, gl.VERTEX_SHADER)
		const fs = compile(this.fsSource, gl.FRAGMENT_SHADER)

		this.program = gl.createProgram()
		gl.attachShader(this.program, vs)
		gl.attachShader(this.program, fs)
		gl.linkProgram(this.program)
		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			throw new Error(gl.getProgramInfoLog(this.program))
		}
		gl.useProgram(this.program)

		// Create geometry and skin data
		const cube = this._createBox(this.SEGMENT_HEIGHT)
		this.bonePositions = []
		this.skinIndices = []

		for (let i = 0; i < this.NUM_BONES; i++) {
			for (let v = 0; v < cube.length / 3; v++) {
				this.bonePositions.push(cube[v * 3], cube[v * 3 + 1] + i * this.SEGMENT_HEIGHT, cube[v * 3 + 2])
				this.skinIndices.push(i)
			}
		}

		// Setup buffers
		this._bindAttrib(this.bonePositions, "position", 3)
		this._bindAttrib(this.skinIndices, "skinIndex", 1, gl.FLOAT)

		// Uniform locations
		this.uBones = gl.getUniformLocation(this.program, "boneMatrices[0]")
		this.uProjection = gl.getUniformLocation(this.program, "projectionMatrix")
		this.uView = gl.getUniformLocation(this.program, "viewMatrix")

		// Set camera uniforms
		gl.uniformMatrix4fv(this.uProjection, false, this._perspective(Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 100))
		gl.uniformMatrix4fv(this.uView, false, this._lookAt([0, 5, 10], [0, 2, 0], [0, 1, 0]))

		gl.clearColor(0.0, 0.0, 0.0, 1.0)

		this._render = this._render.bind(this)
		requestAnimationFrame(this._render)
	}

	_createBox(height = 1.0, width = 0.2, depth = 0.2) {
		const w = width / 2,
			h = height / 2,
			d = depth / 2
		return new Float32Array([
			// Front face
			-w,
			-h,
			d,
			w,
			-h,
			d,
			w,
			h,
			d,
			-w,
			-h,
			d,
			w,
			h,
			d,
			-w,
			h,
			d,
			// Back face
			-w,
			-h,
			-d,
			-w,
			h,
			-d,
			w,
			h,
			-d,
			-w,
			-h,
			-d,
			w,
			h,
			-d,
			w,
			-h,
			-d,
			// Top face
			-w,
			h,
			-d,
			-w,
			h,
			d,
			w,
			h,
			d,
			-w,
			h,
			-d,
			w,
			h,
			d,
			w,
			h,
			-d,
			// Bottom face
			-w,
			-h,
			-d,
			w,
			-h,
			-d,
			w,
			-h,
			d,
			-w,
			-h,
			-d,
			w,
			-h,
			d,
			-w,
			-h,
			d,
			// Right face
			w,
			-h,
			-d,
			w,
			h,
			-d,
			w,
			h,
			d,
			w,
			-h,
			-d,
			w,
			h,
			d,
			w,
			-h,
			d,
			// Left face
			-w,
			-h,
			-d,
			-w,
			-h,
			d,
			-w,
			h,
			d,
			-w,
			-h,
			-d,
			-w,
			h,
			d,
			-w,
			h,
			-d,
		])
	}

	_bindAttrib(data, name, size, type = this.gl.FLOAT) {
		const gl = this.gl
		const loc = gl.getAttribLocation(this.program, name)
		const buf = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, buf)
		const typedData = type === gl.FLOAT ? new Float32Array(data) : new Uint16Array(data)
		gl.bufferData(gl.ARRAY_BUFFER, typedData, gl.STATIC_DRAW)
		gl.enableVertexAttribArray(loc)
		gl.vertexAttribPointer(loc, size, type, false, 0, 0)
	}

	// Math helpers

	_perspective(fov, aspect, near, far) {
		const f = 1.0 / Math.tan(fov / 2),
			nf = 1 / (near - far)
		return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0])
	}

	_lookAt(eye, center, up) {
		const z = this._normalize(this._sub(eye, center))
		const x = this._normalize(this._cross(up, z))
		const y = this._cross(z, x)
		return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -this._dot(x, eye), -this._dot(y, eye), -this._dot(z, eye), 1])
	}

	_sub(a, b) {
		return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
	}

	_cross(a, b) {
		return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
	}

	_dot(a, b) {
		return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
	}

	_normalize(v) {
		const len = Math.sqrt(this._dot(v, v))
		return v.map((e) => e / len)
	}

	_mat4Identity() {
		return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
	}

	_mat4Translate(y) {
		const m = this._mat4Identity()
		m[13] = y
		return m
	}

	_mat4RotateZ(theta) {
		const c = Math.cos(theta),
			s = Math.sin(theta)
		return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
	}

	_mat4Mul(a, b) {
		const out = new Float32Array(16)
		for (let i = 0; i < 4; ++i) {
			for (let j = 0; j < 4; ++j) {
				out[i * 4 + j] = 0
				for (let k = 0; k < 4; ++k) {
					out[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j]
				}
			}
		}
		return out
	}

	// Animation loop
	_render(t) {
		const gl = this.gl
		const time = t * 0.001
		const bones = []

		for (let i = 0; i < this.NUM_BONES; i++) {
			const rot = this._mat4RotateZ(Math.sin(time + i) * 0.4)
			const trans = this._mat4Translate(i * this.SEGMENT_HEIGHT)
			bones.push(this._mat4Mul(trans, rot))
		}

		const boneArray = new Float32Array(this.NUM_BONES * 16)
		for (let i = 0; i < this.NUM_BONES; i++) {
			boneArray.set(bones[i], i * 16)
		}

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		gl.enable(gl.DEPTH_TEST)
		gl.uniformMatrix4fv(this.uBones, false, boneArray)
		gl.drawArrays(gl.TRIANGLES, 0, this.bonePositions.length / 3)

		requestAnimationFrame(this._render)
	}
}

const engine = new WebGLRenderEngine()
