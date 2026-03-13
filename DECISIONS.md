# Happy Camper — Architecture & Decision Log

## Project Overview
A React camping trip planner that takes user inputs (campground, dates, meals, hike preferences) and generates a populated Google Sheet itinerary. Target audience: beginner to advanced campers who don't want to plan everything manually.

---

## Tech Stack
- **Frontend:** React (Create React App), hosted locally on localhost:3000
- **Backend:** Node/Express proxy server (handles API keys, CORS)
- **APIs:** Recreation.gov, Overpass (OSM), NPS Alerts
- **Planned:** Google Sheets API, Google OAuth

---

## File Structure Philosophy
- File separation and single responsibility are non-negotiable
- No thousand-line files — if a file is getting long, it gets split
- Naming conventions: readable function/method names over clever ones
- `src/` organized into: `components/`, `pages/`, `services/`, `utils/`

---

## Goals (in order)
1. ✅ App skeleton and home page form
2. ✅ Recreation.gov API — campground search and selection
3. ⬜ Google Sheets OAuth — auth, read sheet structure, write itinerary
4. ⬜ Schedule builder — hike selection, meal placement, time slot generation
5. ⬜ Multi-step wizard UI (Figma v1 exists, do this last)

---

## Google Sheets Strategy
- User authenticates with Google OAuth
- App programmatically creates a new Sheet in their Drive from a template definition (JS object — no physical Excel file in the repo)
- Sheet is the **output**, not the input — user never pastes a link
- Template structure: Row 1 = title, config row, Column A = time slots, columns per day, Column H = campsite metadata

---

## Campground & Hike Data Sources
Three sources merged into `allAvailableHikes`, passed to `HikeSelector`:
1. **`facility_description`** — parsed from Recreation.gov campground HTML via `descriptionParser.js`. Highest trust, pinned to top of list.
2. **`overpass`** — fetched from Overpass API (OSM) by lat/lon radius. `highway=track` excluded from query to reduce road noise.
3. **`radius`** — placeholder, currently empty array, reserved for future use.

Deduplication happens in `HomePage.js` before passing to `HikeSelector` — `facility_description` names take priority over `overpass` duplicates.

---

## Hike Filtering & Categorization
- `needsVerify` flag: set in `hikingApi.js` when name matches road patterns (Road, Lane, Drive, OHV, FSR, pure alphanumeric codes like 8S10)
- `offroadWarning` flag: set when OSM tags indicate motorized access (highway=track/service, access=private, motorcar=yes)
- **Hiking Trails tab** (default): `facility_description` source OR no flags
- **All Paths tab**: flagged/offroad entries with disclaimer text
- Tab counts shown on toggle buttons

---

## HikeSelector Decisions
- Default max drive time: **20 minutes**
- Drive time estimated at 25mph straight-line (intentionally rough — good enough for sorting, not navigation)
- Google Maps Distance Matrix API intentionally skipped — cost per request at 700+ results is not worth it at this stage
- Hike distance shown **only when present** (most Overpass results have null distanceMiles)
- `facility_description` hikes always sort to top, then sort by drive time ascending
- Clicking the full card OR the + button adds a hike to preferences
- Preferred hikes show as full cards with ✕ to remove (not pill tags)
- AllTrails URLs removed — Overpass only provides search URLs, not direct trail pages, so they're useless

---

## CampgroundDetail Decisions
- Fee and Reservable tags removed — not useful at planning stage
- Kept: ADA accessible, stay limit, phone, Recreation.gov link
- Description parsed into collapsible sections (Overview, Recreation, Facilities, Natural Features, Nearby Attractions)
- Boilerplate cutoff: strips Recreation.gov policy text from descriptions
- NPS alerts shown at top in red when present

---

## Date Inputs
- Replaced `startDate` + `numberOfDays` (select dropdown) with `startDate` + `endDate` date pickers
- `numberOfDays` is derived: `Math.round((endDate - startDate) / ms_per_day)`
- Departure date input disabled until arrival date is set, min enforced to prevent selecting before arrival
- "X nights" label shown between the two inputs once both are selected

---

## Overpass API Reliability
- Primary: `https://overpass-api.de/api/interpreter`
- Fallback mirror: `https://overpass.kumi.systems/api/interpreter`
- On failure: 2 second wait, then retry against mirror
- 504s are common on the free public instance — retry handles this silently

---

## Schedule Builder (Not Yet Built)
Logic lives in `src/utils/hikeSelector.js`:
- `estimateHikeDuration(hike)` — estimates time based on distance
- `filterHikesBySkillLevel(hikes, level)` — beginner 0-3mi, intermediate 3-6mi, advanced 6-10mi, pro 10+mi
- `selectHikesForTrip(params)` — fills days respecting arrival time, wake up time, bedtime, morning hike preference
- Honorable mentions = hikes that were considered but bumped — reserved for future Google Sheet tab
- User-preferred hikes go first, scheduler fills remaining slots randomly from pool

---

## UI / Figma
- Figma v1 designed by Bryant's roommate (UX designer)
- Color: dark forest green `#2d6a2d` as primary, light gray/off-white backgrounds
- Multi-step wizard planned (7 steps) — **do this last, after auth and schedule builder work**
- Steps mapped: Splash → Campsite question → Trip Details → Trail Preferences → Schedule Preferences → Meals → Hike Selection
- `react-day-picker` recommended for the inline calendar on Trip Details step

---

## What's Next
1. Build `SplashPage` component with Google auth button (contained, doesn't touch HomePage.js)
2. Set up Google Cloud project, enable Sheets + Drive APIs
3. Implement OAuth flow — token handling, scopes
4. Schedule builder output — write populated itinerary to Google Sheet
5. Multi-step wizard refactor + full UI pass
