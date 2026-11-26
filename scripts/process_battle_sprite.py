"""
MYTHOS 12.5 — Deterministic HD-2D JRPG Battle Sprite Processor
Converts AI-generated chroma-key pixel art sprites into crisp, transparent,
baseline-aligned game-ready PNGs (Octopath Traveler / Fire Emblem GBA / Final Fantasy Tactics style).

Pipeline:
1. Auto-detect background chroma color from image corners (magenta #FF00FF or green #00FF00).
2. Exterior BFS flood-fill + chroma distance removal (never punches holes inside the character!).
3. Edge Despill (strips green/magenta color-bleed halos cleanly around dark outlines).
4. Connected-component speckle cleanup (removes stray floating dots).
5. Smart aspect-preserving resize onto crisp target canvas (96x96 heroes / 128x128 bosses),
   strictly baseline-aligned to the ground line (feet at y = H - 3).
6. Clean binary/semi-crisp alpha + retro 48-color palette quantization (preserving transparency).
"""

from __future__ import annotations

import argparse
import collections
from pathlib import Path
import numpy as np
from PIL import Image


def detect_bg_color(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    patch = max(4, min(16, h // 40, w // 40))
    corners = np.concatenate(
        [
            rgb[:patch, :patch].reshape(-1, 3),
            rgb[:patch, w - patch :].reshape(-1, 3),
            rgb[h - patch :, :patch].reshape(-1, 3),
            rgb[h - patch :, w - patch :].reshape(-1, 3),
        ],
        axis=0,
    )
    return np.median(corners, axis=0).astype(np.float32)


def is_bg_pixel(rgb: np.ndarray, bg: np.ndarray, tol: float, key_mode: str) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.float32)
    g = rgb[:, :, 1].astype(np.float32)
    b = rgb[:, :, 2].astype(np.float32)
    dist = np.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2)

    if key_mode == "magenta":
        # Magenta dominance: high R and B relative to G
        chroma_dom = np.minimum(r, b) - g
        return (dist < tol) | ((chroma_dom > 55) & (dist < tol * 1.9))
    if key_mode == "green":
        # Green dominance: high G relative to R and B
        chroma_dom = g - np.maximum(r, b)
        return (dist < tol) | ((chroma_dom > 45) & (dist < tol * 1.9))
    return dist < tol


def exterior_flood_fill(candidate_mask: np.ndarray) -> np.ndarray:
    """Marks ONLY background pixels reachable from the outer border (protects interior details!)."""
    h, w = candidate_mask.shape
    visited = np.zeros((h, w), dtype=bool)
    q: collections.deque[tuple[int, int]] = collections.deque()

    for x in range(w):
        if candidate_mask[0, x] and not visited[0, x]:
            visited[0, x] = True
            q.append((0, x))
        if candidate_mask[h - 1, x] and not visited[h - 1, x]:
            visited[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if candidate_mask[y, 0] and not visited[y, 0]:
            visited[y, 0] = True
            q.append((y, 0))
        if candidate_mask[y, w - 1] and not visited[y, w - 1]:
            visited[y, w - 1] = True
            q.append((y, w - 1))

    while q:
        y, x = q.popleft()
        if y > 0 and candidate_mask[y - 1, x] and not visited[y - 1, x]:
            visited[y - 1, x] = True
            q.append((y - 1, x))
        if y + 1 < h and candidate_mask[y + 1, x] and not visited[y + 1, x]:
            visited[y + 1, x] = True
            q.append((y + 1, x))
        if x > 0 and candidate_mask[y, x - 1] and not visited[y, x - 1]:
            visited[y, x - 1] = True
            q.append((y, x - 1))
        if x + 1 < w and candidate_mask[y, x + 1] and not visited[y, x + 1]:
            visited[y, x + 1] = True
            q.append((y, x + 1))

    return visited


def remove_interior_chroma_holes(
    rgb: np.ndarray, bg: np.ndarray, fg_mask: np.ndarray, key_mode: str, hole_tol: float
) -> np.ndarray:
    """Also removes enclosed chroma holes (e.g. gap between legs, arm & cape) matching strong chroma."""
    r = rgb[:, :, 0].astype(np.float32)
    g = rgb[:, :, 1].astype(np.float32)
    b = rgb[:, :, 2].astype(np.float32)
    dist = np.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2)
    if key_mode == "magenta":
        strong_chroma = (np.minimum(r, b) - g > 85) & (dist < hole_tol)
    elif key_mode == "green":
        strong_chroma = (g - np.maximum(r, b) > 75) & (dist < hole_tol)
    else:
        strong_chroma = dist < (hole_tol * 0.65)
    return fg_mask & (~strong_chroma)


def dilate_mask(mask: np.ndarray, radius: int = 1) -> np.ndarray:
    h, w = mask.shape
    out = mask.copy()
    for _ in range(radius):
        cur = out.copy()
        out[1:, :] |= cur[:-1, :]
        out[:-1, :] |= cur[1:, :]
        out[:, 1:] |= cur[:, :-1]
        out[:, :-1] |= cur[:, 1:]
    return out


def despill_edges(rgb: np.ndarray, fg_mask: np.ndarray, key_mode: str) -> np.ndarray:
    """Neutralizes chroma fringe spillover on foreground pixels adjacent to transparent background."""
    out = rgb.copy().astype(np.float32)
    bg_near = dilate_mask(~fg_mask, radius=3)
    edge = fg_mask & bg_near

    r = out[:, :, 0]
    g = out[:, :, 1]
    b = out[:, :, 2]

    if key_mode == "magenta":
        # Suppress excess R and B compared to G on edge fringe pixels
        avg_rb = (r + b) * 0.5
        spill = edge & (np.minimum(r, b) > g + 22)
        if np.any(spill):
            # Pull fringe down cleanly toward dark outline tone
            factor = np.clip((np.minimum(r, b) - g - 22) / 160.0, 0.0, 0.85)
            out[spill, 0] = r[spill] * (1.0 - factor[spill] * 0.72)
            out[spill, 2] = b[spill] * (1.0 - factor[spill] * 0.72)
            out[spill, 1] = g[spill] * (1.0 - factor[spill] * 0.25)
    elif key_mode == "green":
        max_rb = np.maximum(r, b)
        spill = edge & (g > max_rb + 18)
        if np.any(spill):
            out[spill, 1] = np.minimum(g[spill], max_rb[spill] * 0.92 + 6.0)

    return np.clip(out, 0, 255).astype(np.uint8)


def keep_main_components(fg_mask: np.ndarray, min_ratio: float = 0.008) -> np.ndarray:
    """Removes stray isolated background specks while keeping legitimate detached parts (e.g. floating orbs)."""
    h, w = fg_mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    sizes: list[int] = [0]
    cur_label = 0

    ys, xs = np.nonzero(fg_mask)
    for y0, x0 in zip(ys.tolist(), xs.tolist()):
        if labels[y0, x0] != 0:
            continue
        cur_label += 1
        q = collections.deque([(y0, x0)])
        labels[y0, x0] = cur_label
        cnt = 0
        while q:
            y, x = q.popleft()
            cnt += 1
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and fg_mask[ny, nx] and labels[ny, nx] == 0:
                    labels[ny, nx] = cur_label
                    q.append((ny, nx))
        sizes.append(cnt)

    if cur_label == 0:
        return fg_mask
    max_size = max(sizes[1:])
    keep_ids = {i for i, sz in enumerate(sizes) if i > 0 and sz >= max(18, int(max_size * min_ratio))}
    out = np.isin(labels, list(keep_ids))
    return out


def process_sprite(
    input_path: Path,
    output_path: Path,
    canvas_size: int = 96,
    fill_ratio: float = 0.88,
    key_mode: str = "auto",
    tolerance: float = 68.0,
    max_colors: int = 56,
    flip_x: bool = False,
) -> dict[str, object]:
    img = Image.open(input_path).convert("RGBA")
    if flip_x:
        img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    arr = np.array(img)
    rgb = arr[:, :, :3]
    orig_alpha = arr[:, :, 3]

    # If image already has clean transparency, preserve it; otherwise run chroma-key pipeline
    if np.mean(orig_alpha < 10) > 0.15:
        fg_mask = orig_alpha >= 128
        cleaned_rgb = rgb
        detected_mode = "native_alpha"
    else:
        bg = detect_bg_color(rgb)
        if key_mode == "auto":
            if bg[1] > bg[0] + 40 and bg[1] > bg[2] + 40:
                detected_mode = "green"
            elif bg[0] > bg[1] + 40 and bg[2] > bg[1] + 40:
                detected_mode = "magenta"
            else:
                detected_mode = "generic"
        else:
            detected_mode = key_mode

        bg_candidates = is_bg_pixel(rgb, bg, tolerance, detected_mode)
        bg_ext = exterior_flood_fill(bg_candidates)
        fg_mask = ~bg_ext
        fg_mask = remove_interior_chroma_holes(rgb, bg, fg_mask, detected_mode, tolerance * 1.45)
        # Erode 1px of residual semi-chroma fringe on high-res source before downscaling
        eroded = ~dilate_mask(~fg_mask, radius=1)
        # Only drop outermost 1px where pixel still leans toward chroma key
        r = rgb[:, :, 0].astype(np.float32)
        g = rgb[:, :, 1].astype(np.float32)
        b = rgb[:, :, 2].astype(np.float32)
        if detected_mode == "magenta":
            fringe = fg_mask & (~eroded) & ((np.minimum(r, b) - g) > 16)
        elif detected_mode == "green":
            fringe = fg_mask & (~eroded) & ((g - np.maximum(r, b)) > 16)
        else:
            fringe = np.zeros_like(fg_mask)
        fg_mask = fg_mask & (~fringe)
        fg_mask = keep_main_components(fg_mask)
        cleaned_rgb = despill_edges(rgb, fg_mask, detected_mode)

    ys, xs = np.nonzero(fg_mask)
    if len(ys) == 0:
        raise RuntimeError(f"Empty foreground mask after keying for {input_path}")

    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1

    cropped = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    cropped[:, :, :3] = cleaned_rgb[y0:y1, x0:x1]
    cropped[:, :, 3] = np.where(fg_mask[y0:y1, x0:x1], 255, 0)
    crop_img = Image.fromarray(cropped, mode="RGBA")

    # Fit cleanly into target pixel-art canvas while preserving aspect ratio
    max_dim = int(round(canvas_size * fill_ratio))
    cw, ch = crop_img.size
    scale = min(max_dim / cw, max_dim / ch)
    new_w = max(8, int(round(cw * scale)))
    new_h = max(8, int(round(ch * scale)))

    # BOX resampling maps high-res pixel blocks smoothly without ringing, then we snap alpha strictly crisp
    resized = crop_img.resize((new_w, new_h), Image.Resampling.BOX)
    r_arr = np.array(resized)
    alpha = r_arr[:, :, 3]
    # Crisp 1-bit pixel art edge threshold (zero fuzzy halo!)
    crisp_alpha = np.where(alpha >= 135, 255, 0).astype(np.uint8)
    r_arr[:, :, 3] = crisp_alpha
    # Premultiply / clean RGB of transparent pixels to pure black for optimal PNG compression
    r_arr[crisp_alpha == 0, :3] = 0

    # Optional retro palette quantization (preserves crisp alpha channel!)
    if max_colors > 0:
        rgb_pil = Image.fromarray(r_arr[:, :, :3], mode="RGB")
        quant_rgb = rgb_pil.quantize(
            colors=max_colors,
            method=Image.Quantize.FASTOCTREE,
            dither=Image.Dither.NONE,
        ).convert("RGB")
        q_arr = np.array(quant_rgb)
        r_arr[:, :, :3] = np.where(crisp_alpha[:, :, None] > 0, q_arr, 0)

    # Paste centered horizontally and baseline-aligned to bottom margin (3px) so all feet rest on the exact floor
    final_canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    paste_x = (canvas_size - new_w) // 2
    paste_y = max(1, canvas_size - new_h - 3)
    final_canvas.paste(Image.fromarray(r_arr, mode="RGBA"), (paste_x, paste_y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    final_canvas.save(output_path, format="PNG", optimize=True)

    size_kb = output_path.stat().st_size / 1024.0
    return {
        "output": str(output_path),
        "mode": detected_mode,
        "canvas": f"{canvas_size}x{canvas_size}",
        "sprite_box": f"{new_w}x{new_h}",
        "size_kb": round(size_kb, 1),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Process chroma-key sprite into crisp HD-2D PNG")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--size", type=int, default=96)
    parser.add_argument("--fill", type=float, default=0.88)
    parser.add_argument("--key", choices=["auto", "magenta", "green", "generic"], default="auto")
    parser.add_argument("--tol", type=float, default=68.0)
    parser.add_argument("--colors", type=int, default=56)
    parser.add_argument("--flip-x", action="store_true")
    args = parser.parse_args()

    info = process_sprite(
        args.input,
        args.output,
        canvas_size=args.size,
        fill_ratio=args.fill,
        key_mode=args.key,
        tolerance=args.tol,
        max_colors=args.colors,
        flip_x=args.flip_x,
    )
    print(info)


if __name__ == "__main__":
    main()
