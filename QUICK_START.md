# 🚀 Quick Setup Guide - Todo App

Follow these steps to get the app running locally.

## Prerequisites
- **Node.js 18+** (check: `node --version`)
- **npm** (usually comes with Node.js)
- **Git** (for version control)

## Setup Steps

### Step 1: Install Dependencies (2 minutes)
```bash
npm install
```
This installs all required packages from `package.json`.

### Step 2: Start Development Server (1 minute)
```bash
npm run dev
```

You should see:
```
> next dev

  ▲ Next.js 16.x.x
  - Local:        http://localhost:3000
```

**Open your browser**: Visit `http://localhost:3000`

### Step 3: Try It Out (5 minutes)

1. **Create a todo**:
   - Type a title: "Buy groceries"
   - Select priority: "High"
   - Click "Add Todo"

2. **Check the result**:
   - Todo appears in "Active Todos" section
   - Red priority badge shows

3. **Toggle completion**:
   - Click the checkbox
   - Todo moves to "Completed" section

4. **Delete a todo**:
   - Click 🗑️ button
   - Confirm deletion in modal

## Running Tests

### Run All E2E Tests
```bash
npm test
```

Expected output:
```
✓ 01-todo-crud.spec.ts (6 tests)
  ✓ should create a todo with title only
  ✓ should create a todo with priority
  ✓ should reject empty title
  ✓ should toggle todo completion
  ✓ should delete a todo
  ✓ should display all priority levels
```

### Interactive Test UI
```bash
npm run test:ui
```
Opens a browser-based test runner where you can:
- See all tests and results
- Click tests to watch them run
- Debug individual tests

### Debug Mode
```bash
npm run test:debug
```
Opens Playwright inspector for step-by-step debugging.

## Common Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)

# Production
npm run build            # Build for production
npm start                # Start production server

# Testing
npm test                 # Run Playwright tests
npm run test:ui          # Interactive test UI
npm run test:debug       # Debug tests

# Code Quality
npm run lint             # Run ESLint
```

## Folder Guide

```
app/
  ├── page.tsx             ← Main UI (what you see in browser)
  ├── api/todos/           ← API endpoints
  └── layout.tsx           ← App wrapper

lib/
  ├── db.ts                ← Database code
  ├── timezone.ts          ← Date/time helpers
  └── types.ts             ← TypeScript types

tests/
  ├── 01-todo-crud.spec.ts ← Tests you just ran
  └── helpers.ts           ← Test utilities

package.json              ← Dependencies & scripts
```

## Database

- **Location**: `todos.db` (created automatically in project root)
- **Type**: SQLite (local file-based)
- **Reset**: Delete `todos.db` and restart app to start fresh

## Troubleshooting

### Port 3000 already in use
```bash
PORT=3001 npm run dev
```

### Dependencies won't install
```bash
rm -rf node_modules package-lock.json
npm install
```

### Database issues
```bash
# Delete and recreate database
rm todos.db
npm run dev
```

### Tests fail
```bash
# Make sure dev server is running in another terminal
npm run dev

# In another terminal:
npm test
```

### Build fails
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## Next Steps

Once everything is working:

1. **Explore the code**:
   - Look at `app/page.tsx` to see the UI
   - Check `lib/db.ts` to understand database operations
   - Read `app/api/todos/route.ts` to see API endpoints

2. **Add features** (see PRPs folder):
   - Recurring todos
   - Reminders & notifications
   - Subtasks
   - Tags
   - Templates
   - Calendar view
   - Authentication

3. **Deploy**:
   - Railway (recommended for SQLite)
   - Vercel (use external database)
   - Docker (containerized)

## Documentation

- **[TODO_APP_README.md](TODO_APP_README.md)** - Detailed feature docs
- **[BASELINE_IMPLEMENTATION.md](BASELINE_IMPLEMENTATION.md)** - Architecture notes
- **[PRPs/](PRPs/)** - Feature requirement prompts for adding more features

## Need Help?

Check these files:
- ❓ API responses format → `lib/types.ts`
- ❓ Database schema → `lib/db.ts`
- ❓ How tests work → `tests/helpers.ts`
- ❓ Component structure → `app/page.tsx`

---

**Happy coding!** 🚀

For questions, refer to:
- Next.js docs: https://nextjs.org/docs
- React docs: https://react.dev
- Playwright docs: https://playwright.dev/docs/intro
