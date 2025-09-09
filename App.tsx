/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generatePlacedImage, generateFromGrid, generateExpandedImage } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import PlacePanel from './components/PlacePanel';
import GridPanel from './components/GridPanel';
import ExpandPanel from './components/ExpandPanel';
import { UndoIcon, RedoIcon, EyeIcon } from './components/icons';
import StartScreen from './components/StartScreen';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// Creates a placeholder image to use as a base when starting in Grid Combine mode.
const createPlaceholderImage = (): Promise<File> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return reject(new Error('Could not create canvas context for placeholder'));
        }
        
        ctx.fillStyle = '#090A0F'; // Match the body background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '32px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Grid Combine Mode', canvas.width / 2, canvas.height / 2 - 20);
        
        ctx.font = '18px Inter, sans-serif';
        ctx.fillStyle = '#6B7280';
        ctx.fillText('Upload items in the panel below to get started.', canvas.width / 2, canvas.height / 2 + 20);

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], 'grid_placeholder.png', { type: 'image/png' });
                resolve(file);
            } else {
                reject(new Error('Canvas to Blob conversion failed for placeholder'));
            }
        }, 'image/png');
    });
};

type Tab = 'retouch' | 'place' | 'grid' | 'expand' | 'adjust' | 'filters' | 'crop';

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  
  // State for the Place panel for iterative adjustments
  const [placementObject, setPlacementObject] = useState<File | null>(null);
  const [placementPrompt, setPlacementPrompt] = useState<string>('');
  const [justPlacedObject, setJustPlacedObject] = useState<boolean>(false);

  // State for the Grid panel
  const [gridImages, setGridImages] = useState<File[]>([]);
  const [gridPrompt, setGridPrompt] = useState<string>('');

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  // Effect to create and revoke object URLs safely for the original image
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Reset transient states after an action
    setCrop(undefined);
    setCompletedCrop(undefined);
    setEditHotspot(null);
    setDisplayHotspot(null);
  }, [history, historyIndex]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setPlacementObject(null);
    setPlacementPrompt('');
    setJustPlacedObject(false);
    setGridImages([]);
    setGridPrompt('');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }

    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setJustPlacedObject(false);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply a filter to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setJustPlacedObject(false);
    
    try {
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setJustPlacedObject(false);
    
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handlePlaceObject = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to place an object on.');
      return;
    }
    if (!placementObject) {
      setError('No object image provided to place.');
      return;
    }
    if (!editHotspot) {
        setError('Please click on the image to select a location to place the object.');
        return;
    }
     if (!placementPrompt.trim()) {
        setError('Please enter a description for how to place the object.');
        return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const placedImageUrl = await generatePlacedImage(currentImage, placementObject, placementPrompt, editHotspot);
        const newImageFile = dataURLtoFile(placedImageUrl, `placed-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setJustPlacedObject(true);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to place the object. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, placementObject, placementPrompt, editHotspot, addImageToHistory]);

  const handleGenerateGrid = useCallback(async () => {
    if (gridImages.length === 0) {
      setError('Please upload one or more images for the grid.');
      return;
    }
    if (!gridPrompt.trim()) {
      setError('Please enter a prompt to describe the scene you want to create.');
      return;
    }
    if (!imgRef.current) {
        setError('Cannot determine output dimensions as no base image is loaded.');
        return;
    }
    
    setIsLoading(true);
    setError(null);
    setJustPlacedObject(false);
    
    try {
        const { naturalWidth, naturalHeight } = imgRef.current;
        const finalImageUrl = await generateFromGrid(gridImages, gridPrompt, { width: naturalWidth, height: naturalHeight });
        const newImageFile = dataURLtoFile(finalImageUrl, `grid-generated-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setActiveTab('retouch'); // Switch back to a main tab to see the result
        setGridImages([]);
        setGridPrompt('');

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate from grid. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [gridImages, gridPrompt, addImageToHistory]);

  const handleExpandImage = useCallback(async (direction: 'left' | 'right' | 'top' | 'bottom', prompt: string) => {
    if (!currentImage) {
      setError('No image loaded to expand.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setJustPlacedObject(false);
    
    try {
        const expandedImageUrl = await generateExpandedImage(currentImage, direction, prompt);
        const newImageFile = dataURLtoFile(expandedImageUrl, `expanded-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to expand the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }
    setJustPlacedObject(false);

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setJustPlacedObject(false);
    }
  }, [canUndo, historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canRedo, historyIndex]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setJustPlacedObject(false);
    }
  }, [history]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
      setPlacementObject(null);
      setPlacementPrompt('');
      setJustPlacedObject(false);
      setGridImages([]);
      setGridPrompt('');
  }, []);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleStartGridMode = useCallback(async () => {
    setIsLoading(true);
    try {
      const placeholderFile = await createPlaceholderImage();
      // handleImageUpload resets a bunch of state and sets the tab to 'retouch'
      handleImageUpload(placeholderFile); 
      // We immediately override the tab to 'grid' to take the user there directly.
      setActiveTab('grid');
    } catch(err) {
      const errorMessage = err instanceof Error ? err.message : 'Could not start Grid Combine mode.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [handleImageUpload]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch' && activeTab !== 'place') return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    // Adjust for scroll position of the container
    const container = img.parentElement;
    const containerScrollLeft = container?.scrollLeft || 0;
    const containerScrollTop = container?.scrollTop || 0;

    const offsetX = e.clientX - rect.left + containerScrollLeft;
    const offsetY = e.clientY - rect.top + containerScrollTop;
    
    setDisplayHotspot({ x: offsetX, y: offsetY });

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);

    setEditHotspot({ x: originalX, y: originalY });
  };
  
  const handleTabChange = (tab: Tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
      setEditHotspot(null);
      setDisplayHotspot(null);

      if (tab !== 'place') {
          setJustPlacedObject(false);
      }
    }
  }

  const handlePlacementObjectChange = (file: File | null) => {
    setPlacementObject(file);
    setJustPlacedObject(false); // A new object means a new placement, not an adjustment
  };

  const imageCursorClass = (activeTab === 'retouch' || activeTab === 'place') ? 'cursor-crosshair' : '';

  const imageDisplay = (
      <div className="relative inline-block">
          <img
              ref={imgRef}
              key={isComparing && originalImageUrl ? originalImageUrl : currentImageUrl}
              src={(isComparing && originalImageUrl) ? originalImageUrl : currentImageUrl!}
              alt={isComparing ? "Original" : "Current"}
              onClick={handleImageClick}
              className={`h-[60vh] w-auto max-w-none rounded-xl ${imageCursorClass}`}
          />
          {displayHotspot && !isLoading && (activeTab === 'retouch' || activeTab === 'place') && (
              <div 
                  className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
              >
                  <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
              </div>
          )}
      </div>
  );

  const cropImageElement = (
    <img 
      ref={imgRef}
      key={`crop-${currentImageUrl}`}
      src={currentImageUrl!} 
      alt="Crop this image"
      className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
    />
  );
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header />
      <main className="flex-grow w-full p-4 md:p-8 flex flex-col">
        {error ? (
          <div className="flex-grow flex items-center justify-center animate-fade-in">
             <div className="text-center bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
              <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
              <p className="text-md text-red-400">{error}</p>
              <button
                  onClick={() => setError(null)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
                >
                  Try Again
              </button>
            </div>
          </div>
        ) : !currentImageUrl ? (
          <div className="flex-grow flex items-center justify-center">
             <StartScreen onFileSelect={handleFileSelect} onSelectGridMode={handleStartGridMode} />
          </div>
        ) : (
          <>
            {/* Image Viewer Container - Not constrained by controls width */}
            <div className="w-full flex-grow flex justify-center mb-6 animate-fade-in items-center">
              <div className="relative shadow-2xl rounded-xl overflow-auto bg-black/20 flex justify-center items-center">
                  {isLoading && (
                      <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                          <Spinner />
                          <p className="text-gray-300">AI is working its magic...</p>
                      </div>
                  )}
                  
                  {activeTab === 'crop' ? (
                    <ReactCrop 
                      crop={crop} 
                      onChange={c => setCrop(c)} 
                      onComplete={c => setCompletedCrop(c)}
                      aspect={aspect}
                      className="max-h-[60vh]"
                    >
                      {cropImageElement}
                    </ReactCrop>
                  ) : imageDisplay }
              </div>
            </div>

            {/* Controls Container - Constrained width for readability */}
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
              <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-sm">
                  {(['retouch', 'place', 'grid', 'expand', 'crop', 'adjust', 'filters'] as Tab[]).map(tab => (
                       <button
                          key={tab}
                          onClick={() => handleTabChange(tab)}
                          className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                              activeTab === tab 
                              ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                              : 'text-gray-300 hover:text-white hover:bg-white/10'
                          }`}
                      >
                          {tab}
                      </button>
                  ))}
              </div>
              
              <div className="w-full">
                  {activeTab === 'retouch' && (
                      <div className="flex flex-col items-center gap-4">
                          <p className="text-md text-gray-400">
                              {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}
                          </p>
                          <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                              <input
                                  type="text"
                                  value={prompt}
                                  onChange={(e) => setPrompt(e.target.value)}
                                  placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"}
                                  className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={isLoading || !editHotspot}
                              />
                              <button 
                                  type="submit"
                                  className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                                  disabled={isLoading || !prompt.trim() || !editHotspot}
                              >
                                  Generate
                              </button>
                          </form>
                      </div>
                  )}
                  {activeTab === 'place' && <PlacePanel
                    onPlaceObject={handlePlaceObject}
                    isLoading={isLoading}
                    isLocationSelected={!!editHotspot}
                    justPlacedObject={justPlacedObject}
                    placementObject={placementObject}
                    onPlacementObjectChange={handlePlacementObjectChange}
                    placementPrompt={placementPrompt}
                    onPlacementPromptChange={setPlacementPrompt}
                  />}
                  {activeTab === 'grid' && <GridPanel 
                      onGenerateGrid={handleGenerateGrid}
                      isLoading={isLoading}
                      gridImages={gridImages}
                      onGridImagesChange={setGridImages}
                      gridPrompt={gridPrompt}
                      onGridPromptChange={setGridPrompt}
                  />}
                  {activeTab === 'expand' && <ExpandPanel onExpand={handleExpandImage} isLoading={isLoading} />}
                  {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
                  {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} />}
                  {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  <button 
                      onClick={handleUndo}
                      disabled={!canUndo}
                      className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                      aria-label="Undo last action"
                  >
                      <UndoIcon className="w-5 h-5 mr-2" />
                      Undo
                  </button>
                  <button 
                      onClick={handleRedo}
                      disabled={!canRedo}
                      className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                      aria-label="Redo last action"
                  >
                      <RedoIcon className="w-5 h-5 mr-2" />
                      Redo
                  </button>
                  
                  <div className="h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>

                  {canUndo && (
                    <button 
                        onMouseDown={() => setIsComparing(true)}
                        onMouseUp={() => setIsComparing(false)}
                        onMouseLeave={() => setIsComparing(false)}
                        onTouchStart={() => setIsComparing(true)}
                        onTouchEnd={() => setIsComparing(false)}
                        className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
                        aria-label="Press and hold to see original image"
                    >
                        <EyeIcon className="w-5 h-5 mr-2" />
                        Compare
                    </button>
                  )}

                  <button 
                      onClick={handleReset}
                      disabled={!canUndo}
                      className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
                    >
                      Reset
                  </button>
                  <button 
                      onClick={handleUploadNew}
                      className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
                  >
                      Upload New
                  </button>

                  <button 
                      onClick={handleDownload}
                      className="flex-grow sm:flex-grow-0 ml-auto bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
                  >
                      Download Image
                  </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;