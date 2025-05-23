
// Type definitions
export interface GLBModel {
	scene: SceneNode;
	materials: Material[];
	animations: any[];
}

export interface SceneNode {
	nodes: Node[];
}

export interface Node {
	name: string;
	mesh: Mesh | null;
	children: Node[];
	translation: [number, number, number];
	rotation: [number, number, number, number];
	scale: [number, number, number];
}

export interface Mesh {
	name: string;
	primitives: Primitive[];
}

export interface Primitive {
	attributes: { [key: string]: Accessor };
	indices: Accessor | null;
	material: Material | null;
	mode: number;
}

export interface Material {
	name: string;
	doubleSided: boolean;
	alphaMode: string;
	alphaCutoff: number;
	emissiveFactor: [number, number, number];
	pbrMetallicRoughness: {
		baseColorFactor: [number, number, number, number];
		metallicFactor: number;
		roughnessFactor: number;
		baseColorTexture?: any;
	};
	normalTexture?: any;
}

export interface Accessor {
	bufferView: BufferView;
	byteOffset: number;
	componentType: number;
	type: string;
	count: number;
	min?: number[];
	max?: number[];
	normalized?: boolean;
}

export interface BufferView {
	buffer: ArrayBuffer;
	byteOffset: number;
	byteLength: number;
	target: number;
}

export interface WebGLBuffers {
	attributes: { [key: string]: WebGLBuffer };
	indices: WebGLBuffer | null;
	vaos: WebGLVertexArrayObject[];
}
