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

### Prerequisites
- **Python:** 3.10 or higher
- **Node.js:** v18 or higher (with npm)

---

### 1. Setting Up the Backend

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

## Running Tests

To run the backend automated test suite:

```bash
cd backend
python -m unittest test_app.py
```

---

## License

This project is open-source and available under the [MIT License](LICENSE).
