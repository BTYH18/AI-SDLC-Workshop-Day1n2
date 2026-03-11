# Reminders & Notifications

## Feature Overview
Enable browser notifications to remind users before a todo is due.  Supports configurable offsets (from 15 minutes up to one week) and prevents duplicates.  Relies on polling endpoint and Singapore timezone calculations.

## User Stories
- **Forgetful User**: As a user I want to be alerted before a deadline so I don’t miss it.
- **Planner**: As a user I want to customize how far in advance I receive a reminder.
- **Privacy‑minded**: As a user I want to grant notification permissions only when I choose to.

## User Flow
1. Click the orange **Enable Notifications** button in the navbar.
2. Grant browser permission when the prompt appears; the button updates to green and text changes to **Notifications On**.
3. When creating/editing a todo with a due date, select a reminder offset from the dropdown; field is disabled if no due date.
4. A background polling script calls `GET /api/notifications/check` every minute.
5. The endpoint returns todos with `due_date - reminder_offset <= now` and `last_notification_sent` not recent.
6. Client code displays a browser notification and updates the todo’s `last_notification_sent` timestamp to avoid duplicates.

## Technical Requirements
- Add `reminder_minutes` (nullable integer) and `last_notification_sent` (nullable datetime) to `todos` table.
- API route `GET /api/notifications/check`:
  - Query todos for session user where `reminder_minutes IS NOT NULL` and due_date exists
  - Compute threshold using `getSingaporeNow()` minus offset
  - Only include todos where `last_notification_sent` is null or more than 15 minutes ago (to guard against repeated polling)
  - Update `last_notification_sent` to now when sending the list back
  - Return an array of todos with minimal fields (id, title)
- Client polling logic in a custom hook (`useNotifications`) or effect in page component.
- Ensure notifications are only requested once; caching permission state in localStorage or React state.
- Fallback: if browser doesn’t support notifications or permission denied, disable button and show message.

## UI Components
- Notification toggle button in navbar/toolbar.
- Reminder offset dropdown in todo form showing options: 15m, 30m, 1h, 2h, 1d, 2d, 1w, None.
- Badge icon `🔔` on todos with reminder, with short label (e.g. `🔔 1h`).

## Edge Cases
- User revokes permission after enabling; handle gracefully by showing disabled toggle and instructions.
- System clock skew: rely on server-side time (Singapore timezone) for thresholds.
- Multiple reminders in quick succession—ensure duplicate prevention.
- Due date changed to earlier than next check interval; handle in next poll.

## Acceptance Criteria
1. Users can enable and disable notifications; permission status persists per session.
2. Reminder dropdown only active when due date is set.
3. Notifications fire at correct times based on offset and timezone.
4. No todo triggers more than one notification for the same offset within 15 minutes.

## Testing Requirements
- E2E test that enables notifications, creates a due-date todo with 1‑minute offset, and verifies desktop notification appears using Playwright’s `notification` event.
- Unit tests for API query logic and `last_notification_sent` update.
- Manual smoke test on a real browser to verify permission flow.

## Out of Scope
- Email or SMS reminders.
- Custom message content beyond the todo title.

## Success Metrics
- 90% of users who enable notifications receive at least one reminder in the first week.
- Reminder-related support tickets drop by 80% after launch.
