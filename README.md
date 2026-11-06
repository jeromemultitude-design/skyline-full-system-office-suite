# Skyline Full System Office Suite

A video editor that lives in Claude Code. Say **"edit this"**, and it plans the edit, cuts it, and checks the result, using FFmpeg on your own computer. Give it notes in plain words, and it learns your style.

Your videos stay on your computer. The AI part runs on your own Claude account.

## What you need
- The Claude desktop app, or Claude Code on a plan that includes it
- [FFmpeg](https://ffmpeg.org/download.html)
- [Node.js](https://nodejs.org/) 18 or newer

## Install

**Claude desktop app, one click (video tools only)**
1. Download `skyline-full-system-office-suite.mcpb` from [Releases](https://github.com/jeromemultitude-design/skyline-full-system-office-suite/releases/latest).
2. Double-click it, then choose **Install** in Claude.

**Claude Code (the full editor, with skills)**

```
/plugin marketplace add jeromemultitude-design/skyline-full-system-office-suite
/plugin install skyline-full-system-office-suite@skyline
```

In the desktop app's Code tab, you can also add it from **+ > Add plugins**.

## Use it
```
Edit this: C:\Videos\raw-footage.mp4. Make a 30-second reel.
```

## What's inside
| Part | What it does |
|---|---|
| `skyline-editor` | The full job, from brief to quality check |
| `hook-and-copy-qa` | Checks scripts and finds the strongest hook |
| `audio-video-qc` | Checks loudness, picture and delivery specs |
| `video-recipes` | FFmpeg recipes and platform sizes |
| `skyline-video` MCP tools | Video info, contact sheets, silence finding, loudness and picture checks, trimming, 9:16 reels, loudness fixes and compression |

## Safety
It never overwrites your original file, never publishes anything, and asks before any paid AI generation.

## License
MIT. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
