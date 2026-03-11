# Priority System

## Feature Overview
A mechanism to classify todos by importance using three levels: High, Medium, and Low.  Priority affects sorting, visual presentation, and filtering across the app.

## User Stories
- **Organizer**: As a user I want to assign a priority when creating a todo so I can distinguish urgent tasks.
- **Re-prioritizer**: As a user I want to change a todo's priority when its importance changes.
- **Browser**: As a user I want to filter and sort my list by priority.

## User Flow
1. In the add todo form, select a priority from the dropdown (default Medium).
2. In the edit dialog, change the priority and save.
3. On the main page, click the priority filter dropdown to show only certain levels.
4. Todos are sorted automatically: High first, then Medium, then Low, with due dates within each group.

## Technical Requirements
- Add `priority` column to `todos` table (enum or small text).
- Database queries in `lib/db.ts` should order by `priority` (high, medium, low) then `due_date`.
- API handlers must accept and validate `priority` values; default to 'medium' if missing.
- Client adds dropdown component tied to `Priority` type:
  ```ts
  type Priority = 'high' | 'medium' | 'low';
  ```
- Priority filter state stored in React state (string or multi-select), applied client-side before rendering.
- Sorting logic in UI when receiving the todo list: apply server order or sort locally to ensure stability.

## UI Components
- Dropdown in add/edit form showing colored badges: 🔴 High, 🟡 Medium, 🔵 Low.
- Badge next to todo titles in list and overdues.
- Filter dropdown/toolbar with ability to select one or more priorities.
- Color styles adapt to dark mode.

## Edge Cases
- Invalid priority value from API (e.g. injection) → default to medium or reject.
- No priority provided when creating → assume Medium.
- Filtering when no todos exist for a selected level → show "No todos" message.

## Acceptance Criteria
1. Priority assigned and displayed correctly on creation.
2. Filtering works for single and multiple selections.
3. Sorting respects priority order even if due dates are equal.
4. Badges have the correct color and accessible labels (color-blind friendly).

## Testing Requirements
- E2E tests that create todos with each priority and verify ordering and filtering.
- Unit tests for sorting helper functions and validation schema.

## Out of Scope
- Advanced weighting or custom priority levels.
- Analytics on priority usage (not required for MVP).

## Success Metrics
- At least 80% of users assign priority to new todos.
- Filter feature used in >50% of sessions after release.
