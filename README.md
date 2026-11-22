# 🎬 Dulos editor - Editor de Video Web, Escritorio (PC) & Android

**Dulos editor** es una aplicación de edición de video no lineal profesional y responsiva disponible para **Windows (PC)**, **Android (APK)** y **Web/PWA**, diseñada con aceleración por hardware mediante **WebGL / Shaders GLSL**, **WebCodecs**, **Web Audio API** e **IndexedDB**.

---

## 📥 Descargas (v1.0.0)

Descargá los instaladores oficiales desde la sección de [Releases](https://github.com/gerar-ctrl/Dulos-editor-/releases/tag/v1.0.0):

- 💻 **Windows (PC - Instalador x64):** [Dulos-editor-Setup-1.0.0.exe](https://github.com/gerar-ctrl/Dulos-editor-/releases/download/v1.0.0/Dulos-editor-Setup-1.0.0.exe)
- 📱 **Android (APK):** [Dulos-Editor-Android.apk](https://github.com/gerar-ctrl/Dulos-editor-/releases/download/v1.0.0/Dulos-Editor-Android.apk)

---

## 🚀 Características Principales

### 1. Motor Gráfico y Renderizado en Tiempo Real (60 FPS)
- **Shaders GLSL WebGL:**
  - **Etalonaje y Color:** Brillo, Contraste, Saturación, Exposición, Nitidez (convolución 3x3), Sombras, Iluminaciones, Temperatura de color y Viñeta.
  - **Filtros Preestablecidos:** Cinematográfico, Vintage/Retro, Blanco y Negro, Vibrante, Frío, Cálido y Nocturno.
  - **Chroma Key (Pantalla Verde):** Selector cuentagotas de color con controles de Tolerancia, Suavizado de bordes (*feather*) y Supresión de derrame (*despill*).
  - **Máscaras Geométricas:** Lineal (pantalla dividida), Círculo, Rectángulo y Estrella con inversión y difuminado.
  - **Efectos Visuales (VFX):** Glitch RGB split, Aberración cromática, Vibración de cámara (*shake*), Grano de película (*film grain*) y Resplandor Neón.
  - **Transiciones:** Disolución cruzada (*Cross Dissolve*), Barrido direccional (*Wipe*), Zoom Dinámico y Flash Blanco.

### 2. Edición de Video y Línea de Tiempo Multipista
- Pista principal magnética y pistas secundarias para capas superpuestas (PIP), textos y música.
- **Herramientas de Corte:**
  - **Dividir (Split):** Corte exacto en el cabezal de reproducción.
  - **Recortar extremos (Trim):** Tiradores interactivos para ajustar inicio y final de clips.
  - **Duplicar y Eliminar:** Gestión ágil de clips en la línea de tiempo.
  - **Congelar fotograma (Freeze frame):** Extracción de fotogramas congelados de duración configurable.
  - **Invertir clip (Reverse):** Reproducción hacia atrás en video.
- **Control de Velocidad:**
  - Ajuste continuo de 0.1x a 10x.
  - **Corrección de tono (Pitch Correction):** Preserva el timbre natural de la voz al cambiar la velocidad.
  - Curvas de velocidad Bézier preconfiguradas (Montaje, Bullet Time, etc.).
  - Interpolación de fotogramas intermedios (*Optical Flow*).
- **Animaciones y Keyframes:**
  - Animaciones de Entrada (Fade, Zoom In, Slide, Bounce, Spin), Salida y Bucle (Heartbeat, Flotación).
  - Keyframes personalizados para posición (X, Y), escala, rotación y opacidad.

### 3. Motor de Audio Profesional (Web Audio API)
- Mezcla multipista con ganancia de volumen de hasta **1000%**.
- **Curvas de envolvente de atenuación:** *Fade In* y *Fade Out* configurables en segundos y representadas visualmente sobre la forma de onda.
- **Visualizador de forma de onda (Waveform):** Cálculo y renderizado en tiempo real sobre los clips en el timeline.
- **Separar Audio de Video:** Extracción instantánea a pista de audio independiente silenciando el video original.
- **Filtros de Voz:** Efectos de voz Grave, Aguda, Robot, Radio y Eco espacial.
- **Detección de Ritmo (Beats):** Detección de picos y transitorios de música para edición rítmica.
- **Grabadora de Voz:** Grabación directa sincronizada con el micrófono del dispositivo.

### 4. Textos, Tipografía y Subtítulos con IA
- Soporte para fuentes de Google (Bebas Neue, Montserrat, Inter, Playfair Display, Space Grotesk, Oswald, etc.).
- Colores de relleno, degradados, trazos/contornos, sombras proyectadas y cajas de fondo con bordes redondeados.
- **Subtítulos automáticos:** Reconocimiento de voz en tiempo real (*SpeechRecognition API*) con resaltado de palabras.
- **Texto a Voz (TTS):** Generador de locución y narración (*SpeechSynthesis API*) con control de tono, velocidad e idioma.

### 5. Exportación de Video por Hardware (WebCodecs & MP4 Muxer)
- **Resoluciones:** 480p, 720p, 1080p, 2K y 4K con adaptación a relaciones de aspecto (9:16, 16:9, 1:1, 4:5, 21:9).
- **Fotogramas por Segundo (FPS):** 24, 25, 30, 50 y 60 FPS.
- **Estimación en Tiempo Real:** Cálculo dinámico del tamaño final en MB antes de exportar.
- **Codificación por GPU:** Exportación H.264/AVC sin congelar la interfaz y con descarga directa automática.

---

## 🛠️ Instalación y Ejecución Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo (con cabeceras COOP/COEP habilitadas)
npm run dev

# 3. Compilar para producción
npm run build

# 4. Previsualizar la compilación
npm run preview
```

---

## 🌐 Despliegue en Dominio `editordevideos`

El proyecto incluye las cabeceras HTTP de seguridad requeridas por los navegadores para WebCodecs y `SharedArrayBuffer`:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

Archivos de despliegue listos para usar:
1. `public/_headers` (para Cloudflare Pages, Netlify y plataformas Jamstack)
2. `server.js` (servidor de producción Node.js con cabeceras COOP/COEP)
3. `nginx.conf` (configuración de servidor NGINX optimizada)
