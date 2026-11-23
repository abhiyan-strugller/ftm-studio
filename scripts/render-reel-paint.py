#!/usr/bin/env python3
"""Render a Follow the Money reel in the hand-painted p5.brush style.

Reads the SAME input/reels/<slug>.json the pipeline already produces and writes
output/reels/<slug>/<slug>.mp4 — the exact path build-day expects — so nothing
downstream changes.

  python3 scripts/render-reel-paint.py --input input/reels/<slug>.json
  python3 scripts/render-reel-paint.py --input <doc> --stills   # pre-render check
"""
import argparse, functools, hashlib, http.server, json, os, shutil, subprocess, sys, threading, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRUSH = os.path.join(ROOT, "node_modules", "p5.brush", "dist", "brush.js")
TEMPLATE = os.path.join(ROOT, "reel-template", "index.html")
BED = os.path.join(ROOT, "scripts", "gen-reel-bed.py")
CHROME = "/usr/bin/google-chrome"
FPS = 30


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(dirpath, port):
    srv = http.server.ThreadingHTTPServer(
        ("127.0.0.1", port), functools.partial(Quiet, directory=dirpath))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def seed_of(doc):
    if isinstance(doc.get("audio_seed"), int):
        return doc["audio_seed"]
    return int(hashlib.sha256(doc["slug"].encode()).hexdigest()[:8], 16) % 100000


def make_build(doc, outdir):
    bd = os.path.join(outdir, "_build")
    os.makedirs(bd, exist_ok=True)
    html = open(TEMPLATE, encoding="utf-8").read()
    inject = "<script>window.REEL=" + json.dumps(doc) + ";</script>\n"
    assert '<script src="brush.js"></script>' in html, "template marker missing"
    html = html.replace('<script src="brush.js"></script>',
                        inject + '<script src="brush.js"></script>', 1)
    open(os.path.join(bd, "index.html"), "w", encoding="utf-8").write(html)
    shutil.copyfile(BRUSH, os.path.join(bd, "brush.js"))
    return bd


def open_page(bd, port):
    from playwright.sync_api import sync_playwright
    serve(bd, port)
    pw = sync_playwright().start()
    br = pw.chromium.launch(executable_path=CHROME, args=[
        "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    pg = br.new_page(viewport={"width": 1080, "height": 1920})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://127.0.0.1:%d/index.html" % port)
    pg.wait_for_function("window.ready===true", timeout=60000)
    pg.evaluate("document.fonts.ready")
    return pw, br, pg, errs


def do_stills(bd, outdir, port):
    pw, br, pg, errs = open_page(bd, port)
    durs = pg.evaluate("window.SCENES")
    ends = pg.evaluate("window.SCENES.map((d,i)=>d)")
    paths = []
    for si, d in enumerate(durs):
        f = int(min(d - 0.45, 3.4) * FPS)  # busiest moment: after things appear, before fade
        pg.evaluate("renderFrame(%d,%d)" % (si, max(f, 1)))
        p = os.path.join(outdir, "still_%d.jpg" % si)
        pg.screenshot(path=p, type="jpeg", quality=85)
        paths.append(p)
    if errs:
        print("  page errors:", errs[:3], flush=True)
    br.close(); pw.stop()
    return paths


def do_scenes(bd, outdir, scenes, port):
    pw, br, pg, errs = open_page(bd, port)
    durs = pg.evaluate("window.SCENES")
    for si in scenes:
        n = int(round(durs[si] * FPS))
        tmp = os.path.join(outdir, "scene%d.tmp.mp4" % si)
        ff = subprocess.Popen(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS),
             "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "veryfast",
             "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS), tmp], stdin=subprocess.PIPE)
        t0 = time.time()
        for f in range(n):
            pg.evaluate("renderFrame(%d,%d)" % (si, f))
            ff.stdin.write(pg.screenshot(type="jpeg", quality=92))
        ff.stdin.close()
        if ff.wait() != 0:
            raise SystemExit("ffmpeg failed on scene %d" % si)
        os.replace(tmp, os.path.join(outdir, "scene%d.mp4" % si))
        print("  scene %d: %d frames  %.1fs" % (si, n, time.time() - t0), flush=True)
    if errs:
        print("  page errors:", errs[:3], flush=True)
    br.close(); pw.stop()


def preflight():
    if not os.path.exists(CHROME):
        return "google-chrome not found at %s" % CHROME
    try:
        import playwright  # noqa: F401
    except Exception as e:
        return "playwright not importable (%s)" % e
    if not os.path.exists(BRUSH):
        return "p5.brush not installed (run npm ci)"
    if not os.path.exists(TEMPLATE):
        return "reel-template/index.html missing"
    return None


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--stills", action="store_true")
    ap.add_argument("--workers", type=int, default=0)
    ap.add_argument("--worker-scenes", default="")
    ap.add_argument("--port", type=int, default=8780)
    ap.add_argument("--outdir", default="")
    a = ap.parse_args()

    doc = json.load(open(a.input, encoding="utf-8"))
    slug = doc["slug"]
    outdir = a.outdir or os.path.join(ROOT, "output", "reels", slug)
    os.makedirs(outdir, exist_ok=True)

    # worker branch: render only the scenes handed to it
    if a.worker_scenes:
        bd = os.path.join(outdir, "_build")
        do_scenes(bd, outdir, [int(x) for x in a.worker_scenes.split(",")], a.port)
        return

    why = preflight()
    if why:
        # Never let a cycle end up with no reel: fall back to the slide renderer,
        # which writes the same output/reels/<slug>/<slug>.mp4 path.
        print("painted renderer unavailable (%s) -- falling back to the slide renderer" % why,
              flush=True)
        subprocess.run(["npm", "run", "render-reel-slides", "--", "--input",
                        os.path.abspath(a.input)], cwd=ROOT, check=True)
        return

    bd = make_build(doc, outdir)

    if a.stills:
        paths = do_stills(bd, outdir, a.port)
        print("stills: " + " ".join(paths))
        return

    # how many scenes / how long
    pw, br, pg, _ = open_page(bd, a.port)
    durs = pg.evaluate("window.SCENES")
    total = float(pg.evaluate("window.TOTAL"))
    br.close(); pw.stop()
    nsc = len(durs)
    workers = a.workers or min(2, max(1, os.cpu_count() or 1))
    print("reel %s: %d scenes, %.1fs, %d worker(s)" % (slug, nsc, total, workers), flush=True)

    t0 = time.time()
    if workers <= 1:
        do_scenes(bd, outdir, list(range(nsc)), a.port)
    else:
        # interleave so each worker gets a similar amount of work
        groups = [list(range(nsc))[i::workers] for i in range(workers)]
        procs = []
        for i, g in enumerate(groups):
            if not g:
                continue
            procs.append(subprocess.Popen(
                [sys.executable, os.path.abspath(__file__), "--input", os.path.abspath(a.input),
                 "--worker-scenes", ",".join(map(str, g)), "--port", str(a.port + 1 + i),
                 "--outdir", outdir]))
        for p in procs:
            if p.wait() != 0:
                raise SystemExit("a render worker failed")
    print("render: %.1fs" % (time.time() - t0), flush=True)

    missing = [i for i in range(nsc) if not os.path.exists(os.path.join(outdir, "scene%d.mp4" % i))]
    if missing:
        raise SystemExit("missing scene files: %s" % missing)

    # ---- audio bed (procedural, seeded per slug so each reel sounds different)
    seed = seed_of(doc)
    bpm = 88 + (seed % 9) * 3          # 88-112, varied per reel
    root = 46 + (seed % 6) * 2.5         # 46-58.5 Hz
    cuts, acc = [], 0.0
    for d in durs[:-1]:
        acc += d
        cuts.append(round(acc, 2))
    bed = os.path.join(outdir, "bed.wav")
    run([sys.executable, BED, "--seconds", "%.2f" % total, "--out", bed,
         "--seed", str(seed), "--bpm", "%.1f" % bpm, "--root", "%.2f" % root,
         "--cuts", ",".join("%.2f" % c for c in cuts)])

    # ---- join scenes, mux the bed, faststart
    lst = os.path.join(outdir, "scenes.txt")
    with open(lst, "w") as fh:
        for i in range(nsc):
            fh.write("file 'scene%d.mp4'\n" % i)
    silent = os.path.join(outdir, "silent.mp4")
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
         "-c", "copy", silent])
    final_tmp = os.path.join(outdir, "%s.tmp.mp4" % slug)
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", bed,
         "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
         "-shortest", "-movflags", "+faststart", final_tmp])
    final = os.path.join(outdir, "%s.mp4" % slug)
    os.replace(final_tmp, final)

    # ---- cover still + caption
    cover = os.path.join(outdir, "%s-cover.jpg" % slug)
    at = min(total - 0.5, (durs[0] if nsc else 2) + 1.2)
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "%.2f" % at, "-i", final,
         "-frames:v", "1", cover])
    if doc.get("caption"):
        open(os.path.join(outdir, "caption.txt"), "w", encoding="utf-8").write(doc["caption"])

    # ---- verify
    def probe(path, stream):
        out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", stream,
                              "-show_entries", "stream=duration", "-of",
                              "default=nw=1:nk=1", path], capture_output=True, text=True)
        try:
            return float(out.stdout.strip().splitlines()[0])
        except Exception:
            return 0.0
    v, aud = probe(final, "v:0"), probe(final, "a:0")
    size = os.path.getsize(final) / 1e6
    print("OK %s  %.1fs video / %.1fs audio  %.1f MB  %d scenes" % (final, v, aud, size, nsc))
    if abs(v - aud) > 0.6:
        print("WARN: video and audio differ by %.2fs" % abs(v - aud))
    if not (15 <= v <= 60):
        print("WARN: duration %.1fs outside 15-60s" % v)
    for f in [silent, lst]:
        try: os.remove(f)
        except OSError: pass


if __name__ == "__main__":
    main()
