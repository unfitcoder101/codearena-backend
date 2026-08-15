
# CodeArena Backend                        
               
> The execution engine, AI pipeline, and API powering CodeArena.                    

🔗 **Live API**: https://codearena-backend-theta.vercel.app                           
🎨 **Frontend Repo**: https://github.com/unfitcoder101/codearena-frontend                                              
🎨 **Live Frontend**: https://codearena-frontend-lovat.vercel.app

---

## What This Backend Does

This is the engine behind CodeArena — handling auth, problem management, sandboxed code execution, async AI analysis, and AI-powered mock interviews.

For the full product story, problem statement, and feature breakdown, see the [frontend README](https://github.com/unfitcoder101/codearena-frontend). This README focuses on the backend's internals.

---

## Core Responsibilities

- **Auth** — JWT + bcrypt, stateless sessions, rate-limited login routes
- **Code Execution** — sandboxed Docker locally, Judge0 API in production
- **AI Analysis Pipeline** — async, verdict-aware, self-correcting via Zod validation
- **AI Interview Mode** — Groq-powered mock interviewer, full conversation persistence
- **Submission Tracking** — every attempt saved with verdict, runtime, and AI feedback
- **Vault** — cross-platform problem storage with AI-generated progressive hints

---

## Architecture

```
Request → Helmet (security headers) → CORS → Rate Limiter → Route
                                                                  │
                       ┌──────────────────────────────────────────┤
                       ▼                                          ▼
                Auth Routes (10 req/15min)              Submission Routes
                       │                                          │
                       ▼                                          ▼
                JWT issue/verify                         Submission Controller
                                                                  │
                                                    ┌─────────────┼─────────────┐
                                                    ▼             ▼             ▼
                                              Save (PENDING)  Run Judge   Fire AI Analyzer
                                                                  │             (async)
                                                                  ▼             │
                                                          runCode() router      ▼
                                                          ├── Docker (local)  Groq LLaMA
                                                          └── Judge0 (prod)   3.3 70B
                                                                  │             │
                                                                  ▼             ▼
                                                          Verdict → User   Zod validate
                                                                              │
                                                                    self-correct if invalid
                                                                              │
                                                                              ▼
                                                                    Analysis saved
```

---

## Sandboxed Execution — Built From Scratch
                  
Local development runs user code inside Docker containers with hard isolation, implemented from scratch — not using an off-the-shelf sandboxing library:
            
```javascript
docker run --rm \
  --network none \
  --memory=128m \
  --cpus=0.5 \
  --ulimit nproc=50 \
  --read-only \
  --tmpfs /tmp \
  ...
```

Combined with a 5-second timeout via `Promise.race` and a 64KB output cap, this stops fork bombs, memory exhaustion, network exfiltration, and infinite-loop hangs before they ever touch the host.

**Production note:** Render's free tier doesn't support Docker-in-Docker, so production execution routes through Judge0's API instead. The sandbox logic above still runs in local development and is the reference implementation — see [`utils/runCode.js`](./server/utils/runCode.js) and [`utils/runners/`](./server/utils/runners/).

---

## AI Pipeline Internals

Every submission triggers a non-blocking analysis job:

1. Verdict returned to the user immediately — no waiting on AI
2. Background job builds a **verdict-aware prompt** (different instructions for AC/WA/TLE/CE)
3. Groq's LLaMA 3.3 70B generates structured feedback
4. Response validated against a Zod schema
5. **Self-correction loop**: if validation fails, the error is sent back to the model with the original response, asking it to fix the specific issue
6. Final result saved to the `Analysis` collection; frontend polls every 3s until ready

See [`services/ai/`](./server/services/ai/) — `prompt.builder.js`, `llm.client.js`, `response.parser.js`, `analyzer.runner.js`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + Express |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT + bcrypt |
| AI | Groq SDK (LLaMA 3.3 70B) |
| Validation | Zod |
| Code Execution | Docker (local) / Judge0 API (production) |
| Security | Helmet, express-rate-limit |
| Deployment | Vercel (serverless) |

---

## API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/register` | POST | No | Create account |
| `/api/auth/login` | POST | No (rate-limited) | Get JWT |
| `/api/problems` | GET | No | List all problems |
| `/api/problems/:id` | GET | No | Get single problem |
| `/api/submissions` | POST | Yes | Submit code for judging |
| `/api/vault` | GET/POST | Yes | Manage personal problem vault |
| `/api/analysis/:submissionId` | GET | Yes | Poll AI analysis status |
| `/api/interviews` | POST | Yes | Start AI interview session |
| `/api/dashboard` | GET | Yes | Progress stats, heatmap, radar data |

---

## Running Locally

```bash
git clone https://github.com/unfitcoder101/codearena-backend
cd codearena-backend
npm install
cp .env.example .env
npm run dev
```

**Required .env values:**
```
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/codearena
JWT_SECRET=your_long_secret
GROQ_API_KEY=get_free_at_console.groq.com
FRONTEND_URL=http://localhost:5173
```

Docker Desktop must be running for local sandboxed execution to work. In production (Vercel), execution automatically routes through Judge0 instead.

---

## Deployment Notes

Deployed on Vercel as a serverless function (`server/api.js` wraps the Express app with a cached MongoDB connection, since serverless functions don't keep persistent connections alive between invocations).

```javascript
let isConnected = false;
module.exports = async (req, res) => {
    if (!isConnected) {
        await connectDB();
        isConnected = true;
    }
    return app(req, res);
};
```

---

## What I'd Build Next

- WebSocket push for AI analysis instead of polling
- Move production execution to a self-hosted Docker sandbox on EC2
- Spaced repetition scheduling for Vault problems
- Timed mock interview sessions with scoring

---

## Author

Built by **Harshvardhan Kasliwal**
[LinkedIn](https://www.linkedin.com/in/harshvardhan-kasliwal-675207229/) · [GitHub](https://github.com/unfitcoder101)
