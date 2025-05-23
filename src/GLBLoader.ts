import { GLBModel, SceneNode, Node, Mesh, Primitive, Material, Accessor, BufferView, WebGLBuffers } from "./GLBModel";

class GLBLoader {
	private gl: WebGL2RenderingContext;

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;
	}

	async load(url: string): Promise<GLBModel> {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		return this.parse(arrayBuffer);
	}

	private parse(buffer: ArrayBuffer): GLBModel {
		const dataView = new DataView(buffer);

		// Check magic number
		const magic = dataView.getUint32(0, true);
		if (magic !== 0x46546C67) { // "glTF"
			throw new Error('Invalid GLB file');
		}

		const version = dataView.getUint32(4, true);
		const length = dataView.getUint32(8, true);

		let chunkOffset = 12;
		let jsonChunk: any = null;
		let binaryChunk: ArrayBuffer | null = null;

		// Parse chunks
		while (chunkOffset < length) {
			const chunkLength = dataView.getUint32(chunkOffset, true);
			const chunkType = dataView.getUint32(chunkOffset + 4, true);

			if (chunkType === 0x4E4F534A) { // JSON
				const jsonText = new TextDecoder().decode(
					new Uint8Array(buffer, chunkOffset + 8, chunkLength)
				);
				jsonChunk = JSON.parse(jsonText);
			} else if (chunkType === 0x004E4942) { // BIN
				binaryChunk = buffer.slice(chunkOffset + 8, chunkOffset + 8 + chunkLength);
			}

			chunkOffset += 8 + chunkLength;
		}

		if (!jsonChunk || !binaryChunk) {
			throw new Error('GLB missing required chunks');
		}

		return this.processGLTF(jsonChunk, binaryChunk);
	}

	private processGLTF(gltf: any, binaryChunk: ArrayBuffer): GLBModel {
		// Process buffers
		const buffers = this.processBuffers(gltf.buffers, binaryChunk);

		// Process buffer views
		const bufferViews = this.processBufferViews(gltf.bufferViews, buffers);

		// Process accessors
		const accessors = this.processAccessors(gltf.accessors, bufferViews);

		// Process materials
		const materials = this.processMaterials(gltf.materials);

		// Process meshes
		const meshes = this.processMeshes(gltf.meshes, accessors, materials);

		// Process nodes and scene hierarchy
		const scene = this.processNodes(gltf.nodes, gltf.scenes, meshes);

		return {
			scene,
			materials,
			animations: gltf.animations || []
		};
	}

	private processBuffers(buffers: any[], binaryChunk: ArrayBuffer): ArrayBuffer[] {
		return buffers.map(buffer => {
			if (buffer.uri) {
				throw new Error('External buffers not supported in this implementation');
			}
			return binaryChunk;
		});
	}

	private processBufferViews(bufferViews: any[], buffers: ArrayBuffer[]): BufferView[] {
		return bufferViews.map(view => {
			const buffer = buffers[view.buffer];
			return {
				buffer,
				byteOffset: view.byteOffset || 0,
				byteLength: view.byteLength,
				target: view.target || 0
			};
		});
	}

	private processAccessors(accessors: any[], bufferViews: BufferView[]): Accessor[] {
		return accessors.map(accessor => {
			const bufferView = bufferViews[accessor.bufferView];
			const componentType = accessor.componentType;
			const type = accessor.type;
			const count = accessor.count;

			return {
				bufferView,
				byteOffset: accessor.byteOffset || 0,
				componentType,
				type,
				count,
				min: accessor.min,
				max: accessor.max
			};
		});
	}

	private processMaterials(materials: any[]): Material[] {
		return materials.map(mat => {
			const material: Material = {
				name: mat.name || 'material',
				doubleSided: mat.doubleSided || false,
				alphaMode: mat.alphaMode || 'OPAQUE',
				alphaCutoff: mat.alphaCutoff || 0.5,
				emissiveFactor: mat.emissiveFactor || [0, 0, 0],
				pbrMetallicRoughness: {
					baseColorFactor: mat.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1],
					metallicFactor: mat.pbrMetallicRoughness?.metallicFactor || 1.0,
					roughnessFactor: mat.pbrMetallicRoughness?.roughnessFactor || 1.0
				}
			};

			// Add texture references if they exist
			if (mat.pbrMetallicRoughness?.baseColorTexture) {
				material.pbrMetallicRoughness.baseColorTexture = mat.pbrMetallicRoughness.baseColorTexture;
			}

			if (mat.normalTexture) {
				material.normalTexture = mat.normalTexture;
			}

			return material;
		});
	}

	private processMeshes(meshes: any[], accessors: Accessor[], materials: Material[]): Mesh[] {
		return meshes.map(mesh => {
			const primitives = mesh.primitives.map((primitive: any) => {
				const attributes: { [key: string]: Accessor } = {};

				for (const [name, index] of Object.entries(primitive.attributes)) {
					attributes[name] = accessors[index as number];
				}

				return {
					attributes,
					indices: primitive.indices !== undefined ? accessors[primitive.indices] : null,
					material: primitive.material !== undefined ? materials[primitive.material] : null,
					mode: primitive.mode || 4 // TRIANGLES
				};
			});

			return {
				name: mesh.name || 'mesh',
				primitives
			};
		});
	}

	private processNodes(nodes: any[], scenes: any[], meshes: Mesh[]): SceneNode {
		// Simplified - just processes the first scene
		const scene = scenes[0];
		const rootNodes = scene.nodes.map((nodeIndex: number) => this.createNode(nodes[nodeIndex], meshes));

		return {
			nodes: rootNodes
		};
	}

	private createNode(nodeData: any, meshes: Mesh[]): Node {
		const node: Node = {
			name: nodeData.name || 'node',
			mesh: nodeData.mesh !== undefined ? meshes[nodeData.mesh] : null,
			children: [],
			translation: nodeData.translation || [0, 0, 0],
			rotation: nodeData.rotation || [0, 0, 0, 1],
			scale: nodeData.scale || [1, 1, 1]
		};

		if (nodeData.children) {
			node.children = nodeData.children.map((childIndex: number) =>
				this.createNode(nodes[childIndex], meshes));
		}

		return node;
	}

	createWebGLBuffers(model: GLBModel): WebGLBuffers {
		const buffers: WebGLBuffers = {
			attributes: {},
			indices: null,
			vaos: []
		};

		// Process all meshes
		for (const mesh of model.scene.nodes.flatMap(n => this.flattenNodes(n))) {
			for (const primitive of mesh.mesh?.primitives || []) {
				// Create VAO for this primitive
				const vao = this.gl.createVertexArray();
				this.gl.bindVertexArray(vao);

				// Process attributes
				for (const [name, accessor] of Object.entries(primitive.attributes)) {
					if (!buffers.attributes[name]) {
						buffers.attributes[name] = this.createAttributeBuffer(accessor);
					}

					// Set up vertex attrib pointers
					const location = this.getAttributeLocation(name);
					if (location >= 0) {
						this.setupAttributePointer(location, accessor);
					}
				}

				// Process indices
				if (primitive.indices && !buffers.indices) {
					buffers.indices = this.createIndexBuffer(primitive.indices);
				}

				buffers.vaos.push(vao);
				this.gl.bindVertexArray(null);
			}
		}

		return buffers;
	}

	private createAttributeBuffer(accessor: Accessor): WebGLBuffer {
		const buffer = this.gl.createBuffer();
		if (!buffer) throw new Error('Failed to create WebGL buffer');

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);

		const data = this.getAccessorData(accessor);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);

		return buffer;
	}

	private createIndexBuffer(accessor: Accessor): WebGLBuffer {
		const buffer = this.gl.createBuffer();
		if (!buffer) throw new Error('Failed to create WebGL buffer');

		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);

		const data = this.getAccessorData(accessor);
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, data, this.gl.STATIC_DRAW);

		return buffer;
	}

	private getAccessorData(accessor: Accessor): ArrayBufferView {
		const bufferView = accessor.bufferView;
		const byteOffset = accessor.byteOffset;
		const componentType = accessor.componentType;
		const type = accessor.type;
		const count = accessor.count;

		// Determine components per element
		const components = this.getComponentsCount(type);

		// Create appropriate view based on component type
		switch (componentType) {
			case 5120: // BYTE
				return new Int8Array(bufferView.buffer, bufferView.byteOffset + byteOffset, count * components);
			case 5121: // UNSIGNED_BYTE
				return new Uint8Array(bufferView.buffer, bufferView.byteOffset + byteOffset, count * components);
			case 5122: // SHORT
				return new Int16Array(bufferView.buffer, bufferView.byteOffset + byteOffset, count * components);
			case 5123: // UNSIGNED_SHORT
				return new Uint16Array(bufferView.buffer, bufferView.byteOffset + byteOffset, count * components);
			case 5125: // UNSIGNED_INT
				return new Uint32Array(bufferView.buffer, bufferView.byteOffset + byteOffset, count * components);
			case 5126: // FLOAT
				return new Float32Array(bufferView.buffer, bufferView.byteOffset + byteOffset, count * components);
			default:
				throw new Error(`Unsupported component type: ${componentType}`);
		}
	}

	private getComponentsCount(type: string): number {
		switch (type) {
			case 'SCALAR': return 1;
			case 'VEC2': return 2;
			case 'VEC3': return 3;
			case 'VEC4': return 4;
			case 'MAT2': return 4;
			case 'MAT3': return 9;
			case 'MAT4': return 16;
			default: throw new Error(`Unsupported type: ${type}`);
		}
	}

	private getAttributeLocation(name: string): number {
		// Map standard glTF attribute names to locations
		switch (name) {
			case 'POSITION': return 0;
			case 'NORMAL': return 1;
			case 'TANGENT': return 2;
			case 'TEXCOORD_0': return 3;
			case 'TEXCOORD_1': return 4;
			case 'COLOR_0': return 5;
			case 'JOINTS_0': return 6;
			case 'WEIGHTS_0': return 7;
			default: return -1; // Custom attribute
		}
	}

	private setupAttributePointer(location: number, accessor: Accessor) {
		const componentType = accessor.componentType;
		const type = accessor.type;
		const normalized = accessor.normalized || false;
		const components = this.getComponentsCount(type);

		let glType: number;
		switch (componentType) {
			case 5120: glType = this.gl.BYTE; break;
			case 5121: glType = this.gl.UNSIGNED_BYTE; break;
			case 5122: glType = this.gl.SHORT; break;
			case 5123: glType = this.gl.UNSIGNED_SHORT; break;
			case 5125: glType = this.gl.UNSIGNED_INT; break;
			case 5126: glType = this.gl.FLOAT; break;
			default: throw new Error(`Unsupported component type: ${componentType}`);
		}

		this.gl.enableVertexAttribArray(location);
		this.gl.vertexAttribPointer(
			location,
			components,
			glType,
			normalized,
			0, // stride (0 = tightly packed)
			0 // offset
		);
	}

	private flattenNodes(node: Node): Node[] {
		return [node, ...node.children.flatMap(child => this.flattenNodes(child))];
	}
}
