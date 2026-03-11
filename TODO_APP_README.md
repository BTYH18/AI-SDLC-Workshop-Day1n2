# Todo App - Baseline Implementation

A minimal todo app built with **Next.js 16**, **React 19**, and **SQLite** (via sql.js).

## Features

### ✅ Implemented (MVP)
- **Todo CRUD Operations** - Create, read, update, delete todos
- **Priority System** - Three levels (High, Medium, Low) with color-coded badges
- **Due Dates** - Set optional future due dates with Singapore timezone support
- **Completion Tracking** - Mark todos as complete/incomplete
- **Optimistic UI** - Immediate visual feedback on actions
- **Responsive Design** - Works on desktop and mobile

### 📋 Architecture

```
├── app/
│   ├── api/
│   │   └── todos/
│   │       ├── route.ts          # GET/POST todos
│   │       └── [id]/route.ts     # GET/PUT/DELETE specific todo
│   ├── page.tsx                  # Main UI (client component)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Tailwind CSS
├── lib/
│   ├── db.ts                     # Database CRUD operations
│   ├── timezone.ts               # Singapore timezone utilities
│   └── types.ts                  # TypeScript interfaces
├── tests/
│   ├── 01-todo-crud.spec.ts      # E2E tests (Playwright)
│   └── helpers.ts                # Test utilities
├── package.json
├── tsconfig.json
├── next.config.js
└── playwright.config.ts
```

## Quick Start

### Prerequisites
- Node.js 18+ (use `node --version` to check)
- npm (comes with Node.js)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

3. **Run tests**
   ```bash
   npm test              # Run all E2E tests
   npm run test:ui       # Interactive test UI
   npm run test:debug    # Debug mode
   ```

## Database

The app uses **SQLite** with sql.js (pure JavaScript, Node 24 compatible).

- **Database file**: `todos.db` (created automatically on first run)
- **Tables**: `todos`
- **Operations**: Synchronous (no async/await needed)

### Database Schema

```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## API Endpoints

All endpoints return JSON with the format:
```typescript
{
  success: boolean
  data?: T
  error?: string
}
```

### Create Todo
```
POST /api/todos
Body: { title: string, priority?: 'high'|'medium'|'low', dueDate?: string }
Response: 201 { success: true, data: Todo }
```

### Get All Todos
```
GET /api/todos
Response: 200 { success: true, data: Todo[] }
```

### Get Single Todo
```
GET /api/todos/[id]
Response: 200 { success: true, data: Todo }
```

### Update Todo
```
PUT /api/todos/[id]
Body: { title?: string, priority?: string, dueDate?: string|null, completed?: boolean }
Response: 200 { success: true, data: Todo }
```

### Delete Todo
```
DELETE /api/todos/[id]
Response: 204 { success: true }
```

## Validation Rules

- **Title**: Required, non-empty, trimmed
- **Due Date**: Must be at least 1 minute in the future (if provided)
- **Priority**: Defaults to 'medium' if omitted

## Testing

### E2E Tests with Playwright

Tests are located in `tests/` directory and cover:
- ✅ Creating todos
- ✅ Toggling completion
- ✅ Deleting todos
- ✅ Priority levels
- ✅ Validation errors

**Run tests:**
```bash
npm test
```

**Interactive test explorer:**
```bash
npm run test:ui
```

**Debug a specific test:**
```bash
npm run test:debug
```

## Development

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **Database**: SQLite via sql.js
- **Testing**: Playwright
- **Language**: TypeScript

### Timezone
All date/time operations use **Singapore timezone** (Asia/Singapore) via:
```typescript
import { getSingaporeNow, formatSingaporeDate } from '@/lib/timezone'
```

### Code Quality
- ESLint configured
- TypeScript strict mode enabled
- No console.log in production code

## Deployment

### For Railway
1. Create `railway.json` with build/start commands
2. Set environment variables in Railway dashboard
3. Push to GitHub and Railway auto-deploys

### For Vercel
⚠️ **Note**: SQLite persists in Vercel's ephemeral filesystem. Use Vercel Postgres or Railway for persistent data.

## Future Enhancements

These are out of scope for the baseline but included in the [PRPs](../PRPs/README.md):
- Recurring todos (daily, weekly, monthly, yearly)
- Reminders and browser notifications
- Subtasks with progress tracking
- Tag system for organization
- Template system for reusable todos
- Calendar view
- Search and filtering
- Export/import functionality
- WebAuthn authentication

## Troubleshooting

**Port already in use:**
```bash
PORT=3001 npm run dev
```

**Database issues:**
- Delete `todos.db` and restart (fresh database)
- Check file permissions in project directory

**Tests failing:**
- Ensure dev server is running: `npm run dev`
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## License

MIT

---

**Created**: March 2025
**Status**: ✅ MVP Complete
