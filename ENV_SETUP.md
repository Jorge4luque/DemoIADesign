# Configuración de Variables de Entorno

## Variables Necesarias

### GEMINI_API_KEY
- **Descripción**: API Key de Google Gemini para generar imágenes
- **Obtener**: Ve a https://makersuite.google.com/app/apikey
- **Configuración en Vercel**:
  1. Ve a tu proyecto en Vercel
  2. Settings → Environment Variables
  3. Add New
  4. Nombre: `GEMINI_API_KEY`
  5. Valor: tu API key real de Gemini

## Configuración Local

Para desarrollo local, crea un archivo `.env` en la raíz del proyecto:

```bash
GEMINI_API_KEY=tu_api_key_aqui
```

**Importante**: Nunca subas el archivo `.env` al repositorio. Ya está incluido en `.gitignore`.
