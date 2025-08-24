# LookMatch Color & Style Pipeline (Lite)

This module isolates the garment region, normalizes illumination, and extracts color in a robust way.

Thresholds (fallback implementation)
- White: high luminance (Lmean >= ~200 on 0..255 proxy) and low chroma proxy (Cmean <= 8)
- Black: low luminance (<= 35) and low chroma (<= 12)
- Gray: mid luminance with very low chroma (<= 10)
- Chromatic: pick by average RGB heuristic (placeholder for ΔE2000)

Mask QA
- `/api/debug-mask/:id` returns a PNG of the ROI with the mask in the alpha channel.
- Masked area percentage is logged in `meta` (fallback uses 100%).

Tuning
- Increase/decrease luminance thresholds for dark studio shots.
- Increase chroma thresholds slightly if white fabrics with texture are misclassified as gray.

Notes
- Current implementation is a lightweight fallback. Replace `garmentMask`, `illumination`, and `color` with rembg + OpenCV + LAB for production.
