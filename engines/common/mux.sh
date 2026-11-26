#!/bin/sh
# mux.sh video.mp4 audio.wav out.mp4  — AAC audio, -14 LUFS, video copied
set -e
ffmpeg -v error -y -i "$1" -i "$2" -map 0:v -map 1:a -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 160k -shortest -movflags +faststart "$3"
