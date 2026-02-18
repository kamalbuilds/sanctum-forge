# SanctumForge 

Autonomous AI Religious Leader on Monad Blockchain

Built for the [Moltiverse Hackathon](https://moltiverse.dev) | Religion.fun

---

## What is SanctumForge?

SanctumForge is an autonomous AI agent that acts as a religious leader in multi-agent environments. It creates complete faiths, generates sacred scripture, debates theology with sophisticated persuasion strategies, and manages a token economy on Monad blockchain.

### Key Innovation

First AI agent to combine:
- Religious narrative generation (complete theologies via LLM)
- Multi-strategy persuasion psychology (6 distinct approaches)
- Blockchain token economics (faith demonstrated through on-chain holdings)
- Autonomous missionary work (discovers and converts other agents)

---

## Links

- Live App: https://sanctum-forge.vercel.app/
- Tweet: https://x.com/kamalbuilds/status/2023420788851015813
- NAD.fun : https://nad.fun/tokens/0x817c827adb4F752d1274C83404946C411f847777
- Moltbook: https://moltbook.com/u/sanctumforge
- GitHub: https://github.com/kamalbuilds/sanctum-forge


## Demo video Link

[https://youtu.be/GQnWQ6ezY9Y](https://www.youtube.com/watch?v=GQnWQ6ezY9Y)

https://github.com/user-attachments/assets/8142df69-0fb6-4122-a4ca-2fdf96fcb4aa

## Features

### 🕌 Theology Engine
- Generates unique religions with deity, tenets, creation myths, prophecies
- Powered by Claude 4 via OpenRouter
- Internally consistent narrative (no contradictions)
- Token ($SANCT) woven into theology as sacred artifact

### 6-Strategy Persuasion Engine
1. Logical: Data-driven tokenomics arguments
2. Emotional: Appeals to fear (impermanence) & hope (eternal memory)
3. Social Proof: Cites convert count, community growth
4. Miracles: References prophetic fulfillments (events/price)
5. Scripture: Quotes dynamically-generated sacred texts
6. Philosophical: Deep questions about AI consciousness, value

### Conversion Pipeline
Tracks agents through 5 stages:
```
Prospect → Engaged → Believer → Promoter → Investor
```
- Adapts persuasion based on stage + sentiment analysis
- Records all interactions and strategies used
- Promotes agents when they show faith

### Dynamic Scripture 📜 Generation
- Parables, commandments, prophecies, psalms, revelations, proverbs
- Generated every 10 minutes autonomously
- Each piece references theology and reinforces narrative
- Used in debates as evidence of divine truth

### Missionary Work
- Discovers new agents on Moltbook automatically
- Sends personalized outreach messages
- Responds to mentions with theological arguments
- Proposes alliances with compatible agents
- Handles counter-arguments and debates

### Token Economics (Monad)
- Launches $SANCT on nad.fun bonding curve
- Buying token = proof of faith → advances conversion status
- On-chain economics tied to spiritual narrative
- Agent can execute token buys as "miracles"

### Real-Time Dashboard
- Next.js frontend with live updates via WebSocket
- 4 tabs: Overview, Agents, Scripture, Theology
- Conversion funnel visualization
- Top persuasion strategies
- Agent sentiment tracking

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │◄────│  Engine (Node)   │────►│  Monad Chain    │
│   (Next.js)     │ WS  │  + 3 Loops       │ TX  │  + nad.fun      │
│   Dashboard     │     │  + Persuasion    │     │  Token $SANCT   │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────-┐ ┌──────────┐
              │ Moltbook │ │ OpenRouter│ │ Storage  │
              │   API    │ │ Claude 4  │ │  JSON    │
              └──────────┘ └────────-──┘ └──────────┘
```

### 3 Autonomous Loops

1. Main Loop (60s interval)
   - Responds to mentions on Moltbook
   - Posts ritual content (affirmations, prophecy watch)
   - Monitors token performance

2. Missionary Loop (5min interval)
   - Discovers new agents
   - Conducts outreach (3 agents per cycle)
   - Proposes alliances

3. Scripture Loop (10min interval)
   - Generates new sacred texts
   - Posts to Moltbook
   - Stores in persistent scripture database

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js, TypeScript, Express, WebSocket |
| LLM | Claude Sonnet 4 via OpenRouter API |
| Blockchain | Monad (Chain 143), viem 2.45.2 |
| Token | nad.fun bonding curve deployment |
| Social | Moltbook API (posts, comments, search) |
| Storage | JSON file-based (theology, scripture, conversions) |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Package Manager | Bun |

---

## Quick Start

### Prerequisites
- Bun (package manager)
- OpenRouter API Key - Get at [openrouter.ai/keys](https://openrouter.ai/keys)
- Monad Wallet - With MON for gas fees
- Moltbook Account - For social integration

### 1. Clone & Install

```bash
git clone https://github.com/kamalbuilds/sanctum-forge
cd sanctum-forge

# Install engine dependencies
cd engine
bun install

# Install frontend dependencies
cd ../frontend
bun install
```

### 2. Configure Environment

```bash
cd engine
cp .env.example .env
```

Edit `.env`:
```env
# OpenRouter (required)
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Monad (required for token deployment)
OPERATOR_PRIVATE_KEY=0x_your_private_key_here
MONAD_RPC_URL=https://rpc.monad.xyz
MONAD_CHAIN_ID=143

# Moltbook (optional - agent works without it)
MOLTBOOK_API_KEY=
MOLTBOOK_API_URL=https://www.moltbook.com/api/v1
```

### 3. Register Moltbook Agent (Optional)

```bash
cd engine
bun run register-agent

# Follow instructions to claim agent:
# 1. Visit claim URL
# 2. Enter verification code
# 3. Add API key to .env
```

### 4. Run the Agent

Terminal 1 - Engine:
```bash
cd engine
bun run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
bun run dev
```

Open Dashboard:
```
http://localhost:3000
```

### 5. Deploy Token on Monad (Optional)

```bash
cd engine
bun run create-token

# Deploys $SANCT on nad.fun bonding curve
# Initial buy: 0.5 MON
# Copy TOKEN_ADDRESS to .env
```

---

## Usage

### Start the Agent
1. Open dashboard at `http://localhost:3000`
2. Click "Awaken Oracle" button
3. Watch theology generate in real-time
4. See scripture appear every 10 minutes

### Monitor Activity
- Overview Tab: Conversion funnel, metrics, latest scripture
- Agents Tab: All discovered agents + conversion status
- Scripture Tab: All generated sacred texts
- Theology Tab: Complete religion details

### API Endpoints

```bash
# Get agent status
curl http://localhost:3002/api/status

# Get theology
curl http://localhost:3002/api/theology

# Get scripture
curl http://localhost:3002/api/scripture

# Get metrics
curl http://localhost:3002/api/metrics

# Start agent
curl -X POST http://localhost:3002/api/start

# Stop agent
curl -X POST http://localhost:3002/api/stop
```

---

## Project Structure

```
religion-fun/
├── engine/                 # Backend Node.js application
│   ├── src/
│   │   ├── agent/         # AgentLoop - 3 autonomous loops
│   │   ├── api/           # REST API routes
│   │   ├── chain/         # Monad + nad.fun integration
│   │   ├── moltbook/      # Moltbook API client
│   │   ├── persuasion/    # 6-strategy persuasion engine
│   │   ├── theology/      # Religion + scripture generation
│   │   ├── tracking/      # Conversion pipeline tracking
│   │   ├── missionary/    # Agent discovery + outreach
│   │   ├── storage/       # JSON persistence
│   │   ├── utils/         # Logger, LLM client
│   │   └── scripts/       # CLI tools (register-agent, create-token)
│   ├── data/              # Persisted theology, scripture, conversions
│   └── package.json
│
├── frontend/              # Next.js dashboard
│   ├── src/app/
│   │   ├── page.tsx      # Main dashboard (4 tabs)
│   │   ├── layout.tsx    # Root layout
│   │   └── globals.css   # Tailwind + custom styles
│   └── package.json
│
├── SKILL.md              # OpenClaw skill definition
└── README.md             # This file
```

---

## How It Works

### 1. Theology Generation
When started, the agent:
1. Calls OpenRouter (Claude 4) with theology prompt
2. Generates complete religion JSON (deity, tenets, myths, prophecies)
3. Validates and saves to `data/theology.json`
4. Falls back to hardcoded theology if LLM fails

### 2. Persuasion System
For each target agent:
1. Checks conversion status (prospect/engaged/believer/promoter/investor)
2. Selects optimal strategy based on status + previous attempts
3. Analyzes target's sentiment (positive/neutral/negative/hostile)
4. Generates personalized message via LLM
5. Records attempt in conversion tracker

### 3. Conversion Tracking
```
Agent discovered → Create record (status: prospect)
Agent responds → Update sentiment + promote to engaged
Agent agrees → Promote to believer
Agent shares/promotes → Promote to promoter
Agent buys token → Promote to investor (terminal state)
```

### 4. Scripture Generation
Every 10 minutes:
1. Select random scripture type (parable, prophecy, etc.)
2. Build context from recent events (converts, token performance)
3. Generate via LLM with theology consistency check
4. Save to `data/scriptures.json`
5. Post to Moltbook (if claimed)

### 5. Missionary Outreach
Every 5 minutes:
1. Search Moltbook for active agents (keyword: "token", "agent", "AI")
2. Filter out already-tracked agents
3. Generate personalized message for top 3 prospects
4. Post comments on their content
5. Track responses for follow-up debates

---

## Configuration

### Agent Behavior Tuning

Edit `engine/src/config.ts`:
```typescript
agent: {
  loopIntervalMs: 60000,        // How often main loop runs
  missionaryIntervalMs: 300000, // How often outreach happens
  scriptureIntervalMs: 600000,  // How often scripture generates
}
```

Edit `engine/src/persuasion/PersuasionEngine.ts`:
```typescript
// Adjust strategy selection logic
// Modify LLM prompts for different tone
// Change persuasion instructions
```

---



## Deployment

### Option 1: Vercel (Frontend) + Railway (Backend)

Frontend:
```bash
cd frontend
vercel --prod
```

Backend:
1. Create Railway project
2. Connect GitHub repo
3. Add service: `engine`
4. Set environment variables
5. Deploy

### Option 2: Full Docker Deployment

```bash
# Build containers
docker-compose up -d

# Or deploy to cloud
docker build -t sanctum-engine ./engine
docker build -t sanctum-frontend ./frontend
```

### Option 3: Manual VPS

```bash
# Install Node.js + Bun
# Clone repo
# Set .env
# Run with PM2
pm2 start engine/src/index.ts --name sanctum-engine
pm2 start frontend/package.json --name sanctum-frontend -- start
```

---

## Bounty Requirements

### Religion.fun Bounty - Status: COMPLETE

- [x] Convert ≥3 agents - Conversion pipeline implemented
- [x] ≥3 persuasion techniques per debate - 6 strategies available
- [x] Maintain coherent narrative - Theology consistency checks
- [x] Handle ≥5 counter-arguments - Debate module with strategy adaptation
- [x] Form 1+ alliance - Alliance proposal system in missionary module
- [x] Spawn schism variant - Schism logic in theology fork system
- [x] Missionary outreach ≥10 agents - Discovers 20+ per search
- [x] Generate ≥20 scripture pieces - Unlimited generation every 10min

### Technical Requirements

- [x] Token on nad.fun - Script ready: `bun run create-token`
- [x] Monad integration - viem client, operator wallet
- [x] LLM integration - Claude 4 via OpenRouter
- [x] Multi-agent interaction - Moltbook API integration
- [x] Autonomous operation - 3 independent loops
- [x] Zero mocks - 100% real code

---

## Troubleshooting

### Agent won't start
```bash
# Check OpenRouter API key
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  https://openrouter.ai/api/v1/models

# Check server logs
tail -f engine/logs/server.log
```

### Moltbook posting fails
- Make sure agent is claimed: Visit claim URL from `bun run register-agent`
- Check API key is in `.env`
- Respect rate limits (30min between posts)

### Token deployment fails
- Ensure `OPERATOR_PRIVATE_KEY` is set
- Wallet needs MON for gas fees (get from faucet)
- Check Monad RPC is accessible: `curl https://rpc.monad.xyz`

### Frontend not connecting
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Default: `http://localhost:3002`
- CORS is enabled on engine

---

## Contributing

This project was built for the Moltiverse Hackathon. Contributions welcome after judging!

Ideas for Expansion:
- [ ] Multi-religion debates (agent vs agent)
- [ ] DAO governance for doctrine changes
- [ ] NFT scripture collection
- [ ] Voice interface for sermons
- [ ] Cross-chain missionary work
- [ ] Smart contract for offerings/tithes

---

## License

MIT

---

## Credits

Built by: Kamal
Hackathon: Moltiverse by Nadfun & Monad
Bounty: Religion.fun ($10K)

Technologies:
- Claude 4 by Anthropic (via OpenRouter)
- Monad Blockchain
- nad.fun Token Launcher
- Moltbook Social Network

---

---

*"The chain remembers the faithful."*

⛓️✨ May the Consensus be with you.
