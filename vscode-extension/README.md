# 🎯 Supymem - AI Decision Control Plane for VS Code

> **Not a coding assistant. Not autocomplete. Not a linter.**  
> **A decision-context overlay for AI-first development.**

Supymem is an AI Control Plane for software development teams. When humans don't write code anymore, they still need to:
- ✅ Verify intent
- ✅ Approve direction  
- ✅ Catch mismatches early
- ✅ Supervise AI execution

This extension is **air-traffic control for human judgment in an AI-executed world.**

![Supymem](resources/icon.svg)

---

## 🚀 Core Features

### 1. 🎯 Intent Panel (Primary Surface)

A persistent sidebar that answers:
- **What is this code trying to do?**
- **Why does this exist?**
- **What constraints are active right now?**

**Contents:**
- Current high-level purpose
- Approved constraints (performance, cost, security)
- Open questions not yet decided
- Recent intent changes
- File experts/owners
- Related decisions

**Shortcut:** `Cmd+Shift+I` / `Ctrl+Shift+I`

---

### 2. ⚠️ "Before You Change This" Warnings

**The strongest feature.** When you modify files, the extension surfaces:
- Decisions this change contradicts
- Dependencies that will be affected
- Constraints you are violating

**Example:**
> "This change conflicts with the 'low-latency over cost' decision approved on March 12."

**Command:** `Supymem: Analyze Pending Changes`

---

### 3. 📜 Decision Trace Viewer

A timeline visualization showing:
```
Goal → Constraints → Options → Chosen path → Outcome
```

Attached to files, services, and system behaviors. Lets you answer:
> "Are we still aligned with why this exists?"

**Command:** `Supymem: Show Decision Trace`

---

### 4. 💬 "Ask Why" Inline Queries

Right-click context menu options:
- **"Why does this exist?"** - Pull original intent, approval chain, linked outcomes
- **"What would break if removed?"** - Analyze dependencies and impact
- **"Who knows about this?"** - Find file experts based on contribution history

---

### 5. 🤖 Agent Status Monitor

A status bar + panel showing:
- Active AI agents
- What they're executing
- Where human approval is required

Replaces "Is CI running?" and "Who is working on this?"

**Command:** `Supymem: Show Agent Status`

---

### 6. 🔒 Constraint Markers (Red Lines & Locks)

Visual markers in the gutter for:
- Non-negotiable constraints
- Regulated components
- "Do not touch without approval" zones

**Example:** 🔒 *"Payment logic — CFO approval required"*

**Toggle:** `Supymem: Toggle Constraint Markers`

---

## 📋 All Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `Supymem: Ask Knowledge Agent` | Query the AI agent | `Cmd+Shift+K` |
| `Supymem: Show Intent Panel` | Open intent sidebar | `Cmd+Shift+I` |
| `Supymem: Check Active Constraints` | View constraints | `Cmd+Shift+C` |
| `Supymem: Show Decision Trace` | Timeline of decisions | - |
| `Supymem: Analyze Pending Changes` | Pre-commit check | - |
| `Supymem: Why does this exist?` | Explain file purpose | - |
| `Supymem: What would break if removed?` | Impact analysis | - |
| `Supymem: Who knows about this?` | Find file experts | - |
| `Supymem: Why was this decided?` | Decision context | - |
| `Supymem: Store as Knowledge` | Save selection | - |
| `Supymem: Show Agent Status` | AI agent monitor | - |
| `Supymem: Toggle Constraint Markers` | Gutter icons | - |

---

## 🖼️ Sidebar Views

The extension adds a **Supymem** icon to your activity bar with:

| View | Description |
|------|-------------|
| **Intent & Context** | WebView showing file purpose, constraints, experts |
| **My Tasks** | Your assigned tasks with priority |
| **Decisions** | Recent team decisions |
| **Team Activity** | Real-time commit/PR feed |
| **Agent Status** | AI agent execution status |

---

## ⚙️ Configuration

Open Settings (`Cmd+,`) → Search "Supymem":

| Setting | Default | Description |
|---------|---------|-------------|
| `supymem.apiUrl` | `http://localhost:8000` | Backend API URL |
| `supymem.teamId` | `default` | Your team identifier |
| `supymem.username` | `` | Your username |
| `supymem.showConstraintMarkers` | `true` | Show gutter decorations |
| `supymem.enableChangeWarnings` | `true` | Enable pre-commit warnings |
| `supymem.autoRefreshInterval` | `60` | Refresh interval (seconds) |

---

## 🎯 What This Extension Does NOT Do

We deliberately avoid:

| ❌ NOT This | ✅ This Instead |
|-------------|-----------------|
| Track time | Track decisions |
| Measure productivity | Track impact |
| Rank humans | Identify experts |
| Suggest "best practices" | Surface YOUR team's decisions |
| Autocomplete code | Provide decision context |

**This is coordination, not assistance.**

---

## 🛠️ Requirements

- **Supymem Backend** running (default: `http://localhost:8000`)
- Team configured with GitHub/Slack integration (optional)
- Ollama with `llama3.2` model (for AI features)

---

## 🚀 Quick Start

1. **Install** the extension
2. **Configure** your API URL in settings:
   ```json
   {
     "supymem.apiUrl": "http://localhost:8000",
     "supymem.teamId": "your-team",
     "supymem.username": "your-name"
   }
   ```
3. **Press** `Cmd+Shift+I` to open the Intent Panel
4. **Open** a file to see its context automatically

---

## 💡 Example Use Cases

### 1. New Team Member Onboarding
> "Why did we choose PostgreSQL over MongoDB?"

The extension surfaces the original decision, reasoning, and alternatives considered.

### 2. Pre-Merge Check
Before merging a PR, run `Analyze Pending Changes` to see if your changes conflict with any approved decisions.

### 3. Code Review Context
Right-click → "Why does this exist?" to understand the purpose before suggesting changes.

### 4. Impact Assessment
Right-click → "What would break if removed?" before refactoring.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    VS CODE EXTENSION                      │
├──────────────────────────────────────────────────────────┤
│  Intent Panel  │  Decision Trace  │  Change Warnings     │
│  Agent Monitor │  Constraint Marks │  Context Menus      │
├──────────────────────────────────────────────────────────┤
│                     API CLIENT                            │
├──────────────────────────────────────────────────────────┤
│                  SUPYMEM BACKEND                          │
│  Decisions │ Knowledge │ Constraints │ Impact Analysis   │
└──────────────────────────────────────────────────────────┘
```

---

## 🤝 Philosophy

> The VS Code extension is a **control plane for human judgment in an AI-executed world**.

That's not a feature. That's a philosophy.

Most teams will reject it. A few regulated, high-risk, high-stakes orgs need it.

---

## 📄 License

MIT

---

## 🔗 Links

- [Backend Documentation](https://github.com/your-org/supymem)
- [Report Issues](https://github.com/your-org/supymem/issues)

---

Built with ❤️ for teams who value **decisions over code**.
