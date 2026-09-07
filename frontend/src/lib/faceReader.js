/**
 * Reading a face well.
 *
 * A single frame taken the instant someone clicks a button almost always
 * comes back "neutral" — that is the face of a person concentrating on a
 * button. So a read samples across a few seconds and averages, weighted by
 * how confident the detector was in each frame.
 *
 * face-api is ~700KB, so it is imported on demand: only the page with a
 * camera on it ever pays for the download.
 */

let faceapi = null;
let modelsReady = null;

/* face-api reports seven expressions; the library stocks four moods,
   so neighbouring expressions fold into the closest one. */
export const MOOD_GROUPS = {
  happy: ["happy", "surprised"],
  sad: ["sad", "fearful"],
  angry: ["angry", "disgusted"],
  neutral: ["neutral"],
};

export const MOODS = Object.keys(MOOD_GROUPS);

export const SAMPLE_WINDOW_MS = 2800;
export const SAMPLE_EVERY_MS = 260;

export function scoreMoods(expressions) {
  const scores = {};
  for (const mood of MOODS) {
    scores[mood] = MOOD_GROUPS[mood].reduce(
      (sum, key) => sum + (expressions[key] || 0),
      0
    );
  }
  return scores;
}

const emptyScores = () => Object.fromEntries(MOODS.map((m) => [m, 0]));

export function topMood(scores) {
  return MOODS.reduce((a, b) => ((scores[a] || 0) > (scores[b] || 0) ? a : b));
}

/** Loads the detector and its weights once, then resolves instantly. */
export async function loadReader() {
  if (!modelsReady) {
    modelsReady = (async () => {
      faceapi = await import("face-api.js/dist/face-api.js");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceExpressionNet.loadFromUri("/models"),
      ]);
    })();
  }
  await modelsReady;
  return faceapi;
}

/**
 * Samples the video for a few seconds and returns the averaged distribution.
 *
 * `room` switches to every face in frame, so a group gets one shared reading
 * rather than whoever happens to be nearest the camera.
 */
export async function readFace(
  video,
  {
    room = false,
    windowMs = SAMPLE_WINDOW_MS,
    everyMs = SAMPLE_EVERY_MS,
    onProgress,
    signal,
  } = {}
) {
  if (!faceapi) await loadReader();
  if (!video || video.readyState < 2) {
    return { ok: false, reason: "no-video" };
  }

  const options = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 });
  const totals = emptyScores();
  const deadline = Date.now() + windowMs;
  const expected = Math.max(1, Math.round(windowMs / everyMs));

  let weight = 0;
  let frames = 0;
  let hits = 0;
  let faceCount = 0;

  while (Date.now() < deadline) {
    if (signal?.aborted) return { ok: false, reason: "aborted" };
    const started = Date.now();

    const found = room
      ? await faceapi.detectAllFaces(video, options).withFaceExpressions()
      : await faceapi
          .detectSingleFace(video, options)
          .withFaceExpressions()
          .then((one) => (one ? [one] : []));

    frames += 1;
    if (found.length) {
      hits += 1;
      faceCount = Math.max(faceCount, found.length);
      for (const face of found) {
        // a frame the detector was unsure about should count for less
        const confidence = face.detection?.score ?? 1;
        const scores = scoreMoods(face.expressions);
        for (const mood of MOODS) totals[mood] += scores[mood] * confidence;
        weight += confidence;
      }
    }

    onProgress?.({ frames, hits, expected, faces: found.length });

    const spent = Date.now() - started;
    if (spent < everyMs) {
      await new Promise((r) => setTimeout(r, everyMs - spent));
    }
  }

  if (!weight) return { ok: false, reason: "no-face", frames };

  const scores = emptyScores();
  for (const mood of MOODS) scores[mood] = totals[mood] / weight;

  return {
    ok: true,
    scores,
    mood: topMood(scores),
    frames,
    hits,
    faces: faceCount,
    /* how steady the read was — a face held still across the window is a
       reading you can lean on; one glimpsed twice is not */
    confidence: frames ? hits / frames : 0,
  };
}

/** How far apart two readings are, 0 (identical) to 1 (opposite). */
export function moodDistance(a, b) {
  if (!a || !b) return 1;
  return (
    MOODS.reduce((sum, mood) => sum + Math.abs((a[mood] || 0) - (b[mood] || 0)), 0) / 2
  );
}
