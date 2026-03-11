# Todo CRUD Operations

## Feature Overview
A foundational feature that allows users to create, read, update and delete todo items.  All operations respect Singapore timezone rules and enforce validation and error handling.  This PRP establishes the core data model and API/UI contracts that every other feature will build upon.

## User Stories
- **Creator**: As a user, I want to add a todo with a title, optional due date and priority so I can track tasks.
- **Editor**: As a user, I want to change the title, due date, priority or other fields of an existing todo.
- **Viewer**: As a user, I want to see a list of my todos sorted by priority and due date.
- **Remover**: As a user, I want to delete a todo when it’s no longer needed.

## User Flow
1. Open the main page; the add-todo form sits at the top.
2. Enter a title, optionally select a due date/time and priority.
3. Click **Add**; the todo appears in the list with optimistic UI updates.
4. Click the edit icon on an existing todo to open the edit dialog.
5. Modify fields and save; the list updates accordingly.
6. Click the trash icon to delete; confirmation may be shown for bulk actions.

## Technical Requirements
- **Database schema** (`todos` table):
  - `id` (integer PK)
  - `user_id` (FK to users)
  - `title` (text, not null)
  - `due_date` (datetime, nullable)
  - `priority` (enum 'low','medium','high')
  - `created_at`, `updated_at`
  - other fields will be added by later PRPs (reminders, recurrence, etc.)
- **API endpoints** (Next.js App Router style):
  - `POST /api/todos` → create, validates input
  - `GET /api/todos` → list all for session user
  - `PUT /api/todos/[id]` → update
  - `DELETE /api/todos/[id]` → delete
- All endpoints must call `getSession()` and return 401 when unauthenticated.
- Validation rules:
  - `title` required, non-empty, trimmed
  - `due_date` if present must be at least 1 minute in future using `getSingaporeNow()`
  - `priority` defaults to 'medium' if omitted
- Use synchronous database operations via `better-sqlite3` in `lib/db.ts`.
- API responses follow the `ApiResponse<T>` format.
- Client components implement optimistic updates and rollback on error.

## UI Components
- Add/Edit form at top of `app/page.tsx` (client component).  Fields:
  - text input for title
  - priority dropdown (High/Medium/Low)
  - date-time picker (future only)
  - Add/Save button
- Todo list items display:
  - title with priority badge
  - formatted due date according to urgency
  - edit and delete icons
- Overdue section for items whose due date has passed.

## Edge Cases
- Submitting empty or whitespace-only title → show validation error
- Due date in the past or less than 1 minute away → reject
- Network error during create/update/delete; rollback optimistic UI
- Deleting a todo that has already been removed on server (404) → show toast and refresh list
- Editing a todo while offline – queue update or block (graceful degradation)

## Acceptance Criteria
1. Users can create todos with required and optional fields.
2. Todos appear immediately in the list via optimistic UI; errors roll back.
3. Editing and deleting work and reflect in the UI.
4. All date/time calculations use Singapore timezone.
5. API returns proper error messages and status codes for invalid input.

## Testing Requirements
- **E2E**: Cover creation, editing, deletion, validation, and error recovery using Playwright.  Use virtual authenticator and Singapore timezone flags.
- **Unit/Integration**: Tests for validation logic, API route handlers, and DB CRUD methods in `lib/db.ts`.
- Simulate time travel to verify future-due-date validation.

## Out of Scope
- Priority sorting logic (handled in `02-priority-system`)
- Recurring todos, reminders, tags, templates, export/import, calendar view, authentication (will be covered in their own PRPs).

## Success Metrics
- 100% of happy-path CRUD requests succeed.
- Validation errors occur <1% of submissions.
- API latency <200ms for CRUD operations.
