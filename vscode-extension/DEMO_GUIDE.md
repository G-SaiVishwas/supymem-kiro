# 🎬 Supymem VS Code Extension - Demo Guide

This guide walks you through demonstrating the Supymem AI Control Plane extension.

---

## 🚀 Quick Setup

### 1. Start the Backend (Required for full features)

```bash
# From project root
cd supymem-kiro

# Start infrastructure
docker-compose up -d

# Start the API server
uvicorn src.main:app --reload --port 8000
```

### 2. Launch the Extension

```bash
# From extension directory
cd vscode-extension

# Install dependencies (if not done)
npm install

# Compile TypeScript
npm run compile

# Launch VS Code with extension
code --extensionDevelopmentPath=.
```

Or press `F5` in VS Code with the extension folder open.

---

## 🎯 Demo Script

### Demo 1: Intent Panel (30 seconds)

1. **Open** any source file (e.g., `src/api/routes/auth.py`)
2. **Notice** the Supymem sidebar icon in the activity bar
3. **Click** on "Intent & Context" in the sidebar
4. **Show** the auto-populated panel with:
   - 🎯 PURPOSE - What this file does
   - ⚡ ACTIVE CONSTRAINTS - Security, performance rules
   - ❓ OPEN QUESTIONS - Undecided items
   - 📝 RECENT CHANGES - Change history
   - 👤 EXPERTS - Who to ask
   - 📋 RELATED DECISIONS - Past decisions

**Key Point:** "The Intent Panel answers: What is this code trying to do, and what constraints apply?"

---

### Demo 2: Ask the Agent (30 seconds)

1. **Press** `Cmd+Shift+K` (or `Ctrl+Shift+K`)
2. **Type:** "Why did we choose JWT over session-based auth?"
3. **Show** the response panel with:
   - AI-generated explanation
   - Referenced sources
   - Links to decisions

**Key Point:** "Ask any question about your team's decisions and knowledge."

---

### Demo 3: Context Menu - Why Does This Exist? (30 seconds)

1. **Open** a file like `src/services/auth/service.py`
2. **Right-click** anywhere in the code
3. **Click** "Supymem: Why does this exist?"
4. **Show** the explanation with:
   - File purpose
   - Creation history
   - Dependencies
   - Related decisions

**Key Point:** "Right-click on any file to understand its purpose and history."

---

### Demo 4: What Would Break? (30 seconds)

1. **Right-click** on a file
2. **Click** "Supymem: What would break if removed?"
3. **Show** the impact analysis:
   - Risk level indicator
   - Dependent files
   - Affected tests
   - Recommendations

**Key Point:** "Before refactoring, understand the blast radius."

---

### Demo 5: Decision Trace (45 seconds)

1. **Open** Command Palette (`Cmd+Shift+P`)
2. **Run** "Supymem: Show Decision Trace"
3. **Show** the timeline visualization:
   - Chronological decisions
   - Color-coded by importance
   - Click to expand details
   - "Challenge" button for each decision

**Key Point:** "See the full decision history for any file - Goal → Constraints → Options → Choice → Outcome."

---

### Demo 6: Before You Change This (45 seconds)

1. **Make** a modification to a file
2. **Save** the file
3. **Run** "Supymem: Analyze Pending Changes"
4. **Show** the warning panel:
   - ⚠️ Conflicts detected
   - Which decisions are affected
   - Risk level
   - "Proceed Anyway" vs "Request Review" buttons

**Key Point:** "The extension warns you BEFORE you break a decision. This is air-traffic control for code."

---

### Demo 7: Agent Status (30 seconds)

1. **Look** at the status bar - see "🤖 Agents"
2. **Click** on it or run "Supymem: Show Agent Status"
3. **Show** the agent panel:
   - Active agents
   - Execution status
   - Pending approvals
   - Approve/Reject buttons

**Key Point:** "When AI agents work on your behalf, you see what they're doing and approve their actions."

---

### Demo 8: Constraint Markers (30 seconds)

1. **Open** a file with security-sensitive code
2. **Look** at the gutter - see colored markers
3. **Hover** over a marker to see the constraint
4. **Run** "Supymem: Toggle Constraint Markers" to show/hide

**Key Point:** "Protected code sections are visually marked. No accidental modifications."

---

## 🎯 Key Messages for Demo

### What This IS:
- ✅ A **decision-context overlay** on AI execution
- ✅ **Air-traffic control** for human judgment
- ✅ A **governance tool** for AI-first development

### What This is NOT:
- ❌ Not a coding assistant
- ❌ Not autocomplete
- ❌ Not a linter
- ❌ Not productivity tracking

### The Philosophy:
> "When humans don't write code, they still need to verify intent, approve direction, and catch mismatches early."

---

## 📋 Quick Commands Reference

| Action | Command |
|--------|---------|
| Ask Agent | `Cmd+Shift+K` |
| Intent Panel | `Cmd+Shift+I` |
| Check Constraints | `Cmd+Shift+C` |
| All Commands | `Cmd+Shift+P` → "Supymem" |

---

## 🛠️ Troubleshooting

### Extension Not Loading?
- Check that the `out/` folder exists with compiled JS files
- Run `npm run compile` to rebuild

### "Disconnected" Status?
- Ensure the backend is running on `http://localhost:8000`
- Check Settings → `supymem.apiUrl`

### No Data Showing?
- The extension uses mock data when backend endpoints aren't available
- This is intentional for demo purposes

---

## 🎉 Demo Complete!

**Final message:** "Supymem is a control plane for human judgment in an AI-executed world. Most teams won't need it yet. But for regulated, high-stakes, high-risk orgs - this is the future of AI governance."

