#!/usr/bin/env python3
"""Reel JSON -> per-slide Kokoro narration + timeline.json (slide start/duration).
usage: narrate.py input/reels/<slug>.json <workdir>
Offline voice (Kokoro, Apache-2.0). Spoken text = slide lines, with $/%/T/B/M/K numbers expanded.
Writes <workdir>/voice/s<i>.wav and <workdir>/timeline.json {slug,total,slides:[{i,kind,start,dur,vstart}]}"""
import json, os, re, subprocess, sys, wave
HERE = os.path.dirname(os.path.abspath(__file__))
KOKORO_DIR = os.environ.get("KOKORO_DIR", os.path.join(HERE, "..", ".cache", "kokoro"))
UNITS = {"T": "trillion", "B": "billion", "M": "million", "K": "thousand"}

def speak(s):
    s = s.replace("—", ", ").replace("–", " to ").replace("×", " and ")
    def money(m):
        cur, num, unit = m.group(1), m.group(2), m.group(3)
        words = {"$": "dollars", "C$": "Canadian dollars"}.get(cur, "dollars")
        return f"{num} {UNITS[unit]} {words}" if unit else f"{num} {words}"
    s = re.sub(r"(C\$|\$)\s?([\d,]*\.?\d+)\s?([TBMK])?\b", money, s)
    s = re.sub(r"(\d)\s?%", r"\1 percent", s)
    return re.sub(r"\s+", " ", s).strip()

def slide_text(sl):
    if sl.get("say"): return sl["say"]
    parts = ([sl["big"]] if sl.get("big") else []) + list(sl.get("lines", []))
    if sl["kind"] == "end": parts.append("Follow for the money trail.")
    return speak(" ".join(parts))

def wav_len(p):
    with wave.open(p) as w: return w.getnframes() / w.getframerate()

def main():
    doc = json.load(open(sys.argv[1])); work = sys.argv[2]
    os.makedirs(os.path.join(work, "voice"), exist_ok=True)
    tts = os.environ.get("TTS_PY", os.path.join(KOKORO_DIR, "tts.py")); speed = 1.08; MAXT = 44.0
    for attempt in range(3):   # speak a little faster if the reel would run long (target <= ~44 s)
        lines = [{"id": f"s{i}", "text": slide_text(s), "voice": doc.get("voice", "am_michael"), "speed": round(speed, 2)}
                 for i, s in enumerate(doc["slides"])]
        lj = os.path.join(work, "lines.json"); json.dump(lines, open(lj, "w"))
        subprocess.check_call([sys.executable, tts, lj, os.path.join(work, "voice")])
        t, slides = 0.3, []
        for i, sl in enumerate(doc["slides"]):
            vl = wav_len(os.path.join(work, "voice", f"s{i}.wav"))
            dur = max(vl + 0.55, 2.4)
            slides.append({"i": i, "kind": sl["kind"], "start": round(t, 3), "dur": round(dur, 3), "vstart": round(t + 0.2, 3), "vlen": round(vl, 3)})
            t += dur
        if t + 0.8 <= MAXT or speed >= 1.3: break
        speed = min(1.3, speed * (t + 0.8) / MAXT)
    json.dump({"slug": doc["slug"], "total": round(t + 0.8, 3), "slides": slides}, open(os.path.join(work, "timeline.json"), "w"), indent=1)
    print("timeline", round(t + 0.8, 1), "s")
main()
