import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { BACKGROUND_MUSIC_URL, COLORS } from '../constants';

export const MusicPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // 1. Configure audio settings on mount
    if (audioRef.current) {
      audioRef.current.volume = 0.3; // Default to soft volume (30%)
    }

    // 2. Browser Autoplay Policy Handler
    // Most browsers block audio until the user interacts with the page (click/tap).
    const attemptPlay = async () => {
      if (!audioRef.current) return;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        // Autoplay blocked, wait for interaction
        console.log("Autoplay blocked, waiting for user interaction.");
      }
    };

    attemptPlay();

    // 3. Global listener to unlock audio on first interaction
    const unlockAudio = () => {
      if (!hasInteracted && audioRef.current) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setHasInteracted(true);
        }).catch(() => {});
      }
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [hasInteracted]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <>
      <audio 
        ref={audioRef} 
        src={BACKGROUND_MUSIC_URL} 
        loop 
        preload="auto"
      />
      
      <button 
        onClick={togglePlay}
        className="absolute top-6 right-6 z-50 p-3 rounded-full backdrop-blur-md bg-white/5 border border-white/10 text-yellow-100/80 hover:bg-white/10 hover:text-white transition-all hover:scale-110 active:scale-95 group"
        title={isPlaying ? "Mute Music" : "Play Music"}
      >
        {isPlaying ? (
          <Volume2 size={24} className="drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
        ) : (
          <VolumeX size={24} className="opacity-70" />
        )}
        
        {/* Tooltip helper */}
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 text-xs text-white/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {isPlaying ? "Pause Ambient Music" : "Play Ambient Music"}
        </span>
      </button>
    </>
  );
};