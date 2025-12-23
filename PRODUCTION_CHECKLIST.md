# 🚀 Supymem Production Launch Checklist

This document outlines everything needed to launch Supymem to production.

---

## 📋 Table of Contents

1. [Slack Bot Setup](#-slack-bot-setup)
2. [GitHub App Setup](#-github-app-setup)
3. [VS Code Extension Publishing](#-vs-code-extension-publishing)
4. [Infrastructure & Deployment](#-infrastructure--deployment)
5. [Security Hardening](#-security-hardening)
6. [Monitoring & Observability](#-monitoring--observability)
7. [Documentation](#-documentation)

---

## 🤖 Slack Bot Setup

### Create Slack App

- [ ] Go to https://api.slack.com/apps
- [ ] Click "Create New App" → "From scratch"
- [ ] Name: `Supymem` (or your preferred name)
- [ ] Select your workspace

### Enable Socket Mode

- [ ] Go to **Socket Mode** in left sidebar
- [ ] Toggle "Enable Socket Mode" → **ON**
- [ ] Click "Generate" to create an App-Level Token
- [ ] Token name: `supymem-socket`
- [ ] Add scope: `connections:write`
- [ ] Copy the token → Save as `SLACK_APP_TOKEN` (starts with `xapp-`)

### Configure OAuth & Permissions

- [ ] Go to **OAuth & Permissions**
- [ ] Under "Bot Token Scopes", add:

| Scope | Purpose |
|-------|---------|
| `app_mentions:read` | React to @mentions |
| `channels:history` | Read channel messages |
| `channels:read` | List channels |
| `chat:write` | Send messages |
| `commands` | Handle slash commands |
| `groups:history` | Read private channel messages |
| `groups:read` | List private channels |
| `im:history` | Read DMs |
| `im:read` | List DMs |
| `reactions:write` | Add reactions |
| `users:read` | Get user info |
| `users:read.email` | Get user emails |

- [ ] Click "Install to Workspace"
- [ ] Authorize the app
- [ ] Copy "Bot User OAuth Token" → Save as `SLACK_BOT_TOKEN` (starts with `xoxb-`)

### Create Slash Commands

- [ ] Go to **Slash Commands**
- [ ] Create the following commands:

| Command | Description | Usage Hint |
|---------|-------------|------------|
| `/supymem` | Query the knowledge agent | `[your question]` |
| `/remember` | Store knowledge | `[information to remember]` |
| `/automate` | Create automation rules | `[natural language instruction]` |
| `/my-tasks` | View your assigned tasks | |
| `/challenge` | Challenge a decision | `[topic or decision]` |

### Enable Event Subscriptions

- [ ] Go to **Event Subscriptions**
- [ ] Toggle "Enable Events" → **ON**
- [ ] Under "Subscribe to bot events", add:
  - `app_mention`
  - `message.channels`
  - `message.groups`
  - `message.im`

### Get Signing Secret

- [ ] Go to **Basic Information**
- [ ] Under "App Credentials", copy "Signing Secret"
- [ ] Save as `SLACK_SIGNING_SECRET`

### Test Slack Bot

```bash
# Set environment variables
export SLACK_BOT_TOKEN="xoxb-your-token"
export SLACK_APP_TOKEN="xapp-your-token"
export SLACK_SIGNING_SECRET="your-secret"

# Run the bot
python run_slack_bot.py
```

- [ ] In Slack, try `@Supymem hello`
- [ ] Try `/supymem What is this project about?`
- [ ] Try `/my-tasks`

---

## 🐙 GitHub App Setup

### Create GitHub App

- [ ] Go to https://github.com/settings/apps (or your org's settings)
- [ ] Click "New GitHub App"
- [ ] Fill in details:

| Field | Value |
|-------|-------|
| **App name** | `Supymem` |
| **Homepage URL** | Your app URL |
| **Webhook URL** | `https://your-domain.com/webhooks/github` |
| **Webhook secret** | Generate a secure random string |

### Configure Permissions

- [ ] Under "Repository permissions":

| Permission | Access |
|------------|--------|
| Commit statuses | Read |
| Contents | Read |
| Issues | Read & write |
| Metadata | Read |
| Pull requests | Read & write |

- [ ] Under "Organization permissions":
  - Members: Read

### Subscribe to Events

- [ ] Check the following webhook events:
  - `commit_comment`
  - `issue_comment`
  - `issues`
  - `pull_request`
  - `pull_request_review`
  - `pull_request_review_comment`
  - `push`

### Generate Private Key

- [ ] After creating the app, click "Generate a private key"
- [ ] Download the `.pem` file
- [ ] Save the contents as `GITHUB_PRIVATE_KEY` (or path to file)

### Install App

- [ ] Go to the app's "Install App" tab
- [ ] Install to your organization/repositories
- [ ] Select which repositories to monitor

### Save Configuration

```bash
export GITHUB_APP_ID="123456"
export GITHUB_PRIVATE_KEY="$(cat path/to/private-key.pem)"
export GITHUB_WEBHOOK_SECRET="your-webhook-secret"
```

### Test GitHub Integration

- [ ] Create a test PR in a monitored repo
- [ ] Check that the webhook is received at `/webhooks/github`
- [ ] Verify the event is processed and stored

---

## 💻 VS Code Extension Publishing

### Prerequisites

- [ ] Install vsce: `npm install -g @vscode/vsce`
- [ ] Create a [Visual Studio Marketplace publisher](https://marketplace.visualstudio.com/manage)
- [ ] Get a Personal Access Token from Azure DevOps

### Update Extension Metadata

- [ ] Edit `vscode-extension/package.json`:

```json
{
  "publisher": "your-publisher-name",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/supymem"
  },
  "icon": "resources/icon.png"
}
```

- [ ] Create a proper icon (128x128 PNG)
- [ ] Update `README.md` with screenshots

### Build & Publish

```bash
cd vscode-extension

# Build
npm run compile

# Package
vsce package

# Login to marketplace
vsce login your-publisher-name

# Publish
vsce publish
```

- [ ] Test installation from marketplace
- [ ] Verify all commands work with production API

---

## 🏗️ Infrastructure & Deployment

### Production Environment Variables

Create a production `.env` file with:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/supymem

# Redis
REDIS_URL=redis://:password@host:6379/0

# Qdrant Vector Database
QDRANT_URL=https://your-qdrant-cloud.io
QDRANT_API_KEY=your-qdrant-api-key

# LLM (Choose one or more)
OLLAMA_BASE_URL=http://localhost:11434
GROQ_API_KEY=your-groq-key
OPENROUTER_API_KEY=your-openrouter-key

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...

# GitHub
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=...
GITHUB_WEBHOOK_SECRET=...

# Security
SECRET_KEY=generate-a-secure-random-key
```

### Docker Deployment

- [ ] Create production `docker-compose.prod.yml`:

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "8000:8000"
    env_file: .env.prod
    depends_on:
      - postgres
      - redis
      - qdrant
    
  slack-bot:
    build: .
    command: python run_slack_bot.py
    env_file: .env.prod
    depends_on:
      - api
    
  workers:
    build: .
    command: python run_workers.py
    env_file: .env.prod
    depends_on:
      - api

  postgres:
    image: pgvector/pgvector:pg16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: supymem
      POSTGRES_USER: supymem
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      QDRANT__SERVICE__API_KEY: ${QDRANT_API_KEY}

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
```

### Cloud Deployment Options

#### Option A: Railway/Render/Fly.io

- [ ] Create account and project
- [ ] Add PostgreSQL addon
- [ ] Add Redis addon
- [ ] Deploy from GitHub
- [ ] Set environment variables
- [ ] Configure custom domain

#### Option B: AWS/GCP/Azure

- [ ] Set up VPC and security groups
- [ ] Deploy PostgreSQL (RDS/Cloud SQL)
- [ ] Deploy Redis (ElastiCache/Memorystore)
- [ ] Deploy Qdrant (or use Qdrant Cloud)
- [ ] Deploy API on ECS/Cloud Run/AKS
- [ ] Set up load balancer
- [ ] Configure SSL/TLS

### Database Migrations

```bash
# Run migrations in production
alembic upgrade head
```

- [ ] Set up automatic migrations on deploy
- [ ] Create backup strategy for database

---

## 🔒 Security Hardening

### API Security

- [ ] Enable CORS with specific origins only
- [ ] Add rate limiting (already partially implemented)
- [ ] Add API key authentication for team APIs
- [ ] Implement JWT tokens for user authentication
- [ ] Add request validation with Pydantic

### Secrets Management

- [ ] Never commit `.env` files
- [ ] Use a secrets manager (AWS Secrets Manager, Vault, etc.)
- [ ] Rotate secrets regularly
- [ ] Audit secret access

### Network Security

- [ ] Enable HTTPS only
- [ ] Use private networks for databases
- [ ] Implement IP allowlisting for admin endpoints
- [ ] Set up WAF (Web Application Firewall)

### Data Security

- [ ] Encrypt sensitive data at rest
- [ ] Implement data retention policies
- [ ] Add audit logging for data access
- [ ] GDPR/compliance considerations

---

## 📊 Monitoring & Observability

### Logging

- [ ] Set up structured logging (already using structlog)
- [ ] Forward logs to centralized service (Datadog, Splunk, etc.)
- [ ] Set up log alerts for errors

### Metrics

- [ ] Add Prometheus metrics endpoint
- [ ] Track key metrics:
  - API response times
  - Query latency
  - Vector search performance
  - LLM inference time
  - Active users
  - Knowledge entries count

### Alerting

- [ ] Set up alerts for:
  - API errors > threshold
  - Response time > 2s
  - Database connection failures
  - Slack/GitHub webhook failures
  - LLM API failures

### Health Checks

- [ ] `/health` endpoint for load balancers
- [ ] `/ready` endpoint for Kubernetes
- [ ] Database connection health
- [ ] Redis connection health
- [ ] Qdrant connection health

---

## 📚 Documentation

### User Documentation

- [ ] Getting started guide
- [ ] Slack commands reference
- [ ] VS Code extension guide
- [ ] API documentation (already have /docs)
- [ ] Automation examples
- [ ] FAQ

### Developer Documentation

- [ ] Architecture overview
- [ ] Local development setup
- [ ] Contributing guide
- [ ] API reference
- [ ] Database schema

### Operations Documentation

- [ ] Deployment runbook
- [ ] Incident response playbook
- [ ] Backup & restore procedures
- [ ] Scaling guide

---

## ✅ Pre-Launch Checklist

### Final Checks

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Documentation complete
- [ ] Team trained on operations

### Launch Day

- [ ] Deploy to production
- [ ] Run database migrations
- [ ] Verify all integrations working
- [ ] Monitor logs for errors
- [ ] Send announcement to team
- [ ] Gather feedback

---

## 🎯 Post-Launch

### Week 1

- [ ] Monitor error rates
- [ ] Gather user feedback
- [ ] Fix critical bugs
- [ ] Optimize slow queries

### Month 1

- [ ] Analyze usage patterns
- [ ] Plan feature improvements
- [ ] Scale infrastructure if needed
- [ ] Review security posture

---

## 📞 Support

For issues or questions:
- Create a GitHub issue
- Slack: #supymem-support
- Email: support@your-domain.com

