#version 300 es

#define STANDARD

varying vec3 vViewPosition;

#ifdef USE_TRANSMISSION
varying vec3 vWorldPosition;
#endif

// ********************* #include <common> *********************
#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6

#ifndef saturate
// <tonemapping_pars_fragment> may have defined saturate() already
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )

float pow2(const in float x) {
	return x * x;
}
vec3 pow2(const in vec3 x) {
	return x * x;
}
float pow3(const in float x) {
	return x * x * x;
}
float pow4(const in float x) {
	float x2 = x * x;
	return x2 * x2;
}
float max3(const in vec3 v) {
	return max(max(v.x, v.y), v.z);
}
float average(const in vec3 v) {
	return dot(v, vec3(0.3333333f));
}

// expects values in the range of [0,1]x[0,1], returns values in the [0,1] range.
// do not collapse into a single function per: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
highp float rand(const in vec2 uv) {

	const highp float a = 12.9898f, b = 78.233f, c = 43758.5453f;
	highp float dt = dot(uv.xy, vec2(a, b)), sn = mod(dt, PI);

	return fract(sin(sn) * c);
}

#ifdef HIGH_PRECISION
float precisionSafeLength(vec3 v) {
	return length(v);
}
#else
float precisionSafeLength(vec3 v) {
	float maxComponent = max3(abs(v));
	return length(v / maxComponent) * maxComponent;
}
#endif

struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};

struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};

#ifdef USE_ALPHAHASH
varying vec3 vPosition;
#endif

vec3 transformDirection(in vec3 dir, in mat4 matrix) {
	return normalize((matrix * vec4(dir, 0.0f)).xyz);
}

vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
	// dir can be either a direction vector or a normal vector
	// upper-left 3x3 of matrix is assumed to be orthogonal

	return normalize((vec4(dir, 0.0f) * matrix).xyz);
}

mat3 transposeMat3(const in mat3 m) {
	mat3 tmp;

	tmp[0] = vec3(m[0].x, m[1].x, m[2].x);
	tmp[1] = vec3(m[0].y, m[1].y, m[2].y);
	tmp[2] = vec3(m[0].z, m[1].z, m[2].z);

	return tmp;
}

bool isPerspectiveMatrix(mat4 m) {
	return m[2][3] == -1.0f;
}

vec2 equirectUv(in vec3 dir) {
	// dir is assumed to be unit length
	float u = atan(dir.z, dir.x) * RECIPROCAL_PI2 + 0.5f;

	float v = asin(clamp(dir.y, -1.0f, 1.0f)) * RECIPROCAL_PI + 0.5f;

	return vec2(u, v);
}

vec3 BRDF_Lambert(const in vec3 diffuseColor) {
	return RECIPROCAL_PI * diffuseColor;

}

vec3 F_Schlick(const in vec3 f0, const in float f90, const in float dotVH) {
	// Original approximation by Christophe Schlick '94
	// float fresnel = pow( 1.0 - dotVH, 5.0 );

	// Optimized variant (presented by Epic at SIGGRAPH '13)
	// https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
	float fresnel = exp2((-5.55473f * dotVH - 6.98316f) * dotVH);

	return f0 * (1.0f - fresnel) + (f90 * fresnel);
}

float F_Schlick(const in float f0, const in float f90, const in float dotVH) {
	// Original approximation by Christophe Schlick '94
	// float fresnel = pow( 1.0 - dotVH, 5.0 );

	float fresnel = exp2((-5.55473f * dotVH - 6.98316f) * dotVH);

	return f0 * (1.0f - fresnel) + (f90 * fresnel);
}

// ********************* #include <batching_pars_vertex> *********************
#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
uniform int _gl_DrawID;
	#endif

uniform highp sampler2D batchingTexture;
uniform highp usampler2D batchingIdTexture;
mat4 getBatchingMatrix(const in float i) {

	int size = textureSize(batchingTexture, 0).x;
	int j = int(i) * 4;
	int x = j % size;
	int y = j / size;
	vec4 v1 = texelFetch(batchingTexture, ivec2(x, y), 0);
	vec4 v2 = texelFetch(batchingTexture, ivec2(x + 1, y), 0);
	vec4 v3 = texelFetch(batchingTexture, ivec2(x + 2, y), 0);
	vec4 v4 = texelFetch(batchingTexture, ivec2(x + 3, y), 0);
	return mat4(v1, v2, v3, v4);
}

float getIndirectIndex(const in int i) {

	int size = textureSize(batchingIdTexture, 0).x;
	int x = i % size;
	int y = i / size;
	return float(texelFetch(batchingIdTexture, ivec2(x, y), 0).r);
}
#endif

#ifdef USE_BATCHING_COLOR
uniform sampler2D batchingColorTexture;
vec3 getBatchingColor(const in float i) {

	int size = textureSize(batchingColorTexture, 0).x;
	int j = int(i);
	int x = j % size;
	int y = j / size;
	return texelFetch(batchingColorTexture, ivec2(x, y), 0).rgb;

}
#endif

//  ********************* #include <uv_pars_vertex>
#if defined( USE_UV ) || defined( USE_ANISOTROPY )

varying vec2 vUv;

#endif
#ifdef USE_MAP

uniform mat3 mapTransform;
varying vec2 vMapUv;

#endif
#ifdef USE_ALPHAMAP

uniform mat3 alphaMapTransform;
varying vec2 vAlphaMapUv;

#endif
#ifdef USE_LIGHTMAP

uniform mat3 lightMapTransform;
varying vec2 vLightMapUv;

#endif
#ifdef USE_AOMAP

uniform mat3 aoMapTransform;
varying vec2 vAoMapUv;

#endif
#ifdef USE_BUMPMAP

uniform mat3 bumpMapTransform;
varying vec2 vBumpMapUv;

#endif
#ifdef USE_NORMALMAP

uniform mat3 normalMapTransform;
varying vec2 vNormalMapUv;

#endif
#ifdef USE_DISPLACEMENTMAP

uniform mat3 displacementMapTransform;
varying vec2 vDisplacementMapUv;

#endif
#ifdef USE_EMISSIVEMAP

uniform mat3 emissiveMapTransform;
varying vec2 vEmissiveMapUv;

#endif
#ifdef USE_METALNESSMAP

uniform mat3 metalnessMapTransform;
varying vec2 vMetalnessMapUv;

#endif
#ifdef USE_ROUGHNESSMAP

uniform mat3 roughnessMapTransform;
varying vec2 vRoughnessMapUv;

#endif
#ifdef USE_ANISOTROPYMAP

uniform mat3 anisotropyMapTransform;
varying vec2 vAnisotropyMapUv;

#endif
#ifdef USE_CLEARCOATMAP

uniform mat3 clearcoatMapTransform;
varying vec2 vClearcoatMapUv;

#endif
#ifdef USE_CLEARCOAT_NORMALMAP

uniform mat3 clearcoatNormalMapTransform;
varying vec2 vClearcoatNormalMapUv;

#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP

uniform mat3 clearcoatRoughnessMapTransform;
varying vec2 vClearcoatRoughnessMapUv;

#endif
#ifdef USE_SHEEN_COLORMAP

uniform mat3 sheenColorMapTransform;
varying vec2 vSheenColorMapUv;

#endif
#ifdef USE_SHEEN_ROUGHNESSMAP

uniform mat3 sheenRoughnessMapTransform;
varying vec2 vSheenRoughnessMapUv;

#endif
#ifdef USE_IRIDESCENCEMAP

uniform mat3 iridescenceMapTransform;
varying vec2 vIridescenceMapUv;

#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP

uniform mat3 iridescenceThicknessMapTransform;
varying vec2 vIridescenceThicknessMapUv;

#endif
#ifdef USE_SPECULARMAP

uniform mat3 specularMapTransform;
varying vec2 vSpecularMapUv;

#endif
#ifdef USE_SPECULAR_COLORMAP

uniform mat3 specularColorMapTransform;
varying vec2 vSpecularColorMapUv;

#endif
#ifdef USE_SPECULAR_INTENSITYMAP

uniform mat3 specularIntensityMapTransform;
varying vec2 vSpecularIntensityMapUv;

#endif
#ifdef USE_TRANSMISSIONMAP

uniform mat3 transmissionMapTransform;
varying vec2 vTransmissionMapUv;

#endif
#ifdef USE_THICKNESSMAP

uniform mat3 thicknessMapTransform;
varying vec2 vThicknessMapUv;

#endif

// ********************* #include <displacementmap_pars_vertex>
#ifdef USE_DISPLACEMENTMAP

uniform sampler2D displacementMap;
uniform float displacementScale;
uniform float displacementBias;

#endif

// ********************* #include <color_pars_vertex>
#if defined( USE_COLOR_ALPHA )

varying vec4 vColor;

#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )

varying vec3 vColor;

#endif

// ********************* #include <fog_pars_vertex>
#ifdef USE_FOG

varying float vFogDepth;

#endif

// ********************* #include <normal_pars_vertex>
#ifndef FLAT_SHADED

varying vec3 vNormal;

	#ifdef USE_TANGENT

varying vec3 vTangent;
varying vec3 vBitangent;

	#endif

#endif

// ********************* #include <morphtarget_pars_vertex>
#ifdef USE_MORPHTARGETS

	#ifndef USE_INSTANCING_MORPH

uniform float morphTargetBaseInfluence;
uniform float morphTargetInfluences[MORPHTARGETS_COUNT];

	#endif

uniform sampler2DArray morphTargetsTexture;
uniform ivec2 morphTargetsTextureSize;

vec4 getMorph(const in int vertexIndex, const in int morphTargetIndex, const in int offset) {

	int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
	int y = texelIndex / morphTargetsTextureSize.x;
	int x = texelIndex - y * morphTargetsTextureSize.x;

	ivec3 morphUV = ivec3(x, y, morphTargetIndex);
	return texelFetch(morphTargetsTexture, morphUV, 0);

}

#endif

// ********************* #include <skinning_pars_vertex>
#ifdef USE_SKINNING
uniform mat4 bindMatrix;
uniform mat4 bindMatrixInverse;

uniform highp sampler2D boneTexture;

mat4 getBoneMatrix(const in float i) {

	int size = textureSize(boneTexture, 0).x;
	int j = int(i) * 4;
	int x = j % size;
	int y = j / size;
	vec4 v1 = texelFetch(boneTexture, ivec2(x, y), 0);
	vec4 v2 = texelFetch(boneTexture, ivec2(x + 1, y), 0);
	vec4 v3 = texelFetch(boneTexture, ivec2(x + 2, y), 0);
	vec4 v4 = texelFetch(boneTexture, ivec2(x + 3, y), 0);

	return mat4(v1, v2, v3, v4);

}
#endif

// ********************* #include <shadowmap_pars_vertex>
#if NUM_SPOT_LIGHT_COORDS > 0

uniform mat4 spotLightMatrix[NUM_SPOT_LIGHT_COORDS];
varying vec4 vSpotLightCoord[NUM_SPOT_LIGHT_COORDS];

#endif

#ifdef USE_SHADOWMAP

	#if NUM_DIR_LIGHT_SHADOWS > 0

uniform mat4 directionalShadowMatrix[NUM_DIR_LIGHT_SHADOWS];
varying vec4 vDirectionalShadowCoord[NUM_DIR_LIGHT_SHADOWS];

struct DirectionalLightShadow {
	float shadowIntensity;
	float shadowBias;
	float shadowNormalBias;
	float shadowRadius;
	vec2 shadowMapSize;
};

uniform DirectionalLightShadow directionalLightShadows[NUM_DIR_LIGHT_SHADOWS];

	#endif

	#if NUM_SPOT_LIGHT_SHADOWS > 0

struct SpotLightShadow {
	float shadowIntensity;
	float shadowBias;
	float shadowNormalBias;
	float shadowRadius;
	vec2 shadowMapSize;
};

uniform SpotLightShadow spotLightShadows[NUM_SPOT_LIGHT_SHADOWS];

	#endif

	#if NUM_POINT_LIGHT_SHADOWS > 0

uniform mat4 pointShadowMatrix[NUM_POINT_LIGHT_SHADOWS];
varying vec4 vPointShadowCoord[NUM_POINT_LIGHT_SHADOWS];

struct PointLightShadow {
	float shadowIntensity;
	float shadowBias;
	float shadowNormalBias;
	float shadowRadius;
	vec2 shadowMapSize;
	float shadowCameraNear;
	float shadowCameraFar;
};

uniform PointLightShadow pointLightShadows[NUM_POINT_LIGHT_SHADOWS];

	#endif

	/*
	#if NUM_RECT_AREA_LIGHTS > 0

		// TODO (abelnation): uniforms for area light shadows

	#endif
	*/

#endif

// ********************* #include <logdepthbuf_pars_vertex>
#ifdef USE_LOGDEPTHBUF

varying float vFragDepth;
varying float vIsPerspective;

#endif

// ********************* #include <clipping_planes_pars_vertex>
#if NUM_CLIPPING_PLANES > 0
varying vec3 vClipPosition;
#endif

void main() {

// ********************* #include <uv_vertex>
#if defined( USE_UV ) || defined( USE_ANISOTROPY )

	vUv = vec3(uv, 1).xy;

#endif
#ifdef USE_MAP

	vMapUv = (mapTransform * vec3(MAP_UV, 1)).xy;

#endif
#ifdef USE_ALPHAMAP

	vAlphaMapUv = (alphaMapTransform * vec3(ALPHAMAP_UV, 1)).xy;

#endif
#ifdef USE_LIGHTMAP

	vLightMapUv = (lightMapTransform * vec3(LIGHTMAP_UV, 1)).xy;

#endif
#ifdef USE_AOMAP

	vAoMapUv = (aoMapTransform * vec3(AOMAP_UV, 1)).xy;

#endif
#ifdef USE_BUMPMAP

	vBumpMapUv = (bumpMapTransform * vec3(BUMPMAP_UV, 1)).xy;

#endif
#ifdef USE_NORMALMAP

	vNormalMapUv = (normalMapTransform * vec3(NORMALMAP_UV, 1)).xy;

#endif
#ifdef USE_DISPLACEMENTMAP

	vDisplacementMapUv = (displacementMapTransform * vec3(DISPLACEMENTMAP_UV, 1)).xy;

#endif
#ifdef USE_EMISSIVEMAP

	vEmissiveMapUv = (emissiveMapTransform * vec3(EMISSIVEMAP_UV, 1)).xy;

#endif
#ifdef USE_METALNESSMAP

	vMetalnessMapUv = (metalnessMapTransform * vec3(METALNESSMAP_UV, 1)).xy;

#endif
#ifdef USE_ROUGHNESSMAP

	vRoughnessMapUv = (roughnessMapTransform * vec3(ROUGHNESSMAP_UV, 1)).xy;

#endif
#ifdef USE_ANISOTROPYMAP

	vAnisotropyMapUv = (anisotropyMapTransform * vec3(ANISOTROPYMAP_UV, 1)).xy;

#endif
#ifdef USE_CLEARCOATMAP

	vClearcoatMapUv = (clearcoatMapTransform * vec3(CLEARCOATMAP_UV, 1)).xy;

#endif
#ifdef USE_CLEARCOAT_NORMALMAP

	vClearcoatNormalMapUv = (clearcoatNormalMapTransform * vec3(CLEARCOAT_NORMALMAP_UV, 1)).xy;

#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP

	vClearcoatRoughnessMapUv = (clearcoatRoughnessMapTransform * vec3(CLEARCOAT_ROUGHNESSMAP_UV, 1)).xy;

#endif
#ifdef USE_IRIDESCENCEMAP

	vIridescenceMapUv = (iridescenceMapTransform * vec3(IRIDESCENCEMAP_UV, 1)).xy;

#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP

	vIridescenceThicknessMapUv = (iridescenceThicknessMapTransform * vec3(IRIDESCENCE_THICKNESSMAP_UV, 1)).xy;

#endif
#ifdef USE_SHEEN_COLORMAP

	vSheenColorMapUv = (sheenColorMapTransform * vec3(SHEEN_COLORMAP_UV, 1)).xy;

#endif
#ifdef USE_SHEEN_ROUGHNESSMAP

	vSheenRoughnessMapUv = (sheenRoughnessMapTransform * vec3(SHEEN_ROUGHNESSMAP_UV, 1)).xy;

#endif
#ifdef USE_SPECULARMAP

	vSpecularMapUv = (specularMapTransform * vec3(SPECULARMAP_UV, 1)).xy;

#endif
#ifdef USE_SPECULAR_COLORMAP

	vSpecularColorMapUv = (specularColorMapTransform * vec3(SPECULAR_COLORMAP_UV, 1)).xy;

#endif
#ifdef USE_SPECULAR_INTENSITYMAP

	vSpecularIntensityMapUv = (specularIntensityMapTransform * vec3(SPECULAR_INTENSITYMAP_UV, 1)).xy;

#endif
#ifdef USE_TRANSMISSIONMAP

	vTransmissionMapUv = (transmissionMapTransform * vec3(TRANSMISSIONMAP_UV, 1)).xy;

#endif
#ifdef USE_THICKNESSMAP

	vThicknessMapUv = (thicknessMapTransform * vec3(THICKNESSMAP_UV, 1)).xy;

#endif

// ********************* #include <color_vertex>
#if defined( USE_COLOR_ALPHA )

	vColor = vec4(1.0f);

#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )

	vColor = vec3(1.0f);

#endif

#ifdef USE_COLOR

	vColor *= color;

#endif

#ifdef USE_INSTANCING_COLOR

	vColor.xyz *= instanceColor.xyz;

#endif

#ifdef USE_BATCHING_COLOR

	vec3 batchingColor = getBatchingColor(getIndirectIndex(gl_DrawID));

	vColor.xyz *= batchingColor.xyz;

#endif

// ********************* #include <morphinstance_vertex>
#ifdef USE_INSTANCING_MORPH

	float morphTargetInfluences[MORPHTARGETS_COUNT];

	float morphTargetBaseInfluence = texelFetch(morphTexture, ivec2(0, gl_InstanceID), 0).r;

	for(int i = 0; i < MORPHTARGETS_COUNT; i++) {

		morphTargetInfluences[i] = texelFetch(morphTexture, ivec2(i + 1, gl_InstanceID), 0).r;

	}
#endif

// ********************* #include <morphcolor_vertex>
#if defined( USE_MORPHCOLORS )

	// morphTargetBaseInfluence is set based on BufferGeometry.morphTargetsRelative value:
	// When morphTargetsRelative is false, this is set to 1 - sum(influences); this results in normal = sum((target - base) * influence)
	// When morphTargetsRelative is true, this is set to 1; as a result, all morph targets are simply added to the base after weighting
	vColor *= morphTargetBaseInfluence;

	for(int i = 0; i < MORPHTARGETS_COUNT; i++) {

		#if defined( USE_COLOR_ALPHA )

		if(morphTargetInfluences[i] != 0.0f)
			vColor += getMorph(gl_VertexID, i, 2) * morphTargetInfluences[i];

		#elif defined( USE_COLOR )

		if(morphTargetInfluences[i] != 0.0f)
			vColor += getMorph(gl_VertexID, i, 2).rgb * morphTargetInfluences[i];

		#endif

	}
#endif

// ********************* #include <batching_vertex>

// ********************* #include <beginnormal_vertex>

// ********************* #include <morphnormal_vertex>

// ********************* #include <skinbase_vertex>

// ********************* #include <skinnormal_vertex>

// ********************* #include <defaultnormal_vertex>

// ********************* #include <normal_vertex>

// ********************* #include <begin_vertex>

// ********************* #include <morphtarget_vertex>

// ********************* #include <skinning_vertex>

// ********************* #include <displacementmap_vertex>

// ********************* #include <project_vertex>

// ********************* #include <logdepthbuf_vertex>

// ********************* #include <clipping_planes_vertex>

	vViewPosition = -mvPosition.xyz;

// ********************* #include <worldpos_vertex>

// ********************* #include <shadowmap_vertex>

// ********************* #include <fog_vertex>

#ifdef USE_TRANSMISSION

	vWorldPosition = worldPosition.xyz;

#endif
}
