# Jeox: free online games site

Open `index.html` to view the site. No build step is needed.

## Adding a real game

1. Copy the game's embed link from your distributor (GameDistribution, GamePix, and so on).
   If they give you a whole `<iframe ...>` code, the link is the part inside `src="..."`.
2. Open `games.js` and find one of the "Coming soon" entries (or copy an existing entry).
3. Change `title`, `category`, `description` and `icon`, and paste the link into `embed`.
4. Save. The game appears on the homepage automatically.

## Files

| File | What it is |
|---|---|
| `games.js` | The list of games. **This is the only file you need to edit.** |
| `index.html` | Homepage with categories and search |
| `play.html` | The page where a game is played |
| `about.html`, `privacy.html` | About page and a template privacy policy (fill in your contact email) |
| `games/` | Three temporary placeholder games made for this site |
| `style.css`, `site.js` | Design and shared code |
