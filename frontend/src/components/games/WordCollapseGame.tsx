import React from "react";

import type { GlossaryTerm, Level, Stream, VerbEntry } from "../../types";
import WordCollapseBaseGame from "./WordCollapseBaseGame";

type Props = {
  stream: Stream;
  currentLevel: Level;
  playableTerms: GlossaryTerm[];
  verbEntries: VerbEntry[];
};

const WordCollapseGame: React.FC<Props> = (props) => (
  <WordCollapseBaseGame
    {...props}
    storagePrefix="wordcollapse"
    titleKey="games.tabWordCollapse"
    allowClickWhileFalling={false}
  />
);

export default WordCollapseGame;
