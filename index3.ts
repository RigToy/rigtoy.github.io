import * as THREE from 'three';

export class MorphSkinCubeApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private mesh: THREE.SkinnedMesh;
//   private skeletonHelper: THREE.SkeletonHelper;
  private startTime: number;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 1.5, 3);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.startTime = performance.now();

    this.createSkinnedCube();
    this.addEvents();

    this.animate();
  }

  private createSkinnedCube() {
    // Bones
    const rootBone = new THREE.Bone();
    const childBone = new THREE.Bone();
    rootBone.add(childBone);
    rootBone.position.y = -0.5;
    childBone.position.y = 1.0;

    const skeleton = new THREE.Skeleton([rootBone, childBone]);

    // Geometry
    const baseGeo = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    const geo = new THREE.BufferGeometry().copy(baseGeo);
    const posAttr = geo.attributes.position;
    const count = posAttr.count;

    // Morph target
    const morph = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      morph.set([x * 1.2, y * 1.2, z * 1.2], i * 3);
    }
    geo.setAttribute('morphTarget', new THREE.BufferAttribute(morph, 3));

    // Skinning data
    const skinIndices = new Uint16Array(count * 4);
    const skinWeights = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const y = posAttr.getY(i);
      if (y > 0) {
        skinIndices[i * 4 + 0] = 1;
        skinWeights[i * 4 + 0] = 1.0;
      } else {
        skinIndices[i * 4 + 0] = 0;
        skinWeights[i * 4 + 0] = 1.0;
      }
    }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    geo.computeVertexNormals();

    // Raw shader material
    const vertexShader = `
      precision highp float;
      attribute vec3 position;
      attribute vec3 morphTarget;
      attribute vec4 skinIndex;
      attribute vec4 skinWeight;

      uniform float uMorph;
      uniform mat4 boneMatrices[2];
      uniform mat4 projectionMatrix;
      uniform mat4 modelViewMatrix;

      void main() {
        vec3 morphed = mix(position, morphTarget, uMorph);
        mat4 skinMat =
          skinWeight.x * boneMatrices[int(skinIndex.x)] +
          skinWeight.y * boneMatrices[int(skinIndex.y)] +
          skinWeight.z * boneMatrices[int(skinIndex.z)] +
          skinWeight.w * boneMatrices[int(skinIndex.w)];
        vec4 skinned = skinMat * vec4(morphed, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * skinned;
      }
    `;

    const fragmentShader = `
      precision highp float;
      void main() {
        gl_FragColor = vec4(1.0, 0.5, 0.2, 1.0);
      }
    `;

    const material = new THREE.RawShaderMaterial({
      vertexShader,
      fragmentShader,
      skinning: false,
      uniforms: {
        uMorph: { value: 0.0 },
        boneMatrices: { value: skeleton.boneMatrices }
      }
    });

    this.mesh = new THREE.SkinnedMesh(geo, material);
    this.mesh.add(rootBone);
    this.mesh.bind(skeleton);

    // this.skeletonHelper = new THREE.SkeletonHelper(this.mesh);
    // this.scene.add(this.skeletonHelper);
    this.scene.add(this.mesh);
  }

  private addEvents() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const time = (performance.now() - this.startTime) / 1000;

    // Morph animation
    const material = this.mesh.material as THREE.RawShaderMaterial;
    material.uniforms.uMorph.value = 0.5 + 0.5 * Math.sin(time * 1.5);

    // Bone animation
    this.mesh.skeleton.bones[1].rotation.z = Math.sin(time) * 0.5;
    this.mesh.skeleton.update();
    // this.skeletonHelper.update();

    this.renderer.render(this.scene, this.camera);
  };
}

new MorphSkinCubeApp(document.body);
