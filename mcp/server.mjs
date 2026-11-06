#!/usr/bin/env node
// Skyline Full System Office Suite: a small MCP server over stdio. It runs ffmpeg on the user's own computer.
// No packages to install. It never overwrites a file: every edit writes a new one.
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const NAME = "skyline-video", VERSION = "1.1.0", PROTOCOL = "2025-06-18";

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      if (err && err.code === "ENOENT") return reject(new Error(`${cmd} isn't installed. Install ffmpeg, then try again.`));
      if (err) return reject(new Error(String(stderr || err.message).trim().split("\n").slice(-4).join("\n")));
      resolve({ stdout, stderr });
    });
  });
}
function input(p) {
  const full = path.resolve(String(p || ""));
  if (!p || !fs.existsSync(full) || !fs.statSync(full).isFile()) throw new Error(`File not found: ${p}`);
  return full;
}
function output(src, suffix, ext, chosen) {
  const parsed = path.parse(src);
  const full = path.resolve(chosen || path.join(parsed.dir, `${parsed.name}-${suffix}${ext || parsed.ext}`));
  if (full === src) throw new Error("The output can't replace the original.");
  if (fs.existsSync(full)) throw new Error(`Already exists, so nothing was changed: ${full}`);
  return full;
}
const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const seconds = (v, label) => { const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a number of seconds`); return String(n); };
const lines = (text, re) => text.split(/\r?\n/).filter((l) => re.test(l)).map((l) => l.replace(/^\[[^\]]+\]\s*/, "").trim());

const fileProp = { type: "string", description: "Full path to the video or audio file" };
const outProp = { type: "string", description: "Optional output path. Defaults to a new file beside the original." };
const TOOLS = {
  video_info: {
    description: "Read a file's length, size, resolution, frame rate, codecs and audio details.",
    schema: { type: "object", properties: { file: fileProp }, required: ["file"] },
    async run({ file }) {
      const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,pix_fmt,sample_rate,channels,bit_rate:format=duration,size,bit_rate", "-of", "json", input(file)]);
      return stdout;
    },
  },
  contact_sheet: {
    description: "Make one image of frames across a video so the whole edit can be reviewed at a glance.",
    schema: { type: "object", properties: { file: fileProp, every_seconds: { type: "number", description: "Gap between frames. Default 5." }, output: outProp }, required: ["file"] },
    async run({ file, every_seconds, output: out }) {
      const src = input(file), dest = output(src, "sheet", ".jpg", out), gap = Math.max(0.2, num(every_seconds, 5));
      await run("ffmpeg", ["-v", "error", "-n", "-i", src, "-vf", `fps=1/${gap},scale=320:-2,tile=6x6`, "-frames:v", "1", "-q:v", "4", dest]);
      return `Saved ${dest}`;
    },
  },
  find_silences: {
    description: "List the silent gaps in a file, for cutting dead air.",
    schema: { type: "object", properties: { file: fileProp, noise_db: { type: "number", description: "Silence threshold in dB. Default -35." }, min_seconds: { type: "number", description: "Shortest gap to list. Default 0.5." } }, required: ["file"] },
    async run({ file, noise_db, min_seconds }) {
      const { stderr } = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", input(file), "-af", `silencedetect=noise=${num(noise_db, -35)}dB:d=${num(min_seconds, 0.5)}`, "-f", "null", "-"]);
      return lines(stderr, /silence_(start|end)/).join("\n") || "No silences found.";
    },
  },
  loudness_check: {
    description: "Measure integrated loudness, loudness range and true peak (EBU R128). Social platforms usually sit near -14 LUFS.",
    schema: { type: "object", properties: { file: fileProp }, required: ["file"] },
    async run({ file }) {
      const { stderr } = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", input(file), "-af", "ebur128=peak=true", "-f", "null", "-"]);
      return stderr.split(/\r?\n/).slice(-14).join("\n").trim();
    },
  },
  picture_scan: {
    description: "Find black frames and frozen picture, with timestamps.",
    schema: { type: "object", properties: { file: fileProp }, required: ["file"] },
    async run({ file }) {
      const { stderr } = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", input(file), "-vf", "blackdetect=d=0.25:pix_th=0.10,freezedetect=n=-60dB:d=0.75", "-an", "-f", "null", "-"]);
      return lines(stderr, /black_start|freeze_(start|end)/).join("\n") || "No black or frozen sections found.";
    },
  },
  trim_clip: {
    description: "Cut a section into a new file, frame accurate.",
    schema: { type: "object", properties: { file: fileProp, start: { type: "number", description: "Start in seconds" }, end: { type: "number", description: "End in seconds" }, output: outProp }, required: ["file", "start", "end"] },
    async run({ file, start, end, output: out }) {
      const src = input(file), dest = output(src, "trim", ".mp4", out);
      await run("ffmpeg", ["-v", "error", "-n", "-ss", seconds(start, "start"), "-to", seconds(end, "end"), "-i", src, "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", dest]);
      return `Saved ${dest}`;
    },
  },
  make_vertical: {
    description: "Make a 1080x1920 version for Reels, TikTok and Shorts, with a blurred fill behind the picture.",
    schema: { type: "object", properties: { file: fileProp, output: outProp }, required: ["file"] },
    async run({ file, output: out }) {
      const src = input(file), dest = output(src, "reel-9x16", ".mp4", out);
      await run("ffmpeg", ["-v", "error", "-n", "-i", src, "-filter_complex", "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:2[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", dest]);
      return `Saved ${dest}`;
    },
  },
  normalize_loudness: {
    description: "Make a new file at a target loudness. Default -14 LUFS, true peak -1.5 dBTP. The picture isn't re-encoded.",
    schema: { type: "object", properties: { file: fileProp, target_lufs: { type: "number", description: "Target loudness. Default -14." }, output: outProp }, required: ["file"] },
    async run({ file, target_lufs, output: out }) {
      const src = input(file), dest = output(src, "loud", undefined, out);
      await run("ffmpeg", ["-v", "error", "-n", "-i", src, "-af", `loudnorm=I=${num(target_lufs, -14)}:TP=-1.5:LRA=11`, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", dest]);
      return `Saved ${dest}`;
    },
  },
  compress_for_web: {
    description: "Make a smaller H.264 copy for sharing, with fast start for web playback.",
    schema: { type: "object", properties: { file: fileProp, output: outProp }, required: ["file"] },
    async run({ file, output: out }) {
      const src = input(file), dest = output(src, "web", ".mp4", out);
      await run("ffmpeg", ["-v", "error", "-n", "-i", src, "-c:v", "libx264", "-crf", "23", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", dest]);
      return `Saved ${dest}`;
    },
  },
};

const send = (msg) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...msg })}\n`);
async function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return; // notifications need no reply
  if (method === "initialize") return send({ id, result: { protocolVersion: params?.protocolVersion || PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: NAME, version: VERSION } } });
  if (method === "ping") return send({ id, result: {} });
  if (method === "tools/list") return send({ id, result: { tools: Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema: t.schema })) } });
  if (method === "tools/call") {
    const tool = TOOLS[params?.name];
    if (!tool) return send({ id, error: { code: -32602, message: `Unknown tool: ${params?.name}` } });
    try { return send({ id, result: { content: [{ type: "text", text: await tool.run(params.arguments || {}) }] } }); }
    catch (err) { return send({ id, result: { isError: true, content: [{ type: "text", text: err.message }] } }); }
  }
  send({ id, error: { code: -32601, message: `Unknown method: ${method}` } });
}
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return send({ id: null, error: { code: -32700, message: "Bad JSON" } }); }
  handle(msg).catch((err) => send({ id: msg.id ?? null, error: { code: -32603, message: err.message } }));
});
if (process.argv.includes("--version")) { console.log(`${NAME} ${VERSION} on ${os.platform()}`); process.exit(0); }
