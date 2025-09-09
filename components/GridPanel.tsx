/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { UploadIcon } from './icons';

interface GridPanelProps {
  onGenerateGrid: () => void;
  isLoading: boolean;
  gridImages: File[];
  onGridImagesChange: (files: File[]) => void;
  gridPrompt: string;
  onGridPromptChange: (prompt: string) => void;
}

const GridPanel: React.FC<GridPanelProps> = ({
  onGenerateGrid,
  isLoading,
  gridImages,
  onGridImagesChange,
  gridPrompt,
  onGridPromptChange,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = gridImages.map(file => URL.createObjectURL(file));
    setImageUrls(urls);
    
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [gridImages]);

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      onGridImagesChange([...gridImages, ...newFiles]);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newFiles = [...gridImages];
    newFiles.splice(index, 1);
    onGridImagesChange(newFiles);
  };
  
  const instructionText = "Upload multiple items to create a mood board. Then, describe the scene you want to generate.";

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
      <UploadIcon className="w-8 h-8 text-gray-400 mb-2" />
      <p className="font-semibold text-gray-300">Upload Items</p>
      <p className="text-sm text-gray-500">Click or drag & drop files</p>
    </div>
  );

  const GridPreview = () => (
    <div className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {imageUrls.map((url, index) => (
        <div key={index} className="relative aspect-square group">
          <img src={url} alt={`Grid item ${index + 1}`} className="w-full h-full object-cover rounded-md" />
          <button 
            onClick={() => handleRemoveImage(index)}
            disabled={isLoading}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
            aria-label="Remove item"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="aspect-square flex flex-col items-center justify-center bg-gray-900/50 border-2 border-dashed border-gray-600 hover:border-gray-500 rounded-md transition-colors text-gray-400 hover:text-white"
      >
        <UploadIcon className="w-6 h-6 mb-1" />
        <span className="text-xs font-semibold">Add More</span>
      </button>
    </div>
  );

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <input 
        ref={fileInputRef}
        type="file" 
        multiple
        className="hidden" 
        accept="image/png, image/jpeg, image/webp" 
        onChange={(e) => handleFileSelect(e.target.files)} 
      />
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-300">Generate Scene from Grid</h3>
        <p className="text-sm text-gray-400">{instructionText}</p>
      </div>
      
      {gridImages.length > 0 ? <GridPreview /> : <UploadArea />}

      <textarea
        value={gridPrompt}
        onChange={(e) => onGridPromptChange(e.target.value)}
        placeholder="e.g., 'A cozy living room with a fireplace, using these items'"
        className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
        disabled={isLoading || gridImages.length === 0}
        rows={2}
      />

      <button
          onClick={onGenerateGrid}
          className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
          disabled={isLoading || !gridPrompt.trim() || gridImages.length === 0}
      >
          Generate Scene
      </button>
    </div>
  );
};

export default GridPanel;
