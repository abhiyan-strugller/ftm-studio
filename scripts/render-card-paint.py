#!/usr/bin/env python3
"""Render a Follow the Money CARD in the hand-painted p5.brush style.

Writes output/<date>/<id>-<template>.png — the exact path build-day expects —
so build-day picks it up instead of the plain Satori card. If this fails for
any reason, build-day falls back to the plain card automatically (the painted
PNG simply isn't there).

  python3 scripts/render-card-paint.py --input input/<date>.json --id 0800
  python3 scripts/render-card-paint.py --card <card.json> --date 2026-11-23
"""
import argparse, functools, http.server, json, os, shutil, threading, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRUSH = os.path.join(ROOT, "node_modules", "p5.brush", "dist", "brush.js")
TEMPLATE = os.path.join(ROOT, "reel-template", "card.html")
CHROME = "/usr/bin/google-chrome"


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def preflight():
    if not os.path.exists(CHROME):
        return "google-chrome not found"
    try:
        import playwright  # noqa
    except Exception as e:
        return "playwright not importable (%s)" % e
    if not os.path.exists(BRUSH):
        return "p5.brush not installed"
    if not os.path.exists(TEMPLATE):
        return "card template missing"
    return None


def render(card, date, outdir, port):
    from playwright.sync_api import sync_playwright
    os.makedirs(outdir, exist_ok=True)
    bd = os.path.join(outdir, "_cardbuild_%s" % card["id"])
    os.makedirs(bd, exist_ok=True)
    html = open(TEMPLATE, encoding="utf-8").read()
    html = html.replace('<script src="brush.js"></script>',
                        "<script>window.CARD=" + json.dumps(card) + ";</script>\n"
                        '<script src="brush.js"></script>', 1)
    open(os.path.join(bd, "index.html"), "w", encoding="utf-8").write(html)
    shutil.copyfile(BRUSH, os.path.join(bd, "brush.js"))

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Quiet, directory=bd))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=CHROME, args=[
            "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        pg = br.new_page(viewport={"width": 1080, "height": 1350})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto("http://127.0.0.1:%d/index.html" % port)
        pg.wait_for_function("window.ready===true", timeout=60000)
        pg.evaluate("document.fonts.ready")
        pg.evaluate("renderCard()")
        time.sleep(0.3)
        tmpl = card.get("template", "plain")
        out = os.path.join(outdir, "%s-%s.png" % (card["id"], tmpl))
        pg.screenshot(path=out, type="png")
        motif = pg.evaluate("window.MOTIF")
        br.close()
    shutil.rmtree(bd, ignore_errors=True)
    return out, motif, errs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input")       # a day file; render every card in it
    ap.add_argument("--card")        # a single card json
    ap.add_argument("--id")          # with --input: only this post id
    ap.add_argument("--date")        # with --card
    ap.add_argument("--port", type=int, default=8795)
    a = ap.parse_args()

    why = preflight()
    if why:
        raise SystemExit("painted card renderer unavailable: %s "
                         "(build-day will use the plain card instead)" % why)

    cards, date = [], a.date
    if a.input:
        day = json.load(open(a.input, encoding="utf-8"))
        date = day["date"]
        for post in day.get("posts", []):
            if a.id and str(post.get("id")) != str(a.id):
                continue
            cards.append(post)
    elif a.card:
        cards.append(json.load(open(a.card, encoding="utf-8")))
    if not cards:
        raise SystemExit("no card to render")
    if not date:
        raise SystemExit("need --date")

    outdir = os.path.join(ROOT, "output", date)
    port = a.port
    for card in cards:
        card.setdefault("template", "plain")
        out, motif, errs = render(card, date, outdir, port); port += 1
        kb = os.path.getsize(out) / 1024
        print("OK %s  motif=%s  %.0f KB%s" % (out, motif, kb,
              ("  ERRORS:" + str(errs[:2]) if errs else "")))


if __name__ == "__main__":
    main()
