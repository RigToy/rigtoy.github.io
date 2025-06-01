// import vertexShader from "./vert.glsl"
// import fragmentShader from "./frag.glsl"
import vertexShader from "./vertex_full.glsl"
import fragmentShader from "./fragment_full.glsl"

class WebGLCube {
	constructor(canvasId = "scene") {
		this.canvas = document.getElementById(canvasId)
		this.gl = this.canvas.getContext("webgl")
		if (!this.gl) throw new Error("WebGL not supported")

		this.rotationAngle = 0

		this._init()
		this._render = this._render.bind(this)
		window.addEventListener("resize", () => this._resizeCanvas())
		requestAnimationFrame(this._render)
	}

	_init() {
		this._compileShaders()
		this.gl.useProgram(this.program) // ✅ ensure program is active before accessing uniforms
		this._getUniformLocations()
		this._initBuffers()
		this._resizeCanvas()
	}

	_compileShaders() {
		const gl = this.gl

		const compile = (src, type) => {
			const shader = gl.createShader(type)
			gl.shaderSource(shader, src)
			gl.compileShader(shader)
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				throw new Error(gl.getShaderInfoLog(shader))
			}
			return shader
		}

		const vs = compile(vertexShader, gl.VERTEX_SHADER)
		const fs = compile(fragmentShader, gl.FRAGMENT_SHADER)

		this.program = gl.createProgram()
		gl.attachShader(this.program, vs)
		gl.attachShader(this.program, fs)
		gl.linkProgram(this.program)

		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			throw new Error(gl.getProgramInfoLog(this.program))
		}
	}

	_initBuffers() {
		const gl = this.gl

		this.vertexBuffer = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
		gl.bufferData(gl.ARRAY_BUFFER, this._createCubeVertices(), gl.STATIC_DRAW)

		this.indexBuffer = gl.createBuffer()
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this._createCubeIndices(), gl.STATIC_DRAW)

		const positionLoc = gl.getAttribLocation(this.program, "position")
		gl.enableVertexAttribArray(positionLoc)
		gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0)
	}

	_getUniformLocations() {
		const gl = this.gl
		this.modelMatrixLoc = gl.getUniformLocation(this.program, "modelMatrix")
		this.viewMatrixLoc = gl.getUniformLocation(this.program, "viewMatrix")
		this.projectionMatrixLoc = gl.getUniformLocation(this.program, "projectionMatrix")
	}

	_resizeCanvas() {
		const canvas = this.canvas
		const gl = this.gl

		const w = canvas.clientWidth
		const h = canvas.clientHeight

		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w
			canvas.height = h
			gl.viewport(0, 0, w, h)
		}

		gl.useProgram(this.program) // ✅ ensure the program is active

		const aspect = w / h
		const proj = this._perspective(Math.PI / 4, aspect, 0.1, 100)
		gl.uniformMatrix4fv(this.projectionMatrixLoc, false, proj)

		const view = this._lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0])
		gl.uniformMatrix4fv(this.viewMatrixLoc, false, view)
	}

	_render(t) {
		this._resizeCanvas()

		const gl = this.gl
		gl.useProgram(this.program) // ✅ ensure the program is active

		this.rotationAngle = t * 0.001

		const rx = this._rotateX(this.rotationAngle)
		const ry = this._rotateY(this.rotationAngle * 0.7)
		const rz = this._rotateZ(this.rotationAngle * 0.3)
		const model = this._mat4Multiply(rz, this._mat4Multiply(ry, rx))

		gl.uniformMatrix4fv(this.modelMatrixLoc, false, model) // ✅ no longer commented

		gl.clearColor(0.1, 0.1, 0.1, 1.0)
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		gl.enable(gl.DEPTH_TEST)

		gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0)
		requestAnimationFrame(this._render)
	}

	_createCubeVertices() {
		return new Float32Array([
			// Front
			-1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
			// Back
			-1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1,
			// Top
			-1, 1, -1, -1, 1, 1, 1, 1, 1, 1, 1, -1,
			// Bottom
			-1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
			// Right
			1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1,
			// Left
			-1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1,
		])
	}

	_createCubeIndices() {
		return new Uint16Array([
			0,
			1,
			2,
			0,
			2,
			3, // Front
			4,
			5,
			6,
			4,
			6,
			7, // Back
			8,
			9,
			10,
			8,
			10,
			11, // Top
			12,
			13,
			14,
			12,
			14,
			15, // Bottom
			16,
			17,
			18,
			16,
			18,
			19, // Right
			20,
			21,
			22,
			20,
			22,
			23, // Left
		])
	}

	_perspective(fov, aspect, near, far) {
		const f = 1.0 / Math.tan(fov / 2)
		const nf = 1 / (near - far)
		return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0])
	}

	_lookAt(eye, center, up) {
		const z = this._normalize(this._sub(eye, center))
		const x = this._normalize(this._cross(up, z))
		const y = this._cross(z, x)
		return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -this._dot(x, eye), -this._dot(y, eye), -this._dot(z, eye), 1])
	}

	_sub(a, b) {
		return a.map((v, i) => v - b[i])
	}
	_dot(a, b) {
		return a.reduce((sum, v, i) => sum + v * b[i], 0)
	}
	_cross(a, b) {
		return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
	}
	_normalize(v) {
		const len = Math.hypot(...v)
		return v.map((x) => x / len)
	}

	_rotateX(a) {
		const c = Math.cos(a),
			s = Math.sin(a)
		return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1])
	}
	_rotateY(a) {
		const c = Math.cos(a),
			s = Math.sin(a)
		return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1])
	}
	_rotateZ(a) {
		const c = Math.cos(a),
			s = Math.sin(a)
		return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
	}

	_mat4Multiply(a, b) {
		const out = new Float32Array(16)
		for (let i = 0; i < 4; ++i) {
			for (let j = 0; j < 4; ++j) {
				out[i * 4 + j] = a[i * 4 + 0] * b[0 * 4 + j] + a[i * 4 + 1] * b[1 * 4 + j] + a[i * 4 + 2] * b[2 * 4 + j] + a[i * 4 + 3] * b[3 * 4 + j]
			}
		}
		return out
	}
}

const cube = new WebGLCube()
