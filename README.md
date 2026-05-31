# CodeArena — Personal Interview Prep OS

> Stop using Excel sheets for interview prep.

CodeArena centralizes everything — problems from any platform, your solutions, AI feedback, and progress tracking — into one intelligent system that actually helps you improve.

🔗 **Live Demo**: https://codearena-frontend-lovat.vercel.app

## What makes this different from LeetCode

LeetCode tells you pass or fail. CodeArena tells you:
- **Why** your code failed
- **What pattern** of mistake you keep repeating
- **How** your quality is trending over time
- **Where** to focus next based on weak topics

## Features

- 🐳 **Docker sandboxed code execution** — C++, JS, Java run in isolated containers with memory limits, CPU caps, and timeout protection. Built from scratch, no third party judge.
- 🤖 **AI code review** — Every submission gets analyzed by LLaMA via Groq. Verdict-aware prompts — WA gets bug-finding focus, TLE gets algorithm optimization focus.
- 🎤 **AI Interviewer Mode** — After submitting, an AI asks follow-up interview questions about your code. Practice explaining your thinking under pressure.
- 📦 **Personal Vault** — Save problems from any platform (LeetCode, Codeforces, etc) with your solution, notes, and AI hints.
- 📊 **Progress Dashboard** — GitHub-style heatmap, topic radar chart, code quality trend line, streak tracking.
- 🔍 **Pattern Detection** — AI tracks recurring mistakes across submissions. Off-by-one errors, missed edge cases — detected automatically.
- 💡 **Progressive Hints** — 3-level hint system that guides without spoiling.
- 📄 **PDF Export** — Download your progress report to show interviewers.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Monaco Editor |
| Backend | Node.js, Express |
| Database | MongoDB Atlas |
| Auth | JWT |
| AI | Groq (LLaMA 3.3 70B) |
| Code Execution | Docker (local), Judge0 (production) |
| Deployment | Vercel (frontend), Render (backend) |

## Architecture Highlights

**Sandboxed Code Execution**
User code runs in Docker containers with `--network none`, `--memory=128m`, `--cpus=0.5`, read-only filesystem, and ulimit protections. Prevents fork bombs, infinite loops, and filesystem access.

**Async AI Pipeline**
Submissions return immediately with a verdict. AI analysis runs in the background using Groq's LLaMA model. Frontend polls for completion. If AI returns malformed JSON, the system sends the validation error back and asks the model to self-correct.

**Verdict-Aware Prompts**
- AC → code quality and optimization review
- WA → logical bug detection
- TLE → complexity analysis and algorithm suggestions
- CE → compilation error explanation

## Running Locally

```bash
# Clone both repos
git clone https://github.com/unfitcoder101/codearena-backend
git clone https://github.com/unfitcoder101/codearena-frontend

# Backend
cd codearena-backend
npm install
# Add .env file (see .env.example)
npm run dev

# Frontend
cd codearena-frontend
npm install
npm run dev
```

**Required environment variables:**

PORT=4000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret
GROQ_API_KEY=your_groq_key
FRONTEND_URL=http://localhost:5173

## Author

Built by Harshvardhan Kasliwal
