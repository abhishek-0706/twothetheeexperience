/**
 * Mux the recorded video with narration audio, using known scene timestamps.
 * Skips the alignment step — uses the timestamps logged during recording.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const ffmpeg = require('./node_modules/ffmpeg-static');

const narrationPath = path.join(root, 'tmp/submission-narration.json');
const clips = JSON.parse(fs.readFileSync(narrationPath, 'utf8'));

// Scene start times from the latest recording (tight timing)
const sceneTimestamps = {
  intro: 4979,
  hub: 25268,
  budget: 49203,
  timeline: 70977,
  cascade: 88971,
  chat: 112071,
  guardrail: 133547,
  studio: 159473,
  close: 182920,
};

// Assign timestamps
for (const clip of clips) {
  clip.startMs = sceneTimestamps[clip.id];
}

// Find the recorded video (largest webm in the recording dir)
const recDir = path.join(root, 'tmp/submission-recording');
const videos = fs.readdirSync(recDir)
  .filter(f => f.endsWith('.webm'))
  .map(f => ({ name: f, size: fs.statSync(path.join(recDir, f)).size, mtime: fs.statSync(path.join(recDir, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

if (videos.length === 0) {
  console.error('No recorded video found');
  process.exit(1);
}

const recorded = path.join(recDir, videos[0].name);
const output = path.join(root, 'demo/twothetheeexperience_demo.mp4');

console.log('Video: ' + recorded + ' (' + (videos[0].size / 1048576).toFixed(1) + ' MB)');
console.log('Scenes: ' + clips.length);

// Build FFmpeg command
const args = ['-y', '-i', recorded];
for (const clip of clips) args.push('-i', clip.audio);

const filters = clips.map(
  (s, i) => `[${i + 1}:a]adelay=${s.startMs}:all=1[a${i}]`
);
filters.push(
  clips.map((_, i) => `[a${i}]`).join('') +
    `amix=inputs=${clips.length}:normalize=0:dropout_transition=0[a]`
);

args.push(
  '-filter_complex', filters.join(';'),
  '-map', '0:v',
  '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
  '-pix_fmt', 'yuv420p', '-r', '25',
  '-c:a', 'aac', '-b:a', '128k',
  '-movflags', '+faststart',
  output
);

console.log('Muxing...');
execFileSync(ffmpeg, args, { stdio: 'inherit', timeout: 120000 });

const sizeMB = (fs.statSync(output).size / 1048576).toFixed(1);
console.log('Done! ' + output + ' (' + sizeMB + ' MB)');
