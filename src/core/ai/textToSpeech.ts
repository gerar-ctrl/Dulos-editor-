// ============================================================================
// TextToSpeech - Voice Narration Generator (SpeechSynthesis API)
// ============================================================================

export interface TTSOptions {
  text: string;
  lang?: string;
  voiceName?: string;
  rate?: number; // 0.1 to 10 (1.0 default)
  pitch?: number; // 0 to 2 (1.0 default)
}

export class TextToSpeechEngine {
  public static getVoices(): SpeechSynthesisVoice[] {
    if (!('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices();
  }

  public static speak(options: TTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        return reject(new Error('Speech Synthesis not supported'));
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(options.text);
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.lang = options.lang ?? 'es-ES';

      if (options.voiceName) {
        const voices = this.getVoices();
        const found = voices.find((v) => v.name === options.voiceName);
        if (found) utterance.voice = found;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      window.speechSynthesis.speak(utterance);
    });
  }

  public static stop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
