import json, os, re
from manim import *
config.pixel_width, config.pixel_height, config.frame_width, config.frame_height = 1080, 1920, 9, 16
DOC = json.load(open(os.environ["FTM_DOC"])); TL = json.load(open(os.environ["FTM_TL"]))
ACC = {"gold": "#f2b632", "green": "#3ddc84", "red": "#ff5a4f"}.get((DOC.get("style") or {}).get("accent"), "#f2b632")
BG, CRM, DIM, GRN, RED = "#0b1020", "#f6f0e1", "#8fa3c8", "#3ddc84", "#ff5a4f"
FONT = "DejaVu Sans"

def T(s, size=44, col=CRM, bold=True, maxw=7.9):
    t = Text(s, font_size=size, color=col, weight=BOLD if bold else NORMAL, font=FONT)
    if t.width > maxw: t.scale_to_fit_width(maxw)
    return t

def stack(lines, size=44, col=CRM, gap=.28, first=None, maxw=7.9):
    g = VGroup(*[T(l, size, first if (i == 0 and first) else col, maxw=99) for i, l in enumerate(lines)]).arrange(DOWN, buff=gap)
    if g.width > maxw: g.scale_to_fit_width(maxw)
    return g

def parse_big(s):
    m = re.match(r"^([^\d\-]*)(-?[\d,]*\.?\d+)(.*)$", s)
    if not m: return None
    pre, num, suf = m.groups(); dec = len(num.split(".")[1]) if "." in num else 0
    return pre, float(num.replace(",", "")), suf, dec

class Reel(Scene):
    def at(self, t):
        d = t - self.renderer.time
        if d > 0.001: self.wait(d)

    def construct(self):
        self.camera.background_color = BG
        total = TL["total"]
        brand = T("FOLLOW THE MONEY", 22, DIM).move_to(UP * 7.25)
        src = T(DOC.get("source_line", ""), 18, DIM, bold=False, maxw=8.2).move_to(DOWN * 7.1)
        bar = Rectangle(width=9, height=.09, fill_color=ACC, fill_opacity=1, stroke_width=0).move_to(UP * 7.95 + LEFT * 4.5, aligned_edge=LEFT)
        bar.stretch_to_fit_width(.01, about_edge=LEFT)
        self.add(brand, src, bar)
        self.play(bar.animate.stretch_to_fit_width(9, about_edge=LEFT), run_time=total - 0.4, rate_func=linear) if False else None
        for sl, tl in zip(DOC["slides"], TL["slides"]):
            self.at(tl["start"]); objs = self.slide(sl, tl)
            end = tl["start"] + tl["dur"]
            self.at(end - .35)
            self.play(*[FadeOut(o) for o in objs], run_time=.3)
            self.play(bar.animate.stretch_to_fit_width(max(.01, 9 * end / total), about_edge=LEFT), run_time=.05)
        self.at(total)

    def slide(self, sl, tl):
        k, lines = sl["kind"], sl.get("lines", [])
        objs = []
        if k == "hook":
            big = sl.get("big", ""); pb = parse_big(big) if sl.get("countup") else None
            if pb:
                pre, val, suf, dec = pb; vt = ValueTracker(0)
                n = always_redraw(lambda: T(f"{pre}{vt.get_value():,.{dec}f}{suf}", 150, ACC, maxw=8.3).move_to(UP * 2.0))
                self.add(n); self.play(vt.animate.set_value(val), run_time=min(2.6, tl["dur"] * .5), rate_func=rate_functions.ease_out_cubic)
                n.clear_updaters(); fin = T(big, 150, ACC, maxw=8.3).move_to(UP * 2.0); self.remove(n); self.add(fin); objs.append(fin)
            else:
                b = T(big, 150, ACC, maxw=8.3).move_to(UP * 2.0); self.play(FadeIn(b, scale=.8), run_time=.5); objs.append(b)
            s = stack(lines, 44).next_to(objs[0], DOWN, buff=.9); self.play(FadeIn(s, shift=UP * .3), run_time=.6); objs.append(s)
        elif k == "take":
            s = stack(lines, 52, first=GRN).move_to(UP * .6); self.play(LaggedStart(*[FadeIn(m, shift=UP * .25) for m in s], lag_ratio=.35), run_time=1.2); objs.append(s)
        elif k == "end":
            s = stack(lines, 50, first=CRM).move_to(UP * 1.6); f = T("Follow for the money trail.", 40, ACC).next_to(s, DOWN, buff=1.0)
            self.play(FadeIn(s, shift=UP * .3), run_time=.7); self.play(FadeIn(f), run_time=.5); objs += [s, f]
        else:
            ch = sl.get("chart")
            s = stack(lines, 44).move_to(UP * (3.9 if ch else .6)); self.play(LaggedStart(*[FadeIn(m, shift=UP * .2) for m in s], lag_ratio=.3), run_time=1.0); objs.append(s)
            if ch: objs.append(self.chart(ch))
        return objs

    def chart(self, ch):
        data, hl, unit = ch["data"], ch.get("highlight"), ch.get("unit", "")
        mx = max(v for _, v in data); fmt = lambda v: (f"${v:,.0f}" if unit == "$" else f"{v:g}%" if unit == "%" else f"{v:g}")
        g = VGroup(); base = -1.8
        if ch["type"] == "bars":
            n = len(data); w = min(1.7, 6.8 / n - .35); span = n * (w + .5); x0 = -span / 2 + w / 2
            line = Line(LEFT * 4, RIGHT * 4, color=DIM, stroke_width=3).move_to(DOWN * 0.3 + base * 0); line.shift(DOWN * 0)
            ybase = -4.6; g.add(Line(LEFT * 4, RIGHT * 4, color=DIM, stroke_width=3).move_to(UP * ybase))
            bars = []
            for i, (lab, v) in enumerate(data):
                col = ACC if lab == hl else "#4f6ea8"; h = max(.05, 3.9 * v / mx)
                r = Rectangle(width=w, height=h, fill_color=col, fill_opacity=1, stroke_width=0).move_to(RIGHT * (x0 + i * (w + .5)) + UP * ybase, aligned_edge=DOWN)
                vl = T(fmt(v), 34, col).next_to(r, UP, buff=.18); ll = T(str(lab), 30, CRM).next_to(r, DOWN, buff=.25)
                bars.append((r, vl, ll))
            self.play(*[GrowFromEdge(r, DOWN) for r, _, _ in bars], FadeIn(g), run_time=1.0)
            self.play(*[FadeIn(m) for _, vl, ll in bars for m in (vl, ll)], run_time=.4)
            return VGroup(g, *[m for tpl in bars for m in tpl])
        rows = []; top = 0.6
        for i, (lab, v) in enumerate(data):
            col = ACC if lab == hl else "#4f6ea8"; wv = max(.1, 4.4 * v / mx)
            r = Rectangle(width=wv, height=.7, fill_color=col, fill_opacity=1, stroke_width=0).move_to(LEFT * 3.4 + DOWN * (i * 1.15) + UP * top, aligned_edge=LEFT)
            ll = T(str(lab), 28, CRM, maxw=3.0).next_to(r, UP, buff=.12, aligned_edge=LEFT); vl = T(fmt(v), 32, col).next_to(r, RIGHT, buff=.2)
            rows += [r, ll, vl]
        self.play(*[GrowFromEdge(m, LEFT) if isinstance(m, Rectangle) else FadeIn(m) for m in rows], run_time=1.0)
        return VGroup(*rows)
