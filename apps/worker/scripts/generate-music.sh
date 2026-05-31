#!/bin/sh
# Generates royalty-free placeholder loops for Reels Factory (synthetic tones, no external samples).
set -e
DIR="$(cd "$(dirname "$0")/../assets/music" && pwd)"
mkdir -p "$DIR"

gen_track() {
  name="$1"
  freq="$2"
  tempo="$3"
  ffmpeg -y -f lavfi -i "sine=frequency=${freq}:duration=20" \
    -f lavfi -i "sine=frequency=$((freq * 2)):duration=20" \
    -filter_complex "[0:a]volume=0.25[a0];[1:a]volume=0.12[a1];[a0][a1]amix=inputs=2,volume=0.8,afade=t=in:st=0:d=0.3,afade=t=out:st=18.5:d=1.5" \
    -c:a libmp3lame -b:a 128k "$DIR/${name}.mp3" 2>/dev/null
  echo "Generated $DIR/${name}.mp3"
}

gen_track upbeat_drive 440 120
gen_track steady_groove 330 100
gen_track smooth_pulse 220 90
gen_track bright_hook 523 128
gen_track warm_trust 294 95
gen_track luxury_flow 196 85

echo "Music placeholders ready in $DIR"
