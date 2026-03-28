import React from "react";

import type { GlossaryTerm, Level, Stream, VerbEntry } from "../../types";
import WordCollapseBaseGame from "./WordCollapseBaseGame";

type Props = {
  stream: Stream;
  currentLevel: Level;
  playableTerms: GlossaryTerm[];
  verbEntries: VerbEntry[];
};

const WordCollapse2Game: React.FC<Props> = (props) => (
  <WordCollapseBaseGame
    {...props}
    storagePrefix="wordcollapse2"
    titleKey="games.tabWordCollapse2"
    allowClickWhileFalling
  />
);

export default WordCollapse2Game;
