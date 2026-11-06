# Player Visibility System

## Overview
This system allows articles to be restricted to specific players, with the GM always having full access.

## Configuration

### 1. Add Players to Config
Edit `js/config.js` and add your players to the `CONFIG.players` object:

```javascript
CONFIG.players: {
    "Player 1": "#FF6B6B",
    "Player 2": "#4ECDC4",
    "Player 3": "#45B7D1",
    "Player 4": "#FFA502"
}
```

The configured color is used to identify the player in the connected-player list.

## Article Visibility

### Frontmatter Format

Add a `visibility` field to your article's frontmatter. Supported formats:

#### 1. Public (default)
If no `visibility` field is specified, or set to `everyone`, the article is visible to all:
```yaml
---
id: my-article
category: npc
---
```

#### 2. GM Only
Only the GM can see the article:
```yaml
---
visibility: gm
---
```

#### 3. Specific Player (Single)
Only one player can see:
```yaml
---
visibility: Player 1
---
```

#### 4. Multiple Players
Multiple players can see (use array format):
```yaml
---
visibility:
  - Player 1
  - Player 2
---
```

## Logging In

### Players
1. Click the 👥 button in the bottom-right corner
2. Select your player name from the dropdown
3. The page will reload and you'll see only articles visible to you

### GM
Use the existing keybind (Alt+G) to toggle GM mode

## What You See

### Current Login Status
The player tools panel shows who you're currently logged in as:
- "No one" - viewing as public (see all public articles)
- Player name - viewing as that player (see public + player-specific articles)
- "GM" - viewing as GM (see all articles including GM-only)

### Connected Players
The player tools panel also shows players and the GM while they are connected.
The name uses its configured player or GM color, and the status light shows
activity: green for activity within 15 minutes, yellow after 15 minutes, and
red after 1 hour. Names disappear when their browser disconnects.

### Access Control Display (GM Only)
When viewing an article as GM, you'll see an "Access:" line showing which players can view that article.

## Example Usage

Create an article visible only to a specific player:

```markdown
---
id: secret-quest
category: npc
name: Secret Quest
visibility: Player 1
---

# Secret Quest

This quest is only visible to Player 1.
```

Create an article visible to multiple players:

```markdown
---
id: group-secret
category: npc
name: Group Secret
visibility:
  - Player 1
  - Player 2
---

# Group Secret

This information is shared between Player 1 and Player 2.
```

## Technical Notes

- Visibility data is stored in localStorage (browser-side only)
- No backend or authentication required
- GMs can see everything and see who has access to each article
- Public articles show no visibility info
- The system gracefully handles missing players in the config

## Player Tool Sharing

The player tools panel has one **Show to others** setting for the measure distance and laser pointer tools:

- **Everyone**: all connected viewers can see the measurement and laser pointer.
- **GM only**: the user who created them and the GM can see them.
- **Only me**: measurements and laser pointer remain local to the user.

The selection is saved in localStorage.

## Map Pins

Use **Add map pin** in the player tools panel, choose Public or Private, then click a map location and enter a title and notes. Public pins are blue and editable by anyone using the app. Private pins appear in a separate map layer named for their owner; the owner and GM can view and edit them. A GM's private pins are visible only in GM mode. Use the map layer control to show or hide each layer.

Pins are stored in the shared Supabase `darien_map_pins` table. Apply `supabase/migrations/20261031100000_map_pins.sql` before using this feature.

**Privacy limitation:** As with the shared notepads, this app has no authenticated user accounts. Private pin visibility and editing restrictions are enforced by the application UI, not by database authorization; anyone with direct access to the public Supabase API can read or change stored pins.
