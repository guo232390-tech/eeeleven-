import React, { useState, useRef } from 'react';
import { Send, Sparkles, Hand, Grab, Upload, ImagePlus, Snowflake, TreePine } from 'lucide-react';
import { POSITIVE_PHRASES, COLORS } from '../constants';
import { AppMode } from '../types';

interface InterfaceProps {
  onWishSubmit: () => void;
  onPhotosUpload: (files: FileList) => void;
  onToggleMode: () => void;
  mode: AppMode;
}

export const Interface: React.FC<InterfaceProps> = ({ onWishSubmit, onPhotosUpload, onToggleMode, mode }) => {
  const [wish, setWish] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wish.trim()) return;
    
    setWish('');
    const randomPhrase = POSITIVE_PHRASES[Math.floor(Math.random() * POSITIVE_PHRASES.length)];
    setResponse(randomPhrase);
    onWishSubmit(); // Trigger effect

    setTimeout(() => setResponse(null), 5000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onPhotosUpload(e.target.files);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
      
      {/* Header */}
      <div className="w-full text-center mt-4">
        <h1 
          className="text-4xl md:text-6xl font-bold tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]"
          style={{ fontFamily: "'Cinzel', serif", color: COLORS.GOLD }}
        >
          Eleven Merry Christmas
        </h1>
        <p className="text-white/60 text-sm mt-2 tracking-widest font-light">
          IMMERSIVE HOLIDAY EXPERIENCE
        </p>
      </div>

      {/* Top Right Controls Group */}
      <div className="absolute top-20 right-6 pointer-events-auto flex flex-col items-end gap-3 z-40">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-white/5 border border-white/10 text-yellow-100/80 hover:bg-white/10 hover:text-white transition-all hover:scale-105 active:scale-95 group shadow-lg shadow-black/20"
        >
          <ImagePlus size={18} />
          <span className="text-xs tracking-wider font-serif">ADD PHOTOS</span>
        </button>
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Bottom Left Mode Toggle */}
      <div className="absolute bottom-6 left-6 pointer-events-auto z-40">
        <button 
          onClick={onToggleMode}
          className="flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-md bg-white/5 border border-white/10 text-white shadow-2xl hover:bg-white/10 transition-all active:scale-95 group"
        >
            {mode === AppMode.TREE ? (
                <>
                   <Snowflake className="w-5 h-5 text-yellow-400 group-hover:rotate-180 transition-transform duration-500" />
                   <span className="text-sm font-serif tracking-widest">SCATTER</span>
                </>
            ) : (
                <>
                   <TreePine className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" />
                   <span className="text-sm font-serif tracking-widest">COLLECT</span>
                </>
            )}
        </button>
      </div>

      {/* Instructions Overlay (Slightly moved up) */}
      <div className="absolute top-32 left-6 text-white/40 text-xs md:text-sm space-y-3 max-w-[200px]">
        <div className="flex items-center gap-3">
            <Hand className="w-4 h-4 text-yellow-500/80" /> 
            <span className="drop-shadow-md">Open Hand: Scatter</span>
        </div>
        <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center text-[8px] text-white">✊</div> 
            <span className="drop-shadow-md">Fist: Collect Tree</span>
        </div>
        <div className="flex items-center gap-3">
            <Grab className="w-4 h-4 text-yellow-500/80" /> 
            <span className="drop-shadow-md">Pinch: Zoom Photo</span>
        </div>
      </div>

      {/* Center Feedback */}
      {response && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center animate-pulse z-50">
             <div className="text-3xl md:text-5xl text-white font-serif italic drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">
               {response}
             </div>
             <Sparkles className="w-8 h-8 text-yellow-400 mx-auto mt-2 animate-spin-slow" />
        </div>
      )}

      {/* Wish Input - Bottom Right */}
      <div className="pointer-events-auto self-end w-full max-w-sm z-50">
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4 shadow-2xl ring-1 ring-white/5 transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-yellow-900/20">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <label className="text-xs text-yellow-100/80 uppercase tracking-widest font-semibold ml-1">
              Make a Wish
            </label>
            <div className="relative">
              <input
                type="text"
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                placeholder="Write your wish here..."
                className="w-full bg-black/40 text-white placeholder-white/30 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-1 focus:ring-yellow-500/50 border border-white/5 font-serif transition-all"
              />
              <button 
                type="submit" 
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-yellow-400 hover:text-white transition-colors hover:scale-110 active:scale-95"
                disabled={!wish.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};