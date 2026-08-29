# The grade, and the bug in it

Images are unified by converging **40% of the way** toward target val 0.66 / sat 0.42,
measured per image, so each one moves a different distance. Partial convergence unifies
the set without flattening its variety.

```
colorbalance=rs=-0.055:gs=0.042:bs=-0.005:   # shadows -> ink #131F18
              rm=-0.012:gm=0.016:bm=0.015:   # midtones -> rain neutral, hue 154
              rh=0.022:gh=0.012:bh=0.008     # highlights -> WARM toward spark #FEE981
```

## Two mistakes worth keeping

**The highlights were cooled first** (`rh=-0.012`), on the theory that everything should
move toward the rain neutral. It drained every warm image — the raking-sun desk went dead
brown, the sakura signal went lilac-grey. The theme is rain *and* sun; only shadows and
midtones belong to the rain. **The numbers converged correctly both times. Only the
before/after render caught it.**

**The gamma exponent is inverted.** The script computes `log(target)/log(val)` — the
exponent for `out = in^gamma`. ffmpeg's `eq` applies `out = in^(1/gamma)`. Measured on a
val-0.333 source: `gamma=0.82` gives 0.254 (darker), `gamma=1.22` gives 0.413 (brighter).

So convergence ran **away** from the target: dark sources pushed darker, bright ones
brighter. The clamps `[0.82, 1.28]` kept it from being visible and the look was accepted,
so the original 19 have **not** been re-run. Batch 18 used the corrected form,
`gamma = log(val) / log(target)`.

## Format

**Animated WebP, not GIF.** GIF's 256-colour ceiling was the cause of the "bad quality"
hero. `libwebp_anim` at q:v 48-66, frame rate decimated to 6-9fps for gallery tiles,
holds up at a fraction of the bytes.
