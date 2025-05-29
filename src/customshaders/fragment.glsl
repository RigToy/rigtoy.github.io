#define STANDARD

#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif

uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;

#ifdef IOR
uniform float ior;
#endif

#ifdef USE_SPECULAR
uniform float specularIntensity;
uniform vec3 specularColor;

	#ifdef USE_SPECULAR_COLORMAP
uniform sampler2D specularColorMap;
	#endif

	#ifdef USE_SPECULAR_INTENSITYMAP
uniform sampler2D specularIntensityMap;
	#endif
#endif

#ifdef USE_CLEARCOAT
uniform float clearcoat;
uniform float clearcoatRoughness;
#endif

#ifdef USE_DISPERSION
uniform float dispersion;
#endif

#ifdef USE_IRIDESCENCE
uniform float iridescence;
uniform float iridescenceIOR;
uniform float iridescenceThicknessMinimum;
uniform float iridescenceThicknessMaximum;
#endif

#ifdef USE_SHEEN
uniform vec3 sheenColor;
uniform float sheenRoughness;

	#ifdef USE_SHEEN_COLORMAP
uniform sampler2D sheenColorMap;
	#endif

	#ifdef USE_SHEEN_ROUGHNESSMAP
uniform sampler2D sheenRoughnessMap;
	#endif
#endif

#ifdef USE_ANISOTROPY
uniform vec2 anisotropyVector;

	#ifdef USE_ANISOTROPYMAP
uniform sampler2D anisotropyMap;
	#endif
#endif

varying vec3 vViewPosition;

// ******************** #include <common> ****************
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
	return dot(v, vec3(0.3333333));
}

// expects values in the range of [0,1]x[0,1], returns values in the [0,1] range.
// do not collapse into a single function per: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
highp float rand(const in vec2 uv) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
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
	return normalize((matrix * vec4(dir, 0.0)).xyz);
}

vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
	// dir can be either a direction vector or a normal vector
	// upper-left 3x3 of matrix is assumed to be orthogonal

	return normalize((vec4(dir, 0.0) * matrix).xyz);
}

mat3 transposeMat3(const in mat3 m) {
	mat3 tmp;

	tmp[0] = vec3(m[0].x, m[1].x, m[2].x);
	tmp[1] = vec3(m[0].y, m[1].y, m[2].y);
	tmp[2] = vec3(m[0].z, m[1].z, m[2].z);
	return tmp;
}

bool isPerspectiveMatrix(mat4 m) {
	return m[2][3] == -1.0;
}

vec2 equirectUv(in vec3 dir) {
	// dir is assumed to be unit length

	float u = atan(dir.z, dir.x) * RECIPROCAL_PI2 + 0.5;

	float v = asin(clamp(dir.y, -1.0, 1.0)) * RECIPROCAL_PI + 0.5;

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
	float fresnel = exp2((-5.55473 * dotVH - 6.98316) * dotVH);

	return f0 * (1.0 - fresnel) + (f90 * fresnel);
}

float F_Schlick(const in float f0, const in float f90, const in float dotVH) {

	// Original approximation by Christophe Schlick '94
	// float fresnel = pow( 1.0 - dotVH, 5.0 );

	// Optimized variant (presented by Epic at SIGGRAPH '13)
	// https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
	float fresnel = exp2((-5.55473 * dotVH - 6.98316) * dotVH);

	return f0 * (1.0 - fresnel) + (f90 * fresnel);
}

// ******************** #include <packing> ****************
vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}

vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}

const float PackUpscale = 256. / 255.; // fraction -> 0..1 (including 1)
const float UnpackDownscale = 255. / 256.; // 0..1 -> fraction (excluding 1)
const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;

const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );

const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );

vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}

vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	// the 0.9999 tweak is unimportant, very tiny empirical improvement
	// return vec3( vuf * Inv255, gf * PackUpscale, bf * 0.9999 );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}

vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}

float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}

float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}

float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}

vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}

vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}

// NOTE: viewZ, the z-coordinate in camera space, is negative for points in front of the camera

float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	// -near maps to 0; -far maps to 1
	return ( viewZ + near ) / ( near - far );
}

float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	// maps orthographic depth in [ 0, 1 ] to viewZ
	return depth * ( near - far ) - near;
}

// NOTE: https://twitter.com/gonnavis/status/1377183786949959682
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	// -near maps to 0; -far maps to 1
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}

float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	// maps perspective depth in [ 0, 1 ] to viewZ
	return ( near * far ) / ( ( far - near ) * depth - far );
}

// ******************** #include <dithering_pars_fragment> ****************


// ******************** #include <color_pars_fragment> ****************

// ******************** #include <uv_pars_fragment> ****************

// ******************** #include <map_pars_fragment> ****************

// ******************** #include <alphamap_pars_fragment> ****************

// ******************** #include <alphatest_pars_fragment> ****************

// ******************** #include <alphahash_pars_fragment> ****************

// ******************** #include <aomap_pars_fragment> ****************

// ******************** #include <lightmap_pars_fragment> ****************

// ******************** #include <emissivemap_pars_fragment> ****************

// ******************** #include <iridescence_fragment> ****************

// ******************** #include <cube_uv_reflection_fragment> ****************

// ******************** #include <envmap_common_pars_fragment> ****************

// ******************** #include <envmap_physical_pars_fragment> ****************

// ******************** #include <fog_pars_fragment> ****************

// ******************** #include <lights_pars_begin> ****************

// ******************** #include <normal_pars_fragment> ****************

// ******************** #include <lights_physical_pars_fragment> ****************

// ******************** #include <transmission_pars_fragment> ****************

// ******************** #include <shadowmap_pars_fragment> ****************

// ******************** #include <bumpmap_pars_fragment> ****************

// ******************** #include <normalmap_pars_fragment> ****************

// ******************** #include <clearcoat_pars_fragment> ****************

// ******************** #include <iridescence_pars_fragment> ****************

// ******************** #include <roughnessmap_pars_fragment> ****************

// ******************** #include <metalnessmap_pars_fragment> ****************

// ******************** #include <logdepthbuf_pars_fragment> ****************

// ******************** #include <clipping_planes_pars_fragment> ****************

void main() {

	vec4 diffuseColor = vec4(diffuse, opacity);
	// ******************** #include <clipping_planes_fragment> ****************

	ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
	vec3 totalEmissiveRadiance = emissive;

	// ******************** #include <logdepthbuf_fragment> ****************


	// ******************** #include <map_fragment> ****************


	// ******************** #include <color_fragment> ****************

	// ******************** #include <alphamap_fragment> ****************

	// ******************** #include <alphatest_fragment> ****************

	// ******************** #include <alphahash_fragment> ****************

	// ******************** #include <roughnessmap_fragment> ****************

	// ******************** #include <metalnessmap_fragment> ****************

	// ******************** #include <normal_fragment_begin> ****************

	// ******************** #include <normal_fragment_maps> ****************

	// ******************** #include <clearcoat_normal_fragment_begin> ****************

	// ******************** #include <clearcoat_normal_fragment_maps> ****************

	// ******************** #include <emissivemap_fragment> ****************

	// accumulation
	// ******************** #include <lights_physical_fragment> ****************

	// ******************** #include <lights_fragment_begin> ****************

	// ******************** #include <lights_fragment_maps> ****************

	// ******************** #include <lights_fragment_end> ****************

	// modulation
	// ******************** #include <aomap_fragment> ****************

	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;

	// ******************** #include <transmission_fragment> ****************

	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;

	#ifdef USE_SHEEN

		// Sheen energy compensation approximation calculation can be found at the end of
		// https://drive.google.com/file/d/1T0D1VSyR4AllqIJTQAraEIzjlb5h4FKH/view?usp=sharing
	float sheenEnergyComp = 1.0 - 0.157 * max3(material.sheenColor);

	outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;

	#endif

	#ifdef USE_CLEARCOAT

	float dotNVcc = saturate(dot(geometryClearcoatNormal, geometryViewDir));

	vec3 Fcc = F_Schlick(material.clearcoatF0, material.clearcoatF90, dotNVcc);

	outgoingLight = outgoingLight * (1.0 - material.clearcoat * Fcc) + (clearcoatSpecularDirect + clearcoatSpecularIndirect) * material.clearcoat;

	#endif

	// ******************** #include <opaque_fragment> ****************

	// ******************** #include <tonemapping_fragment> ****************

	// ******************** #include <colorspace_fragment> ****************

	// ******************** #include <fog_fragment> ****************

	// ******************** #include <premultiplied_alpha_fragment> ****************

	// ******************** #include <dithering_fragment> ****************

}
