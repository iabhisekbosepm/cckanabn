# CC Kanban - Modern Project Management

A powerful, self-hosted Kanban board application built with React and Node.js. Designed for teams who want full control over their data with features that go beyond traditional project management tools.

## Features

### Core Kanban Functionality
- **Multi-Project Support** - Manage unlimited projects, each with its own board
- **Drag & Drop** - Intuitive task movement between columns with smooth animations
- **Custom Columns** - Create, rename, reorder, and color-code columns per project
- **Task Management** - Full CRUD operations with rich task details

### Task Details
- **Priority Levels** - High, Medium, Low with visual indicators
- **Due Dates** - Set deadlines with overdue/due-today highlighting
- **Labels** - Color-coded tags for categorization (global across projects)
- **Subtasks/Checklists** - Break down tasks into actionable items with progress tracking
- **Attachments** - Link external resources (auto-detects images, videos, documents)
- **Notes/Comments** - Add context and updates to tasks
- **Activity Log** - Complete history of all task changes

### Advanced Views

| View | Description |
|------|-------------|
| **Dashboard** | Overview of all projects with task counts and quick access |
| **Global Board** | See all projects' tasks in one unified Kanban view |
| **Today View** | Focus mode showing only today's tasks and overdue items |
| **Calendar** | Monthly view of tasks by due date |
| **Heatmap** | GitHub-style contribution graph showing task activity |
| **Statistics** | Charts and metrics for productivity insights |

### AI Integration
- **Built-in AI Chat** - Powered by Ollama (local LLM)
- **Smart Task Parsing** - Describe tasks naturally, AI extracts title, priority, due date
- **Project Context** - AI understands your projects and can help manage tasks

### Other Features
- **Bulk Import** - Import multiple tasks at once via text or AI parsing
- **Export Options** - Export projects as Markdown or JSON
- **Search & Filter** - Find tasks by title, priority, labels, or due date
- **Dark/Light Mode** - System preference detection (coming soon)
- **Responsive Design** - Works on desktop and tablet

---

## What Makes CC Kanban Different from Trello?

| Feature | CC Kanban | Trello |
|---------|-----------|--------|
| **Self-Hosted** | Your data stays on your servers | Cloud-only, data on Atlassian servers |
| **No User Limits** | Unlimited users, no pricing tiers | Free tier limited to 10 boards |
| **AI Assistant** | Built-in local AI (Ollama) for task management | Requires paid Butler automation |
| **Heatmap View** | GitHub-style activity visualization | Not available |
| **Global Board** | View all projects in one unified board | Must switch between boards |
| **Today Focus** | Dedicated view for daily priorities | Requires workarounds with filters |
| **Statistics** | Built-in analytics and charts | Requires Power-Ups (paid) |
| **Calendar View** | Native calendar included | Calendar Power-Up (limited free) |
| **Bulk Import** | AI-powered multi-task import | Manual entry only |
| **Activity Heatmap** | Visual workload distribution | Not available |
| **No Vendor Lock-in** | Export anytime, open data format | Limited export options |
| **One-Time Setup** | No recurring subscription | $5-17.50/user/month for full features |

### Key Advantages

1. **Privacy First** - All data stored in your MongoDB instance. No third-party tracking.

2. **AI-Powered Workflow** - Local AI assistant helps create tasks, understands context, and can bulk-process task lists.

3. **Developer-Friendly** - Built with modern stack (React, Node.js, MongoDB). Easy to customize and extend.

4. **Unified Views** - See everything across all projects without switching contexts. The Global Board shows all tasks in one place.

5. **Visual Insights** - Heatmap and statistics give you productivity insights that Trello locks behind paid tiers.

6. **No Feature Gating** - Every feature is available. No "upgrade to unlock" prompts.

---

## Tech Stack

**Frontend:**
- React 18 + Vite
- Tailwind CSS
- @dnd-kit (drag and drop)
- @tanstack/react-query (state management)
- date-fns (date utilities)
- recharts (statistics charts)

**Backend:**
- Node.js + Express
- MongoDB Atlas (cloud) or local MongoDB
- Mongoose ODM

**AI (Optional):**
- Ollama with Llama/Mistral models

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account or local MongoDB
- (Optional) Ollama for AI features

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/iabhisekbosepm/cckanabn.git
   cd cckanabn
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and add your MongoDB connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kanban
   PORT=3001
   ```

4. **Start the application**
   ```bash
   # Start backend (from project root)
   npm run dev

   # In another terminal, start frontend
   cd frontend
   npm run dev
   ```

5. **Open in browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Optional: Enable AI Chat

1. Install [Ollama](https://ollama.ai)
2. Pull a model: `ollama pull llama2` or `ollama pull mistral`
3. Start Ollama: `ollama serve`
4. The AI chat will auto-detect and connect

---

## Project Structure

```
cckanabn/
├── backend/
│   ├── src/
│   │   ├── config/        # Database configuration
│   │   ├── controllers/   # Request handlers
│   │   ├── models/        # Business logic
│   │   ├── routes/        # API endpoints
│   │   ├── schemas/       # MongoDB schemas
│   │   └── services/      # AI and external services
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   └── utils/         # Helper functions
│   └── index.html
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/:id` | Get project with columns and tasks |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/dashboard` | Get all data for dashboard |
| GET | `/api/dashboard/heatmap` | Get heatmap data |
| POST | `/api/columns/:id/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| PUT | `/api/tasks/:id/move` | Move task between columns |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/labels` | Get all labels |
| POST | `/api/chat` | AI chat endpoint |

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License - feel free to use this project for personal or commercial purposes.

---

## Acknowledgments

Built with Claude AI assistance.
