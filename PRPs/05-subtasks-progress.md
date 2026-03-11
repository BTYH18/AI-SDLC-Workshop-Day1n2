# Subtasks & Progress Tracking

## Feature Overview
Allow todos to contain an ordered list of subtasks (checklist) with visual progress bars.  Progress persists across edits and deletion cascades from todo to subtasks.

## User Stories
- **Checker**: As a user I want to divide a todo into smaller steps and mark them off one by one.
- **Tracker**: As a user I want to see how far along I am on a lengthy task.
- **Cleaner**: As a user I want subtasks removed automatically when I delete their parent todo.

## User Flow
1. Create or edit a todo and click **Add Subtask** to insert a new line.
2. Enter subtask titles; the list maintains a position field for ordering.
3. Tap the checkbox next to a subtask to mark it complete; the progress bar updates (completed/total).
4. Drag handles appear to reorder subtasks; positions update in DB.
5. Delete a subtask with the trash icon; the remaining ones re‑index.
6. Deleting a parent todo triggers cascade delete of its subtasks via foreign key.

## Technical Requirements
- New `subtasks` table:
  - `id` (PK), `todo_id` (FK with ON DELETE CASCADE), `title` (text), `position` (integer), `completed` (boolean default false)
- CRUD methods in `lib/db.ts`: `createSubtask`, `updateSubtask`, `deleteSubtask`, `listSubtasksForTodo`.
- API endpoints under `/api/todos/[id]/subtasks` with POST/PUT/DELETE listing.
- Progress calculation helper: `(completedCount / totalCount) * 100`.
- Position management: when inserting/removing, shift following items’ position values accordingly.
- Ensure updates are transactional to avoid gaps.

## UI Components
- In the todo edit modal or inline expansion, show list of subtasks with inputs and checkboxes.
- Progress bar above or beside the subtask list reflecting percentage.
- Add/remove buttons; drag handle icons if reorder is supported.
- Completed subtasks rendered with strike-through text.

## Edge Cases
- Two subtasks with same position due to race; enforce unique index on `(todo_id, position)` or recalc positions.
- Marking all subtasks complete should visually update parent todo (optional indicator).
- Reordering while offline—sync issues when back online.

## Acceptance Criteria
1. Users can add, edit, delete, complete, and reorder subtasks.
2. Progress bar accurately reflects completion ratio.
3. Deleting a todo removes its subtasks in the database.
4. Subtasks maintain their intended order through CRUD operations.

## Testing Requirements
- E2E tests for subtask lifecycle: create, complete, reorder, delete, and ensure progress bar updates.
- Unit tests for position-recalculation logic and progress calculation.
- Integration tests confirming cascade delete.

## Out of Scope
- Nested subtasks (only a single level allowed).
- Templates export of subtasks is handled in templates PRP.

## Success Metrics
- 70% of todos created with more than one subtask convert to at least one completion activity.
- Average time to mark a subtask complete under 10s (usability metric).
