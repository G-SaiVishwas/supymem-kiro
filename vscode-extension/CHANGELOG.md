# Change Log

All notable changes to the "Supymem - AI Decision Control Plane" extension will be documented in this file.

## [0.2.0] - 2024-12-23

### 🎯 Major Release: AI Control Plane

This release transforms Supymem from a knowledge assistant into a full **AI Decision Control Plane** for development teams.

### Added

#### 🎯 Intent Panel (New Core Feature)
- Persistent WebView sidebar showing file purpose and context
- Active constraints display (security, performance, cost)
- Open questions tracking
- Recent changes timeline
- File experts with ownership scores
- Related decisions quick access

#### ⚠️ "Before You Change This" Warnings
- Pre-commit conflict detection
- Surfaces decisions your changes contradict
- Shows affected dependencies and constraints
- Risk level assessment (low/medium/high/critical)
- Inline diagnostics for constraint violations

#### 📜 Decision Trace Viewer
- Timeline visualization of decision chain
- Goal → Constraints → Options → Path → Outcome flow
- Challenge decisions directly from the trace
- Full reasoning and alternatives display

#### 💬 "Ask Why" Context Menu
- Right-click: "Why does this exist?"
- Right-click: "What would break if removed?"
- Right-click: "Who knows about this?"
- Works on files and selections

#### 🤖 Agent Status Monitor
- Status bar indicator for AI agents
- Full panel showing agent execution status
- Pending approvals count
- Execution history
- Approve/reject agent actions

#### 🔒 Constraint Markers
- Gutter icons for protected code sections
- Color-coded by severity (critical/high/medium/low)
- Hover for constraint details
- Toggle via command

### Changed

- Renamed to "AI Decision Control Plane"
- Updated icon to target/crosshair design
- Enhanced status bar with agent indicator
- Improved webview styling throughout
- Richer tooltips on tree items

### New Commands

| Command | Shortcut |
|---------|----------|
| Show Intent Panel | `Cmd+Shift+I` |
| Check Constraints | `Cmd+Shift+C` |
| Show Decision Trace | - |
| Analyze Pending Changes | - |
| Why does this exist? | - |
| What would break? | - |
| Show Agent Status | - |
| Toggle Constraint Markers | - |

### New Settings

| Setting | Default |
|---------|---------|
| `showConstraintMarkers` | `true` |
| `enableChangeWarnings` | `true` |
| `autoRefreshInterval` | `60` |

---

## [0.1.0] - 2024-12-01

### Initial Release

- Basic knowledge agent queries
- Decision viewing
- Task management sidebar
- Activity feed
- "Why was this decided?" command
- "Who knows about this?" command
- Store knowledge command
