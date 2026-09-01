# Issue Tracker (Mini Jira)

A full-stack Issue & Project Management web application built with a **Flask REST API** backend and a modern **React + Vite** frontend. Designed for agile teams to track projects, manage bugs & tasks, monitor activity logs, generate reports, and visualize metrics.

---

## Features

- **Authentication & Role-Based Access Control (RBAC)**
  - JWT token authentication with token blocklist logout mechanism.
  - Three distinct user roles: `Admin`, `Manager`, and `User`.
- **Project Management**
  - Create and manage projects with custom keys, descriptions, and assigned team members.
  - Track per-project issue statistics and overall project progress.
- **Issue Management**
  - Full issue lifecycle: `Open`, `In Progress`, `Resolved`, `Closed`.
  - Issue types: `Bug`, `Feature`, `Task`.
  - Priority levels: `Low`, `Medium`, `High`, `Critical`.
  - Filter, search, assign issues, and track due dates.
- **Comments & Collaboration**
  - Rich commentary system on issues for team collaboration.
- **Interactive Analytics Dashboard**
  - Data visualizations powered by **Recharts** (issues by status, priority breakdown, team workload).
- **Activity Logging & Audit Trail**
  - Audit trail of user actions across projects and issues.
- **Reports & PDF Export**
  - Generate comprehensive project/issue reports.
  - Export PDF summaries generated dynamically via **ReportLab**.
- **Notifications**
  - Real-time in-app notification tracking for user updates and assignments.
- **GitHub Integration & Webhook Sync**
  - Two-way link between Git commits/PRs and IssueTrack tickets.
  - Automated status workflow transitions (`Fixes #12` resolves issues, `WIP #12` sets to in-progress).
  - HMAC-SHA256 signature verification (`X-Hub-Signature-256`) for security.
  - In-app timeline view of linked commits, branch names, authors, and permalinks.
  - Local simulation CLI tool for testing webhook payloads offline.

---

## Tech Stack

### Backend
- **Framework:** Python / Flask 3.1
- **Database ORM:** Flask-SQLAlchemy (SQLite for development, MySQL ready for production)
- **Authentication:** Flask-JWT-Extended
- **PDF Generation:** ReportLab
- **CORS Management:** Flask-CORS

### Frontend
- **Framework:** React 19 (Vite build tool)
- **Routing:** React Router v7
- **HTTP Client:** Axios
- **Data Visualization:** Recharts
- **Iconography:** React Icons

---

## Project Structure

```
issue_tracker/
├── backend/
│   ├── app.py                # Flask app factory & blueprint registrations
│   ├── config.py             # App configurations (Dev, Prod, Test)
│   ├── db_init.py            # Database initializer & default admin seeder
│   ├── requirements.txt      # Python dependencies
│   ├── test_app.py           # Backend unit test suite
│   ├── models/               # SQLAlchemy database models
│   │   ├── activity_log.py
│   │   ├── comment.py
│   │   ├── issue.py
│   │   ├── notification.py
│   │   ├── project.py
│   │   └── user.py
│   └── routes/               # API route blueprints
│       ├── activity.py
│       ├── auth.py
│       ├── comments.py
│       ├── dashboard.py
│       ├── issues.py
│       ├── notifications.py
│       ├── projects.py
│       ├── reports.py
│       └── users.py
└── frontend/
    ├── package.json          # Node dependencies & scripts
    ├── vite.config.js        # Vite configuration
    └── src/
        ├── App.jsx           # Main React component & routes
        ├── components/       # Reusable UI components (Navbar, Sidebar, etc.)
        ├── context/          # React Context (AuthContext)
        ├── pages/            # Page components (Dashboard, Projects, Issues, etc.)
        └── services/         # API client & axios instances
```

---

## Quick Start Guide

### Option A: Run with Docker (Recommended)

Make sure [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) are installed.

1. **Build and start the application**:
   ```bash
   docker compose up --build
   ```
   Or to run in detached background mode:
   ```bash
   docker compose up -d --build
   ```

2. **Access the Application**:
   - **Frontend UI:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:5005/api](http://localhost:5005/api)
   - **Health Check:** [http://localhost:5005/api/health](http://localhost:5005/api/health)

3. **Stop the containers**:
   ```bash
   docker compose down
   ```

---

### Option B: Manual Local Setup

#### Prerequisites
- **Python:** 3.10 or higher
- **Node.js:** v18 or higher (with npm)

---

#### 1. Setting Up the Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows:**
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Initialize the database and seed the default admin account:
   ```bash
   python db_init.py
   ```

5. Start the backend development server:
   ```bash
   python app.py
   ```
   The Flask API server will run at `http://localhost:5000`.

---

### 2. Setting Up the Frontend

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The React frontend will run at `http://localhost:5173`.

---

## Default Login Credentials

Upon running `db_init.py`, a default administrator account is automatically created:

- **Email:** `admin@admin.com`
- **Password:** `admin123`
- **Role:** System Administrator

---

## API Endpoints Summary

| Base Path | Description |
| :--- | :--- |
| `POST /api/auth/login` | Authenticate user & receive JWT token |
| `POST /api/auth/logout` | Revoke JWT token |
| `GET/POST /api/users` | List or create system users (Admin) |
| `GET/POST /api/projects` | List or create projects |
| `GET/POST /api/issues` | List, filter, or create issues |
| `GET/POST /api/comments` | Fetch or add comments on issues |
| `GET /api/dashboard/stats` | Fetch dashboard analytics metrics |
| `GET /api/reports/pdf` | Export issue summary PDF report |
| `GET /api/notifications` | Fetch user notifications |
| `GET /api/activity` | System audit activity logs |
| `GET /api/health` | API health check |

---

## GitHub Webhook Integration

IssueTrack seamlessly integrates with GitHub to sync code commits and pull requests directly with issues.

### 1. Supported Commit Keywords
Mentioning an issue tag in commit messages or PR descriptions triggers automatic state updates:

| Syntax | Intent | Action Taken in IssueTrack |
| :--- | :--- | :--- |
| `Fixes #12`, `Closes #12`, `Resolves #12` | Resolve | Moves issue status from `Open` / `In Progress` → **`Resolved`** |
| `WIP #12`, `Working on #12`, `Ref #12` | Progress | Moves issue status from `Open` → **`In Progress`** |
| `See #12`, `GH-12`, `#12` | Link | Links commit/PR reference to issue without state change |

### 2. Setting up Webhook on GitHub
1. In your GitHub repository, navigate to **Settings** → **Webhooks** → **Add webhook**.
2. **Payload URL:** `https://your-domain.com/api/webhooks/github` (or your ngrok / cloud domain).
3. **Content type:** `application/json`.
4. **Secret:** Enter your `GITHUB_WEBHOOK_SECRET` string.
5. **Events:** Select **Pushes** and **Pull requests**.
6. Click **Add webhook**.

### 3. Local Webhook Simulator (Offline Testing)
You can test webhook processing and status transitions locally without setting up public tunnels:

```bash
# Simulate a commit resolving issue #1
python backend/scripts/simulate_webhook.py --issue 1 --action fix

# Simulate WIP progress on issue #2
python backend/scripts/simulate_webhook.py --issue 2 --action wip --author "Alice Dev"

# Simulate a merged Pull Request resolving issue #1
python backend/scripts/simulate_webhook.py --type pull_request --issue 1 --merged
```

---

## Running Tests

To run the backend automated test suite (including all 10 modules + GitHub Webhooks suite):

```bash
cd backend
python -m unittest test_app.py
```

---

## License

This project is open-source and available under the [MIT License](LICENSE).
