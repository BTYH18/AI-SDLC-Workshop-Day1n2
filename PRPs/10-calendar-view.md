# Calendar View

## Feature Overview
Display todos on a monthly calendar grid, highlighting due dates and Singapore public holidays.  Allows navigation between months and visual correlation of tasks with dates.

## User Stories
- **Planner**: As a user I want to see my todo distribution over the month.
- **Holiday-aware**: As a user I want to be reminded of public holidays when planning.
- **Navigator**: As a user I want to move between months quickly.

## User Flow
1. Click the **Calendar** tab/link to open the monthly view.
2. The current month is shown with each day cell; todos due that day are summarized with color badges.
3. Holidays are fetched from the `holidays` table and highlighted (e.g. light gray background).
4. Click on a day cell to expand a list of todos due that day (optionally navigate back to the main list filtered for that date).
5. Use left/right arrows or a month picker to change month; the calendar updates accordingly.

## Technical Requirements
- `holidays` table seeded with Singapore public holidays and timezone-aware dates.
- New API endpoint `GET /api/holidays` or integrate into `/api/todos` query when calendar view requests.
- Server logic computes month range and returns todos grouped by date.
- Client renders a 7-column grid with correct weekday alignment for the first of the month.
- Use Singapore timezone when determining the user's current month and when grouping todos.
- Support responsive layout for mobile/desktop.

## UI Components
- `Calendar` client component that draws grid and populates with:
  - date number in corner
  - small dots or badges for each todo
  - holiday marking (e.g. red text or gray cell)
- Navigation controls (previous/next month arrows, optionally month/year picker).
- Day detail popup or side panel listing todos due on that date.

## Edge Cases
- No todos in a month → show empty cells but still include holidays.
- Month transitions across year boundary.
- Timezone differences causing a todo due at 00:00 Singapore to appear on previous day if user in different timezone (app always uses SG time, so consider disclaimers or conversion in UI).

## Acceptance Criteria
1. Calendar loads quickly and displays the proper number of days aligned to weekdays.
2. Todos appear on the correct date cells with visible badges.
3. Holidays are shown accurately according to the `holidays` table and timezone.
4. Navigation buttons load adjacent months without full page refresh.

## Testing Requirements
- E2E tests that open the calendar, navigate months, and verify sample todos and holidays appear.
- Unit tests for date calculations (start-of-month, number of days, weekday offset).

## Out of Scope
- Drag-and-drop to reschedule todos on the calendar.
- Fully interactive event management like a full calendar app.

## Success Metrics
- Calendar adoption rate ≥ 30% of users within first two months.
- Average session time increases when calendar is used.
