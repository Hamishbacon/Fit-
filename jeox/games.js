/*
  JEOX GAME LIST
  ==============
  This is the only file you need to change to add or remove games.

  Each game looks like this:
    {
      id: "unique-short-name",          // used in the web address, no spaces
      title: "Game Name",
      category: "Puzzle",               // must match one in CATEGORIES below
      description: "One or two sentences about the game.",
      icon: "🧩",                       // emoji shown on the card
      color: "#6c5ce7",                 // card colour
      embed: "https://html5.gamedistribution.com/....",  // the game link from the distributor
      orientation: "landscape"          // "landscape" or "portrait"
    }

  Leave embed as "" to show a "Coming soon" card.
  Games in the games/ folder are temporary placeholders made for this site.
*/

const CATEGORIES = ["Action", "Puzzle", "Arcade", "Sports", "Racing", "Casual"];

const GAMES = [
  // ---- Playable placeholder games (made for Jeox) ----
  {
    id: "memory-match",
    title: "Memory Match",
    category: "Puzzle",
    description: "Flip the cards and find every matching pair in as few moves as you can.",
    icon: "🃏",
    color: "#6c5ce7",
    embed: "games/memory.html",
    orientation: "landscape"
  },
  {
    id: "quick-tap",
    title: "Quick Tap",
    category: "Casual",
    description: "Wait for green, then tap as fast as you can. How quick are your reflexes?",
    icon: "⚡",
    color: "#00b894",
    embed: "games/reaction.html",
    orientation: "landscape"
  },
  {
    id: "star-catcher",
    title: "Star Catcher",
    category: "Arcade",
    description: "Slide the basket to catch falling stars and dodge the bombs.",
    icon: "⭐",
    color: "#e17055",
    embed: "games/catch.html",
    orientation: "landscape"
  },

  // ---- Coming soon: swap in real embed links here ----
  { id: "action-1", title: "Action Game", category: "Action", description: "A licensed action game will go here.", icon: "💥", color: "#d63031", embed: "" },
  { id: "racing-1", title: "Racing Game", category: "Racing", description: "A licensed racing game will go here.", icon: "🏎️", color: "#0984e3", embed: "" },
  { id: "sports-1", title: "Sports Game", category: "Sports", description: "A licensed sports game will go here.", icon: "⚽", color: "#00a86b", embed: "" },
  { id: "puzzle-2", title: "Puzzle Game", category: "Puzzle", description: "A licensed puzzle game will go here.", icon: "🧩", color: "#a29bfe", embed: "" },
  { id: "arcade-2", title: "Arcade Game", category: "Arcade", description: "A licensed arcade game will go here.", icon: "👾", color: "#fd79a8", embed: "" },
  { id: "sports-2", title: "Basketball Game", category: "Sports", description: "A licensed sports game will go here.", icon: "🏀", color: "#e67e22", embed: "" },
  { id: "action-2", title: "Adventure Game", category: "Action", description: "A licensed adventure game will go here.", icon: "🗡️", color: "#636e72", embed: "" },
  { id: "racing-2", title: "Bike Game", category: "Racing", description: "A licensed racing game will go here.", icon: "🏍️", color: "#00cec9", embed: "" },
  { id: "casual-2", title: "Casual Game", category: "Casual", description: "A licensed casual game will go here.", icon: "🎈", color: "#fdcb6e", embed: "" }
];
