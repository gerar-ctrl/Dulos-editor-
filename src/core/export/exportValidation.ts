// ============================================================================
// exportValidation - Guard against exporting empty projects with no media
// ============================================================================

import type { Project } from '../../types/editor';

export const NO_MEDIA_EXPORT_MESSAGE =
  'Importa al menos un video, audio o imagen antes de exportar.';

/**
 * Returns true only when the project timeline contains at least one imported
 * media clip (video, audio, or image). Empty projects (or projects without
 * imported media) must not be exportable.
 */
export function hasExportableMedia(project: Project | null | undefined): boolean {
  if (!project || !Array.isArray(project.tracks)) return false;
  return project.tracks.some((track) =>
    track.clips.some(
      (clip) =>
        clip.type === 'video' ||
        clip.type === 'audio' ||
        clip.type === 'image'
    )
  );
}
