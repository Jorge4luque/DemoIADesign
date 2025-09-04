# Guía de Despliegue Seguro en Vercel

## 🚀 Resumen de la Solución

Hemos implementado una solución segura que protege tu API Key de Gemini mediante un endpoint serverless en Vercel. Ahora tu cliente puede usar la aplicación sin riesgo de exponer la clave API.

## 📁 Archivos Creados/Modificados

### Nuevos Archivos:
- `api/generate.js` - Endpoint seguro para llamadas a Gemini
- `vercel.json` - Configuración de despliegue
- `ENV_SETUP.md` - Guía de variables de entorno
- `DEPLOYMENT_GUIDE.md` - Esta guía

### Archivos Modificados:
- `services/geminiService.ts` - Actualizado para usar el endpoint seguro
- `package.json` - Agregado script de build para Vercel

## 🔧 Pasos para Desplegar

### 1. Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Haz clic en **Add New**
5. Configura:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Tu API key real de Gemini
   - **Environment**: Production, Preview, Development (marca todas)

### 2. Desplegar el Proyecto

```bash
# Si no tienes Vercel CLI instalado
npm i -g vercel

# En el directorio del proyecto
vercel

# O simplemente conecta tu repositorio GitHub a Vercel
```

### 3. Verificar el Despliegue

1. Una vez desplegado, tu aplicación estará disponible en `https://tu-proyecto.vercel.app`
2. El endpoint seguro estará en `https://tu-proyecto.vercel.app/api/generate`
3. Prueba la funcionalidad subiendo una imagen y generando ediciones

## 🔒 Seguridad Implementada

### ✅ Lo que está protegido:
- **API Key**: Nunca se expone en el frontend
- **Llamadas seguras**: Todas las requests van a través del endpoint serverless
- **CORS configurado**: Solo permite requests desde tu dominio
- **Validación**: El endpoint valida todos los parámetros

### ✅ Lo que puede hacer tu cliente:
- Subir imágenes
- Generar ediciones con prompts
- Aplicar filtros
- Hacer ajustes globales
- Colocar objetos en escenas
- **Sin acceso a tu API Key**

## 🧪 Cómo Probar

1. **Accede a tu demo**: `https://tu-proyecto.vercel.app`
2. **Sube una imagen** usando el botón de carga
3. **Haz clic en un área** de la imagen para crear un hotspot
4. **Escribe un prompt** como "haz que esta persona sonría"
5. **Haz clic en "Generar"** y espera el resultado

## 🐛 Solución de Problemas

### Error: "API Key no configurada"
- Verifica que `GEMINI_API_KEY` esté configurada en Vercel
- Asegúrate de que el valor sea correcto (sin espacios extra)

### Error: "Método no permitido"
- El endpoint solo acepta POST requests
- Verifica que el frontend esté enviando requests POST

### Error: "CORS"
- El endpoint está configurado para permitir requests desde cualquier origen
- Si persiste, verifica la configuración de CORS en `api/generate.js`

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs en Vercel Dashboard → Functions
2. Verifica la consola del navegador para errores del frontend
3. Asegúrate de que todas las variables de entorno estén configuradas

## 🎉 ¡Listo!

Tu aplicación ahora está desplegada de forma segura. Tu cliente puede usarla sin riesgo de exponer tu API Key, y todas las funcionalidades de IA están disponibles a través del endpoint seguro.
