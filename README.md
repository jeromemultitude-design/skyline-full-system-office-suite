# Skyline Full System Office Suite

A whole digital company inside Claude Code: 36 specialists, from Video Editor and Content Strategist to Software Engineer, UI/UX Designer, Web Developer, QA Engineer, Media Buyer and Sales Representative. A Company Director assigns the work, and a Quality Reviewer checks it.

It also includes video tools that run FFmpeg on your own computer. Your files stay on your computer, and the AI runs on your own Claude account.

## What you need
- The Claude desktop app, or Claude Code on a plan that includes it
- [FFmpeg](https://ffmpeg.org/download.html) for the video tools
- [Node.js](https://nodejs.org/) 18 or newer

## Install

**Claude Code (the full company)**

```
/plugin marketplace add jeromemultitude-design/skyline-full-system-office-suite
/plugin install skyline-full-system-office-suite@skyline
```

In the desktop app's Code tab, you can also add it from **+ > Add plugins**.

**Claude desktop app, one click (video tools only)**
1. Download `skyline-full-system-office-suite.mcpb` from [Releases](https://github.com/jeromemultitude-design/skyline-full-system-office-suite/releases/latest).
2. Double-click it, then choose **Install** in Claude.

## Use it
Give a big job to the Company Director:

```
/skyline-full-system-office-suite:company-director Launch a landing page and three video ads for my bakery.
```

Or call one specialist:

```
/skyline-full-system-office-suite:video-editor Edit this: C:\Videos\raw-footage.mp4. Make a 30-second reel.
/skyline-full-system-office-suite:qa-engineer Reproduce the login bug and write a failing test.
```

## The team
See [COMPANY.md](COMPANY.md) for all 36 specialists by department: Leadership, Video, Design, Engineering, Marketing, Sales, Data, Customer Success and Operations.

Each specialist is a skill you can call and an agent the Company Director can assign.

## Video tools
The `skyline-video` MCP tools read video info, make contact sheets, find silences, check loudness and picture, trim clips, make 9:16 reels, fix loudness and compress for the web.

## Safety
The team works in drafts. It never sends, posts, publishes, pays, deploys or changes a live site without you doing it yourself. It never overwrites your original files, and it asks before any paid AI generation.

## What this isn't
This is the team and its methods, not a finished company that runs itself. Check the team's work before you rely on it.

## License
MIT. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
