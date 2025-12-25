import React, { useRef, useMemo, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Stars, Sparkles, Environment, Float, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AppMode, ParticleData, GestureState } from '../types';
import { COLORS, PARTICLE_COUNT, TREE_HEIGHT, TREE_RADIUS } from '../constants';

interface TreeSceneProps {
  mode: AppMode;
  uploadedImages: string[];
  gestureState: GestureState;
  onPhotoSelect: (id: string) => void;
  activePhotoId: string | null;
}

// ---- Geometry Helpers ----

// Spiral/Streamline point for Photos in Scatter Mode
const spiralPoint = (index: number, total: number) => {
    const t = (index / Math.max(total, 1)) * Math.PI * 6; 
    const radius = 6 + (index / total) * 6; 
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;
    const y = -5 + (index / total) * 15; 
    return new THREE.Vector3(x, y, z);
};

const randomSpherePoint = (radius: number) => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  );
};

// Standard tree cone logic - Tighter packing
const conePoint = (index: number, total: number, forceSurface: boolean = false) => {
  const normalizedIndex = index / total;
  // Use a stronger power to push more volume to the bottom, making it look stable
  const biasedIndex = Math.pow(normalizedIndex, 1.1);
  
  const y = (biasedIndex * TREE_HEIGHT) - (TREE_HEIGHT / 2);
  const maxRadiusAtY = ((TREE_HEIGHT / 2 - y) / TREE_HEIGHT) * TREE_RADIUS;
  
  let r;
  if (forceSurface) {
    // Push surface elements very close to the edge for a defined shape
    r = (0.95 + 0.05 * Math.random()) * maxRadiusAtY;
  } else {
    // Fill the volume, but bias towards the outside so it doesn't look hollow
    r = Math.pow(Math.random(), 0.3) * maxRadiusAtY;
  }
  
  const theta = index * 2.39996 + (Math.random() * 0.05); // Less random variation in theta for cleaner lines
  return new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
};

// Helper for explicit placement of photos on tree surface
const photoConePoint = (index: number, totalPhotos: number) => {
    // Distribute photos evenly along the spiral of the tree
    const y = -TREE_HEIGHT/2 + (index / totalPhotos) * (TREE_HEIGHT * 0.85) + 1;
    const maxRadiusAtY = ((TREE_HEIGHT / 2 - y) / TREE_HEIGHT) * TREE_RADIUS;
    // Push photos OUTWARD (1.15x) so they float slightly above the ornaments
    const r = maxRadiusAtY * 1.15; 
    const theta = index * (Math.PI * 2 / 1.618); 
    return new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
};

// ---- Components ----

const GiftBox = ({ color }: { color: string }) => (
  <group>
    <mesh castShadow receiveShadow>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshPhysicalMaterial color={color} roughness={0.3} metalness={0.6} />
    </mesh>
    <mesh>
      <boxGeometry args={[0.52, 0.52, 0.15]} />
      <meshPhysicalMaterial color={COLORS.GOLD} metalness={1} roughness={0.2} emissive={COLORS.GOLD} emissiveIntensity={0.2} />
    </mesh>
    <mesh>
      <boxGeometry args={[0.15, 0.52, 0.52]} />
      <meshPhysicalMaterial color={COLORS.GOLD} metalness={1} roughness={0.2} emissive={COLORS.GOLD} emissiveIntensity={0.2} />
    </mesh>
  </group>
);

const LuxuryOrnament = ({ color }: { color: string }) => (
  <mesh castShadow receiveShadow>
    <sphereGeometry args={[0.3, 32, 32]} />
    <meshPhysicalMaterial 
        color={color} 
        metalness={0.9} 
        roughness={0.1} 
        clearcoat={1} 
        clearcoatRoughness={0.1}
        emissive={color} 
        emissiveIntensity={0.2} 
    />
  </mesh>
);

const GlowingStar = () => (
  <mesh castShadow>
    <octahedronGeometry args={[0.25, 0]} />
    <meshStandardMaterial color={COLORS.WHITE_GLOW} emissive={COLORS.GOLD} emissiveIntensity={4} toneMapped={false} />
  </mesh>
);

const FallbackFrame = ({ url }: { url?: string }) => (
    <group>
        <mesh name="photo-frame-border">
          <boxGeometry args={[1.5, 1.5, 0.1]} />
          <meshPhysicalMaterial color={COLORS.GOLD} metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[1.3, 1.3]} />
          <meshStandardMaterial color="#5e0000" roughness={0.5} metalness={0.2} />
        </mesh>
        <Text
            position={[0, 0, 0.08]}
            fontSize={0.12}
            color={COLORS.GOLD}
            maxWidth={1.2}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            lineHeight={1.5}
        >
            {"MERRY\nCHRISTMAS"}
        </Text>
    </group>
);

const SafePhotoFrame = ({ textureUrl, isTreeMode }: { textureUrl: string, isTreeMode: boolean }) => {
  const texture = useLoader(THREE.TextureLoader, textureUrl);

  if (texture) {
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
  }

  return (
    <group>
        {isTreeMode && (
           <mesh position={[0, 0.8, 0]}>
             <cylinderGeometry args={[0.02, 0.02, 0.8]} />
             <meshStandardMaterial color={COLORS.GOLD} />
           </mesh>
        )}
        <mesh name="photo-frame-border">
          <boxGeometry args={[1.5, 1.5, 0.1]} />
          <meshPhysicalMaterial color={COLORS.GOLD} metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.06]} name="photo-frame-surface">
          <planeGeometry args={[1.3, 1.3]} />
          <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
    </group>
  );
};

class PhotoErrorBoundary extends React.Component<{fallback: React.ReactNode, children: React.ReactNode}, {hasError: boolean}> {
    state = { hasError: false };
    static getDerivedStateFromError(error: any) { 
        console.error("Failed to load photo texture:", error);
        return { hasError: true }; 
    }
    render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

// ---- Particle Object ----

interface ParticleObjProps {
  data: ParticleData;
  mode: AppMode;
  activePhotoId: string | null;
  onPhotoSelect: (id: string) => void;
}

const ParticleObj: React.FC<ParticleObjProps> = ({ data, mode, activePhotoId, onPhotoSelect }) => {
  const mesh = useRef<THREE.Group>(null);
  const randomRot = useRef(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0));
  const timeOffset = useRef(Math.random() * 100);
  const [isHovered, setIsHovered] = useState(false);

  const isSelected = activePhotoId === data.id;

  useFrame((state) => {
    if (!mesh.current) return;

    let targetPos = data.targetTree;
    let targetScale = data.scale;
    let targetRot = data.rotation;
    const time = state.clock.elapsedTime;

    if (mode === AppMode.SCATTER) {
      if (data.type === 'photo') {
         targetPos = data.targetScatter.clone();
         targetPos.y += Math.sin(time * 0.5 + Number(data.id.split('-')[1])) * 0.5;
         
         mesh.current.lookAt(state.camera.position);
         targetRot = mesh.current.rotation.clone(); 
         if (isHovered && !activePhotoId) {
            targetScale = data.scale * 1.5;
            document.body.style.cursor = 'pointer';
         }
      } else {
         targetPos = data.targetScatter.clone().add(new THREE.Vector3(Math.sin(time * 0.5 + timeOffset.current) * 0.5, Math.cos(time * 0.3 + timeOffset.current) * 0.5, 0));
         targetRot = randomRot.current;
      }
    } else if (mode === AppMode.PHOTO) {
      if (isSelected) {
         targetPos = new THREE.Vector3(0, 0, 12); 
         targetScale = 4.0; 
         mesh.current.lookAt(state.camera.position);
         targetRot = mesh.current.rotation.clone();
         targetPos.y += Math.sin(time) * 0.2;
      } else {
         const dir = data.position.clone().normalize();
         targetPos = dir.multiplyScalar(25); 
         targetScale = 0; 
      }
    } else {
        // Tree Mode
        // Minimal sway for a solid look
        const sway = Math.sin(time * 2 + data.position.x) * 0.02;
        targetPos = targetPos.clone().add(new THREE.Vector3(sway, sway * 0.5, 0));
        if (isHovered && data.type === 'photo') targetScale = data.scale * 1.2;
    }

    const speed = isSelected || isHovered ? 0.1 : 0.06;
    mesh.current.position.lerp(targetPos, speed);
    mesh.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), speed);
    if (!isSelected) { 
        mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, targetRot.x, 0.08);
        mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, targetRot.y, 0.08);
        mesh.current.rotation.z = THREE.MathUtils.lerp(mesh.current.rotation.z, targetRot.z, 0.08);
    }
  });

  return (
    <group 
      ref={mesh} 
      position={data.position} 
      onClick={(e) => {
        if (data.type === 'photo') {
            e.stopPropagation();
            onPhotoSelect(data.id);
        }
      }}
      onPointerOver={(e) => {
        if (data.type === 'photo') {
            e.stopPropagation();
            setIsHovered(true);
            document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={(e) => {
        if (data.type === 'photo') {
            setIsHovered(false);
            document.body.style.cursor = 'auto';
        }
      }}
    >
      {data.type === 'sphere' && <LuxuryOrnament color={data.color} />}
      {data.type === 'box' && <GiftBox color={data.color} />}
      {data.type === 'candy' && <GlowingStar />} 
      {data.type === 'photo' && data.textureUrl && (
        <PhotoErrorBoundary fallback={<FallbackFrame url={data.textureUrl} />}>
            <React.Suspense fallback={<FallbackFrame url={data.textureUrl} />}>
                <SafePhotoFrame textureUrl={data.textureUrl} isTreeMode={mode === AppMode.TREE} />
            </React.Suspense>
        </PhotoErrorBoundary>
      )}
    </group>
  );
};

// ---- Main Scene ----

export const TreeScene: React.FC<TreeSceneProps> = ({ mode, uploadedImages, gestureState, onPhotoSelect, activePhotoId }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!groupRef.current) return;
    let targetY = 0;
    let targetX = 0;
    const isInteracting = gestureState.isHandDetected && mode === AppMode.SCATTER;

    if (isInteracting && !activePhotoId) {
        targetY = (gestureState.handPosition.x - 0.5) * Math.PI * 2;
        targetX = (gestureState.handPosition.y - 0.5) * Math.PI * 0.5;
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.05);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.05);
    } else if (mode === AppMode.TREE) {
         groupRef.current.rotation.y += 0.003; // Slightly faster rotation for brilliance
         groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
    }
  });

  const particles = useMemo(() => {
    const temp: ParticleData[] = [];
    const imageCount = uploadedImages.length;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let type: ParticleData['type'] = 'sphere';
      let color = COLORS.GOLD;
      let texUrl: string | undefined = undefined;
      // SIGNIFICANTLY INCREASED SCALES for fuller look
      let scale = Math.random() * 0.5 + 0.8; // Base scale: 0.8 to 1.3
      let forceSurface = false;
      let treePos, scatterPos;

      if (i < imageCount) {
          type = 'photo';
          texUrl = uploadedImages[i];
          scale = 1.2; // Larger photos
          forceSurface = true;
          treePos = photoConePoint(i, imageCount);
          scatterPos = spiralPoint(i, imageCount);
      } else {
          const rand = Math.random();
          if (rand > 0.90) { 
              type = 'box'; 
              color = Math.random() > 0.5 ? COLORS.RUBY : COLORS.EMERALD; 
              forceSurface = false; 
              scale *= 1.2; // Boxes are chunky
          }
          else if (rand > 0.75) { // More stars/candies
              type = 'candy'; 
              forceSurface = true; 
          }
          else {
            type = 'sphere';
            const colorRand = Math.random();
            if (colorRand > 0.6) color = COLORS.RUBY;
            else if (colorRand > 0.4) color = COLORS.EMERALD;
            else if (colorRand > 0.15) color = COLORS.CHAMPAGNE;
            else color = COLORS.GOLD;
            forceSurface = Math.random() > 0.4;
          }

          treePos = conePoint(i, PARTICLE_COUNT, forceSurface);
          scatterPos = randomSpherePoint(20);
      }

      const dummyObj = new THREE.Object3D();
      dummyObj.position.copy(treePos);
      dummyObj.lookAt(0, treePos.y, 0); 
      dummyObj.rotateY(Math.PI); 
      const treeRot = dummyObj.rotation.clone();
      
      temp.push({
        id: `p-${i}`,
        type,
        position: treePos,
        targetTree: treePos,
        targetScatter: scatterPos,
        rotation: treeRot,
        color,
        textureUrl: texUrl,
        scale,
      });
    }
    return temp;
  }, [uploadedImages]);

  return (
    <>
      <color attach="background" args={['#05100a']} />
      <Environment preset="city" /> 
      
      {/* Lighting System Enhanced */}
      <ambientLight intensity={0.4} color="#ffffff" />
      <pointLight position={[10, 10, 10]} intensity={1.5} color={COLORS.GOLD} />
      <pointLight position={[-10, 5, -5]} intensity={1} color={COLORS.RUBY} />
      <spotLight position={[0, 20, 0]} angle={0.5} penumbra={1} intensity={2} color={COLORS.CHAMPAGNE} castShadow />
      
      {/* Magical Inner Glow Light */}
      <pointLight position={[0, 0, 0]} intensity={3} color="#ff9900" distance={12} decay={2} />
      <pointLight position={[0, 4, 0]} intensity={2} color="#ffdd00" distance={10} decay={2} />

      <pointLight position={[0, -5, 0]} intensity={2} color={COLORS.GOLD} distance={10} />
      
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
         <Sparkles count={200} scale={20} size={6} speed={0.3} opacity={0.4} color={COLORS.GOLD} />
      </Float>

      <group ref={groupRef}>
        {particles.map((p) => (
          <ParticleObj 
            key={p.id} 
            data={p} 
            mode={mode} 
            activePhotoId={activePhotoId}
            onPhotoSelect={onPhotoSelect}
          />
        ))}
        {/* Larger Top Star */}
        <mesh position={[0, TREE_HEIGHT/2 + 1.2, 0]}>
            <octahedronGeometry args={[1.8, 0]} />
            <meshStandardMaterial color={COLORS.GOLD} emissive={COLORS.GOLD} emissiveIntensity={4} toneMapped={false} />
        </mesh>
        <pointLight position={[0, TREE_HEIGHT/2 + 1.2, 0]} intensity={3} color={COLORS.GOLD} distance={8} />
      </group>

      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.7} mipmapBlur intensity={1.5} radius={0.5} />
        <Vignette eskil={false} offset={0.1} darkness={0.8} />
      </EffectComposer>
    </>
  );
};