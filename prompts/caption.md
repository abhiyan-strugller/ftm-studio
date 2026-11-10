# Caption spec — Follow the Money

The editorial standard every caption is written against. No code reads this file;
it is the rulebook you write to, and the thing to re-read when a caption feels
off but you cannot say why.

---

## The one question

**Every post answers: how does this affect people's money?**

If a draft does not answer that, it is not a Follow the Money post yet. Politics,
wars, elections and policy appear only as the *cause* — never as the subject. The
subject is always the reader's wallet.

- ✅ "Tariffs on imported steel push up the price of a new car."
- ❌ "The administration announced new steel tariffs today."

## Neutrality

- No party bashing. No side-taking. Name what happened and who it costs.
- No opinion presented as fact. The **only** opinion in a post is your take line,
  and it has to read unmistakably as yours.
- Describe policies by what they do, not by who passed them.

## Never invent anything

**Use only facts present in the story text in front of you.** Never invent, infer,
or "round to a sensible-looking" number, date, quote, company name or source.

If a key figure is missing, write a placeholder in square caps — `[NUMBER]`,
`[DATE]`, `[PERCENT]` — and fill it in once you have the real one. The build
scans every field for this pattern and warns before you export, so a placeholder
can never ship by accident.

A post with a placeholder is unfinished. A post with an invented number is a
correction waiting to happen.

## Unconfirmed stories

If the story is not confirmed, the caption must **say so in the caption itself** —
not only in the badge on the image. "Reports are circulating", "unconfirmed",
"not yet verified". Use the `UNCONFIRMED` or `DEVELOPING` badge on the `breaking`
template to match.

## Hard limits

- **No buy/sell advice.** Never tell anyone to buy, sell, hold or allocate.
- **No price predictions.** No targets, no "could hit", no "on track for".
- **No get-rich language.** No "secret", "hack", "this one trick", "life-changing".
- **No engagement bait.** No "share if you agree", "type YES", "comment 1 for…".
  A genuine question that invites a real answer is good and encouraged.

## Tone on wars, disasters and tragedies

Lead with people, not markets. Cover the economic effects plainly — supply, prices,
jobs, bills — and never frame human suffering as an opportunity. Nothing that
reads as "how to profit from this".

---

## Format

In order:

1. **Hook line** — one line, the money consequence.
2. **2–4 short lines** of explanation. One idea per line.
3. **My take** — clearly marked as opinion. "My take:" is fine.
4. **A question** — something a reader can actually answer from their own life.
5. **`Source: …`** — the outlet or release the facts came from.
6. For stocks, crypto, or any market post, the final line, verbatim:
   `Educational only — not financial advice.`

### Mechanics

- **Max ~110 words.** Shorter is almost always better.
- **2–4 hashtags.** No more. No hashtag walls.
- **US spelling, USD, US examples first.**
- Short sentences. Plain words. No jargon without a four-word explanation.

---

## Stat deltas: direction and polarity

On a `stats` card, each tile's delta has two separate fields:

- **`direction`** — `up`, `down` or `flat`. What the number actually did. It
  sets the **arrow**, and the arrow always points the real way.
- **`polarity`** — whether a rise is good news *for the reader*. It sets the
  **colour** only.
  - `higher_is_good` (the default): up is green, down is red. Wages, savings
    yields, employment, home equity.
  - `lower_is_good`: up is red, down is green. **Inflation, prices, rent,
    fees, interest you pay, unemployment.** A falling CPI is good news, so it
    must not render red.

Set `polarity` explicitly on every tile where falling helps the wallet — the
build never guesses it from the label. On a CPI card, all three tiles are
`lower_is_good`:

```json
{ "label": "Groceries", "value": "1.8%", "delta": "0.2 pt",
  "direction": "up", "polarity": "lower_is_good" }
```

renders an **up** arrow in the **negative** colour. Values are snake_case
exactly as shown; anything else fails validation.

If you cannot say whether higher is better for the reader, the stat probably
needs a clearer label before it needs a colour.

---

## Worked example

> Mortgage rates fell for a fourth straight week.
>
> On a $400,000 loan, a quarter-point drop is about $60 a month.
> That is real money over thirty years.
> It is not the same as houses getting cheaper — prices have not moved.
>
> My take: this helps buyers at the margin, not the ones priced out.
>
> Has a rate change moved your plans this year?
>
> Source: Freddie Mac weekly survey
> Educational only — not financial advice.

---

## Pre-flight checklist

- [ ] Answers "how does this affect my money?" in the first line
- [ ] Every number traceable to the source text — no placeholders left
- [ ] Opinion confined to the take line and marked as opinion
- [ ] No advice, no prediction, no bait
- [ ] Unconfirmed stories say so in the caption
- [ ] Source line present
- [ ] Disclaimer present on market posts
- [ ] Under ~110 words, 2–4 hashtags
