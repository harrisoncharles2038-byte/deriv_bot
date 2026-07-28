# Deriv Synthetic Indices Analyzer & Auto-Bot 

A highly advanced, real-time trading terminal and analytics dashboard for **Deriv Synthetic Indices**. Built with modern web technologies, this platform delivers institutional-grade statistical analysis and fully automated algorithmic trading directly in your browser.

## Features

- **Live Analytics Dashboard:**
  - Real-time price charting for all Deriv Volatility Indices.
  - Live statistical breakdowns: Digit Frequencies, Even/Odd ratios, Rise/Fall trends, Matches/Differs probabilities, and Over/Under thresholds.
- **Smart Symbol Scanner:** Continuously scans the market across all synthetic indices to find the highest probability setups based on your custom targets and barriers.
- **Background Auto-Bot Engine:** 
  - Fully automated trading bot that runs in the background.
  - Supports continuous background execution even while navigating other parts of the app.
  - Advanced risk management including **Martingale** recovery multiplier systems.
- **Seamless Account Integration:** 
  - Connect via OAuth or secure API token.
  - Quick toggle between Virtual (Demo) and Real-Money accounts.
- **Premium "Pro" UI:** Deep dark-mode aesthetic with glassmorphism, responsive sidebar navigation, and smart scroll states.

## Technology Stack

- **Frontend Framework:** React (via TanStack Start)
- **Routing:** TanStack Router
- **Styling:** Tailwind CSS (v4) + Shadcn UI components
- **Build Tool:** Vite + Nitro (SSR ready)
- **Data Source:** Deriv public WebSocket API

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/harrisoncharles2038-byte/deriv_bot.git
   cd deriv_bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Security & API Tokens

- The application communicates directly with the Deriv WebSocket API.
- Your API tokens are stored strictly in your browser's `localStorage` and are never sent to any third-party servers.
- **Disclaimer:** Trading involves significant risk. The analytical signals provided by this tool are statistical probabilities and should not be considered financial advice. Always test strategies thoroughly on a Virtual (Demo) account before using Real Money.

## 🔑 Step-by-Step API Setup Guide

To connect the Deriv Pro Analyzer to your account, you need to generate a secure API token. Follow these exact steps:

1. **Log in to Deriv:**
   Go to [app.deriv.com](https://app.deriv.com) and log into your account.
2. **Navigate to API Tokens:**
   - Click on the **Settings Gear** (⚙️) or go to **Manage Account Settings**.
   - On the left sidebar, click on **Security & safety** > **API token**.
3. **Select the Correct Scopes:**
   To ensure the Auto-Bot and Analyzer function correctly, you must select the following scopes:
   - ✅ **Read** (Required to view balances, history, and live ticks)
   - ✅ **Trade** (Required for the Auto-Bot to execute trades)
   - ✅ **Admin** (Optional but recommended if you want to switch between Virtual and Real accounts from within the app)
4. **Name and Generate:**
   - In the "Token name" field, type something memorable like `DerivProAnalyzer`.
   - Click **Create**.
5. **Connect to the App:**
   - Copy the newly generated token.
   - Open our app, navigate to **Settings & Auth** on the sidebar.
   - Paste the token into the input field and click **Connect**.
   - Your balance and account status will instantly appear!

## Contributors

This project is proudly built and maintained by:

- **Harrison** ([harrisoncharles2038-byte](https://github.com/harrisoncharles2038-byte))
- **Geoffrey Mokami** ([GEOFFREY-MO](https://github.com/GEOFFREY-MO))
  

Thank you for your contributions to the codebase and strategy engine!

---
*Developed with RESPECT and connected to Lovable.*
