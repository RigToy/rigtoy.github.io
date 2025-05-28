import vertexShaderSource from './customshaders/vertex.glsl'
import fragmentShaderSource from './customshaders/fragment.glsl'
import { Geometry, Material, Mesh, PerspectiveCamera, WebGLRenderer } from "./core"

class OpenHumanGL {
	private renderer: WebGLRenderer;
	private camera: PerspectiveCamera;
	private mesh: Mesh;
	private touching: boolean = false;
	private prevTime: number = performance.now();
	private angle: number = 0;

	constructor() {
		this.renderer = new WebGLRenderer();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(this.renderer.canvas);

		this.camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight);
		this.camera.position.z = 5;

		const geometry = this.createCubeGeometry();
		const material = this.createCubeMaterial();

		this.mesh = new Mesh(geometry, material);

		this.setupEventListeners();
		this.animate();
	}

	private createCubeGeometry(): Geometry {
		const geometry = new Geometry({
			position: {
				size: 3,
				data: new Float32Array([
					0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5,
					-0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
					-0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5,
					0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
				]),
			},
			normal: {
				size: 3,
				data: new Float32Array([
					1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
					-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
				]),
			},
			uv: {
				size: 2,
				data: new Float32Array([
					0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0,
					1, 0, 0, 1, 1, 1, 0, 0, 1, 0,
				]),
			},
			index: {
				size: 1,
				data: new Uint16Array([
					0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19, 17, 20, 22,
					21, 22, 23, 21,
				]),
			},
		})

		return geometry
	}

	private createCubeMaterial(): Material {
		const material = new Material({
			uniforms: {
				color: [0.2, 0.4, 0.7],
			},
			vertex: vertexShaderSource,
			fragment: fragmentShaderSource,
		})
		return material
	}

	private setupEventListeners(): void {
		window.addEventListener('resize', () => {
			this.renderer.setSize(window.innerWidth, window.innerHeight);
			this.camera.aspect = window.innerWidth / window.innerHeight;
		});

		this.renderer.canvas.onpointerdown = () => this.touching = true;
		this.renderer.canvas.onpointerup = () => this.touching = false;
	}

	private animate(): void {
		const animateFrame = (time: DOMHighResTimeStamp) => {
			requestAnimationFrame(animateFrame);

			if (!this.touching) this.angle += (time - this.prevTime) / 2500;
			this.prevTime = time;
			this.mesh.quaternion.fromEuler(0, this.angle, this.angle);

			this.renderer.render(this.mesh, this.camera);
		};

		requestAnimationFrame(animateFrame);
	}
}

const cubeScene = new OpenHumanGL();

