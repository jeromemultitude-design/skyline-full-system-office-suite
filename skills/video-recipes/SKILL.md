---
name: video-recipes
description: ffmpeg recipes for video editing. Use for trimming, joining, resizing for Reels/TikTok/Shorts (9:16), YouTube (16:9) or square, adding burned-in captions, normalizing loudness, compressing for sharing, extracting thumbnails or audio, and quality-checking an export.
---

# Video editing (ffmpeg)

These recipes need ffmpeg and ffprobe installed. This skill works on exported files.

## Rules
- Never overwrite or delete the original. Write outputs beside it with a clear suffix (`-reel-9x16.mp4`, `-captions.mp4`, `-web.mp4`).
- Always inspect first: `ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,bit_rate -show_entries format=duration,size -of json "<in>"`.

## Recipes
- Trim (frame-accurate): `ffmpeg -ss 00:00:05 -i in.mp4 -to 00:00:35 -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k out.mp4`
- 9:16 reel from 16:9 (blurred background fill):
  `ffmpeg -i in.mp4 -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:2[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p" -c:v libx264 -crf 18 -r 30 -c:a aac -b:a 192k -movflags +faststart out-reel-9x16.mp4`
- Loudness to social standard (-14 LUFS): `ffmpeg -i in.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:v copy -c:a aac -b:a 192k out.mp4`
- Burn in captions from an .srt: `ffmpeg -i in.mp4 -vf "subtitles=captions.srt:force_style='FontName=Arial,FontSize=16,Outline=2,MarginV=60'" -c:a copy out-captions.mp4`
- Compress for sharing (~8 Mbps 1080p): `ffmpeg -i in.mp4 -c:v libx264 -preset slow -b:v 8M -maxrate 10M -bufsize 16M -c:a aac -b:a 160k -movflags +faststart out-web.mp4`
- Thumbnail at 3 s: `ffmpeg -ss 3 -i in.mp4 -frames:v 1 -q:v 2 thumb.jpg`; contact sheet: `ffmpeg -i in.mp4 -vf "fps=1/5,scale=320:-1,tile=4x3" -frames:v 1 sheet.jpg`
- Join clips with the same codec: list them in `list.txt` (`file 'a.mp4'`), then `ffmpeg -f concat -safe 0 -i list.txt -c copy joined.mp4`.

## Platform specs
| Platform | Size | Max length | Notes |
|---|---|---|---|
| Instagram Reels / TikTok / YouTube Shorts | 1080×1920, 30 fps | 90 s / 10 min / 60 s | keep text out of the top 250 px and bottom 400 px |
| YouTube | 1920×1080 (or 3840×2160) | — | H.264, AAC 48 kHz |
| Instagram feed | 1080×1350 (4:5) | 60 s | |

## Quality check before handing over
Run ffprobe on every output and confirm: expected width/height and duration (±0.1 s), `yuv420p`, audio present (unless intended),
file plays from the start (moov at front: `+faststart`), loudness near -14 LUFS (`ffmpeg -i out.mp4 -af ebur128 -f null -` tail), and
grab a frame at 10%, 50% and 90% to look at framing and caption placement. Report the checks and their results.
