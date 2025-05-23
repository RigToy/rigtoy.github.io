precision highp float;

// Material properties
uniform vec3 diffuseColor;
uniform float roughness;
uniform float metalness;
uniform vec3 emissiveColor;
uniform float emissiveIntensity;
uniform float ior;
uniform float clearcoat;
uniform float clearcoatRoughness;
uniform vec3 sheenColor;
uniform float sheenRoughness;
uniform vec3 specularColor;
uniform float specularIntensity;
uniform float transmission;
uniform float thickness;
uniform vec3 attenuationColor;
uniform float attenuationDistance;

// Lighting uniforms
uniform vec3 ambientLightColor;
uniform vec3 directionalLightColor;
uniform vec3 directionalLightDirection;

// Textures
uniform sampler2D map;
uniform sampler2D normalMap;
uniform sampler2D roughnessMap;
uniform sampler2D metalnessMap;
uniform sampler2D aoMap;
uniform sampler2D emissiveMap;
uniform sampler2D clearcoatNormalMap;
uniform sampler2D clearcoatRoughnessMap;
uniform sampler2D sheenColorMap;
uniform sampler2D specularMap;
uniform sampler2D transmissionMap;
uniform sampler2D thicknessMap;

// Environment maps
uniform samplerCube envMap;
uniform samplerCube envMapDiffuse;
uniform float envMapIntensity;

// Varyings
varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying mat3 vTBN;

// Constants
const float PI = 3.141592653589793;
const float RECIPROCAL_PI = 0.3183098861837907;
const float RECIPROCAL_PI2 = 0.15915494309189535;
const float LN2 = 0.6931472;
const float ENV_LODS = 6.0;

// Encodings
vec3 linearToSRGB(vec3 color) {
	return pow(color, vec3(1.0 / 2.2));
}

vec3 sRGBToLinear(vec3 color) {
	return pow(color, vec3(2.2));
}

// Normal mapping
vec3 getNormal() {
	vec3 tangentNormal = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
	return normalize(vTBN * tangentNormal);
}

// PBR Functions
float GGXRoughnessToAlpha(float roughness) {
	return roughness * roughness;
}

float D_GGX(float NoH, float a) {
	float a2 = a * a;
	float NoH2 = NoH * NoH;
	float denom = NoH2 * (a2 - 1.0) + 1.0;
	return a2 / (PI * denom * denom);
}

float G_SchlickGGX(float NoV, float k) {
	return NoV / (NoV * (1.0 - k) + k);
}

float G_Smith(float NoV, float NoL, float roughness) {
	float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
	return G_SchlickGGX(NoV, k) * G_SchlickGGX(NoL, k);
}

vec3 F_Schlick(float VoH, vec3 F0) {
	return F0 + (1.0 - F0) * pow(1.0 - VoH, 5.0);
}

vec3 F_SchlickR(float VoH, vec3 F0, float roughness) {
	return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - VoH, 5.0);
}

// IBL Functions
vec3 getIBLRadiance(vec3 N, vec3 V, float roughness, vec3 F0, vec3 diffuseColor) {
    // Simplified IBL calculation
	vec3 reflection = normalize(reflect(-V, N));
	float lod = roughness * ENV_LODS;

    // Specular
	vec3 radiance = textureCubeLodEXT(envMap, reflection, lod).rgb;
	vec3 specular = radiance * F_SchlickR(max(dot(N, V), 0.0), F0, roughness);

    // Diffuse
	vec3 irradiance = textureCube(envMapDiffuse, N).rgb;
	vec3 diffuse = diffuseColor * irradiance * (1.0 - metalness);

	return (specular + diffuse) * envMapIntensity;
}

void main() {
    // Base material properties
	vec4 baseColor = texture2D(map, vUv) * vec4(diffuseColor, 1.0);
	vec3 albedo = sRGBToLinear(baseColor.rgb);
	float alpha = baseColor.a;

    // Material maps
	float materialRoughness = roughness * texture2D(roughnessMap, vUv).g;
	float materialMetalness = metalness * texture2D(metalnessMap, vUv).b;
	vec3 materialEmissive = emissiveColor * texture2D(emissiveMap, vUv).rgb * emissiveIntensity;
	float ao = texture2D(aoMap, vUv).r;

    // Normal mapping
	vec3 N = getNormal();
	vec3 V = normalize(vViewPosition);

    // Fresnel (F0) approximation
	vec3 F0 = mix(vec3(0.04), albedo, materialMetalness);

    // Lighting calculations (simplified directional light)
	vec3 L = normalize(directionalLightDirection);
	vec3 H = normalize(V + L);

	float NoL = clamp(dot(N, L), 0.0, 1.0);
	float NoV = clamp(abs(dot(N, V)), 0.001, 1.0);
	float NoH = clamp(dot(N, H), 0.0, 1.0);
	float VoH = clamp(dot(V, H), 0.0, 1.0);

    // PBR components
	float D = D_GGX(NoH, GGXRoughnessToAlpha(materialRoughness));
	float G = G_Smith(NoV, NoL, materialRoughness);
	vec3 F = F_Schlick(VoH, F0);

    // Specular BRDF
	vec3 specular = (D * G * F) / (4.0 * NoL * NoV);

    // Diffuse BRDF
	vec3 diffuse = albedo * RECIPROCAL_PI * (1.0 - materialMetalness);

    // Combine lighting
	vec3 directLight = (diffuse + specular) * directionalLightColor * NoL;

    // IBL
	vec3 indirectLight = getIBLRadiance(N, V, materialRoughness, F0, albedo);

    // Combine all lighting
	vec3 color = directLight + indirectLight + materialEmissive;
	color *= ao;

    // Transmission (simplified)
	if(transmission > 0.0) {
		float thicknessVal = texture2D(thicknessMap, vUv).r * thickness;
		vec3 transmissionColor = albedo * attenuationColor * exp(-thicknessVal / attenuationDistance);
		color = mix(color, transmissionColor, transmission);
	}

    // Clearcoat (simplified)
	if(clearcoat > 0.0) {
		vec3 clearcoatNormal = texture2D(clearcoatNormalMap, vUv).xyz * 2.0 - 1.0;
		clearcoatNormal = normalize(vTBN * clearcoatNormal);

		float clearcoatRoughnessVal = clearcoatRoughness * texture2D(clearcoatRoughnessMap, vUv).g;
		float clearcoatNoV = clamp(abs(dot(clearcoatNormal, V)), 0.001, 1.0);

		vec3 clearcoatF = F_Schlick(clearcoatNoV, vec3(0.04));
		color = mix(color, color * (1.0 - clearcoatF), clearcoat);
	}

    // Sheen (simplified)
	if(sheenRoughness > 0.0) {
		vec3 sheenColorVal = sheenColor * texture2D(sheenColorMap, vUv).rgb;
		float sheenD = D_GGX(NoH, GGXRoughnessToAlpha(sheenRoughness));
		vec3 sheen = sheenD * sheenColorVal;
		color += sheen * NoL;
	}

    // Gamma correction
	color = linearToSRGB(color);

	gl_FragColor = vec4(color, alpha);
}
