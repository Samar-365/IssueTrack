# Issue Tracker (IssueTrack)

A full-stack Issue & Project Management web application built with a **Flask REST API** backend and a modern **React + Vite** frontend. Designed for agile teams to track projects, manage bugs & tasks, coordinate via Kanban boards, monitor activity logs, generate reports, and automate workflows via **GitHub Webhooks**.

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start Guide](#quick-start-guide)
  - [Option A: Docker Compose (Local Dev)](#option-a-docker-compose-local-dev)
  - [Option B: Manual Local Setup](#option-b-manual-local-setup)
- [Production Deployment Guide](#production-deployment-guide)
  - [1. Backend Deployment (Render)](#1-backend-deployment-render)
  - [2. Frontend Deployment (Vercel)](#2-frontend-deployment-vercel)
  - [3. Keep Backend Alive (UptimeRobot)](#3-keep-backend-alive-uptimerobot)
- [Default Login Credentials](#default-login-credentials)
- [GitHub Webhook Automation](#github-webhook-automation)
- [API Endpoints Summary](#api-endpoints-summary)
- [Running Tests](#running-tests)
- [License](#license)

---

## Features

- **Authentication & Multi-Tenant Team Workspaces**
  - JWT authentication with token revocation blocklist for secure logouts.
  - Three distinct user roles: `Admin`, `Manager`, and `Employee`.
  - Team ID isolation & Team Access portal with strict email whitelist protection.
- **Project & Team Management**
  - Create and manage projects with custom keys, descriptions, and assigned team members.
  - Dedicated per-project GitHub webhook tokens and secret rotation.
- **Issue Management & Kanban Board**
  - Interactive **Kanban Board** with drag-and-drop state transitions.
  - Full issue lifecycle: `Open` ➔ `In Progress` ➔ `Testing` ➔ `Resolved` ➔ `Closed`.
  - Visible `#ID` badges on cards and tables for quick Git commit referencing.
  - Priority levels: `Low`, `Medium`, `High`, `Critical`.
  - Filter by project, priority, status, assignee, and live search.
- **Comments & Collaboration**
  - Real-time comment threads on issues with edit and delete capabilities.
- **Interactive Analytics Dashboard**
  - Data visualizations powered by **Recharts** (status distribution, priority metrics, project health).
- **Activity Logging & Audit Trail**
  - Complete chronological audit log of team actions, member removals, and issue status updates.
- **Reports & PDF Export**
  - Real-time issue performance reports with CSV and **ReportLab** PDF generation.
- **GitHub Integration & Webhook Sync**
  - Two-way synchronization between Git commits/PRs and IssueTrack tickets.
  - Smart status transitions (`Fixes #1` auto-closes issue, `Working on #1` moves to in-progress).
  - HMAC-SHA256 signature verification (`X-Hub-Signature-256`).
  - Linked commit history modal displaying commit message, author, branch, SHA, and timestamps.
- **Production-Ready Architecture**
  - Render Blueprint support (`render.yaml`).
  - Native PostgreSQL support on Render + SQLite local fallback.
  - Vercel client-side routing support via `vercel.json` SPA rewrites.
  - Standalone `/health` endpoint for monitoring & keep-alive pingers (UptimeRobot).

---

## Tech Stack

### Backend
- **Framework:** Python 3.11 / Flask 3.1
- **WSGI Production Server:** Gunicorn 23.0
- **Database ORM:** Flask-SQLAlchemy (SQLite for development, PostgreSQL via `psycopg2-binary` for Render production)
- **Authentication:** Flask-JWT-Extended
- **CORS Management:** Flask-CORS (Dynamic Vercel domain & production origin whitelisting)
- **PDF Generation:** ReportLab
- **Security:** HMAC-SHA256 signature verification, Werkzeug password hashing

### Frontend
- **Framework:** React 19 (Vite build system)
- **Routing:** React Router v7 (SPA rewrites configured for Vercel)
- **HTTP Client:** Axios (automatic JWT Bearer token interceptor)
- **Data Visualization:** Recharts
- **Icons:** React Icons & Custom Pixel Icons
- **Styling:** Modern Vanilla CSS Design System with dark mode aesthetics

---

## Project Structure

```text
issue_tracker/
├── render.yaml               # Render Infrastructure as Code (Blueprint)
├── docker-compose.yml        # Docker Compose configuration for local dev
├── backend/
│   ├── app.py                # Flask app factory, CORS & blueprint registrations
│   ├── config.py             # Config classes (Development, Production with Postgres)
│   ├── db_init.py            # Database initializer & schema migrator
│   ├── build.sh              # Render build script (pip install + db_init)
│   ├── Dockerfile            # Production Docker container definition
│   ├── docker-entrypoint.sh  # Docker entrypoint (db migration + Gunicorn)
│   ├── requirements.txt      # Python dependencies (includes psycopg2-binary & gunicorn)
│   ├── test_app.py           # Backend automated test suite
│   ├── models/               # SQLAlchemy models
│   │   ├── activity_log.py
│   │   ├── comment.py
│   │   ├── github_event.py   # Linked GitHub commits & PR records
│   │   ├── issue.py
│   │   ├── notification.py
│   │   ├── project.py
│   │   ├── removed_member.py # Team member removal blacklist
│   │   └── user.py
│   ├── routes/               # API Blueprints
│   │   ├── activity.py
│   │   ├── auth.py
│   │   ├── comments.py
│   │   ├── dashboard.py
│   │   ├── issues.py
│   │   ├── notifications.py
│   │   ├── projects.py
│   │   ├── reports.py
│   │   ├── users.py
│   │   └── webhooks.py       # GitHub Webhook ingress & event receiver
│   ├── scripts/
│   │   └── simulate_webhook.py # CLI tool to simulate GitHub webhook events locally
│   └── services/             # Webhook security & parser services
│       ├── github_parser.py
│       ├── github_workflow.py
│       └── webhook_security.py
└── frontend/
    ├── vercel.json           # Vercel SPA rewrite configuration
    ├── package.json          # Frontend dependencies & build scripts
    ├── vite.config.js        # Vite configuration
    └── src/
        ├── App.jsx           # Root application router
        ├── components/       # UI Components & Modals (KanbanBoard, WebhookModal, etc.)
        ├── context/          # React Contexts (AuthContext)
        ├── pages/            # View pages (LoginPage, IssuesPage, ProjectsPage, etc.)
        └── services/
            └── api.js        # Axios API client with dynamic VITE_API_URL
```

---

## Quick Start Guide

### Option A: Docker Compose (Local Dev)

1. **Build and start the application**:
   ```bash
   docker compose up --build
   ```

2. **Access the Application**:
   - **Frontend UI:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:5005/api](http://localhost:5005/api)
   - **Health Check:** [http://localhost:5005/health](http://localhost:5005/health)

3. **Stop the containers**:
   ```bash
   docker compose down
   ```

---

### Option B: Manual Local Setup

#### Prerequisites
- **Python:** 3.10 or higher
- **Node.js:** v18 or higher (with npm)

#### 1. Backend Setup
```bash
cd backend

# Create & activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database & seed admin user
python db_init.py

# Start Flask development server
python app.py
```
The Flask API runs at `http://127.0.0.1:5005`.

#### 2. Frontend Setup
```bash
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```
The React UI runs at `http://localhost:5173`.

---

## Production Deployment Guide

### 1. Backend Deployment (Render)

#### Option 1: Using Render Blueprint (Recommended)
1. In [Render Dashboard](https://dashboard.render.com/), click **New** ➔ **Blueprint**.
2. Connect your GitHub repository (`Samar-365/IssueTrack`).
3. Render reads `render.yaml` and automatically creates:
   - A free **PostgreSQL database** (`issue-tracker-db`).
   - A free **Web Service** with Gunicorn, auto-linking `DATABASE_URL`.

#### Option 2: Manual Web Service Setup
1. In Render, click **New** ➔ **PostgreSQL**:
   - Name: `issue-tracker-db`
   - Plan: **Free**
   - Click **Create Database**, then copy the **Internal Database URL**.
2. Click **New** ➔ **Web Service**:
   - Connect repository.
   - **Language:** `Docker` (or `Python` with build command `./build.sh`).
   - **Root Directory:** `backend`
   - **Docker Build Context Directory:** `.`
   - **Dockerfile Path:** `Dockerfile`
   - **Health Check Path:** `/health`
3. Add Environment Variables:
   | Key | Value |
   |---|---|
   | `FLASK_ENV` | `production` |
   | `SECRET_KEY` | *(click Generate)* |
   | `JWT_SECRET_KEY` | *(click Generate)* |
   | `DATABASE_URL` | *(paste Internal Database URL copied from PostgreSQL)* |
   | `FRONTEND_URL` | `https://<your-vercel-app>.vercel.app` *(add after frontend deploy)* |

---

### 2. Frontend Deployment (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/) ➔ **Add New** ➔ **Project**.
2. Import your GitHub repository.
3. Configure Project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend` *(click Edit and select `frontend`)*
4. Add Environment Variable:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://<your-render-service>.onrender.com/api` *(must end with `/api`)*
   - **Type:** `Config` *(do NOT select Secret)*
5. Click **Deploy**.

> **Note:** Client-side routing is handled automatically by `frontend/vercel.json` rewrites, preventing 404 errors when refreshing pages.

---

### 3. Keep Backend Alive (UptimeRobot)

Render free-tier instances sleep after 15 minutes of inactivity (causing cold-start delays). Use **UptimeRobot** to keep it active 24/7:

1. Create a free account at [UptimeRobot](https://uptimerobot.com/).
2. Click **+ Add New Monitor**:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `IssueTrack Backend`
   - **URL (or IP):** `https://<your-render-service>.onrender.com/health`
   - **Monitoring Interval:** Every `5 minutes`
3. Click **Create Monitor**.

---

## Default Login Credentials

Running `db_init.py` (or initial deployment build) automatically provisions the default administrator account:

- **Email:** `admin@admin.com`
- **Password:** `admin123`
- **Role:** System Administrator

*You can also self-register as a **Project Manager** to create a new isolated Team Workspace, and then invite employees via the Team Access portal.*

---

## GitHub Webhook Automation

IssueTrack connects directly to GitHub to update tickets automatically through commit messages and pull requests.

### 1. Supported Commit Keywords

| Syntax | Intent | Action in IssueTrack |
|---|---|---|
| `Fixes #1`, `Closes #1`, `Resolves #1`, `Fix #1` | Auto-Close | Transitions issue status ➔ **`Closed`** |
| `Working on #1`, `WIP #1`, `Refs #1`, `#1` | In Progress | Transitions issue status ➔ **`In Progress`** |

### 2. Setting Up in GitHub
1. In your GitHub repository, go to **Settings** ➔ **Webhooks** ➔ **Add webhook**.
2. **Payload URL:**
   - Dedicated Project webhook: `https://<your-render-url>/api/webhooks/github/<webhook_token>` *(found in Project Details ➔ Webhook Config)*
   - Or Global webhook: `https://<your-render-url>/api/webhooks/github`
3. **Content type:** `application/json`
4. **Secret:** Your project's Webhook Secret
5. **Events:** Select `Pushes` and `Pull requests`
6. Click **Add webhook**. GitHub will send a `ping` handshake which IssueTrack verifies with `200 OK`.

### 3. Local Webhook Simulator (Offline Testing)
Test your webhook integration locally without pushing commits to GitHub:
```bash
# Simulate fixing issue #1
python backend/scripts/simulate_webhook.py --issue 1 --action fix

# Simulate WIP progress on issue #1
python backend/scripts/simulate_webhook.py --issue 1 --action wip --author "Samar Dev"

# Simulate a merged Pull Request resolving issue #1
python backend/scripts/simulate_webhook.py --type pull_request --issue 1 --merged
```

---

## API Endpoints Summary

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/health` | UptimeRobot keep-alive health check | Public |
| `POST` | `/api/auth/register` | Register Project Manager & create new team | Public |
| `POST` | `/api/auth/login` | Email/password login & receive JWT token | Public |
| `POST` | `/api/auth/team-login` | Direct employee login with Team ID, Name & Email | Public |
| `POST` | `/api/auth/logout` | Revoke JWT token | Authenticated |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Authenticated |
| `GET/POST` | `/api/users` | List or create team members | Manager/Admin |
| `GET/POST` | `/api/projects` | List or create projects | Authenticated |
| `GET/POST` | `/api/issues` | List, filter, search, or create issues | Authenticated |
| `PATCH` | `/api/issues/<id>/status` | Update issue status (`open`, `in_progress`, etc.) | Authenticated |
| `GET/POST` | `/api/comments/issue/<id>` | Fetch or add comments on an issue | Authenticated |
| `GET` | `/api/dashboard` | Dashboard metrics & analytics | Authenticated |
| `GET` | `/api/reports/export-pdf/<type>` | Generate & download PDF report | Authenticated |
| `POST` | `/api/webhooks/github/<token>` | Ingress endpoint for GitHub Webhook events | HMAC Verified |
| `GET` | `/api/webhooks/events/<issue_id>` | Fetch linked commits/PR history for an issue | Authenticated |

---

## Running Tests

Run the full automated backend test suite (unit tests across all modules):

```bash
cd backend
python -m unittest test_app.py
```

---

## License

This project is licensed under the [MIT License](LICENSE).
