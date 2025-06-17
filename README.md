# Fútbol con los pibes

> _This project was originally initiated from the BetterAuth demo app._

## Overview

**Fútbol con los pibes** is a web application for organizing, joining, and managing casual football (soccer) matches with your friends and local community. Built with Next.js, TypeScript, and Tailwind CSS, it provides a seamless experience for both match organizers and players.

## Features

- **Create Matches:** Organize new football matches, set date, time, location, and player limits.
- **Join Matches:** Browse upcoming matches and sign up to play.
- **Player Signups:** See who's in, manage signups, and handle waitlists automatically.
- **Match Management:** Edit match details, manage participants, and cancel matches if needed.
- **Authentication:** Secure sign-in and sign-up (powered by BetterAuth).
- **Mobile-First Design:** Responsive UI for easy use on any device.

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- pnpm, npm, or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd football-with-friends
   ```
2. **Install dependencies:**
   ```bash
   pnpm install
   # or
   npm install
   # or
   yarn install
   ```
3. **Set up environment variables:**
   - Copy `.env.example` to `.env` and fill in the required values.

### Running the App

Start the development server:
```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the app.

## Contributing

Contributions are welcome! Please open issues or submit pull requests for new features, bug fixes, or suggestions.

## License

MIT
