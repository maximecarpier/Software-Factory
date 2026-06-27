const axios = require("axios");
const fs = require("fs");
const path = require("path");

const ARCS_URL = "https://raw.githubusercontent.com/m00p1ng/one-piece-catchup/main/src/data/arcs.ts";
const EPISODES_URL = "https://raw.githubusercontent.com/AniraTeam/AniFiller/main/data/shows/one-piece.json";
const OUTPUT_PATH = path.join(__dirname, "data", "one-piece.json");

function extractBalancedBrackets(str, openBracketIdx) {
  let depth = 0;
  for (let i = openBracketIdx; i < str.length; i++) {
    if (str[i] === "[") depth++;
    else if (str[i] === "]") {
      depth--;
      if (depth === 0) return str.slice(openBracketIdx, i + 1);
    }
  }
  return null;
}

function parseArcRanges(arcsTsSource) {
  const arcs = [];
  const arcObjectRe =
    /id:\s*"([a-z0-9-]+)",\s*\n\s*name:\s*"([^"]+)",\s*\n\s*episodes:\s*"[^"]+",\s*\n\s*startEp:\s*(\d+),\s*\n\s*endEp:\s*(\d+),/g;
  const sagaArcsBlockRe = /arcs:\s*\[/g;
  let blockStart;
  while ((blockStart = sagaArcsBlockRe.exec(arcsTsSource))) {
    const block = extractBalancedBrackets(arcsTsSource, blockStart.index + blockStart[0].length - 1);
    if (!block) continue;
    let arcMatch;
    while ((arcMatch = arcObjectRe.exec(block))) {
      arcs.push({
        id: arcMatch[1],
        name: arcMatch[2],
        start: Number(arcMatch[3]),
        end: Number(arcMatch[4]),
      });
    }
  }
  return arcs;
}

function normalizeEpisodeType(rawType) {
  if (rawType === "filler") return "filler";
  if (rawType === "mixed-manga") return "mixte";
  return "canon"; // manga-canon, anime-canon
}

function computeArcType(episodeTypes) {
  const distinctTypes = new Set(episodeTypes);
  if (distinctTypes.size === 1) return episodeTypes[0];
  return "mixte";
}

async function main() {
  const today = new Date();

  const [arcsRes, episodesRes] = await Promise.all([
    axios.get(ARCS_URL),
    axios.get(EPISODES_URL),
  ]);

  const arcRanges = parseArcRanges(arcsRes.data);

  const episodes = episodesRes.data.episodes
    .filter((episode) => new Date(episode.aired_date) <= today)
    .map((episode) => ({
      number: episode.episode,
      title: episode.title,
      type: normalizeEpisodeType(episode.type),
    }))
    .sort((a, b) => a.number - b.number);

  const lastAiredEpisode = episodes.length ? episodes[episodes.length - 1].number : 0;

  const arcs = arcRanges
    .filter((arc) => arc.start <= lastAiredEpisode)
    .map((arc) => {
      const arcEpisodes = episodes.filter((episode) => episode.number >= arc.start && episode.number <= arc.end);
      return {
        id: arc.id,
        name: arc.name,
        type: computeArcType(arcEpisodes.map((episode) => episode.type)),
        episodes: arcEpisodes,
      };
    })
    .filter((arc) => arc.episodes.length > 0);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(arcs, null, 2));

  const totalEpisodes = arcs.reduce((sum, arc) => sum + arc.episodes.length, 0);
  console.log(`Arcs: ${arcs.length}`);
  console.log(`Episodes: ${totalEpisodes}`);
  for (const arc of arcs) {
    console.log(`  [${arc.type}] ${arc.name} (${arc.episodes.length} episodes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
