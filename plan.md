# Kanban Board Implementation Plan

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **Key Libraries:** @dnd-kit (drag-and-drop), @tanstack/react-query (state), axios

## Database Schema

```sql
-- Projects table
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Columns table (belongs to project)
CREATE TABLE columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    color TEXT DEFAULT '#E5E7EB',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Tasks table (belongs to column)
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    column_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
);
```

## Project Structure

```
kanban-app/
├── backend/
│   ├── src/
│   │   ├── index.js              # Server entry point
│   │   ├── app.js                # Express app config
│   │   ├── config/database.js    # SQLite connection
│   │   ├── models/               # Project.js, Column.js, Task.js
│   │   ├── routes/               # API route handlers
│   │   ├── controllers/          # Business logic
│   │   └── middleware/           # Error handling, validation
│   └── database/
│       └── schema.sql
│
├── frontend/
│   ├── src/
│   │   ├── api/                  # API client functions
│   │   ├── components/
│   │   │   ├── board/            # KanbanBoard, Column, TaskCard
│   │   │   ├── project/          # ProjectCard, ProjectGrid
│   │   │   ├── modals/           # Create/Edit modals
│   │   │   └── ui/               # Button, Input, etc.
│   │   ├── pages/                # DashboardPage, BoardPage
│   │   ├── hooks/                # useProjects, useBoard, useDragAndDrop
│   │   └── context/              # ProjectContext, ModalContext
│   └── index.html
```

## API Endpoints

```
GET    /api/projects              - List all projects
GET    /api/projects/:id          - Get project with columns/tasks
POST   /api/projects              - Create project
PUT    /api/projects/:id          - Update project
DELETE /api/projects/:id          - Delete project

POST   /api/projects/:id/columns  - Create column
PUT    /api/columns/:id           - Update column
DELETE /api/columns/:id           - Delete column
PUT    /api/columns/:id/reorder   - Reorder column

POST   /api/columns/:id/tasks     - Create task
PUT    /api/tasks/:id             - Update task
DELETE /api/tasks/:id             - Delete task
PUT    /api/tasks/:id/move        - Move task between columns

GET    /api/dashboard             - All projects with nested data (multi-project view)
```

## Implementation Order

### Phase 1: Project Setup
1. Initialize monorepo with backend/ and frontend/ folders
2. Set up Express backend with SQLite
3. Set up Vite + React + Tailwind frontend
4. Create database schema and seed data

### Phase 2: Backend API
1. Implement Project CRUD endpoints
2. Implement Column CRUD with position management
3. Implement Task CRUD with move/reorder logic
4. Add dashboard aggregate endpoint

### Phase 3: Frontend - Core UI
1. Create Layout with Header and routing
2. Build DashboardPage with ProjectGrid
3. Build BoardPage with KanbanBoard, Column, TaskCard
4. Create modals for Project/Column/Task create/edit

### Phase 4: Drag and Drop
1. Set up @dnd-kit context in KanbanBoard
2. Make TaskCard draggable, Column droppable
3. Implement task reorder within column
4. Implement task move between columns with optimistic updates

### Phase 5: Multi-Project View
1. Add view mode toggle (single/multi-project)
2. Build MultiProjectBoardPage showing all boards side-by-side
3. Connect to dashboard API endpoint

### Phase 6: Polish
1. Add loading states, empty states, toast notifications
2. Add delete confirmations
3. Style improvements and responsive design

## Critical Files to Create

1. `backend/src/config/database.js` - SQLite connection and initialization
2. `backend/src/models/Task.js` - Task model with move/reorder logic
3. `frontend/src/components/board/KanbanBoard.jsx` - Main board with DnD
4. `frontend/src/hooks/useBoard.js` - React Query board state management
5. `frontend/src/api/client.js` - Axios API client

## Verification

1. **Backend:** Test all API endpoints with curl/Postman
2. **Database:** Verify cascading deletes work correctly
3. **Frontend:**
   - Create project, add columns, add tasks
   - Drag tasks between columns
   - Switch between single and multi-project views
   - Edit and delete projects/columns/tasks
4. **Integration:** Full flow from create project to drag-and-drop task management

## Commands

```bash
# Install dependencies (from kanban-app root)
npm install

# Run both frontend and backend in development
npm run dev

# Run only backend
npm run dev:backend

# Run only frontend
npm run dev:frontend

# Build frontend for production
npm run build

# Start production server
npm run start
```

## Ports
- Backend API: http://localhost:3001
- Frontend Dev Server: http://localhost:5173
