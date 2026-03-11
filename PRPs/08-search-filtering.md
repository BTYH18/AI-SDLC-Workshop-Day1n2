# Search & Filtering

## Feature Overview
Allow users to quickly find todos using text search and multiple filter criteria (priority, tags, due date ranges).  Search is performed client‑side for responsive interactions.

## User Stories
- **Seeker**: As a user I want to type keywords to locate a specific todo.
- **Organizer**: As a user I want to narrow my list by priority, tags or date range.
- **Expert**: As a user I want advanced search combining title and tag terms.

## User Flow
1. Enter text in the search input; the todo list filters in real time to match titles and (optionally) tags.
2. Open filter panel to select priority levels, tag(s), and optional due-date range.
3. Clear filters/search to return to full list.

## Technical Requirements
- Search logic runs in the client component (`app/page.tsx`) using JavaScript string matching or Regex.
- Filter state stored in React state or context; combined using logical AND across criteria.
- When tags or priorities are changed, apply filters immediately; maintain scroll position.
- For performance with large lists, debounce search input and memoize filtered results.
- Advanced search syntax: support `tag:work` or `priority:high` tokens (optional enhancement).

## UI Components
- Text search box at the top of todo list.
- Filter dropdown/panel with checkboxes for priorities, multi-select tags component, and date range picker.
- Clear-all button to reset filters.
- Visual cues when filters are active (e.g. badge count).

## Edge Cases
- Case-insensitive matching.
- Searching with special characters or regex-like syntax; escape appropriately.
- Filtering when list is empty yields "No results" message.

## Acceptance Criteria
1. Search input filters todos by title (and tags if enabled) in real time.
2. Multiple filters combine correctly: e.g. priority=high AND tag=work.
3. Performance remains snappy with 500+ todos in local state.

## Testing Requirements
- E2E tests verifying search and each filter type individually and combined.
- Unit tests for filtering helper functions with various term combinations.
- Performance test using large synthetic dataset.

## Out of Scope
- Server-side search or full-text indexing.
- Synonym or fuzzy matching beyond substring search.

## Success Metrics
- Median time to find a todo reduced to under 5 seconds after search feature release.
- Filter usage rate above 50% for active users.
