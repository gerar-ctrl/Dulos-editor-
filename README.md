# 🎬 Dulos editor — Editor de Videos Cortos para PC (Windows), Android y Web

> [!IMPORTANT]
> ### ⚠️ Aviso importante antes de descargar
> **Dulos editor está diseñado exclusivamente para videos cortos — NO está pensado para videos largos ni proyectos pesados.**
>
> Es ideal para **Reels, TikToks, Shorts, estados y clips rápidos**. Si necesitás editar películas, vlogs extensos o producciones de larga duración, te conviene usar un editor de escritorio dedicado a proyectos grandes.

**Dulos editor** es un editor de videos cortos multipista acelerado por GPU (**WebGL / Shaders GLSL**), con **Web Audio API**, exportación nativa con **FFmpeg** en escritorio (Windows) y **WebCodecs / MP4 Muxer** en navegador y Android.

---

## 📥 Descargas (v1.0.0)

Descargá los instaladores oficiales desde la sección de [Releases](https://github.com/gerar-ctrl/Dulos-editor-/releases/tag/v1.0.0):

- 💻 **Windows (PC x64 — Instalador con FFmpeg integrado):** [Dulos-editor-Setup-1.0.0.exe](https://github.com/gerar-ctrl/Dulos-editor-/releases/download/v1.0.0/Dulos-editor-Setup-1.0.0.exe)
- 📱 **Android (APK nativo con Capacitor):** [Dulos-Editor-Android.apk](https://github.com/gerar-ctrl/Dulos-editor-/releases/download/v1.0.0/Dulos-Editor-Android.apk)

---

## ✨ Funcionalidades Reales de la Aplicación

### 1. Motor Gráfico WebGL / GLSL en Tiempo Real (con respaldo Canvas 2D)
- **285 filtros LUT y presets de color** clasificados por categorías (*Cine, Vintage, Cyber, Naturaleza, Blanco y Negro / Duotono, Retrato / Editorial y Atmósfera / Arte*) con control de intensidad.
- **Etalonaje y corrección de color:** Brillo, Contraste, Saturación, Exposición, Nitidez, Iluminaciones, Sombras, Temperatura, Tinte, Viñeta y **ajustes HSL selectivos** (Rojo, Verde, Azul y Amarillo).
- **290 efectos visuales (VFX) por shader:** Fuego y llamas, Destellos y halos, Clima y partículas, Naturaleza, Glitch y Cyber, Lentes y óptica, Arte y cine retro, con control de intensidad y velocidad.
- **206 transiciones:** Cámara/Desenfoque, Luz y Cine, 3D y Formas, Glitch y Ondas, Barridos y Cortes con duración ajustable.
- **Chroma Key (Pantalla Verde):** Cuentagotas de color, Tolerancia, Suavizado de bordes (*feather*) y Supresión de derrame (*despill*).
- **9 formas de máscara geométrica:** Lineal, Espejo, Círculo, Rectángulo, Estrella, Diamante, Corazón, Hexágono y Triángulo (con inversión y difuminado).
- **Transformación directa en lienzo:** Gizmo interactivo para mover, escalar (proporcional o libre), rotar, voltear horizontal/verticalmente, ajustar opacidad, modo de ajuste (*contain / cover / fill*), **recorte de pantalla interactivo** y **6 modos de fusión** (*Normal, Overlay, Multiply, Screen, Lighten, Darken*).
- **Fondo del lienzo personalizable:** Color sólido, imagen o desenfoque.

### 2. Línea de Tiempo Multipista y Montaje
- Pista principal de video, pistas superpuestas (**PIP / Picture-in-Picture**), pistas de audio y pistas de texto.
- **Herramientas de corte y edición:** Dividir (*Split*), Recortar extremos izquierdo/derecho (*Trim*), Duplicar, Eliminar, Reordenar clips, Congelar fotograma (*Freeze Frame*) e Invertir clip (*Reverse*).
- **Control de velocidad:** Velocidad lineal (desde cámara lenta `0.1x` hasta `100x`), **curvas de velocidad Bézier** y preservación del tono de voz (*Pitch Correction*).
- **Animaciones de clips:** **34 animaciones de Entrada**, **26 de Salida** y **26 de Bucle/Combo** (3D, zoom, deslizamientos, rebotes, glitch, cámara en mano, etc.).
- **Keyframes (Puntos Clave):** Animación por fotogramas clave de posición, escala, rotación y opacidad con interpolación (*linear, easeIn, easeOut, easeInOut*).
- **Gestión de proyectos:** Múltiples proyectos guardados localmente en `IndexedDB` e historial de **Deshacer / Rehacer**.

### 3. Motor de Audio y Doblaje (Web Audio API)
- Mezcla multipista con ganancia de volumen de hasta **1000%** por clip.
- **Curva de envolvente de volumen por pista (tecla `V`):** Nodos interactivos de volumen a lo largo de toda la pista (0% a 200%).
- **Fade In / Fade Out** configurables y visualización de **forma de onda (*Waveform*)** en los clips.
- **Separar audio de video** a una pista independiente.
- **Doblaje / Grabadora de voz en tiempo real:** Barra dedicada para grabar voz con el micrófono directamente sincronizada sobre la línea de tiempo.
- **Más de 50 filtros de voz** en 6 categorías: *Personas y Edades, Divertidos y Animales, Ciencia Ficción y Robots, Terror y Fantasía, Dispositivos y Retro, y Espacios y Efectos* (eco, cueva, catedral, estadio, bajo el agua, etc.).

### 4. Textos y Tipografía
- **258 fuentes tipográficas** organizadas en 6 categorías (*Modernas, Impacto, Elegantes, Manuscritas, Tecno y Artísticas*).
- **Edición directa sobre el lienzo** (*Inline Text Editor*).
- Relleno sólido o **degradado**, alineación, espaciado de letras y palabras, interlineado, **texto curvo**, contorno/trazo, sombra configurable y caja de fondo con opacidad, relleno y bordes redondeados.
- Animaciones de texto de **entrada, salida y bucle** (máquina de escribir, rebote, ola, latido, flotación, etc.).

### 5. Exportación Multiplataforma (Video MP4 y Audio MP3/WAV)
- **Formatos de salida:** Video **MP4 (H.264/AVC)** y exportación de solo audio en **MP3** (128 / 192 / 320 kbps) y **WAV**.
- **Resoluciones:** `360p`, `480p`, `720p`, `1080p`, `2K` y `4K`, con relaciones de aspecto `Auto`, `9:16`, `16:9`, `1:1`, `4:5`, `21:9`, `4:3` y `Libre`.
- **FPS y calidad:** `24`, `25`, `30`, `50` y `60 FPS`, selector de calidad (*Baja, Media, Alta*) y estimación en tiempo real del tamaño final en MB.
- **En PC (Windows — Electron):**
  - Doble motor de exportación: **FFmpeg nativo integrado** o **WebCodecs**.
  - **Smart Stream Copy:** Copia directa sin recodificación cuando no hay ediciones visuales para exportaciones ultrarrápidas.
  - Lectura de archivos locales por streaming HTTP Range (sin duplicar videos pesados en el disco `C:`), elección directa de carpeta de guardado y **modo seguro de GPU** (`--safe-gpu`).
- **En Android (APK — Capacitor + Puente Nativo):**
  - Guardado nativo en galería/almacenamiento (`Dulos Editor` vía `MediaStore`).
  - Pantalla encendida automáticamente durante la exportación.
  - Botones para abrir o compartir el video/audio exportado directamente (incluido **WhatsApp**) y recepción de archivos compartidos desde otras apps.

---

## 🛠️ Desarrollo y Compilación Local

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar en modo desarrollo web
npm run dev

# 3. Compilar la aplicación web
npm run build

# 4. Ejecutar versión de escritorio (Electron)
npm run electron:start

# 5. Generar instalador de Windows (.exe)
npm run dist:win

# 6. Sincronizar y compilar APK de Android
npm run android:apk
```

> **Nota para compilación de PC:** Para generar el instalador de escritorio (`npm run dist:win`), colocá `ffmpeg.exe` y `ffprobe.exe` en `build-resources/bin/` (excluidos del repositorio por superar el límite de 100 MB de GitHub).
