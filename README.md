# MCHP Bot

A Node.js + TypeScript bot that automates end-of-day student session reporting for a Mathnasium learning center. It pulls data from Google Sheets and the Radius CRM, then posts a formatted summary to a Discord channel on a scheduled basis.

---

## Features

- **Scheduled reporting** — automatically runs on weekday evenings (Mon–Thu at 7:45 PM) and Sundays (5:15 PM), Chicago time
- **Google Sheets integration** — reads student session statuses (Last-Minute, Cancelled, No Show) from the Instruction Scheduler spreadsheet
- **Radius CRM scraping** — uses Puppeteer to log into the Radius attendance roster and detect students who are still checked in
- **Discord delivery** — posts a formatted EOD report to a designated Discord channel

---

## Tech Stack

| Tool                             | Purpose                                 |
| -------------------------------- | --------------------------------------- |
| Node.js + TypeScript             | Runtime and language                    |
| Puppeteer                        | Headless browser scraping of Radius CRM |
| Google Sheets API (`googleapis`) | Reading student status data             |
| discord.js                       | Sending messages to Discord             |
| node-cron                        | Scheduling the reports                  |
| date-fns                         | Date formatting                         |
| dotenv                           | Environment variable management         |

---

## Project Structure

```
src/
├── index.ts              # Entry point — Discord login and cron scheduling
└── services/
    ├── discord.ts        # Report assembly and Discord message delivery
    ├── googleSheets.ts   # Google Sheets API client and data fetching
    ├── puppeteer.ts      # Puppeteer browser/page setup utilities
    └── radius.ts         # Radius CRM login and attendance scraping
```

---

## Prerequisites

- Node.js v18+
- A Discord bot token with `Guilds`, `GuildMessages`, and `MessageContent` intents enabled
- A Google Cloud service account with access to the Google Sheets API
- Valid Radius CRM credentials

---

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd <your-repo-name>
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```env
DISCORD_TOKEN=your_discord_bot_token
GOOGLE_CREDENTIALS=your_google_service_account_json
RADIUS_USER=your_radius_username
RADIUS_PWD=your_radius_password
```

### 3. Add the Google service account key

Place your Google Cloud service account JSON file at the project root and name it:

```
service-account.json
```

The service account must have read access to the Instruction Scheduler spreadsheet.

### 4. Build and run

```bash
npm run build
npm start
```

Or run directly with `tsx` for development:

```bash
npx tsx src/index.ts
```

---

## How It Works

### Scheduling (`index.ts`)

Two cron jobs are registered after the Discord client is ready:

| Schedule   | Days              |
| ---------- | ----------------- |
| 7:45 PM CT | Monday – Thursday |
| 5:15 PM CT | Sunday            |

Both jobs call `sendEODStudentReport()`.

### Report Assembly (`discord.ts`)

The report is built from four data sources fetched in parallel and joined into a single Discord message:

1. **Last-Minute Students** — from Google Sheets
2. **Cancelled Students** — from Google Sheets
3. **No Show Students** — from Google Sheets
4. **Checked-In Students** — from Radius (students not yet checked out)

### Google Sheets (`googleSheets.ts`)

Reads the range `Admin View!O2:AB77` from the Instruction Scheduler spreadsheet. Filters rows by the `Status` column and formats each student as:

```
1. Student Name *(HH:MM AM/PM)*
```

### Radius Scraping (`radius.ts`)

1. Launches a headless Puppeteer browser
2. Logs into `radius.mathnasium.com` with credentials from `.env.local`
3. Navigates to the Attendance Roster page
4. Scrapes all `tr.k-master-row` elements
5. Filters for rows where the `IsCheckedInTD` cell value is `"true"`
6. Returns a formatted list of first and last names

### Discord Delivery (`discord.ts`)

Posts to the `lead-team` channel. The message includes the date, a link to the Instruction Scheduler spreadsheet, and each of the four report sections separated by dividers.

---

## Discord Channels

Configured in `discord.ts`:

| Name                  | Purpose                                 |
| --------------------- | --------------------------------------- |
| `lead-team`           | Primary channel for EOD reports         |
| `automated-reminders` | Reserved for future automated reminders |
| `test-channel`        | For development and testing             |

---

## Notes

- The Radius scraper uses `innerText` to read hidden table cells — if attendance data appears missing, switching to `textContent` on those cells may help
- The `launchPuppeteer` function accepts an optional `headless` boolean (defaults to `true`) — set it to `false` during debugging to watch the browser
- The cron schedule uses the `America/Chicago` timezone explicitly to account for daylight saving time
