#!/bin/sh
# Synthetic material only. No remote inputs, accounts or provider streams.
set -eu
root="$1"
mkdir -p "$root"
generate(){
 name="$1"; size="$2"; tone="$3"; rate="$4"; buf="$5"
 dir="$root/$name"; mkdir -p "$dir"
 ffmpeg -hide_banner -loglevel error -nostdin -y   -f lavfi -i "testsrc2=size=$size:rate=25"   -f lavfi -i "sine=frequency=$tone:sample_rate=48000"   -t 24 -c:v libx264 -preset ultrafast -threads 2 -pix_fmt yuv420p   -g 100 -keyint_min 100 -sc_threshold 0 -b:v "$rate" -maxrate "$rate" -bufsize "$buf"   -c:a aac -b:a 96k -ac 2 -f hls -hls_time 4 -hls_playlist_type vod   -hls_flags independent_segments -hls_segment_filename "$dir/seg-%03d.ts" "$dir/index.m3u8"
 # Decode the complete generated playlist, not just a transport prefix.
 ffmpeg -hide_banner -v error -xerror -nostdin -i "$dir/index.m3u8" -f null -
 test "$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$dir/seg-000.ts" | head -n 1)" = "${size#*x}"
 test "$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "$dir/seg-000.ts" | head -n 1)" = aac
 echo "BLOFY_ENGINE_FIXTURE_DECODE_OK $name $size H264 AAC 24s"
}
generate fhd 1920x1080 440 3M 6M
generate hd 1280x720 660 1500k 3M
