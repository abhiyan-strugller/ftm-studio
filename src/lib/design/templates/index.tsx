/** Template dispatch: a validated PostDoc in, a framed composition out. */
import { Frame } from "../frame";
import { getPalette } from "../palettes";
import type { PostDoc } from "../../schema";

import { HeadlineTemplate } from "./headline";
import { StatsTemplate } from "./stats";
import { LineChartTemplate } from "./line-chart";
import { BarCompareTemplate } from "./bar-compare";
import { VersusTemplate } from "./versus";
import { StepsTemplate } from "./steps";
import { BreakingTemplate } from "./breaking";

function TemplateBody({ doc, palette }: { doc: PostDoc; palette: ReturnType<typeof getPalette> }) {
  switch (doc.template) {
    case "headline":
      return <HeadlineTemplate doc={doc} palette={palette} />;
    case "stats":
      return <StatsTemplate doc={doc} palette={palette} />;
    case "line_chart":
      return <LineChartTemplate doc={doc} palette={palette} />;
    case "bar_compare":
      return <BarCompareTemplate doc={doc} palette={palette} />;
    case "versus":
      return <VersusTemplate doc={doc} palette={palette} />;
    case "steps":
      return <StepsTemplate doc={doc} palette={palette} />;
    case "breaking":
      return <BreakingTemplate doc={doc} palette={palette} />;
  }
}

export function PostComposition({ doc }: { doc: PostDoc }) {
  const palette = getPalette(doc.palette);
  return (
    <Frame palette={palette} tag={doc.tag} postNumber={doc.post_number}>
      <TemplateBody doc={doc} palette={palette} />
    </Frame>
  );
}
