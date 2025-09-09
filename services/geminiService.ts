/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// No imports needed for API-based approach

// Helper function to convert a File object to base64 data URL
const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

/**
 * Pads an image file to be square by adding black bars.
 * This preserves the original aspect ratio and content.
 * @param imageFile The file to pad.
 * @returns A promise that resolves with the new padded image file and original dimensions.
 */
const padImageToSquare = (imageFile: File): Promise<{ file: File; originalWidth: number; originalHeight: number; }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = (e) => {
            if (!e.target?.result) return reject(new Error("Could not read file"));
            const img = new Image();
            img.src = e.target.result as string;
            img.onload = () => {
                const { naturalWidth, naturalHeight } = img;
                const size = Math.max(naturalWidth, naturalHeight);

                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context for padding'));
                }

                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, size, size);

                const x = (size - naturalWidth) / 2;
                const y = (size - naturalHeight) / 2;
                ctx.drawImage(img, x, y, naturalWidth, naturalHeight);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve({
                            file: new File([blob], imageFile.name, { type: 'image/png' }),
                            originalWidth: naturalWidth,
                            originalHeight: naturalHeight,
                        });
                    } else {
                        reject(new Error('Canvas to Blob conversion failed for padding'));
                    }
                }, 'image/png');
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

/**
 * Crops a square, padded image back to its original dimensions.
 * @param dataUrl The data URL of the square image from the AI.
 * @param originalWidth The original width of the content.
 * @param originalHeight The original height of the content.
 * @returns A promise that resolves with the data URL of the cropped image.
 */
const cropSquareToOriginal = (dataUrl: string, originalWidth: number, originalHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const { naturalWidth: newSize } = img;
            const originalSize = Math.max(originalWidth, originalHeight);

            const ratioX = (originalSize - originalWidth) / 2 / originalSize;
            const ratioY = (originalSize - originalHeight) / 2 / originalSize;
            const ratioW = originalWidth / originalSize;
            const ratioH = originalHeight / originalSize;
            
            const sourceX = newSize * ratioX;
            const sourceY = newSize * ratioY;
            const sourceWidth = newSize * ratioW;
            const sourceHeight = newSize * ratioH;

            const canvas = document.createElement('canvas');
            canvas.width = originalWidth;
            canvas.height = originalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for cropping'));
            }
            
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(
                img,
                sourceX, sourceY, sourceWidth, sourceHeight,
                0, 0, originalWidth, originalHeight
            );
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => reject(err);
    });
};


/**
 * Draws a visual marker on an image at a specified hotspot.
 * @param imageFile The file to draw on.
 * @param hotspot The {x, y} coordinates for the marker.
 * @returns A promise that resolves with the new image file containing the marker.
 */
const drawHotspotOnImage = (imageFile: File, hotspot: { x: number, y: number }): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = (e) => {
            if (!e.target?.result) return reject(new Error("Could not read file for hotspot drawing"));
            const img = new Image();
            img.src = e.target.result as string;
            img.onload = () => {
                const { naturalWidth, naturalHeight } = img;

                const canvas = document.createElement('canvas');
                canvas.width = naturalWidth;
                canvas.height = naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context for hotspot drawing'));
                }

                // Draw the original image
                ctx.drawImage(img, 0, 0);

                // Draw the hotspot marker
                const radius = Math.min(naturalWidth, naturalHeight) * 0.015; // 1.5% of the smallest dimension
                ctx.beginPath();
                ctx.arc(hotspot.x, hotspot.y, radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'rgba(0, 255, 255, 0.7)'; // Bright cyan with some transparency
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; // White border
                ctx.stroke();

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], imageFile.name, { type: 'image/png' }));
                    } else {
                        reject(new Error('Canvas to Blob conversion failed for hotspot drawing'));
                    }
                }, 'image/png');
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};


/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Padding image to square for editing...');
    const { file: paddedImage, originalWidth, originalHeight } = await padImageToSquare(originalImage);

    // Adjust hotspot coordinates for the padded image
    const size = Math.max(originalWidth, originalHeight);
    const paddedHotspot = {
        x: hotspot.x + (size - originalWidth) / 2,
        y: hotspot.y + (size - originalHeight) / 2,
    };
    
    console.log('Drawing visual hotspot on padded image at:', paddedHotspot);
    const imageWithHotspot = await drawHotspotOnImage(paddedImage, paddedHotspot);

    // Convert image to base64 for API call
    const imageBase64 = await fileToBase64(imageWithHotspot);

    console.log('Sending request to secure API endpoint...');
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'edit',
            originalImage: imageBase64,
            userPrompt,
            hotspot: paddedHotspot
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la generación de imagen');
    }

    const result = await response.json();
    const squareImageUrl = result.data;
    
    console.log('Cropping padded image back to original dimensions...');
    return await cropSquareToOriginal(squareImageUrl, originalWidth, originalHeight);
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Padding image to square for filter: ${filterPrompt}`);
    const { file: paddedImage, originalWidth, originalHeight } = await padImageToSquare(originalImage);

    // Convert image to base64 for API call
    const imageBase64 = await fileToBase64(paddedImage);

    console.log('Sending request to secure API endpoint...');
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'filter',
            originalImage: imageBase64,
            filterPrompt
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la generación de filtro');
    }

    const result = await response.json();
    const squareImageUrl = result.data;
    
    console.log('Cropping padded image back to original dimensions...');
    return await cropSquareToOriginal(squareImageUrl, originalWidth, originalHeight);
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Padding image to square for adjustment: ${adjustmentPrompt}`);
    const { file: paddedImage, originalWidth, originalHeight } = await padImageToSquare(originalImage);
    
    // Convert image to base64 for API call
    const imageBase64 = await fileToBase64(paddedImage);

    console.log('Sending request to secure API endpoint...');
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'adjustment',
            originalImage: imageBase64,
            adjustmentPrompt
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la generación de ajuste');
    }

    const result = await response.json();
    const squareImageUrl = result.data;
    
    console.log('Cropping padded image back to original dimensions...');
    return await cropSquareToOriginal(squareImageUrl, originalWidth, originalHeight);
};

/**
 * Generates an image with a new object placed in it using generative AI.
 * @param originalImage The original image file (the scene).
 * @param objectImage The image of the object to place.
 * @param userPrompt The text prompt describing how and where to place the object.
 * @param hotspot The {x, y} coordinates on the image to focus the placement.
 * @returns A promise that resolves to the data URL of the final image.
 */
export const generatePlacedImage = async (
    originalImage: File,
    objectImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log(`Padding image to square for placement: ${userPrompt}`);
    const { file: paddedImage, originalWidth, originalHeight } = await padImageToSquare(originalImage);

    // Adjust hotspot coordinates for the padded image
    const size = Math.max(originalWidth, originalHeight);
    const paddedHotspot = {
        x: hotspot.x + (size - originalWidth) / 2,
        y: hotspot.y + (size - originalHeight) / 2,
    };
    
    console.log('Drawing visual hotspot for placement at:', paddedHotspot);
    const imageWithHotspot = await drawHotspotOnImage(paddedImage, paddedHotspot);

    // Convert images to base64 for API call
    const sceneImageBase64 = await fileToBase64(imageWithHotspot);
    const objectImageBase64 = await fileToBase64(objectImage);

    console.log('Sending request to secure API endpoint...');
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'placement',
            originalImage: sceneImageBase64,
            objectImage: objectImageBase64,
            userPrompt,
            hotspot: paddedHotspot
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la colocación de objeto');
    }

    const result = await response.json();
    const squareImageUrl = result.data;
    
    console.log('Cropping padded image back to original dimensions...');
    return await cropSquareToOriginal(squareImageUrl, originalWidth, originalHeight);
};

/**
 * Generates a new scene based on a collection of inspiration images and a text prompt.
 * @param gridImages The collection of inspiration image files.
 * @param userPrompt The text prompt describing the desired scene.
 * @param targetDimensions Optional dimensions for the output image. If provided, the AI will be asked to pad the result to a square, which will then be cropped.
 * @returns A promise that resolves to the data URL of the generated image.
 */
export const generateFromGrid = async (
    gridImages: File[],
    userPrompt: string,
    targetDimensions?: { width: number, height: number }
): Promise<string> => {
    console.log(`Generating a new image from grid with prompt: ${userPrompt}`);
    
    // Convert all images to base64
    const imageBase64Array = await Promise.all(gridImages.map(file => fileToBase64(file)));

    console.log('Sending request to secure API endpoint...');
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'grid',
            images: imageBase64Array,
            userPrompt,
            targetDimensions
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la generación de grid');
    }

    const result = await response.json();
    return result.data;
};

/**
 * Expands an image by generating new content in a specified direction.
 * @param originalImage The original image file.
 * @param direction The direction to expand ('left', 'right', 'top', 'bottom').
 * @param userPrompt An optional prompt to guide the content generation.
 * @returns A promise that resolves to the data URL of the expanded image.
 */
export const generateExpandedImage = async (
    originalImage: File,
    direction: 'left' | 'right' | 'top' | 'bottom',
    userPrompt: string
): Promise<string> => {
    console.log(`Preparing to expand image to the ${direction}...`);

    // Convert image to base64
    const imageBase64 = await fileToBase64(originalImage);

    console.log('Sending request to secure API endpoint...');
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'expand',
            originalImage: imageBase64,
            direction,
            userPrompt
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la expansión de imagen');
    }

    const result = await response.json();
    return result.data;
};