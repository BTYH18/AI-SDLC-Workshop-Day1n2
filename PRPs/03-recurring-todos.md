# Recurring Todos

## Feature Overview
Allow users to set todos that repeat on a schedule (daily, weekly, monthly, yearly), automatically creating the next instance when the current one is completed.  Recurrence helps with habits, bills, and regular events.

## User Stories
- **Habit Keeper**: As a user I want a todo to reappear every day so I don’t have to recreate it.
- **Planner**: As a user I want monthly reminders for bills or reports.
- **Reporter**: As a user I want a yearly task for reviews or renewals.

## User Flow
1. In the add/edit form, check the “Repeat” checkbox.
2. Choose a recurrence pattern from the dropdown (daily, weekly, monthly, yearly).
3. Set a due date; this field becomes required when recurrence is enabled.
4. When the user marks the todo complete (via checkbox or API), the system calculates and inserts a new todo with the same settings and due date offset.
5. The new instance appears in the list immediately; the old one is moved to the completed section or removed.

## Technical Requirements
- `todos` table schema modifications:
  - `recurrence_pattern` (nullable text enum: 'daily','weekly','monthly','yearly')
  - existing `due_date` becomes required when this field is non-null
- Logic in `lib/db.ts` or service layer: when marking complete, if `recurrence_pattern` is set, compute next due date using Singapore timezone utility functions.
  - For daily/weekly: add 1 day or 7 days.
  - For monthly: add one month preserving day; if next month has fewer days, cap to last day.
  - For yearly: add one year.
- In PUT `/api/todos/[id]` when `completed` flag is toggled, include recurrence handling.
- The new todo should inherit:
  - same `priority`, `reminder_minutes`, `tags`, `recurrence_pattern`.
  - any user-customized fields except `created_at` and `id`.
- Use `getSingaporeNow()` for all date math and require due_date calculations to be timezone-aware.

## UI Components
- Recurrence controls in add/edit form: checkbox + pattern dropdown alongside due date field.
- Badges on todo items indicating recurrence pattern (`🔄 daily`, etc.).
- Color style for recurrence badges (purple with border) in light mode and adjusted in dark mode.

## Edge Cases
- User sets recurrence but no due date → form should block submission with validation message.
- Recurrence pattern changed after creation; existing future instance unaffected until next completion.
- Calculating next date for Feb 29 or months with variable lengths.
- Completing a recurring todo when offline; queue new instance or prompt retry.

## Acceptance Criteria
1. Users can select recurrence pattern; field is required when recurrence is active.
2. New instance is generated upon completion with correct due date and inherited metadata.
3. UI indicators correctly show recurrence pattern.
4. Edge cases with month boundaries and leap years handled correctly.

## Testing Requirements
- E2E tests completing todos with each pattern and verifying new items appear.
- Unit tests for `calculateNextDueDate` helper function with edge-case dates.
- Integration tests verifying database insertion logic on completion.

## Out of Scope
- Custom interval patterns (every 3 days, custom weekdays).
- Recurrence based on completion date vs due date (always use due date).

## Success Metrics
- Daily recurring todo creation reduces manual entry by 90% for active users.
- 75% completion retention for recurring items after 30 days.
