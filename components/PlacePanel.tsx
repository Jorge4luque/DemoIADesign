/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { UploadIcon } from './icons';

interface PlacePanelProps {
  onPlaceObject: () => void;
  isLoading: boolean;
  isLocationSelected: boolean;
  justPlacedObject: boolean;
  placementObject: File | null;
  onPlacementObjectChange: (file: File | null) => void;
  placementPrompt: string;
  onPlacementPromptChange: (prompt: string) => void;
}

const PlacePanel: React.FC<PlacePanelProps> = ({ 
  onPlaceObject,
  isLoading,
  isLocationSelected,
  justPlacedObject,
  placementObject,
  onPlacementObjectChange,
  placementPrompt,
  onPlacementPromptChange,
}) => {
  const [furnitureImageUrl, setFurnitureImageUrl] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (placementObject) {
      const url = URL.createObjectURL(placementObject);
      setFurnitureImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFurnitureImageUrl(null);
    }
  }, [placementObject]);

  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      onPlacementObjectChange(files[0]);
    }
  };

  const handleApply = async () => {
    if (placementPrompt && placementObject && isLocationSelected) {
      onPlaceObject();
    }
  };
  
  const getInstructionText = () => {
    if (justPlacedObject) {
        return "Object placed! To move or modify it, switch to the 'Retouch' tab and click on it.";
    }
    if (!placementObject) {
      return '1. Upload an image of the object you want to place.';
    }
    if (!isLocationSelected) {
      return '2. Great! Now click a location on the main image.';
    }
    return '3. Perfect! Now describe how to place the object.';
  }

  const UploadArea = () => (
    <div 
      className={`relative w-full h-40 flex flex-col items-center justify-center text-center p-4 transition-all duration-300 rounded-lg border-2 ${isDraggingOver ? 'bg-blue-500/10 border-dashed border-blue-400' : 'bg-gray-900/50 border-dashed border-gray-600 hover:border-gray-500'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        handleFileSelect(e.dataTransfer.files);
      }}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        ref={fileInputRef}
        type="file" 
        className="hidden" 
        accept="image/png, image/jpeg, image/webp" 
        onChange={(e) => handleFileSelect(e.target.files)} 
      />
      <UploadIcon className="w-8 h-8 text-gray-400 mb-2" />
      <p className="font-semibold text-gray-300">Upload Object Image</p>
      <p className="text-sm text-gray-500">Click or drag & drop a file</p>
      <p className="text-xs text-gray-500 mt-1">Tip: Use an image with a transparent background for best results.</p>
    </div>
  );

  const FurniturePreview = () => (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full flex items-center gap-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
          <div className="w-20 h-20 flex-shrink-0 bg-white/10 rounded-md flex items-center justify-center overflow-hidden">
            <img 
              src={furnitureImageUrl!} 
              alt="Furniture preview" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="flex-grow min-w-0">
              <p className="font-semibold text-gray-200 truncate">{placementObject?.name}</p>
              <p className="text-sm text-gray-400">{(placementObject!.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
              onClick={() => { onPlacementObjectChange(null); }}
              disabled={isLoading}
              className="text-gray-400 hover:text-white transition-colors text-sm font-semibold py-2 px-3 bg-white/5 hover:bg-white/10 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
              Change
          </button>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-300">Place an Object</h3>
        <p className="text-sm text-gray-400">{getInstructionText()}</p>
      </div>
      
      {placementObject && furnitureImageUrl ? <FurniturePreview /> : <UploadArea />}

      <input
        type="text"
        value={placementPrompt}
        onChange={(e) => onPlacementPromptChange(e.target.value)}
        placeholder={!placementObject || !isLocationSelected ? "Waiting for object and location..." : "e.g., 'place this chair in the corner'"}
        className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
        disabled={isLoading || !placementObject || !isLocationSelected}
      />

      <button
          onClick={handleApply}
          className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
          disabled={isLoading || !placementPrompt.trim() || !placementObject || !isLocationSelected}
      >
          Generate Placement
      </button>
    </div>
  );
};

export default PlacePanel;