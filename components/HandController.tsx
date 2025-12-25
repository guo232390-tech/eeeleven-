import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GestureState } from '../types';

interface HandControllerProps {
  onGestureChange: (state: GestureState) => void;
}

export const HandController: React.FC<HandControllerProps> = ({ onGestureChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      setIsLoaded(true);
      startWebcam();
    };

    init();
    return () => {
      if(requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startWebcam = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predict);
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    }
  };

  const predict = () => {
    if (!handLandmarkerRef.current || !videoRef.current) return;
    
    // Process only when video is ready
    if (videoRef.current.videoWidth > 0) {
        let startTimeMs = performance.now();
        const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
        
        let detectedGesture: GestureState['gesture'] = 'NONE';
        let handX = 0.5;
        let handY = 0.5;
        let isDetected = false;

        if (results.landmarks.length > 0) {
            isDetected = true;
            const landmarks = results.landmarks[0];
            
            const wrist = landmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];
            const ringTip = landmarks[16];
            const pinkyTip = landmarks[20];

            handX = wrist.x;
            handY = wrist.y;

            const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
            
            const fingerTips = [indexTip, middleTip, ringTip, pinkyTip];
            let avgDistToWrist = 0;
            fingerTips.forEach(tip => avgDistToWrist += dist(tip, wrist));
            avgDistToWrist /= 4;

            // Tuned Heuristics
            // Increase sensitivity for FIST:
            // Previous threshold was 0.22, increasing to 0.26 makes it easier to trigger "Close/Tree" mode.
            if (avgDistToWrist < 0.26) { 
                detectedGesture = 'FIST';
            } 
            // Open Hand
            else if (avgDistToWrist > 0.30) {
                detectedGesture = 'OPEN';
            }
        }

        onGestureChange({
            isHandDetected: isDetected,
            gesture: detectedGesture,
            handPosition: { x: handX, y: handY },
            rotation: 0 
        });
    }

    requestRef.current = requestAnimationFrame(predict);
  };

  return (
    <div className="absolute bottom-4 left-4 z-50 pointer-events-none opacity-50 hidden md:block">
       <video 
         ref={videoRef} 
         autoPlay 
         playsInline
         muted
         className="w-32 h-24 rounded-lg border border-white/20 transform scale-x-[-1]"
       />
    </div>
  );
};