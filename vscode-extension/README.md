# Supymem - AI Knowledge Agent for VS Code

Access your team's collective knowledge, decisions, and context right in your editor.

![Supymem](resources/icon.svg)

## Features

### 🧠 Ask the Knowledge Agent
Query your team's knowledge base using natural language. The agent searches through commits, PRs, issues, Slack conversations, and stored knowledge to find relevant answers.

**Shortcut:** `Cmd+Shift+K` (Mac) / `Ctrl+Shift+K` (Windows/Linux)

### 📋 Why Was This Decided?
Select code or open a file and ask "Why was this decided?" The extension searches for related decisions and provides context with original reasoning.

### 👤 Who Knows About This?
Find team members who are experts on specific files or components based on their contribution history.

### 💾 Store Knowledge
Select important text and save it to the team knowledge base for future reference.

### ✅ Task Management
View your assigned tasks directly in the sidebar, with priority levels and status indicators.

### 📊 Team Activity
Stay updated with recent team activity including commits, PRs, and code reviews.

## Sidebar Views

The extension adds a Supymem icon to your activity bar with three views:

- **My Tasks**: Your assigned tasks with priority and status
- **Recent Decisions**: Latest team decisions with importance levels
- **Team Activity**: Real-time feed of team commits, PRs, and reviews

## Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `Supymem: Ask Knowledge Agent` | Query the AI agent | `Cmd+Shift+K` |
| `Supymem: Why was this decided?` | Get decision context | - |
| `Supymem: Who knows about this?` | Find file experts | - |
| `Supymem: Store as Knowledge` | Save selected text | - |
| `Supymem: View Decisions` | Browse all decisions | - |
| `Supymem: My Tasks` | Refresh tasks view | - |

## Configuration

Open Settings (`Cmd+,`) and search for "Supymem":

| Setting | Default | Description |
|---------|---------|-------------|
| `supymem.apiUrl` | `http://localhost:8000` | Supymem backend API URL |
| `supymem.teamId` | `default` | Your team identifier |
| `supymem.username` | `` | Your username for activity tracking |

## Requirements

- Supymem backend running (default: `http://localhost:8000`)
- Team configured with GitHub webhook integration

## Getting Started

1. Install the extension
2. Configure your API URL in settings
3. Set your team ID and username
4. Use `Cmd+Shift+K` to ask your first question!

## Example Queries

- "What's our deployment process?"
- "Why did we choose PostgreSQL?"
- "How does authentication work?"
- "What decisions were made about the API?"
- "Who should I ask about the payment system?"

## Privacy

All queries are sent to your configured Supymem backend. If running locally with Ollama, your code and questions never leave your infrastructure.

## Issues & Feedback

Report issues or request features on the [GitHub repository](https://github.com/your-org/supymem).

