const uniforms = {
    // Core js matrices
    projectionMatrix: { type: 'mat4', value: new Matrix4() },
    modelViewMatrix: { type: 'mat4', value: new Matrix4() },
    normalMatrix: { type: 'mat3', value: new Matrix3() },
    modelMatrix: { type: 'mat4', value: new Matrix4() },
    viewMatrix: { type: 'mat4', value: new Matrix4() },

    // Batching system uniforms
    batchingTexture: { type: 't', value: null },
    batchingIdTexture: { type: 'usampler2D', value: null },
    batchingColorTexture: { type: 't', value: null },
    _gl_DrawID: { type: 'i', value: 0 }, // For non-multi-draw extensions

    // Morph targets
    morphTargetBaseInfluence: { type: 'f', value: 0 },
    morphTargetInfluences: { type: 'float[]', value: [] },
    morphTargetsTexture: { type: 'sampler2DArray', value: null },
    morphTargetsTextureSize: { type: 'ivec2', value: new Vector2() },
    morphTexture: { type: 't', value: null }, // For instanced morphing

    // Skinning uniforms
    bindMatrix: { type: 'mat4', value: new Matrix4() },
    bindMatrixInverse: { type: 'mat4', value: new Matrix4() },
    boneTexture: { type: 'sampler2D', value: null },

    // Displacement mapping
    displacementMap: { type: 't', value: null },
    displacementScale: { type: 'f', value: 1.0 },
    displacementBias: { type: 'f', value: 0.0 },

    // All possible texture transforms (conditionally used)
    mapTransform: { type: 'mat3', value: new Matrix3() },
    alphaMapTransform: { type: 'mat3', value: new Matrix3() },
    lightMapTransform: { type: 'mat3', value: new Matrix3() },
    aoMapTransform: { type: 'mat3', value: new Matrix3() },
    bumpMapTransform: { type: 'mat3', value: new Matrix3() },
    normalMapTransform: { type: 'mat3', value: new Matrix3() },
    displacementMapTransform: { type: 'mat3', value: new Matrix3() },
    emissiveMapTransform: { type: 'mat3', value: new Matrix3() },
    metalnessMapTransform: { type: 'mat3', value: new Matrix3() },
    roughnessMapTransform: { type: 'mat3', value: new Matrix3() },
    anisotropyMapTransform: { type: 'mat3', value: new Matrix3() },
    clearcoatMapTransform: { type: 'mat3', value: new Matrix3() },
    clearcoatNormalMapTransform: { type: 'mat3', value: new Matrix3() },
    clearcoatRoughnessMapTransform: { type: 'mat3', value: new Matrix3() },
    sheenColorMapTransform: { type: 'mat3', value: new Matrix3() },
    sheenRoughnessMapTransform: { type: 'mat3', value: new Matrix3() },
    iridescenceMapTransform: { type: 'mat3', value: new Matrix3() },
    iridescenceThicknessMapTransform: { type: 'mat3', value: new Matrix3() },
    specularMapTransform: { type: 'mat3', value: new Matrix3() },
    specularColorMapTransform: { type: 'mat3', value: new Matrix3() },
    specularIntensityMapTransform: { type: 'mat3', value: new Matrix3() },
    transmissionMapTransform: { type: 'mat3', value: new Matrix3() },
    thicknessMapTransform: { type: 'mat3', value: new Matrix3() },

    // Shadow system uniforms
    directionalShadowMatrix: { type: 'mat4[]', value: [] },
    pointShadowMatrix: { type: 'mat4[]', value: [] },
    spotLightMatrix: { type: 'mat4[]', value: [] },

    // Directional light shadows
    directionalLightShadows: {
        type: 'struct[]',
        value: new Array(NUM_DIR_LIGHT_SHADOWS).fill().map(() => ({
            shadowIntensity: { type: 'f', value: 0 },
            shadowBias: { type: 'f', value: 0 },
            shadowNormalBias: { type: 'f', value: 0 },
            shadowRadius: { type: 'f', value: 0 },
            shadowMapSize: { type: 'vec2', value: new Vector2() }
        }))
    },

    // Spot light shadows
    spotLightShadows: {
        type: 'struct[]',
        value: new Array(NUM_SPOT_LIGHT_SHADOWS).fill().map(() => ({
            shadowIntensity: { type: 'f', value: 0 },
            shadowBias: { type: 'f', value: 0 },
            shadowNormalBias: { type: 'f', value: 0 },
            shadowRadius: { type: 'f', value: 0 },
            shadowMapSize: { type: 'vec2', value: new Vector2() }
        }))
    },

    // Point light shadows
    pointLightShadows: {
        type: 'struct[]',
        value: new Array(NUM_POINT_LIGHT_SHADOWS).fill().map(() => ({
            shadowIntensity: { type: 'f', value: 0 },
            shadowBias: { type: 'f', value: 0 },
            shadowNormalBias: { type: 'f', value: 0 },
            shadowRadius: { type: 'f', value: 0 },
            shadowMapSize: { type: 'vec2', value: new Vector2() },
            shadowCameraNear: { type: 'f', value: 0 },
            shadowCameraFar: { type: 'f', value: 0 }
        }))
    },

    // Clipping planes
    clippingPlanes: { type: 'vec4[]', value: [] }
};