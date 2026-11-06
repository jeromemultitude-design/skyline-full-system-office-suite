---
name: audio-video-qc
description: International-standard audio and video quality control with ffmpeg. Use to measure and certify loudness (ITU-R BS.1770 / EBU R128 / ATSC A/85 / streaming platforms), true peak, clipping, noise, phase and mono compatibility, sample rate and bit depth, and video technical quality (resolution, frame rate, black and frozen frames, broadcast-safe levels, interlacing, A/V sync, VMAF/PSNR/SSIM against a master). Produces a pass/fail QC report and, only when asked, a corrected copy.
---

# Audio & video quality control

Based on the `audio-quality-controller` agent from davila7/claude-code-templates (MIT), extended for music, radio and video delivery.
This needs a full ffmpeg build. The `loudness_check` and `picture_scan` tools cover the common checks.

**Never change the original.** Analysis is read-only. A corrected version is a new file with a suffix (`-mastered`, `-qc-fixed`) in your job folder, made only when the user asks for it.

## 1. Pick the target for where it's going

| Destination | Integrated loudness | True peak max | Notes |
|---|---|---|---|
| Spotify, YouTube, YouTube Music, TikTok, Instagram, Facebook | −14 LUFS (±1) | −1.0 dBTP | platforms turn louder masters down; louder = no benefit |
| Apple Music / iTunes (Sound Check) | −16 LUFS (±1) | −1.0 dBTP | |
| Amazon Music, Tidal, Deezer | −14 to −15 LUFS | −1.0 dBTP (−2 for lossy-heavy chains) | |
| Podcasts (AES TD1004 / Apple) | −16 LUFS stereo, −19 mono | −1.0 dBTP | |
| European broadcast TV/radio (EBU R128) | −23 LUFS (±0.5; ±1 live) | −1.0 dBTP | LRA reported; short-form ads must also meet −23 |
| US broadcast TV (ATSC A/85, CALM Act) | −24 LKFS (±2) | −2.0 dBTP | |
| Cinema / film mix (reference) | dialogue-gated ~−27 LKFS (Netflix: −27 LKFS ±2 dialog) | −2.0 dBTP | |

Measurement is always ITU-R BS.1770-4 (K-weighted, gated), which is what `ebur128` and `loudnorm` implement.

## 2. Audio analysis (one pass each, read-only)
```
ffprobe -v error -show_entries stream=codec_name,sample_rate,channels,channel_layout,bits_per_raw_sample,bit_rate:format=duration,format_name -of json "<in>"
ffmpeg -nostats -i "<in>" -af ebur128=peak=true -f null - 2>&1 | tail -n 14          # Integrated (I), LRA, True peak
ffmpeg -nostats -i "<in>" -af astats=metadata=0:reset=0 -f null - 2>&1 | grep -E "Overall|DC offset|Peak level|RMS level|RMS trough|Noise floor|Number of samples|Flat factor|Peak count" 
ffmpeg -nostats -i "<in>" -af aphasemeter=video=0,ametadata=print:key=lavfi.aphasemeter.phase:file=- -f null - | awk -F= '/phase/{s+=$2;n++;if($2<m||n==1)m=$2}END{print "phase avg",s/n,"min",m}'
ffmpeg -nostats -i "<in>" -af silencedetect=noise=-60dB:d=0.3 -f null - 2>&1 | grep silence_
ffmpeg -y -i "<in>" -lavfi showspectrumpic=s=1600x600:legend=1 spectrum.png        # look for hum (50/60 Hz lines), hiss, low-pass cut-offs from lossy sources
```

Pass/fail rules:
- **Loudness** within the destination tolerance; **true peak** at or below the limit.
- **Clipping**: `Flat factor` > 0 or `Peak count` > a few with peak at 0 dBFS → FAIL (inter-sample overs show as true peak > 0).
- **DC offset** > 0.1% (|value| > 0.001) → flag.
- **Phase**: average correlation < 0.2 or sustained negative values → mono-compatibility FAIL (radio and phone speakers sum to mono).
- **Noise floor** worse than −60 dBFS in quiet passages → flag (hum/hiss; check the spectrum).
- **Head/tail**: dead air > 2 s at start or abrupt cut at end → flag. Mid-file silence > 1 s → flag unless intended.
- **Format** matches the delivery spec (sample rate, bit depth, channels); lossy source upsampled to WAV (spectrum hard-cut at 16 kHz) → flag.

## 3. Video analysis
```
ffprobe -v error -show_entries stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,avg_frame_rate,field_order,color_space,color_transfer,color_primaries,bit_rate,start_time:format=duration -of json "<in>"
ffmpeg -nostats -i "<in>" -vf blackdetect=d=0.5:pix_th=0.10 -an -f null - 2>&1 | grep black_
ffmpeg -nostats -i "<in>" -vf freezedetect=n=-60dB:d=1 -an -f null - 2>&1 | grep freeze_
ffmpeg -nostats -i "<in>" -vf idet -frames:v 600 -an -f null - 2>&1 | grep "Multi frame"
ffmpeg -nostats -i "<in>" -vf signalstats,metadata=print:key=lavfi.signalstats.YMIN:file=ymin.txt -an -f null - ; (same for YMAX) # broadcast-safe 16–235 (8-bit)
ffmpeg -i "<distorted>" -i "<master>" -lavfi "[0:v]scale=1920:1080:flags=bicubic[d];[1:v]scale=1920:1080:flags=bicubic[r];[d][r]libvmaf=log_fmt=json:log_path=vmaf.json" -f null -   # quality vs master
```

Pass/fail rules:
- Resolution, frame rate and aspect as specified; **variable frame rate** (avg ≠ r_frame_rate) → flag for editing/broadcast.
- **pix_fmt yuv420p** for web/social; color tags bt709 for HD (missing tags → colors can shift on phones).
- **Black frames / freezes** > 0.5 s outside intended fades → flag with timestamps.
- **Interlaced** content in a progressive deliverable → FAIL.
- **Broadcast-safe**: YMIN < 16 or YMAX > 235 for broadcast delivery → flag (fine for web).
- **A/V sync**: audio and video `start_time` differ by > 40 ms → flag; spot-check lip sync at 10/50/90%.
- **VMAF** vs master (when a master exists): ≥ 93 excellent for streaming, 80–93 acceptable, < 80 visible degradation. Also report PSNR/SSIM.
- Web playback: `moov` atom at the start (`+faststart`).

## 4. Fixing (only when asked)
- Loudness to a target, two-pass and linear where possible: run `loudnorm=I=<t>:TP=<tp>:LRA=11:print_format=json` once to measure,
  then a second pass with `measured_I/LRA/TP/thresh/offset` and `linear=true`. Re-measure with `ebur128` and report before/after.
- Remove DC: `highpass=f=10`. Rumble: `highpass=f=30` (music) or `80` (voice only). Hum: `bandreject` at 50/60 Hz and harmonics.
- Never use a broad low-pass on music (a 3 kHz low-pass is only ever for telephone-band voice).
- Don't "fix" clipping with a limiter after the fact; report it and request a new master from the mix.

## 5. Report (`AV-QC.md` in the job folder)
Header: file, destination standard used, overall **PASS / FAIL / PASS WITH NOTES**. Then a table per check: measured value, target,
result, and the command used. Then numbered fixes, each with who should do it (mix/master engineer, video editor, export settings).
