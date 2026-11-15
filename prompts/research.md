# Research spec — the daily deep sweep

How the day's stories are found, filtered and verified before anything is
written. `caption.md` governs how a chosen story is written; this file governs
how stories get chosen. Task A follows this every run. A human-run session
doing a build follows it too.

## The shape of the sweep

Cast wide, then cut hard. Target on the order of **100 candidate items** seen
per sweep — a candidate is any headline, post or thread noted and judged, most
of which die in seconds. Do not pad to hit the number; do not stop at 20
because the first page looked good. Breadth is what finds the story nobody
else is carding.

Sweep these beats, every run:

1. **Wire/day news** — the day's top business and economy stories
   (searches like "biggest financial news today", "<today> economy").
2. **Rates & cost of living** — Fed speakers, CPI/PPI/jobs calendar, prediction
   -market odds (Kalshi/Polymarket, named as such), gas (AAA), groceries,
   rents, mortgage rates (Freddie Mac Thursdays).
3. **CEO / top-business-people watch** — run a named search for each of:
   Musk (Tesla/SpaceX/xAI), Nvidia leadership, Zuckerberg/Meta, Altman/OpenAI,
   Amodei/Anthropic, Bezos/Amazon, Buffett/Berkshire, Dimon/JPMorgan, plus
   whoever is in that week's story. The beat is their MONEY moves — deals,
   stock, pay, self-dealing, testimony — never gossip for its own sake. A
   personal scandal qualifies only through its money consequence (market value,
   governance, your 401(k)).
4. **Cyber → money** — attacks on infrastructure, retailers, banks, supply
   chains, with the bill in dollars and who pays it. (JLR = $2.5B to the UK
   economy is the template.) Outages count (FAA, Microsoft) — chaos has a
   price tag.
5. **Investigations** — ProPublica, ICIJ, WSJ/NYT/Reuters/Bloomberg
   investigations, committee hearings, IG reports. The "something hidden
   becoming visible" quadrant. One strong investigative thread beats three
   commodity headlines.
6. **Viral/social layer** — what ordinary people are sharing about money:
   search angles on Reddit (r/personalfinance, r/povertyfinance,
   r/wallstreetbets, r/frugal) and X; Post Planner Content streams
   (big pages: Money, Young Money, Money Saving Mom, Esquire Money, Money
   Power Politics). Purpose: catch themes and phrasing that are working, and
   catch a story early. Reddit/X direct fetches are blocked from the cloud
   session — go through search ("reddit <topic> viral") and note what
   surfaces. NEVER repost others' content; Facebook penalises reused content
   and the page is built for monetization.

## The cut

Apply CLAUDE.md's stakes test to every candidate: would a working American
stop scrolling because this touches their own money? Then rank what survives:

- somebody wins AND somebody pays, both nameable → top of list
- a true number that genuinely surprises → high
- hidden thing becoming visible → high
- big but consequence-free (markets mixed, process stories) → dead

News/evergreen mix: **6–8 of the 10 posts from the sweep, 2–4 evergreen** from
the bank — evergreens are the engagement floor, news is why the page exists.
Never repeat an evergreen topic that ran in the last two days (check input/).

## Verification ladder

Every figure on a card must clear all three: (1) names the period it covers,
(2) comes from a release that has already happened, (3) carries a named
source. Then:

- Prefer primary (bls.gov, federalreserve.gov, sec.gov, AAA, Freddie Mac) or
  top-tier wire (Reuters, AP, Bloomberg, CNBC, WSJ).
- **One-outlet rule:** a dramatic figure reported by a single outlet is
  attributed to that outlet by name on the card and in the caption ("per
  Axios"), or dropped. If it's the lead claim of the post, it needs a second
  source or it moves to the UNCONFIRMED list.
- Falling-knife numbers (gas, bitcoin, any live price) are re-pulled at build
  time, dated to the day, and never reused from a previous day's research.
- Prediction-market odds are quoted as odds ("Kalshi puts it at 97%"), never
  as fact, and never as our prediction.
- WebFetch of primary sources often fails in cloud sessions (proxy); confirm
  via multiple independent search results citing the same primary release,
  and say so in the run-log.

## UNCONFIRMED protocol

Trending but unverified stories are NEVER posted. Each run's report lists
them: claim, where it's circulating, what confirmation would take. Abhiyan
decides. A story with a confirmed core and an unconfirmed detail runs with
the detail omitted or attributed by name.

## Standing outputs

Each sweep updates `research/<date>-sweep.md` (or appends to the run-log for
automated runs): the shortlist with sources, the kill list in one line, and
the UNCONFIRMED queue. The next day's sweep reads the previous one first —
continuity is how a running investigation (e.g. the Nvidia money trail)
compounds instead of resetting daily.
