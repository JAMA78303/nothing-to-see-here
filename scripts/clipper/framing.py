"""Finds faces in a stretch of video and works out how to frame it vertically.

    python3 framing.py VIDEO START DURATION FOCUS MODEL_DIR  ->  JSON on stdout

Samples a few frames a second, detects faces with OpenCV's YuNet model
(downloaded once into MODEL_DIR and checked against a pinned hash), then
reports:

  facecam   a small face that sits in the same spot for most of the clip,
            i.e. a streamer's webcam overlay: {cx, cy, w, h, edge, box} as
            fractions of the frame. edge=True when it's near a side or corner;
            box={x, y, w, h} is the overlay's rectangle when it can be found,
            else null. First choice: the still region around the face (gameplay
            changes all the time, a webcam scene mostly doesn't). Fallback:
            straight edges in the averaged frame, where moving gameplay blurs
            away and the overlay's border stays sharp.
  track     where a 9:16 crop should sit, frame by frame, to follow the main
            face: {fps, x: [left edge as a fraction of the width, ...]}.
            Holds still when the face barely moves, pans smoothly when it
            does, and cuts (rather than pans) across shot changes.
  coverage  fraction of samples with any face in them

Needs opencv-python (or opencv-python-headless) 4.8+ and numpy.
"""

import hashlib
import json
import os
import sys
import urllib.request

import cv2
import numpy as np

SAMPLE_FPS = 4
OUT_FPS = 30
DETECT_WIDTH = 640
MIN_SCORE = 0.75
MODEL_URL = "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
MODEL_SHA256 = "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4"


def main():
    video, start, duration, focus = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
    model = load_model(sys.argv[5])
    cap = cv2.VideoCapture(video)
    if not cap.isOpened():
        sys.exit(f"cannot open {video}")
    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    if start > 0:
        cap.set(cv2.CAP_PROP_POS_MSEC, start * 1000)

    detect_h = round(DETECT_WIDTH * H / W)
    detector = cv2.FaceDetectorYN.create(model, "", (DETECT_WIDTH, detect_h), MIN_SCORE, 0.3, 50)

    step = max(1, round(fps / SAMPLE_FPS))
    samples = []  # (t, faces, cut)
    prev_hist = None
    mean = None
    sq = None
    idx = 0
    while idx / fps < duration:
        if not cap.grab():
            break
        if idx % step == 0:
            ok, frame = cap.retrieve()
            if not ok:
                break
            small = cv2.resize(frame, (DETECT_WIDTH, detect_h))
            hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
            hist = cv2.calcHist([hsv], [0, 1], None, [16, 8], [0, 180, 0, 256])
            cv2.normalize(hist, hist)
            cut = prev_hist is not None and cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL) < 0.5
            prev_hist = hist
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32)
            mean = gray if mean is None else mean + gray
            sq = gray * gray if sq is None else sq + gray * gray
            samples.append((idx / fps, detect(small, detector), cut))
        idx += 1

    n = len(samples)
    if n == 0:
        sys.exit("no frames read")
    crop_w = (H * 9 / 16) / W
    coverage = sum(1 for _, f, _ in samples if f) / n

    print(json.dumps({
        "width": W,
        "height": H,
        "coverage": round(coverage, 3),
        "facecam": find_facecam(samples, mean / n, np.maximum(sq / n - (mean / n) ** 2, 0)),
        "track": track(samples, crop_w, focus, duration) if crop_w < 1 and coverage >= 0.15 else None,
    }))


def load_model(model_dir):
    path = os.path.join(model_dir, "face_detection_yunet_2023mar.onnx")
    if not os.path.exists(path):
        os.makedirs(model_dir, exist_ok=True)
        print("Downloading the face detection model (230 KB, once)...", file=sys.stderr)
        data = urllib.request.urlopen(MODEL_URL, timeout=60).read()
        if hashlib.sha256(data).hexdigest() != MODEL_SHA256:
            sys.exit("face model download failed its checksum")
        with open(path, "wb") as f:
            f.write(data)
    return path


def detect(frame, detector):
    h, w = frame.shape[:2]
    _, faces = detector.detect(frame)
    if faces is None:
        return []
    out = []
    for f in faces:
        x, y, bw, bh = (float(v) for v in f[:4])
        if bw < w * 0.02:
            continue
        out.append(((x + bw / 2) / w, (y + bh / 2) / h, bw / w, bh / h))
    return out


def find_facecam(samples, mean, var):
    """A small face that stays put for at least half the clip."""
    clusters = []  # [sum_cx, sum_cy, count, set(sample ids), faces]
    for i, (_, faces, _) in enumerate(samples):
        for f in faces:
            if f[2] > 0.13:
                continue
            for c in clusters:
                if abs(c[0] / c[2] - f[0]) < 0.04 and abs(c[1] / c[2] - f[1]) < 0.05:
                    c[0] += f[0]
                    c[1] += f[1]
                    c[2] += 1
                    c[3].add(i)
                    c[4].append(f)
                    break
            else:
                clusters.append([f[0], f[1], 1, {i}, [f]])
    if not clusters:
        return None
    best = max(clusters, key=lambda c: len(c[3]))
    if len(best[3]) < 0.5 * len(samples):
        return None
    cx, cy, w, h = (float(np.median([f[k] for f in best[4]])) for k in range(4))
    edge = cx < 0.3 or cx > 0.7 or cy < 0.28 or cy > 0.72
    r = lambda v: round(float(v), 4)
    return {"cx": r(cx), "cy": r(cy), "w": r(w), "h": r(h), "edge": edge, "box": still_box(var, cx, cy, w, h) or cam_box(mean, cx, cy, w, h)}


def still_box(var, cx, cy, fw, fh):
    """The low-motion region connected to the face: a webcam inside moving gameplay."""
    H, W = var.shape
    raw = (var < 150).astype(np.uint8)
    fwp, fhp = fw * W, fh * H
    # Fill the holes a moving streamer leaves, as much as possible without
    # merging into a static HUD or menu next to the cam.
    for scale in (1.2, 0.6, 0.3, 0.0):
        k = max(1, int(fwp * scale)) | 1
        still = cv2.morphologyEx(raw, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (k, k)))
        still = cv2.morphologyEx(still, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)))
        _, labels, stats, _ = cv2.connectedComponentsWithStats(still, connectivity=4)
        label = labels[min(H - 1, int(cy * H)), min(W - 1, int(cx * W))]
        if label == 0:
            continue
        x, y, bw, bh, _ = stats[label]
        # Reject the whole screen (paused game, menu) or a region barely bigger than the face.
        if 2 * fwp <= bw <= 14 * fwp and 1.5 * fhp <= bh <= 10 * fhp and bw * bh < 0.4 * W * H:
            i = max(2, round(min(bw, bh) * 0.02))  # trim any border line around the overlay
            return {"x": round((x + i) / W, 4), "y": round((y + i) / H, 4), "w": round((bw - 2 * i) / W, 4), "h": round((bh - 2 * i) / H, 4)}
    return None


def cam_box(mean, cx, cy, fw, fh):
    """The webcam overlay's rectangle around a face, from straight edges in the averaged frame."""
    H, W = mean.shape
    gx = np.abs(cv2.Sobel(mean, cv2.CV_32F, 1, 0, ksize=3))
    gy = np.abs(cv2.Sobel(mean, cv2.CV_32F, 0, 1, ksize=3))
    cx, cy, fw, fh = cx * W, cy * H, fw * W, fh * H
    rows = slice(max(0, int(cy - 0.8 * fh)), min(H, int(cy + 0.8 * fh)))
    cols = slice(max(0, int(cx - 0.8 * fw)), min(W, int(cx + 0.8 * fw)))

    def border(grad, band, near, far, vertical):
        """Scan outward from the face; the first straight line wins, the frame edge if we run off it."""
        limit = (W if vertical else H) - 1
        step = 1 if far > near else -1
        for i in range(int(round(near)), int(round(far)) + step, step):
            if i <= 0 or i >= limit:
                return max(0, min(i, limit))
            line = grad[band, i] if vertical else grad[i, band]
            if np.mean(line > 30) >= 0.8:
                return i
        return None

    left = border(gx, rows, cx - 0.9 * fw, cx - 7 * fw, True)
    right = border(gx, rows, cx + 0.9 * fw, cx + 7 * fw, True)
    top = border(gy, cols, cy - 0.9 * fh, cy - 6 * fh, False)
    bottom = border(gy, cols, cy + 0.9 * fh, cy + 6 * fh, False)
    if None in (left, right, top, bottom):
        return None
    bw, bh = right - left, bottom - top
    if not (2 * fw <= bw <= 14 * fw and 0.7 <= bw / max(bh, 1) <= 2.6):
        return None
    inset = 3  # stay inside the border line itself
    return {
        "x": round((left + inset) / W, 4),
        "y": round((top + inset) / H, 4),
        "w": round((bw - 2 * inset) / W, 4),
        "h": round((bh - 2 * inset) / H, 4),
    }


def track(samples, crop_w, focus, duration):
    # Pick the face to follow in each sample: the biggest, but stick with the
    # one we were following unless another is clearly bigger.
    targets, prev = [], None
    for _, faces, cut in samples:
        if cut:
            prev = None
        if not faces:
            targets.append(None)
            continue
        choice = max(faces, key=lambda f: f[2])
        if prev is not None:
            near = [f for f in faces if abs(f[0] - prev) < 0.08]
            if near:
                n = max(near, key=lambda f: f[2])
                if n[2] >= 0.6 * choice[2]:
                    choice = n
        targets.append(choice[0])
        prev = choice[0]

    # Shots: split at cuts, frame each shot on its own.
    bounds = [0] + [i for i, s in enumerate(samples) if s[2]] + [len(samples)]
    default = focus * (1 - crop_w) + crop_w / 2
    times = np.array([s[0] for s in samples])
    shots = []  # (t_start, t_end, sample_times, centers)
    for a, b in zip(bounds, bounds[1:]):
        if b <= a:
            continue
        vals = targets[a:b]
        known = [v for v in vals if v is not None]
        if len(known) < max(2, 0.2 * len(vals)):
            centers = np.full(b - a, default)
        else:
            centers = np.array(fill_gaps(vals))
            centers = median_filter(centers, 5)
            if centers.max() - centers.min() <= crop_w * 0.35:
                centers = np.full_like(centers, float(np.median(centers)))
            else:
                centers = gaussian(centers, 1.2 * SAMPLE_FPS)
        t_end = times[b] if b < len(samples) else duration
        shots.append((times[a] if a else 0.0, t_end, times[a:b], centers))

    xs = []
    for k in range(int(duration * OUT_FPS)):
        t = k / OUT_FPS
        shot = next((s for s in shots if s[0] <= t < s[1]), shots[-1])
        c = float(np.interp(t, shot[2], shot[3]))
        xs.append(round(min(max(c - crop_w / 2, 0.0), 1 - crop_w), 4))
    return {"fps": OUT_FPS, "x": xs}


def fill_gaps(vals):
    out = list(vals)
    last = None
    for i, v in enumerate(out):
        if v is None:
            out[i] = last
        else:
            last = v
    nxt = None
    for i in range(len(out) - 1, -1, -1):
        if out[i] is None:
            out[i] = nxt
        else:
            nxt = out[i]
    return out


def median_filter(a, k):
    if len(a) < k:
        return a
    pad = k // 2
    p = np.pad(a, pad, mode="edge")
    return np.array([np.median(p[i:i + k]) for i in range(len(a))])


def gaussian(a, sigma):
    radius = int(3 * sigma)
    kernel = np.exp(-0.5 * (np.arange(-radius, radius + 1) / sigma) ** 2)
    kernel /= kernel.sum()
    return np.convolve(np.pad(a, radius, mode="edge"), kernel, mode="valid")


if __name__ == "__main__":
    main()
