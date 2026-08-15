# Study Squad — Modular Structure

This version keeps the existing single-page application behavior and Supabase logic, but separates the source into maintainable modules.

```text
Study_Squad_Modular/
├── index.html                  # markup / layout only
├── css/
│   ├── main.css                # shared layout, theme, common components
│   ├── marketplace.css         # shop / marketplace visuals
│   ├── badges.css              # badges / achievements visuals
│   ├── titles.css              # title + text-style visuals
│   └── leaderboard.css          # leaderboard cosmetic visuals
├── js/
│   ├── app.js                  # Supabase, auth, navigation, initialization
│   ├── marketplace.js          # shop catalogue + buying/equipping
│   ├── badges.js               # achievement definitions
│   ├── titles.js               # title/text-style helpers
│   ├── leaderboard.js          # leaderboard + equipped cosmetics
│   ├── profile.js               # profile, personal dashboard, analytics
│   ├── tasks.js                 # daily tasks, study logging, realtime study updates
│   ├── tests.js                 # test scores
│   ├── history.js               # study history
│   └── animations.js            # UI motion system
└── assets/
    ├── badges/
    └── effects/
```

## Important
- `index.html` no longer contains the giant inline `<style>` or application `<script>`.
- Script order is intentional: titles/badges/marketplace/leaderboard load before `app.js` can call `refreshAll()`.
- The Supabase URL/key remain in `js/app.js` exactly as in the existing site.
- The leaderboard continues to show equipped title, text style, accessory/crown, and animated effect.
