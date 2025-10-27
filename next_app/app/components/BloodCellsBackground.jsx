'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Lava lamp-like blood cell component
function BloodCell({ position, speed, scale, rotation, index }) {
  const meshRef = useRef();
  
  // Animation loop
  useFrame((state) => {
    if (meshRef.current) {
      // Calculate time offset based on index for varied movement
      const timeOffset = index * 0.5;
      
      // Slow horizontal movement
      meshRef.current.position.x += speed * 0.3;
      
      // More pronounced vertical movement for lava lamp effect
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 0.2 + timeOffset) * 0.02;
      
      // Slight depth movement
      meshRef.current.position.z += Math.cos(state.clock.elapsedTime * 0.15 + timeOffset) * 0.01;
      
      // Reset position when cell goes off screen
      if (meshRef.current.position.x > 25) {
        meshRef.current.position.x = -25;
        meshRef.current.position.y = Math.random() * 30 - 15;
        meshRef.current.position.z = Math.random() * 5 - 2.5;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      {/* Larger sphere for blood cell */}
      <sphereGeometry args={[1, 24, 24]} />
      <meshBasicMaterial 
        color="#e11d48" 
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

// Main component with fewer, larger cells
export default function BloodCellsBackground() {
  // State to track if we're on a mobile device
  const [cellCount, setCellCount] = useState(25);
  
  // Adjust cell count based on screen size for performance
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCellCount(15); // Fewer cells for mobile
      } else if (window.innerWidth < 1280) {
        setCellCount(20); // Medium amount for tablets
      } else {
        setCellCount(25); // Full amount for desktops
      }
    };
    
    // Set initial count
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Generate random cells
  const cells = useMemo(() => {
    return Array.from({ length: cellCount }, (_, i) => ({
      position: [
        Math.random() * 50 - 25, // x: -25 to 25
        Math.random() * 30 - 15, // y: -15 to 15
        Math.random() * 5 - 2.5  // z: -2.5 to 2.5
      ],
      rotation: [
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ],
      speed: 0.02 + Math.random() * 0.04, // Slower speed
      scale: [0.8 + Math.random() * 1.2, 0.8 + Math.random() * 1.2, 0.8 + Math.random() * 1.2] // Larger scale
    }));
  }, [cellCount]);

  // Soft pink background color
  const pinkBackgroundColor = "#fff1f2"; // Very light pink

  return (
    <div className="fixed inset-0 z-0" style={{ backgroundColor: pinkBackgroundColor }}>
      <Canvas shadows dpr={[1, 1.5]} performance={{ min: 0.5 }}>
        <color attach="background" args={[pinkBackgroundColor]} />
        <PerspectiveCamera makeDefault position={[0, 0, 20]} fov={75} />
        <ambientLight intensity={1} />
        
        {cells.map((cell, i) => (
          <BloodCell 
            key={i}
            index={i}
            position={cell.position} 
            speed={cell.speed} 
            scale={cell.scale}
            rotation={cell.rotation}
          />
        ))}
        
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      </Canvas>
    </div>
  );
}