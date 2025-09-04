import { GoogleGenAI, Modality } from "@google/genai";

export default async function handler(req, res) {
  // Configurar CORS para permitir requests desde el frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { 
    type, 
    originalImage, 
    userPrompt, 
    hotspot, 
    filterPrompt, 
    adjustmentPrompt, 
    objectImage 
  } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API Key de Gemini no configurada' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let response;

    switch (type) {
      case 'edit':
        response = await handleEditRequest(ai, originalImage, userPrompt, hotspot);
        break;
      case 'filter':
        response = await handleFilterRequest(ai, originalImage, filterPrompt);
        break;
      case 'adjustment':
        response = await handleAdjustmentRequest(ai, originalImage, adjustmentPrompt);
        break;
      case 'placement':
        response = await handlePlacementRequest(ai, originalImage, objectImage, userPrompt, hotspot);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de operación no válido' });
    }

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error('Error en API:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
}

// Helper function para convertir base64 a Part de Gemini
const base64ToPart = (base64Data, mimeType) => {
  return { 
    inlineData: { 
      mimeType, 
      data: base64Data.replace(/^data:image\/[a-z]+;base64,/, '') 
    } 
  };
};

// Helper function para manejar respuestas de la API
const handleApiResponse = (response, context) => {
  if (response.promptFeedback?.blockReason) {
    const { blockReason, blockReasonMessage } = response.promptFeedback;
    throw new Error(`Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`);
  }

  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (imagePartFromResponse?.inlineData) {
    const { mimeType, data } = imagePartFromResponse.inlineData;
    return `data:${mimeType};base64,${data}`;
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    throw new Error(`Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}`);
  }
  
  const textFeedback = response.text?.trim();
  throw new Error(`The AI model did not return an image for the ${context}. ${textFeedback ? `The model responded with text: "${textFeedback}"` : "This can happen due to safety filters or if the request is too complex."}`);
};

// Función para manejar edición de imágenes
async function handleEditRequest(ai, originalImage, userPrompt, hotspot) {
  const originalImagePart = base64ToPart(originalImage, 'image/png');
  
  const prompt = `You are an expert photo editor AI. The user has provided a square image where their original photo is centered within black bars (padding). A bright cyan circle has been added to this image to serve as a temporary marker, indicating the exact location for a specific edit.

User Request: "${userPrompt}"

**CRITICAL INSTRUCTIONS:**
1.  **The Marker is a Guide, NOT Content:** The bright cyan circle is a temporary guide for you, the AI. It MUST be completely and seamlessly removed from the final output. Think of it as an instruction layer that needs to be painted over.
2.  **Perform Edit at Marker's Location:** Execute the user's requested edit ONLY at the precise location where the cyan marker was.
3.  **Preserve Padding:** The black bars surrounding the central photo are padding. They MUST remain untouched. Your output must be a square image with the exact same black padding.
4.  **Seamless & Localized Edit:** The edit must be photorealistic and blend perfectly with the surrounding area. The rest of the photo (outside the immediate edit area) and the padding must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

**Output:** Return ONLY the final, edited, square image. The image must have the cyan marker completely removed and the black padding perfectly preserved. Do not return any text.`;

  const textPart = { text: prompt };
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: { parts: [originalImagePart, textPart] },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return handleApiResponse(response, 'edit');
}

// Función para manejar filtros
async function handleFilterRequest(ai, originalImage, filterPrompt) {
  const originalImagePart = base64ToPart(originalImage, 'image/png');
  
  const prompt = `You are an expert photo editor AI. The user has provided a square image that contains their original photo centered within black bars (padding). Your task is to apply a stylistic filter to the central photo while strictly preserving the padding.

Filter Request: "${filterPrompt}"

**CRITICAL RULES:**
1.  **PRESERVE PADDING:** The black bars around the central image are padding. You MUST NOT modify them. The output image must be a square with the exact same black padding.
2.  **APPLY FILTER TO CENTRAL IMAGE ONLY:** Apply the filter across the entire central photo area. Do not change the composition or content, only apply the style. The padding must remain pure black.

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final, filtered, square image, including the unmodified black padding. Do not return text.`;

  const textPart = { text: prompt };
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: { parts: [originalImagePart, textPart] },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return handleApiResponse(response, 'filter');
}

// Función para manejar ajustes
async function handleAdjustmentRequest(ai, originalImage, adjustmentPrompt) {
  const originalImagePart = base64ToPart(originalImage, 'image/png');
  
  const prompt = `You are an expert photo editor AI. The user has provided a square image that contains their original photo centered within black bars (padding). Your task is to perform a natural, global adjustment to the central photo while strictly preserving the padding.

User Request: "${adjustmentPrompt}"

**CRITICAL RULES:**
1.  **PRESERVE PADDING:** The black bars around the central image are padding. You MUST NOT modify them. The output image must be a square with the exact same black padding.
2.  **ADJUST CENTRAL IMAGE ONLY:** The adjustment must be applied across the entire central photo area. The result must be photorealistic. The padding must remain pure black.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final, adjusted, square image, including the unmodified black padding. Do not return text.`;

  const textPart = { text: prompt };
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: { parts: [originalImagePart, textPart] },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return handleApiResponse(response, 'adjustment');
}

// Función para manejar colocación de objetos
async function handlePlacementRequest(ai, originalImage, objectImage, userPrompt, hotspot) {
  const sceneImagePart = base64ToPart(originalImage, 'image/png');
  const objectImagePart = base64ToPart(objectImage, 'image/png');
  
  const prompt = `You are an expert photo compositing AI. Your single, most important task is to perfectly integrate a new object (Image 2) into a background scene (Image 1) at a precise location.

**INPUTS:**
- **Background Scene (Image 1):** A square image with the original photo centered in black padding. A bright cyan circle has been added to this image. This is NOT part of the photo; it is a **temporary, visual instruction marker**.
- **Object (Image 2):** The object to be placed into the scene.
- **User Request:** "${userPrompt}"
- **Target Location:** The cyan marker is located at coordinates (${hotspot.x}, ${hotspot.y}) in the square image.

**ABSOLUTE, CRITICAL INSTRUCTIONS:**
1.  **PRIMARY OBJECTIVE: REPLACE THE MARKER.** Your main goal is to replace the bright cyan marker in Image 1 with the object from Image 2. The final image MUST NOT contain the cyan marker. You must paint over it completely.
2.  **LOCATION IS NON-NEGOTIABLE.** Place the object exactly where the cyan marker is located at coordinates (${hotspot.x}, ${hotspot.y}). Do not use your own judgment to move the object to a "better" spot. The marker's position is the absolute and final target.
3.  **PRESERVE PADDING.** The black bars around the central photo are padding and MUST remain completely untouched. Your output must be a square image with the exact same black padding.
4.  **SEAMLESS INTEGRATION.** Realistically integrate the object according to the user's request. This includes adjusting its lighting, shadows, scale, and perspective to perfectly match the background scene. If the provided object image has its own background, you must remove it.

**OUTPUT:**
- Return ONLY the final, composited, square image. The image must have the cyan marker completely removed and the black padding perfectly preserved.
- Do not output any text, explanations, or apologies.`;

  const textPart = { text: prompt };
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: { parts: [sceneImagePart, objectImagePart, textPart] },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return handleApiResponse(response, 'placement');
}
