import React, { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { TreeScene } from './components/TreeScene';
import { Interface } from './components/Interface';
import { HandController } from './components/HandController';
import { MusicPlayer } from './components/MusicPlayer';
import { AppMode, GestureState } from './types';
import { LOCKED_PHOTOS } from './constants';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  
  // Start with default online images, but allow user to prepend their own
  const [customImages, setCustomImages] = useState<string[]>(LOCKED_PHOTOS);

  const [gestureState, setGestureState] = useState<GestureState>({
    isHandDetected: false,
    gesture: 'NONE',
    handPosition: { x: 0.5, y: 0.5 },
    rotation: 0
  });

  const handlePhotosUpload = useCallback((files: FileList) => {
    const newImageUrls = Array.from(files).map(file => URL.createObjectURL(file));
    // Prepend new images so they appear first and are prioritized in the cycle
    setCustomImages(prev => [...newImageUrls, ...prev]);
  }, []);

  // Gesture Logic to State Machine
  const handleGestureChange = useCallback((state: GestureState) => {
    setGestureState(state);

    // Global mode switching logic based on gesture
    if (state.gesture === 'FIST') {
        // Fist always returns to Tree mode and resets selection
        setMode(AppMode.TREE);
        setActivePhotoId(null);
    } else if (state.gesture === 'OPEN') {
        // Open hand triggers scatter (unless we are already locked in a photo via click)
        // We only switch to SCATTER if we aren't currently viewing a specific photo
        if (mode !== AppMode.SCATTER && mode !== AppMode.PHOTO) {
           setMode(AppMode.SCATTER);
        }
    }
  }, [mode]);

  const handlePhotoSelect = (id: string) => {
    setActivePhotoId(id);
    setMode(AppMode.PHOTO);
  };

  const handleWishSubmit = () => {
    setMode(AppMode.SCATTER);
    setTimeout(() => {
        if (gestureState.gesture !== 'OPEN') {
            setMode(AppMode.TREE);
        }
    }, 2000);
  };

  const toggleMode = () => {
    if (mode === AppMode.TREE) {
        setMode(AppMode.SCATTER);
    } else {
        setMode(AppMode.TREE);
        setActivePhotoId(null);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#05100a] overflow-hidden">
      
      {/* Background Music */}
      <MusicPlayer />

      {/* 3D Scene */}
      <Canvas shadows camera={{ position: [0, 0, 18], fov: 45 }} gl={{ antialias: false }}>
        <TreeScene 
            mode={mode} 
            uploadedImages={customImages} 
            gestureState={gestureState}
            onPhotoSelect={handlePhotoSelect}
            activePhotoId={activePhotoId}
        />
      </Canvas>

      {/* HTML Interface */}
      <Interface 
        onWishSubmit={handleWishSubmit} 
        onPhotosUpload={handlePhotosUpload}
        onToggleMode={toggleMode}
        mode={mode}
      />

      {/* Hand Tracking */}
      <HandController onGestureChange={handleGestureChange} />
      
      <Loader 
        containerStyles={{ backgroundColor: '#05100a' }}
        innerStyles={{ width: '200px', height: '10px', backgroundColor: '#333' }}
        barStyles={{ backgroundColor: '#FFD700', height: '10px' }}
        dataInterpolation={(p) => `Loading Magic... ${p.toFixed(0)}%`}
      />
    </div>
  );
}

export default App;