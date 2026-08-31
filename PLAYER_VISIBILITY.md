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

The color is for future use (player status display).

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
