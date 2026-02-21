# Civic Connect - SmartCity AI

Civic Connect is a modern, AI-powered platform designed to bridge the gap between citizens and urban maintenance authorities. Developed for the **Prince - iSolve Hack 26_SmartHacks**, this application simplifies the process of reporting civic issues, tracking their status, and ensuring efficient resolution through a decentralized, transparent system.

## 🚀 Key Features

- **Automated Issue Reporting**: Citizens can easily raise complaints with AI-assisted categorization.
- **Real-time Tracking**: Monitor the progress of complaints from "Pending" to "Resolved".
- **Evidence-based Resolution**: Workers must provide video proof of completion to close tasks.
- **Smart Dashboard**: Comprehensive view for officers to manage resources and priorities.
- **Interactive Map**: Location-based issue visualization for better situational awareness.
- **Notification System**: Instant updates for users and workers on task status changes.

## 🛠 Tech Stack

- **Frontend**: React.js, Vite, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend & Database**: Supabase (PostgreSQL, Auth, Storage)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Testing**: Vitest

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or bun

### Installation

1.  **Clone the repository**:
    ```sh
    git clone https://github.com/Varshakaleeswaran/Prince-iSolve-Hack-26_SmartHacks.git
    cd Prince-iSolve-Hack-26_SmartHacks
    ```

2.  **Install dependencies**:
    ```sh
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the root directory and add your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**:
    ```sh
    npm run dev
    ```

## 🏗 Build for Production

```sh
npm run build
```

## 🧪 Running Tests

```sh
npm run test
```

## 📜 License

This project is developed for hackathon purposes.

---
Built with 💡 for a smarter city.
