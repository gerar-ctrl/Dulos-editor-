// ============================================================================
// DubbingBar.tsx - Live Simultaneous Video Dubbing / Voiceover Recorder
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, X } from 'lucide-react';
import { VoiceRecorder } from '../../core/audio/VoiceRecorder';
import { globalAudioEngine } from '../../core/audio/AudioEngine';
import { useEditorStore } from '../../store/useEditorStore';
import { AudioClip } from '../../types/editor';

function formatRecTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}.${tenths}`;
}

export function useDubbingRecorder() {
  const isRecordingDub = useEditorStore((s) => s.isRecordingDub);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setDubRecordingState = useEditorStore((s) => s.setDubRecordingState);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const addDubbingClip = useEditorStore((s) => s.addDubbingClip);
  const showToast = useEditorStore((s) => s.showToast);

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const recordStartTimeRef = useRef<number>(0);
  const isStoppingRef = useRef<boolean>(false);
  const wasPlayingDuringRecRef = useRef<boolean>(false);

  const [elapsed, setElapsed] = useState(0);
  const [micLevel, setMicLevel] = useState(0);

  const stopDubbing = useCallback(async () => {
    if (isStoppingRef.current || !recorderRef.current) return;
    isStoppingRef.current = true;

    const recorder = recorderRef.current;
    recorderRef.current = null;
    wasPlayingDuringRecRef.current = false;

    setDubRecordingState(false, null);
    if (useEditorStore.getState().isPlaying) {
      setIsPlaying(false);
    }

    try {
      const result = await recorder.stop();
      let finalDuration = result.duration;
      try {
        const buffer = await globalAudioEngine.loadAudioBuffer(result.url);
        if (buffer && buffer.duration > 0) {
          finalDuration = buffer.duration;
        }
      } catch {}

      if (finalDuration < 0.1) {
        URL.revokeObjectURL(result.url);
        showToast('Grabación demasiado corta');
        return;
      }

      const waveform = await globalAudioEngine.generateWaveform(result.url, 60);
      const clipId = 'dub_' + Math.random().toString(36).substring(2, 9);
      const newClip: AudioClip = {
        id: clipId,
        trackId: 'track_audio',
        type: 'audio',
        name: '🎤 Doblaje',
        sourceUrl: result.url,
        startTime: Number(Math.max(0, recordStartTimeRef.current).toFixed(2)),
        duration: Number(finalDuration.toFixed(2)),
        sourceStartTime: 0,
        sourceDuration: Number(finalDuration.toFixed(2)),
        speed: 1,
        waveform,
        audio: {
          volume: 100,
          fadeInDuration: 0.05,
          fadeOutDuration: 0.1,
          voiceFilter: 'none',
          noiseReduction: true,
          isMuted: false,
          preservesPitch: true,
        },
      };

      addDubbingClip(newClip);
      showToast('🎤 Doblaje añadido sobre el video');
    } catch {
      showToast('Error al guardar la grabación de voz');
    } finally {
      isStoppingRef.current = false;
      setElapsed(0);
      setMicLevel(0);
    }
  }, [addDubbingClip, setDubRecordingState, setIsPlaying, showToast]);

  const startDubbing = useCallback(async () => {
    if (recorderRef.current || useEditorStore.getState().isRecordingDub) return;

    // Unlock Web Audio synchronously within user gesture
    globalAudioEngine.init();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Tu navegador no soporta grabación de micrófono');
      return;
    }

    const rec = new VoiceRecorder();
    try {
      await rec.start();
    } catch {
      showToast('No se pudo acceder al micrófono. Revisa los permisos.');
      return;
    }

    recorderRef.current = rec;
    isStoppingRef.current = false;

    const state = useEditorStore.getState();
    let startAt = state.currentTime;
    if (startAt >= state.project.settings.duration - 0.05) {
      startAt = 0;
      setCurrentTime(0);
    }

    recordStartTimeRef.current = startAt;
    setElapsed(0);
    setDubRecordingState(true, startAt);

    // Start playing video simultaneously if it isn't already running
    if (!state.isPlaying) {
      setIsPlaying(true);
    }
    wasPlayingDuringRecRef.current = true;
  }, [setCurrentTime, setDubRecordingState, setIsPlaying, showToast]);

  const cancelDubbing = useCallback(() => {
    wasPlayingDuringRecRef.current = false;
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    setDubRecordingState(false, null);
    if (useEditorStore.getState().isPlaying) {
      setIsPlaying(false);
    }
    setElapsed(0);
    setMicLevel(0);
    showToast('Grabación cancelada');
  }, [setDubRecordingState, setIsPlaying, showToast]);

  const toggleDubbing = useCallback(() => {
    if (useEditorStore.getState().isRecordingDub) {
      void stopDubbing();
    } else {
      void startDubbing();
    }
  }, [startDubbing, stopDubbing]);

  // Auto-stop and save dubbing if playback stops or reaches the end of the timeline
  useEffect(() => {
    if (isRecordingDub && isPlaying) {
      wasPlayingDuringRecRef.current = true;
    } else if (isRecordingDub && !isPlaying && wasPlayingDuringRecRef.current) {
      void stopDubbing();
    }
  }, [isRecordingDub, isPlaying, stopDubbing]);

  // Live timer & mic level meter
  useEffect(() => {
    if (!isRecordingDub) return;
    const startedAtMs = Date.now();
    const id = window.setInterval(() => {
      setElapsed((Date.now() - startedAtMs) / 1000);
      if (recorderRef.current) {
        setMicLevel(recorderRef.current.getLevel());
      }
    }, 60);
    return () => window.clearInterval(id);
  }, [isRecordingDub]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.cancel();
        recorderRef.current = null;
      }
    };
  }, []);

  return {
    isRecordingDub,
    elapsed,
    micLevel,
    toggleDubbing,
    stopDubbing,
    cancelDubbing,
  };
}

interface DubbingBarProps {
  isRecording: boolean;
  elapsed: number;
  micLevel: number;
  onStop: () => void;
  onCancel: () => void;
}

const METER_BARS = [0.15, 0.28, 0.42, 0.56, 0.7, 0.82, 0.92, 1];

export const DubbingBar: React.FC<DubbingBarProps> = ({
  isRecording,
  elapsed,
  micLevel,
  onStop,
  onCancel,
}) => {
  if (!isRecording) return null;

  return (
    <div className="w-full bg-rose-950/90 border-t border-rose-500/40 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 z-30 shadow-[0_-4px_20px_rgba(225,29,72,0.25)]">
      {/* Left: Live REC indicator + timer */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0 shadow-[0_0_8px_#f43f5e]" />
        <Mic className="w-4 h-4 text-rose-300 shrink-0" />
        <span className="text-xs font-semibold text-rose-100 truncate">
          Grabando doblaje
        </span>
        <span className="font-mono text-xs font-bold text-white bg-black/30 px-1.5 py-0.5 rounded">
          {formatRecTime(elapsed)}
        </span>
      </div>

      {/* Center: Live Microphone Level Meter */}
      <div className="hidden xs:flex items-center gap-0.5 h-4 px-2" aria-hidden="true">
        {METER_BARS.map((threshold, idx) => {
          const active = micLevel >= threshold * 0.65;
          return (
            <div
              key={idx}
              style={{ height: `${35 + idx * 8}%` }}
              className={`w-1 rounded-full transition-colors duration-75 ${
                active
                  ? idx >= 6
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                  : 'bg-white/15'
              }`}
            />
          );
        })}
      </div>

      {/* Right: Stop & Cancel */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow active:scale-95 transition-all"
          title="Detener y guardar doblaje"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>Detener</span>
        </button>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white active:scale-95 transition-all"
          title="Cancelar grabación"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
