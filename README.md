# 🏕️ Happy Camper

A React-based camping trip planner that takes the logistics out of the outdoors. Search parks and trails via the Recreation.gov API, build a day-by-day trip schedule, plan meals, and export everything to a formatted Google Sheet — all in one place.

---

## Features

- **Park & Trail Search** — Search campgrounds and trails using the Recreation.gov API, with park details pulled from the NPS API
- **Trip Scheduling** — Dynamic day-by-day itinerary builder with configurable start times and activity blocks
- **Meal Planning** — Add and organize meals across your trip days
- **Google Sheets Export** — Generate a formatted trip sheet directly to your Google Drive with a single click
- **Google OAuth** — Secure sign-in via Google to authorize Sheets access

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Create React App) |
| Backend | Node.js / Express |
| Auth | Google OAuth 2.0 |
| APIs | Recreation.gov, NPS, Google Sheets API, Overpass (trail data) |
| Export | Google Sheets API v4 |

---

## Getting Started

### Prerequisites

- Node.js v16+
- A [Recreation.gov API key](https://ridb.recreation.gov/docs)
- A [Google Cloud project](https://console.cloud.google.com/) with the following enabled:
  - Google Sheets API
  - Google OAuth 2.0 credentials (Web application type)

### 1. Clone the repo

```bash
git clone https://github.com/bx-machina/happy-camper.git
cd happy-camper
```

### 2. Install dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
REACT_APP_RIDB_API_KEY=your_recreation_gov_api_key
REACT_APP_NPS_API_KEY=your_nps_api_key
REACT_APP_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

Create a `.env` file in the `/server` directory:

```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
REDIRECT_URI=http://localhost:3001/auth/google/callback
```

> ⚠️ Never commit `.env` files. Both are included in `.gitignore`.

### 4. Run the app

In two separate terminals:

```bash
# Terminal 1 — start the backend
cd server
node index.js

# Terminal 2 — start the frontend
npm start
```

The app will be available at `http://localhost:3000`.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Sheets API** and **Google Drive API**
4. Under **Credentials**, create an OAuth 2.0 Client ID
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:3001/auth/google/callback`
5. Copy the Client ID and Client Secret into your server `.env`

---

## Project Structure

```
happy-camper/
├── public/
├── src/
│   ├── components/        # React UI components
│   ├── logic/             # Scheduling, sheet generation, trip logic
│   ├── App.js
│   └── index.js
├── server/
│   ├── index.js           # Express server + OAuth flow
│   └── ...
├── decisions.md           # Architecture and design decisions log
└── README.md
```

---

## Roadmap

- [ ] Packing list generator based on trip length and activities
- [ ] Weather forecast integration per trip day
- [ ] Multi-trip saving and history
- [ ] Mobile layout polish

---

## Author

**Bryant Flores** — [github.com/bx-machina](https://github.com/bx-machina) · [LinkedIn](https://www.linkedin.com/in/bryant-flores-9510b61bb/)

Built for personal use because planning camping trips in spreadsheets by hand is its own kind of suffering.
