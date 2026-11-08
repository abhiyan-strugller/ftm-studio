/**
 * Sample datasets — one short and one long per template.
 *
 * These exist to exercise the layouts, especially the auto-shrink paths: the
 * "long" variant of each template pushes every variable-length field close to
 * the limit its zod schema allows, which is how overflow and clipping get
 * caught before a real post hits them.
 *
 * The figures are ILLUSTRATIVE PLACEHOLDERS for design QA. They are not real
 * data and must never be published.
 */
import type { PostDoc } from "../schema";

export type SampleKey = `${PostDoc["template"]}.${"short" | "long"}`;

export const SAMPLES: Record<SampleKey, PostDoc> = {
  // -------------------------------------------------------------- headline
  "headline.short": {
    template: "headline",
    palette: "night",
    tag: "Rates",
    post_number: 1,
    kicker: "Federal Reserve",
    headline: "The Fed held rates steady again",
    accent_word: "steady",
    data: { dek: "Your savings yield stays high for now — and so does your card APR." },
    source_line: "Source: Federal Reserve statement",
  },
  "headline.long": {
    template: "headline",
    palette: "cream",
    tag: "Housing",
    post_number: 2,
    kicker: "Mortgage market",
    headline:
      "Mortgage rates slipped for a fourth straight week, and the monthly payment on a median-priced home fell by roughly the cost of a weekly grocery run",
    accent_word: "slipped",
    data: {
      dek: "A quarter-point move on a $400,000 loan is about $60 a month. Over thirty years that is real money, but it is not the same as the house getting cheaper.",
    },
    source_line: "Source: Freddie Mac weekly survey",
  },

  // ----------------------------------------------------------------- stats
  "stats.short": {
    template: "stats",
    palette: "midnight",
    tag: "Inflation",
    post_number: 3,
    kicker: "CPI report",
    headline: "Where prices actually moved",
    accent_word: "actually",
    data: {
      stats: [
        { label: "Headline CPI", value: "2.9%", delta: "0.1 pt", direction: "down" },
        { label: "Groceries", value: "1.8%", delta: "0.2 pt", direction: "up" },
        { label: "Rent", value: "4.1%", delta: "0.3 pt", direction: "down" },
      ],
    },
    source_line: "Source: BLS Consumer Price Index",
  },
  "stats.long": {
    template: "stats",
    palette: "sand",
    tag: "Savings",
    post_number: 4,
    kicker: "Deposit accounts",
    headline:
      "Three numbers that decide whether your cash is working for you or quietly losing ground this year",
    accent_word: "quietly",
    data: {
      stats: [
        { label: "Top online savings APY", value: "4.35%", delta: "0.10 pt", direction: "down" },
        { label: "Big-bank average APY", value: "0.42%", delta: "unchanged", direction: "flat" },
        { label: "Inflation, 12-month", value: "2.9%", delta: "0.1 pt", direction: "down" },
      ],
      footnote:
        "A $10,000 balance earns about $435 a year at the top rate and about $42 at the big-bank average.",
    },
    source_line: "Source: FDIC and BLS data",
  },

  // ------------------------------------------------------------ line_chart
  "line_chart.short": {
    template: "line_chart",
    palette: "forest",
    tag: "Housing",
    post_number: 5,
    headline: "The 30-year mortgage rate, six months on",
    accent_word: "six",
    data: {
      x_labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"],
      y_values: [7.04, 6.88, 6.95, 6.72, 6.51, 6.34],
      value_suffix: "%",
      series_label: "Average 30-year fixed rate",
    },
    source_line: "Source: Freddie Mac weekly survey",
  },
  "line_chart.long": {
    template: "line_chart",
    palette: "ice",
    tag: "Markets",
    post_number: 6,
    kicker: "Twelve-month view",
    headline:
      "The S&P 500 has spent a year grinding higher, and the path matters more than the headline number for anyone adding money each month",
    accent_word: "path",
    data: {
      x_labels: [
        "Oct",
        "Nov",
        "Dec",
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
      ],
      y_values: [
        4280, 4410, 4590, 4620, 4780, 4890, 4760, 5020, 5180, 5240, 5390, 5610,
      ],
      value_prefix: "",
      series_label: "S&P 500 index, monthly close",
    },
    source_line: "Source: Index monthly closes",
  },

  // ----------------------------------------------------------- bar_compare
  "bar_compare.short": {
    template: "bar_compare",
    palette: "cream",
    tag: "Groceries",
    post_number: 7,
    headline: "A full grocery cart, two countries",
    accent_word: "two",
    data: {
      unit: "Average monthly grocery bill, family of four, USD",
      bars: [
        { label: "Canada", value: 1120, display: "$1,120" },
        { label: "United States", value: 975, display: "$975" },
      ],
    },
    source_line: "Source: National statistics agencies",
  },
  "bar_compare.long": {
    template: "bar_compare",
    palette: "night",
    tag: "Cost of living",
    post_number: 8,
    kicker: "Metro comparison",
    headline:
      "What a one-bedroom actually costs across six big American metros, before you add utilities or parking",
    accent_word: "actually",
    data: {
      unit: "Median asking rent, one bedroom, USD per month",
      bars: [
        { label: "New York", value: 4100, display: "$4,100" },
        { label: "San Francisco", value: 3250, display: "$3,250" },
        { label: "Boston", value: 2990, display: "$2,990" },
        { label: "Miami", value: 2480, display: "$2,480" },
        { label: "Chicago", value: 1960, display: "$1,960" },
        { label: "Houston", value: 1340, display: "$1,340" },
      ],
    },
    source_line: "Source: Rental listing aggregates",
  },

  // --------------------------------------------------------------- versus
  "versus.short": {
    template: "versus",
    palette: "ice",
    tag: "Debt",
    post_number: 9,
    headline: "Card balance or emergency fund?",
    accent_word: "or",
    data: {
      option_a: { label: "Pay the card first", amount: "24.6%", sub: "Average card APR you stop paying" },
      option_b: { label: "Build the fund first", amount: "4.3%", sub: "Top savings APY you start earning" },
      pill: "Vote in comments",
    },
    source_line: "Source: Federal Reserve G.19, FDIC",
  },
  "versus.long": {
    template: "versus",
    palette: "forest",
    tag: "Retirement",
    post_number: 10,
    kicker: "Same dollar, two homes",
    headline:
      "Match the 401(k) or clear the student loan: the same two hundred dollars a month, pointed at two very different outcomes",
    accent_word: "different",
    data: {
      option_a: {
        label: "Capture the employer match",
        amount: "+100%",
        sub: "Instant return on the matched portion",
      },
      option_b: {
        label: "Clear the 6.5% student loan",
        amount: "6.5%",
        sub: "Guaranteed interest you stop paying",
      },
      pill: "Which would you pick?",
    },
    source_line: "Source: Plan documents, federal loan rates",
  },

  // ---------------------------------------------------------------- steps
  "steps.short": {
    template: "steps",
    palette: "midnight",
    tag: "Supply chain",
    post_number: 11,
    headline: "How a port strike reaches your receipt",
    accent_word: "receipt",
    data: {
      steps: [
        { icon: "ship", label: "Containers stop moving", detail: "Ships wait offshore instead of unloading." },
        { icon: "store", label: "Shelves thin out", detail: "Retailers ration the stock they already hold." },
        { icon: "person", label: "You pay the gap", detail: "Scarcity shows up as a higher sticker price." },
      ],
    },
    source_line: "Source: Port authority notices",
  },
  "steps.long": {
    template: "steps",
    palette: "sand",
    tag: "Rates",
    post_number: 12,
    kicker: "Transmission",
    headline:
      "Five steps between a Fed decision in Washington and the number printed on your credit card statement",
    accent_word: "five",
    data: {
      steps: [
        { icon: "bank", label: "The Fed sets the target", detail: "The overnight rate banks charge each other moves." },
        { icon: "chart", label: "Bond yields reprice", detail: "Markets reset what future money is worth." },
        { icon: "gate", label: "Banks adjust prime", detail: "The benchmark most consumer credit is tied to shifts." },
        { icon: "store", label: "Lenders rewrite offers", detail: "Card, auto and mortgage quotes follow." },
        { icon: "person", label: "Your statement changes", detail: "Usually within one or two billing cycles." },
      ],
    },
    source_line: "Source: Federal Reserve, bank disclosures",
  },

  // ------------------------------------------------------------- breaking
  "breaking.short": {
    template: "breaking",
    palette: "night",
    tag: "World",
    post_number: 13,
    headline: "A major payments processor is down",
    accent_word: "down",
    data: {
      badge: "DEVELOPING",
      impacts: [
        { sector: "Card payments", change: "delayed", direction: "down" },
        { sector: "Retail stocks", change: "-1.2%", direction: "down" },
      ],
    },
    source_line: "Source: Company status page",
  },
  "breaking.long": {
    template: "breaking",
    palette: "midnight",
    tag: "World",
    post_number: 14,
    kicker: "Unverified reports",
    headline:
      "Reports are circulating of a cyberattack on a regional electricity operator, and energy traders are already pricing in a disruption that has not been confirmed",
    accent_word: "circulating",
    data: {
      badge: "UNCONFIRMED",
      impacts_label: "If confirmed, what it means for your money",
      impacts: [
        { sector: "Natural gas futures", change: "+3.4%", direction: "up" },
        { sector: "Utility shares", change: "-2.1%", direction: "down" },
        { sector: "Household power bills", change: "watch", direction: "flat" },
      ],
    },
    source_line: "Source: Unconfirmed media reports",
  },
};

export const SAMPLE_KEYS = Object.keys(SAMPLES) as SampleKey[];
