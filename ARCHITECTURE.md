# Arquitectura Segura de la Aplicación

## 🔄 Flujo de Datos Seguro

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Vercel API     │    │   Gemini API    │
│   (Cliente)     │    │   /api/generate  │    │   (Google)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │ 1. POST /api/generate  │                        │
         │    {                   │                        │
         │      type: "edit",     │                        │
         │      originalImage,    │                        │
         │      userPrompt,       │                        │
         │      hotspot           │                        │
         │    }                   │                        │
         ├───────────────────────►│                        │
         │                        │                        │
         │                        │ 2. POST a Gemini API   │
         │                        │    Authorization:       │
         │                        │    Bearer API_KEY      │
         │                        ├───────────────────────►│
         │                        │                        │
         │                        │ 3. Imagen generada     │
         │                        │◄───────────────────────┤
         │                        │                        │
         │ 4. Respuesta con       │                        │
         │    imagen generada     │                        │
         │◄───────────────────────┤                        │
         │                        │                        │
```

## 🔒 Ventajas de Seguridad

### ❌ ANTES (Inseguro):
```
Frontend ──► Gemini API (con API Key expuesta)
```
- API Key visible en el código del cliente
- Cualquiera puede ver y usar tu clave
- Riesgo de abuso y costos inesperados

### ✅ AHORA (Seguro):
```
Frontend ──► Vercel API ──► Gemini API (API Key oculta)
```
- API Key solo en el servidor
- Cliente nunca ve la clave
- Control total sobre el uso de la API

## 🛡️ Capas de Protección

1. **Endpoint Serverless**: Procesa todas las requests en el servidor
2. **Validación de Entrada**: Verifica que los datos sean válidos
3. **CORS Configurado**: Solo permite requests desde tu dominio
4. **Variables de Entorno**: API Key almacenada de forma segura
5. **Manejo de Errores**: Respuestas controladas sin exponer detalles internos

## 📊 Tipos de Operaciones Soportadas

| Tipo | Descripción | Parámetros |
|------|-------------|------------|
| `edit` | Edición localizada | originalImage, userPrompt, hotspot |
| `filter` | Aplicar filtro | originalImage, filterPrompt |
| `adjustment` | Ajuste global | originalImage, adjustmentPrompt |
| `placement` | Colocar objeto | originalImage, objectImage, userPrompt, hotspot |

## 🔧 Configuración Técnica

### Frontend (services/geminiService.ts):
- Convierte imágenes a base64
- Envía requests POST al endpoint seguro
- Maneja respuestas y errores

### Backend (api/generate.js):
- Valida requests y parámetros
- Llama a Gemini API con API Key segura
- Procesa respuestas y devuelve imágenes
- Configura CORS para seguridad

### Despliegue (vercel.json):
- Configura builds para API y frontend
- Define rutas para el endpoint
- Gestiona variables de entorno
