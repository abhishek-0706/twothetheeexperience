/**
 * Aligns scene caption changes detected in the video with wall-clock scene timestamps.
 * Browser capture can start seconds after timestamps were logged, so we measure from the video.
 */
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function alignCapturedScenes(ffmpeg, videoPath, scenes) {
  const root = path.resolve(__dirname, '../..');
  const framesRaw = path.join(root, 'tmp/caption-frames.raw');

  // Extract a bottom strip, grayscale, 25fps — use input width (iw) not hardcoded
  execFileSync(ffmpeg, [
    '-y', '-i', videoPath,
    '-vf', 'crop=iw:70:0:in_h-70,scale=360:18,format=gray',
    '-r', '25', '-f', 'rawvideo', '-pix_fmt', 'gray', framesRaw,
  ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 60000 });

  const raw = fs.readFileSync(framesRaw);
  const frameSize = 360 * 18;
  const frameCount = Math.floor(raw.length / frameSize);
  const fps = 25;

  // Detect caption transitions via mean absolute pixel difference
  const transitions = [];
  for (let i = 1; i < frameCount; i++) {
    let diff = 0;
    const offset = i * frameSize;
    const prevOffset = (i - 1) * frameSize;
    for (let p = 0; p < frameSize; p++) {
      diff += Math.abs(raw[offset + p] - raw[prevOffset + p]);
    }
    const mad = diff / frameSize;
    if (mad > 3) {
      const ms = Math.round((i / fps) * 1000);
      // Merge transitions closer than 100ms, keep the stronger one
      if (transitions.length > 0 && ms - transitions[transitions.length - 1].ms < 100) {
        if (mad > transitions[transitions.length - 1].mad) {
          transitions[transitions.length - 1] = { ms, mad };
        }
      } else {
        transitions.push({ ms, mad });
      }
    }
  }

  // Try offsets from -1s to +20s to find best alignment
  let bestOffset = 0, bestCount = 0, bestError = Infinity;
  for (let tryOffset = -1000; tryOffset <= 20000; tryOffset += 10) {
    let count = 0, totalError = 0;
    for (const scene of scenes) {
      const expected = scene.startMs + tryOffset;
      let minDist = Infinity;
      for (const t of transitions) {
        const d = Math.abs(t.ms - expected);
        if (d < minDist) minDist = d;
      }
      if (minDist <= 180) { count++; totalError += minDist; }
    }
    if (count > bestCount || (count === bestCount && totalError < bestError)) {
      bestOffset = tryOffset;
      bestCount = count;
      bestError = totalError;
    }
  }

  if (bestCount < scenes.length) {
    throw new Error(
      `Scene captions could not be aligned reliably (${bestCount}/${scenes.length} matched). ` +
      `Refusing a mistimed export.`
    );
  }

  // Assign measured start times
  const aligned = scenes.map((scene, i) => {
    const measured = scene.startMs + bestOffset;
    const next = i < scenes.length - 1 ? scenes[i + 1].startMs + bestOffset : null;
    if (next !== null && measured >= next) {
      throw new Error(`Scene ${scene.id} overlaps with next scene`);
    }
    return { ...scene, startMs: measured };
  });

  // Calculate padding so video runs 500ms past last narration
  const lastScene = aligned[aligned.length - 1];
  const lastEnd = lastScene.startMs + lastScene.durationMs;
  const videoMs = (frameCount / fps) * 1000;
  const padSeconds = Math.max(0, (lastEnd + 500 - videoMs) / 1000);

  // Cleanup
  try { fs.unlinkSync(framesRaw); } catch {}

  return {
    scenes: aligned,
    padSeconds,
    alignment: {
      method: 'caption-transition-detection',
      fps,
      meanOffset: bestOffset,
      sceneCount: scenes.length,
      maxFitError: bestError,
    },
  };
}

module.exports = { alignCapturedScenes };
