export type MusicTrack = {
  id: string;
  file: string;
  mood: "energetic" | "trust" | "premium";
  bpm: number;
  durationSec: number;
  beatMarkersSec: number[];
};

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "upbeat_drive",
    file: "upbeat_drive.mp3",
    mood: "energetic",
    bpm: 120,
    durationSec: 20,
    beatMarkersSec: [0, 3.75, 7.5, 11.25],
  },
  {
    id: "steady_groove",
    file: "steady_groove.mp3",
    mood: "trust",
    bpm: 100,
    durationSec: 20,
    beatMarkersSec: [0, 3.75, 7.5, 11.25],
  },
  {
    id: "smooth_pulse",
    file: "smooth_pulse.mp3",
    mood: "premium",
    bpm: 90,
    durationSec: 20,
    beatMarkersSec: [0, 3.75, 7.5, 11.25],
  },
  {
    id: "bright_hook",
    file: "bright_hook.mp3",
    mood: "energetic",
    bpm: 128,
    durationSec: 20,
    beatMarkersSec: [0, 3.75, 7.5, 11.25],
  },
  {
    id: "warm_trust",
    file: "warm_trust.mp3",
    mood: "trust",
    bpm: 95,
    durationSec: 20,
    beatMarkersSec: [0, 3.75, 7.5, 11.25],
  },
  {
    id: "luxury_flow",
    file: "luxury_flow.mp3",
    mood: "premium",
    bpm: 85,
    durationSec: 20,
    beatMarkersSec: [0, 3.75, 7.5, 11.25],
  },
];

export function pickMusicTrack(
  trackId?: string,
  mood?: "energetic" | "trust" | "premium"
): MusicTrack {
  if (trackId) {
    const found = MUSIC_TRACKS.find((t) => t.id === trackId);
    if (found) return found;
  }
  if (mood) {
    const found = MUSIC_TRACKS.find((t) => t.mood === mood);
    if (found) return found;
  }
  return MUSIC_TRACKS[1]!;
}
