// ============================================================================
// textFonts - Complete Catalog of 258 Video Editor Fonts (8 Core + 250 Extra)
// ============================================================================

export type TextFontCategory =
  | 'all'
  | 'moderno'
  | 'impacto'
  | 'elegante'
  | 'manuscrita'
  | 'tecno'
  | 'artistico';

export interface TextFontOption {
  label: string;
  tag: string;
  value: string;
  category: Exclude<TextFontCategory, 'all'>;
  fallback: 'sans-serif' | 'serif' | 'cursive' | 'monospace';
}

export const TEXT_FONT_CATEGORIES: { id: TextFontCategory; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'moderno', label: 'Modernas' },
  { id: 'impacto', label: 'Impacto' },
  { id: 'elegante', label: 'Elegantes' },
  { id: 'manuscrita', label: 'Manuscritas' },
  { id: 'tecno', label: 'Tecno' },
  { id: 'artistico', label: 'Artísticas' },
];

export const TEXT_FONTS: TextFontOption[] = [
  // --- 8 Core Fonts ---
  { label: 'Inter', tag: 'Predeterminada', value: 'Inter', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Bebas Neue', tag: 'Impacto', value: 'Bebas Neue', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Montserrat', tag: 'Elegante', value: 'Montserrat', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Playfair Display', tag: 'Serif Cine', value: 'Playfair Display', category: 'elegante', fallback: 'serif' },
  { label: 'Oswald', tag: 'Compacto', value: 'Oswald', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Space Grotesk', tag: 'Tecno', value: 'Space Grotesk', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Permanent Marker', tag: 'Manual', value: 'Permanent Marker', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Fira Code', tag: 'Código', value: 'Fira Code', category: 'tecno', fallback: 'monospace' },

  // --- Original 50 Extra Fonts ---
  // Modernas (10)
  { label: 'Roboto', tag: 'Clásico', value: 'Roboto', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Poppins', tag: 'Geométrico', value: 'Poppins', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Lato', tag: 'Limpio', value: 'Lato', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Raleway', tag: 'Fino', value: 'Raleway', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Nunito', tag: 'Redondeado', value: 'Nunito', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Rubik', tag: 'Urbano', value: 'Rubik', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Outfit', tag: 'Moderno', value: 'Outfit', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Syne', tag: 'Vanguardia', value: 'Syne', category: 'moderno', fallback: 'sans-serif' },
  { label: 'DM Sans', tag: 'Editorial', value: 'DM Sans', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Plus Jakarta Sans', tag: 'Premium', value: 'Plus Jakarta Sans', category: 'moderno', fallback: 'sans-serif' },

  // Impacto / Display & Cine (10)
  { label: 'Anton', tag: 'Ultra Impacto', value: 'Anton', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Bangers', tag: 'Cómic', value: 'Bangers', category: 'impacto', fallback: 'cursive' },
  { label: 'Black Ops One', tag: 'Militar', value: 'Black Ops One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Righteous', tag: 'Retro Pop', value: 'Righteous', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Archivo Black', tag: 'Titular', value: 'Archivo Black', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Russo One', tag: 'Gamer', value: 'Russo One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Staatliches', tag: 'Póster', value: 'Staatliches', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Teko', tag: 'Condensado', value: 'Teko', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Bungee', tag: 'Urbano 3D', value: 'Bungee', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Ultra', tag: 'Pesado', value: 'Ultra', category: 'impacto', fallback: 'serif' },

  // Elegantes / Serif & Editorial (8)
  { label: 'Merriweather', tag: 'Editorial', value: 'Merriweather', category: 'elegante', fallback: 'serif' },
  { label: 'Lora', tag: 'Literario', value: 'Lora', category: 'elegante', fallback: 'serif' },
  { label: 'Cinzel', tag: 'Épico Cine', value: 'Cinzel', category: 'elegante', fallback: 'serif' },
  { label: 'Abril Fatface', tag: 'Revista', value: 'Abril Fatface', category: 'elegante', fallback: 'serif' },
  { label: 'Cormorant Garamond', tag: 'Lujo', value: 'Cormorant Garamond', category: 'elegante', fallback: 'serif' },
  { label: 'DM Serif Display', tag: 'Clásico', value: 'DM Serif Display', category: 'elegante', fallback: 'serif' },
  { label: 'Prata', tag: 'Sofisticado', value: 'Prata', category: 'elegante', fallback: 'serif' },
  { label: 'Bodoni Moda', tag: 'Moda', value: 'Bodoni Moda', category: 'elegante', fallback: 'serif' },

  // Manuscritas / Caligrafía & Firma (10)
  { label: 'Pacifico', tag: 'Surf Retro', value: 'Pacifico', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Dancing Script', tag: 'Cursiva', value: 'Dancing Script', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Lobster', tag: 'Vintage', value: 'Lobster', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Caveat', tag: 'Nota Mano', value: 'Caveat', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Satisfy', tag: 'Firma', value: 'Satisfy', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Great Vibes', tag: 'Boda', value: 'Great Vibes', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Sacramento', tag: 'Elegante', value: 'Sacramento', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Shadows Into Light', tag: 'Diario', value: 'Shadows Into Light', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Kaushan Script', tag: 'Pincel', value: 'Kaushan Script', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Amatic SC', tag: 'Creativo', value: 'Amatic SC', category: 'manuscrita', fallback: 'cursive' },

  // Tecno / Futurista & Gamer (7)
  { label: 'Orbitron', tag: 'Sci-Fi', value: 'Orbitron', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Audiowide', tag: 'Neón', value: 'Audiowide', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Press Start 2P', tag: 'Pixel 8-bit', value: 'Press Start 2P', category: 'tecno', fallback: 'monospace' },
  { label: 'Silkscreen', tag: 'Pixel Pro', value: 'Silkscreen', category: 'tecno', fallback: 'monospace' },
  { label: 'Chakra Petch', tag: 'Cyber', value: 'Chakra Petch', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Exo 2', tag: 'Futurista', value: 'Exo 2', category: 'tecno', fallback: 'sans-serif' },
  { label: 'JetBrains Mono', tag: 'Mono Pro', value: 'JetBrains Mono', category: 'tecno', fallback: 'monospace' },

  // Artísticas / Terror, Retro & Divertido (5)
  { label: 'Creepster', tag: 'Terror', value: 'Creepster', category: 'artistico', fallback: 'cursive' },
  { label: 'Monoton', tag: 'Disco Neón', value: 'Monoton', category: 'artistico', fallback: 'cursive' },
  { label: 'Fredoka', tag: 'Divertido', value: 'Fredoka', category: 'artistico', fallback: 'sans-serif' },
  { label: 'Luckiest Guy', tag: 'Cartoon', value: 'Luckiest Guy', category: 'artistico', fallback: 'cursive' },
  { label: 'Special Elite', tag: 'Máquina', value: 'Special Elite', category: 'artistico', fallback: 'monospace' },

  // =========================================================================
  // 100 NEW FONTS (59 - 158)
  // =========================================================================

  // Modernas +20
  { label: 'Open Sans', tag: 'Universal', value: 'Open Sans', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Work Sans', tag: 'Minimal', value: 'Work Sans', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Manrope', tag: 'Moderno', value: 'Manrope', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Urbanist', tag: 'Geométrico', value: 'Urbanist', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Quicksand', tag: 'Suave', value: 'Quicksand', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Josefin Sans', tag: 'Estilizado', value: 'Josefin Sans', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Barlow', tag: 'Industrial', value: 'Barlow', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Mulish', tag: 'Limpio', value: 'Mulish', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Karla', tag: 'Grotesco', value: 'Karla', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Cabin', tag: 'Humanista', value: 'Cabin', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Titillium Web', tag: 'Tech UI', value: 'Titillium Web', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Figtree', tag: 'Fresco', value: 'Figtree', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Lexend', tag: 'Legible', value: 'Lexend', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Sora', tag: 'Digital', value: 'Sora', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Albert Sans', tag: 'Nórdico', value: 'Albert Sans', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Red Hat Display', tag: 'Corporativo', value: 'Red Hat Display', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Be Vietnam Pro', tag: 'Nítido', value: 'Be Vietnam Pro', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Hind', tag: 'Neutro', value: 'Hind', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Kanit', tag: 'Deportivo', value: 'Kanit', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Prompt', tag: 'Actual', value: 'Prompt', category: 'moderno', fallback: 'sans-serif' },

  // Impacto +20
  { label: 'Alfa Slab One', tag: 'Titular XL', value: 'Alfa Slab One', category: 'impacto', fallback: 'serif' },
  { label: 'Passion One', tag: 'Fuerte', value: 'Passion One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Titan One', tag: 'Volumen', value: 'Titan One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Paytone One', tag: 'Bold Pop', value: 'Paytone One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Lilita One', tag: 'Viral', value: 'Lilita One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Fugaz One', tag: 'Velocidad', value: 'Fugaz One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Rammetto One', tag: 'Cartel', value: 'Rammetto One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Bowlby One SC', tag: 'Bloque', value: 'Bowlby One SC', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Rowdies', tag: 'YouTube', value: 'Rowdies', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Squada One', tag: 'Compacto', value: 'Squada One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Fjalla One', tag: 'Noticia', value: 'Fjalla One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Francois One', tag: 'Portada', value: 'Francois One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Patua One', tag: 'Slab Bold', value: 'Patua One', category: 'impacto', fallback: 'serif' },
  { label: 'Changa One', tag: 'Afiche', value: 'Changa One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Racing Sans One', tag: 'Motor', value: 'Racing Sans One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Boogaloo', tag: 'Dinámico', value: 'Boogaloo', category: 'impacto', fallback: 'cursive' },
  { label: 'Sigmar One', tag: 'Gigante', value: 'Sigmar One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Bungee Shade', tag: 'Sombra 3D', value: 'Bungee Shade', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Rubik Mono One', tag: 'Impacto Mono', value: 'Rubik Mono One', category: 'impacto', fallback: 'monospace' },
  { label: 'Dela Gothic One', tag: 'Ultra Gruesa', value: 'Dela Gothic One', category: 'impacto', fallback: 'sans-serif' },

  // Elegantes +18
  { label: 'Libre Baskerville', tag: 'Clásico', value: 'Libre Baskerville', category: 'elegante', fallback: 'serif' },
  { label: 'Crimson Pro', tag: 'Libro', value: 'Crimson Pro', category: 'elegante', fallback: 'serif' },
  { label: 'EB Garamond', tag: 'Histórico', value: 'EB Garamond', category: 'elegante', fallback: 'serif' },
  { label: 'Playfair Display SC', tag: 'Versalitas', value: 'Playfair Display SC', category: 'elegante', fallback: 'serif' },
  { label: 'Spectral', tag: 'Refinado', value: 'Spectral', category: 'elegante', fallback: 'serif' },
  { label: 'Bitter', tag: 'Prensa', value: 'Bitter', category: 'elegante', fallback: 'serif' },
  { label: 'Vollkorn', tag: 'Robusto', value: 'Vollkorn', category: 'elegante', fallback: 'serif' },
  { label: 'Yeseva One', tag: 'Femenino', value: 'Yeseva One', category: 'elegante', fallback: 'serif' },
  { label: 'Marcellus', tag: 'Romano', value: 'Marcellus', category: 'elegante', fallback: 'serif' },
  { label: 'Cinzel Decorative', tag: 'Realeza', value: 'Cinzel Decorative', category: 'elegante', fallback: 'serif' },
  { label: 'Cardo', tag: 'Académico', value: 'Cardo', category: 'elegante', fallback: 'serif' },
  { label: 'Fraunces', tag: 'Editorial Pro', value: 'Fraunces', category: 'elegante', fallback: 'serif' },
  { label: 'Newsreader', tag: 'Periódico', value: 'Newsreader', category: 'elegante', fallback: 'serif' },
  { label: 'Rozha One', tag: 'Alto Contraste', value: 'Rozha One', category: 'elegante', fallback: 'serif' },
  { label: 'Poiret One', tag: 'Art Déco', value: 'Poiret One', category: 'elegante', fallback: 'sans-serif' },
  { label: 'Forum', tag: 'Antiguo', value: 'Forum', category: 'elegante', fallback: 'serif' },
  { label: 'Vidaloka', tag: 'Lujo Editorial', value: 'Vidaloka', category: 'elegante', fallback: 'serif' },
  { label: 'Rufina', tag: 'Estético', value: 'Rufina', category: 'elegante', fallback: 'serif' },

  // Manuscritas +18
  { label: 'Indie Flower', tag: 'Natural', value: 'Indie Flower', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Patrick Hand', tag: 'Cuaderno', value: 'Patrick Hand', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Courgette', tag: 'Suave', value: 'Courgette', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Cookie', tag: 'Dulce', value: 'Cookie', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Yellowtail', tag: 'Retro Brush', value: 'Yellowtail', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Allura', tag: 'Caligrafía', value: 'Allura', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Alex Brush', tag: 'Invitación', value: 'Alex Brush', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Parisienne', tag: 'París', value: 'Parisienne', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Marck Script', tag: 'Bolígrafo', value: 'Marck Script', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Kalam', tag: 'Apunte', value: 'Kalam', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Gloria Hallelujah', tag: 'Escolar', value: 'Gloria Hallelujah', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Architects Daughter', tag: 'Boceto', value: 'Architects Daughter', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Rock Salt', tag: 'Marcador', value: 'Rock Salt', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Homemade Apple', tag: 'Carta', value: 'Homemade Apple', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Bad Script', tag: 'Espontánea', value: 'Bad Script', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Handlee', tag: 'Amigable', value: 'Handlee', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Covered By Your Grace', tag: 'Juvenil', value: 'Covered By Your Grace', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Damion', tag: 'Rápida', value: 'Damion', category: 'manuscrita', fallback: 'cursive' },

  // Tecno +12
  { label: 'Michroma', tag: 'Espacial', value: 'Michroma', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Rajdhani', tag: 'HUD Sci-Fi', value: 'Rajdhani', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Saira', tag: 'Deporte Tech', value: 'Saira', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Oxanium', tag: 'Esports', value: 'Oxanium', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Electrolize', tag: 'Circuito', value: 'Electrolize', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Share Tech Mono', tag: 'Terminal', value: 'Share Tech Mono', category: 'tecno', fallback: 'monospace' },
  { label: 'Space Mono', tag: 'Retro Tech', value: 'Space Mono', category: 'tecno', fallback: 'monospace' },
  { label: 'IBM Plex Mono', tag: 'Sistema', value: 'IBM Plex Mono', category: 'tecno', fallback: 'monospace' },
  { label: 'VT323', tag: 'CRT 90s', value: 'VT323', category: 'tecno', fallback: 'monospace' },
  { label: 'Syncopate', tag: 'Nave', value: 'Syncopate', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Jura', tag: 'Futuro', value: 'Jura', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Aldrich', tag: 'Robótico', value: 'Aldrich', category: 'tecno', fallback: 'sans-serif' },

  // Artísticas +12
  { label: 'Nosifer', tag: 'Horror', value: 'Nosifer', category: 'artistico', fallback: 'cursive' },
  { label: 'Metal Mania', tag: 'Rock Metal', value: 'Metal Mania', category: 'artistico', fallback: 'cursive' },
  { label: 'Rye', tag: 'Western', value: 'Rye', category: 'artistico', fallback: 'serif' },
  { label: 'Fascinate', tag: 'Jazz', value: 'Fascinate', category: 'artistico', fallback: 'cursive' },
  { label: 'Shrikhand', tag: 'Retro 70s', value: 'Shrikhand', category: 'artistico', fallback: 'cursive' },
  { label: 'Modak', tag: 'Globo', value: 'Modak', category: 'artistico', fallback: 'cursive' },
  { label: 'Chewy', tag: 'Chicle', value: 'Chewy', category: 'artistico', fallback: 'cursive' },
  { label: 'Bubblegum Sans', tag: 'Pop Kids', value: 'Bubblegum Sans', category: 'artistico', fallback: 'cursive' },
  { label: 'Bungee Inline', tag: 'Doble Línea', value: 'Bungee Inline', category: 'artistico', fallback: 'sans-serif' },
  { label: 'Faster One', tag: 'Turbo', value: 'Faster One', category: 'artistico', fallback: 'cursive' },
  { label: 'Griffy', tag: 'Fantasía', value: 'Griffy', category: 'artistico', fallback: 'cursive' },
  { label: 'UnifrakturMaguntia', tag: 'Gótica', value: 'UnifrakturMaguntia', category: 'artistico', fallback: 'serif' },

  // =========================================================================
  // 100 NEW FONTS (159 - 258)
  // =========================================================================

  // Modernas +20
  { label: 'Source Sans 3', tag: 'Editorial', value: 'Source Sans 3', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Noto Sans', tag: 'Global', value: 'Noto Sans', category: 'moderno', fallback: 'sans-serif' },
  { label: 'PT Sans', tag: 'Clásico UI', value: 'PT Sans', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Ubuntu', tag: 'Humanista', value: 'Ubuntu', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Dosis', tag: 'Redondeado', value: 'Dosis', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Comfortaa', tag: 'Geométrico', value: 'Comfortaa', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Signika', tag: 'Señalética', value: 'Signika', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Catamaran', tag: 'Limpio', value: 'Catamaran', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Varela Round', tag: 'Suave', value: 'Varela Round', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Heebo', tag: 'Moderno', value: 'Heebo', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Overpass', tag: 'Autopista', value: 'Overpass', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Asap', tag: 'Versátil', value: 'Asap', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Exo', tag: 'Dinámico', value: 'Exo', category: 'moderno', fallback: 'sans-serif' },
  { label: 'M PLUS Rounded 1c', tag: 'Kawaii Pro', value: 'M PLUS Rounded 1c', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Jost', tag: 'Futura Style', value: 'Jost', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Epilogue', tag: 'Estudio', value: 'Epilogue', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Bricolage Grotesque', tag: 'Trendy', value: 'Bricolage Grotesque', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Onest', tag: 'Nítido', value: 'Onest', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Instrument Sans', tag: 'Diseño', value: 'Instrument Sans', category: 'moderno', fallback: 'sans-serif' },
  { label: 'Readex Pro', tag: 'Legible', value: 'Readex Pro', category: 'moderno', fallback: 'sans-serif' },

  // Impacto +20
  { label: 'Candal', tag: 'Titular', value: 'Candal', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Carter One', tag: 'Bold Pop', value: 'Carter One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Concert One', tag: 'Escenario', value: 'Concert One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Coda', tag: 'Bloque', value: 'Coda', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Secular One', tag: 'Fuerte', value: 'Secular One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Yanone Kaffeesatz', tag: 'Alto', value: 'Yanone Kaffeesatz', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Big Shoulders Display', tag: 'Condensado', value: 'Big Shoulders Display', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Antonio', tag: 'Póster', value: 'Antonio', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Saira Condensed', tag: 'Deportivo', value: 'Saira Condensed', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Barlow Condensed', tag: 'Cine Titular', value: 'Barlow Condensed', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Six Caps', tag: 'Ultra Alto', value: 'Six Caps', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Pathway Gothic One', tag: 'Estrecho', value: 'Pathway Gothic One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Cuprum', tag: 'Moderno Alto', value: 'Cuprum', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Black Han Sans', tag: 'Ultra Pesado', value: 'Black Han Sans', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Seymour One', tag: 'Impacto XL', value: 'Seymour One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Bakbak One', tag: 'Pesado', value: 'Bakbak One', category: 'impacto', fallback: 'sans-serif' },
  { label: 'Calistoga', tag: 'Retro Bold', value: 'Calistoga', category: 'impacto', fallback: 'serif' },
  { label: 'Potta One', tag: 'Pincel Bold', value: 'Potta One', category: 'impacto', fallback: 'cursive' },
  { label: 'Knewave', tag: 'Brocha', value: 'Knewave', category: 'impacto', fallback: 'cursive' },
  { label: 'Bree Serif', tag: 'Slab Suave', value: 'Bree Serif', category: 'impacto', fallback: 'serif' },

  // Elegantes +18
  { label: 'PT Serif', tag: 'Editorial', value: 'PT Serif', category: 'elegante', fallback: 'serif' },
  { label: 'Source Serif 4', tag: 'Libro Pro', value: 'Source Serif 4', category: 'elegante', fallback: 'serif' },
  { label: 'Noto Serif', tag: 'Clásico', value: 'Noto Serif', category: 'elegante', fallback: 'serif' },
  { label: 'Alegreya', tag: 'Literario', value: 'Alegreya', category: 'elegante', fallback: 'serif' },
  { label: 'Arvo', tag: 'Slab Serif', value: 'Arvo', category: 'elegante', fallback: 'serif' },
  { label: 'Rokkitt', tag: 'Geométrico', value: 'Rokkitt', category: 'elegante', fallback: 'serif' },
  { label: 'Domine', tag: 'Revista', value: 'Domine', category: 'elegante', fallback: 'serif' },
  { label: 'Frank Ruhl Libre', tag: 'Prensa', value: 'Frank Ruhl Libre', category: 'elegante', fallback: 'serif' },
  { label: 'Gelasio', tag: 'Elegante', value: 'Gelasio', category: 'elegante', fallback: 'serif' },
  { label: 'Old Standard TT', tag: 'Antiguo', value: 'Old Standard TT', category: 'elegante', fallback: 'serif' },
  { label: 'Quattrocento', tag: 'Romano', value: 'Quattrocento', category: 'elegante', fallback: 'serif' },
  { label: 'Sorts Mill Goudy', tag: 'Clásico Cine', value: 'Sorts Mill Goudy', category: 'elegante', fallback: 'serif' },
  { label: 'Philosopher', tag: 'Filosofía', value: 'Philosopher', category: 'elegante', fallback: 'serif' },
  { label: 'Italiana', tag: 'Moda Italia', value: 'Italiana', category: 'elegante', fallback: 'serif' },
  { label: 'Aboreto', tag: 'Lujo Fino', value: 'Aboreto', category: 'elegante', fallback: 'serif' },
  { label: 'Tenor Sans', tag: 'Editorial', value: 'Tenor Sans', category: 'elegante', fallback: 'sans-serif' },
  { label: 'Bellefair', tag: 'Sofisticado', value: 'Bellefair', category: 'elegante', fallback: 'serif' },
  { label: 'Gilda Display', tag: 'Alta Moda', value: 'Gilda Display', category: 'elegante', fallback: 'serif' },

  // Manuscritas +18
  { label: 'Arizonia', tag: 'Caligrafía', value: 'Arizonia', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Bilbo Swash Caps', tag: 'Cuento', value: 'Bilbo Swash Caps', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Calligraffitti', tag: 'Pluma', value: 'Calligraffitti', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Cedarville Cursive', tag: 'Carta', value: 'Cedarville Cursive', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Clicker Script', tag: 'Romántica', value: 'Clicker Script', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Dawning of a New Day', tag: 'Firma Fina', value: 'Dawning of a New Day', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Euphoria Script', tag: 'Elegante', value: 'Euphoria Script', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Grand Hotel', tag: 'Retro Cine', value: 'Grand Hotel', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Herr Von Muellerhoff', tag: 'Manuscrito', value: 'Herr Von Muellerhoff', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Italianno', tag: 'Invitación', value: 'Italianno', category: 'manuscrita', fallback: 'cursive' },
  { label: 'La Belle Aurore', tag: 'Diario', value: 'La Belle Aurore', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Leckerli One', tag: 'Pincel Grueso', value: 'Leckerli One', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Merienda', tag: 'Creativa', value: 'Merienda', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Mr Dafoe', tag: 'Retro 80s', value: 'Mr Dafoe', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Niconne', tag: 'Cursiva', value: 'Niconne', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Nothing You Could Do', tag: 'Natural', value: 'Nothing You Could Do', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Pinyon Script', tag: 'Gala', value: 'Pinyon Script', category: 'manuscrita', fallback: 'cursive' },
  { label: 'Reenie Beanie', tag: 'Nota Rápida', value: 'Reenie Beanie', category: 'manuscrita', fallback: 'cursive' },

  // Tecno +12
  { label: 'Tektur', tag: 'Cyberpunk', value: 'Tektur', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Goldman', tag: 'Mecha', value: 'Goldman', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Turret Road', tag: 'Sci-Fi', value: 'Turret Road', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Geo', tag: 'Digital', value: 'Geo', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Keania One', tag: 'Futurista', value: 'Keania One', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Wallpoet', tag: 'Stencil Tech', value: 'Wallpoet', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Nova Square', tag: 'Cuadrada', value: 'Nova Square', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Quantico', tag: 'Táctico', value: 'Quantico', category: 'tecno', fallback: 'sans-serif' },
  { label: 'Major Mono Display', tag: 'Geométrico', value: 'Major Mono Display', category: 'tecno', fallback: 'monospace' },
  { label: 'Syne Mono', tag: 'Experimental', value: 'Syne Mono', category: 'tecno', fallback: 'monospace' },
  { label: 'Roboto Mono', tag: 'Código Pro', value: 'Roboto Mono', category: 'tecno', fallback: 'monospace' },
  { label: 'Source Code Pro', tag: 'Terminal', value: 'Source Code Pro', category: 'tecno', fallback: 'monospace' },

  // Artísticas +12
  { label: 'Eater', tag: 'Zombie', value: 'Eater', category: 'artistico', fallback: 'cursive' },
  { label: 'Butcherman', tag: 'Terror', value: 'Butcherman', category: 'artistico', fallback: 'cursive' },
  { label: 'Jolly Lodger', tag: 'Halloween', value: 'Jolly Lodger', category: 'artistico', fallback: 'cursive' },
  { label: 'Pirata One', tag: 'Gótica', value: 'Pirata One', category: 'artistico', fallback: 'serif' },
  { label: 'Grenze Gotisch', tag: 'Medieval', value: 'Grenze Gotisch', category: 'artistico', fallback: 'serif' },
  { label: 'Berkshire Swash', tag: 'Fantasía', value: 'Berkshire Swash', category: 'artistico', fallback: 'cursive' },
  { label: 'Lobster Two', tag: 'Vintage', value: 'Lobster Two', category: 'artistico', fallback: 'cursive' },
  { label: 'Limelight', tag: 'Art Déco', value: 'Limelight', category: 'artistico', fallback: 'cursive' },
  { label: 'Megrim', tag: 'Vanguardia', value: 'Megrim', category: 'artistico', fallback: 'sans-serif' },
  { label: 'Spicy Rice', tag: 'Retro Pop', value: 'Spicy Rice', category: 'artistico', fallback: 'cursive' },
  { label: 'Ribeye Marrow', tag: 'Ilustrada', value: 'Ribeye Marrow', category: 'artistico', fallback: 'cursive' },
  { label: 'Rubik Bubbles', tag: 'Burbujas', value: 'Rubik Bubbles', category: 'artistico', fallback: 'cursive' },
];

export const EXTRA_FONT_STYLESHEET_URLS = [
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&family=Poppins:wght@400;700;900&family=Lato:wght@400;700;900&family=Raleway:wght@400;700;900&family=Nunito:wght@400;700;900&family=Rubik:wght@400;700;900&family=Outfit:wght@400;700;900&family=Syne:wght@600;800&family=DM+Sans:wght@400;700;900&family=Plus+Jakarta+Sans:wght@400;700;800&family=Anton&family=Bangers&family=Black+Ops+One&family=Righteous&family=Archivo+Black&family=Russo+One&family=Staatliches&family=Teko:wght@500;700&family=Bungee&family=Ultra&family=Merriweather:wght@400;700;900&family=Lora:wght@400;700&family=Cinzel:wght@600;800&family=Abril+Fatface&family=Cormorant+Garamond:wght@600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Prata&family=Bodoni+Moda:wght@500;800&family=Pacifico&family=Dancing+Script:wght@600;700&family=Lobster&family=Caveat:wght@600;700&family=Satisfy&family=Great+Vibes&family=Sacramento&family=Shadows+Into+Light&family=Kaushan+Script&family=Amatic+SC:wght@700&family=Orbitron:wght@600;800&family=Audiowide&family=Press+Start+2P&family=Silkscreen:wght@400;700&family=Chakra+Petch:wght@600;700&family=Exo+2:wght@600;800&family=Creepster&family=Monoton&family=Fredoka:wght@500;700&family=Luckiest+Guy&family=Special+Elite&family=JetBrains+Mono:wght@500;800&display=swap',
  // 100 New Fonts (split into 4 fast parallel sheets of 25 fonts each)
  'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700;800&family=Work+Sans:wght@400;700;900&family=Manrope:wght@400;700;800&family=Urbanist:wght@400;700;900&family=Quicksand:wght@500;700&family=Josefin+Sans:wght@400;700&family=Barlow:wght@500;700;900&family=Mulish:wght@500;700;900&family=Karla:wght@500;700;800&family=Cabin:wght@500;700&family=Titillium+Web:wght@600;700;900&family=Figtree:wght@500;700;900&family=Lexend:wght@500;700;800&family=Sora:wght@500;700;800&family=Albert+Sans:wght@500;700;900&family=Red+Hat+Display:wght@500;700;900&family=Be+Vietnam+Pro:wght@500;700;900&family=Hind:wght@500;700&family=Kanit:wght@500;700;900&family=Prompt:wght@500;700;900&family=Alfa+Slab+One&family=Passion+One:wght@700;900&family=Titan+One&family=Paytone+One&family=Lilita+One&display=swap',
  'https://fonts.googleapis.com/css2?family=Fugaz+One&family=Rammetto+One&family=Bowlby+One+SC&family=Rowdies:wght@400;700&family=Squada+One&family=Fjalla+One&family=Francois+One&family=Patua+One&family=Changa+One&family=Racing+Sans+One&family=Boogaloo&family=Sigmar+One&family=Bungee+Shade&family=Rubik+Mono+One&family=Dela+Gothic+One&family=Libre+Baskerville:wght@400;700&family=Crimson+Pro:wght@500;700&family=EB+Garamond:wght@500;700&family=Playfair+Display+SC:wght@700;900&family=Spectral:wght@500;700&family=Bitter:wght@500;700;900&family=Vollkorn:wght@500;700;900&family=Yeseva+One&family=Marcellus&family=Cinzel+Decorative:wght@700;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Cardo:wght@400;700&family=Fraunces:wght@500;700;900&family=Newsreader:wght@500;700&family=Rozha+One&family=Poiret+One&family=Forum&family=Vidaloka&family=Rufina:wght@400;700&family=Indie+Flower&family=Patrick+Hand&family=Courgette&family=Cookie&family=Yellowtail&family=Allura&family=Alex+Brush&family=Parisienne&family=Marck+Script&family=Kalam:wght@400;700&family=Gloria+Hallelujah&family=Architects+Daughter&family=Rock+Salt&family=Homemade+Apple&family=Bad+Script&family=Handlee&family=Covered+By+Your+Grace&display=swap',
  'https://fonts.googleapis.com/css2?family=Damion&family=Michroma&family=Rajdhani:wght@500;700&family=Saira:wght@500;700;900&family=Oxanium:wght@500;700;800&family=Electrolize&family=Share+Tech+Mono&family=Space+Mono:wght@400;700&family=IBM+Plex+Mono:wght@500;700&family=VT323&family=Syncopate:wght@400;700&family=Jura:wght@500;700&family=Aldrich&family=Nosifer&family=Metal+Mania&family=Rye&family=Fascinate&family=Shrikhand&family=Modak&family=Chewy&family=Bubblegum+Sans&family=Bungee+Inline&family=Faster+One&family=Griffy&family=UnifrakturMaguntia&display=swap',
  // 100 Additional New Fonts (159 - 258, split into 4 fast parallel sheets of 25 fonts each)
  'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;700;900&family=Noto+Sans:wght@400;700;900&family=PT+Sans:wght@400;700&family=Ubuntu:wght@400;700&family=Dosis:wght@500;700;800&family=Comfortaa:wght@500;700&family=Signika:wght@500;700&family=Catamaran:wght@500;700;900&family=Varela+Round&family=Heebo:wght@400;700;900&family=Overpass:wght@400;700;900&family=Asap:wght@500;700;900&family=Exo:wght@500;700;900&family=M+PLUS+Rounded+1c:wght@500;700;900&family=Jost:wght@500;700;900&family=Epilogue:wght@500;700;900&family=Bricolage+Grotesque:wght@500;700;800&family=Onest:wght@500;700;900&family=Instrument+Sans:wght@500;700&family=Readex+Pro:wght@400;700&family=Candal&family=Carter+One&family=Concert+One&family=Coda:wght@400;800&family=Secular+One&display=swap',
  'https://fonts.googleapis.com/css2?family=Yanone+Kaffeesatz:wght@500;700&family=Big+Shoulders+Display:wght@700;900&family=Antonio:wght@500;700&family=Saira+Condensed:wght@600;800&family=Barlow+Condensed:wght@600;800&family=Six+Caps&family=Pathway+Gothic+One&family=Cuprum:wght@600;700&family=Black+Han+Sans&family=Seymour+One&family=Bakbak+One&family=Calistoga&family=Potta+One&family=Knewave&family=Bree+Serif&family=PT+Serif:wght@400;700&family=Source+Serif+4:wght@400;700;900&family=Noto+Serif:wght@400;700;900&family=Alegreya:wght@500;700;900&family=Arvo:wght@400;700&family=Rokkitt:wght@500;700;900&family=Domine:wght@500;700&family=Frank+Ruhl+Libre:wght@500;700;900&family=Gelasio:wght@500;700&family=Old+Standard+TT:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Quattrocento:wght@400;700&family=Sorts+Mill+Goudy&family=Philosopher:wght@400;700&family=Italiana&family=Aboreto&family=Tenor+Sans&family=Bellefair&family=Gilda+Display&family=Arizonia&family=Bilbo+Swash+Caps&family=Calligraffitti&family=Cedarville+Cursive&family=Clicker+Script&family=Dawning+of+a+New+Day&family=Euphoria+Script&family=Grand+Hotel&family=Herr+Von+Muellerhoff&family=Italianno&family=La+Belle+Aurore&family=Leckerli+One&family=Merienda:wght@500;700;900&family=Mr+Dafoe&family=Niconne&family=Nothing+You+Could+Do&family=Pinyon+Script&display=swap',
  'https://fonts.googleapis.com/css2?family=Reenie+Beanie&family=Tektur:wght@500;700;900&family=Goldman:wght@400;700&family=Turret+Road:wght@500;700;800&family=Geo&family=Keania+One&family=Wallpoet&family=Nova+Square&family=Quantico:wght@400;700&family=Major+Mono+Display&family=Syne+Mono&family=Roboto+Mono:wght@400;700&family=Source+Code+Pro:wght@500;700;900&family=Eater&family=Butcherman&family=Jolly+Lodger&family=Pirata+One&family=Grenze+Gotisch:wght@500;700;900&family=Berkshire+Swash&family=Lobster+Two:wght@400;700&family=Limelight&family=Megrim&family=Spicy+Rice&family=Ribeye+Marrow&family=Rubik+Bubbles&display=swap',
];

let extraFontsInjected = false;

export function ensureExtraFontsStylesheetsLoaded(): void {
  if (extraFontsInjected || typeof document === 'undefined') return;
  extraFontsInjected = true;
  EXTRA_FONT_STYLESHEET_URLS.forEach((href, idx) => {
    const id = `dulos-extra-fonts-${idx}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  });
}
