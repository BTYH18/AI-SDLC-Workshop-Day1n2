# Export & Import

## Feature Overview
Provide a JSON-based backup and restore mechanism that preserves todos, subtasks, tags, and relationships.  Imported data is validated and IDs remapped to avoid collisions.

## User Stories
- **Migrator**: As a user I want to download my data so I can move to another device or keep a backup.
- **Recoverer**: As a user I want to re-import a previously exported file to restore my todos.

## User Flow
1. Click **Export** button in settings/toolbar; browser downloads `todos.json` containing all user data.
2. To import, choose a JSON file via file picker; the app validates the structure.
3. The import API assigns new IDs and remaps relationships (e.g., subtask -> todo, todo -> tag) before inserting.
4. On success, the UI refreshes to show newly imported todos; on failure, display error details.

## Technical Requirements
- Export endpoint `GET /api/todos/export` returns full JSON
  ```json
  {
    "todos": [...],
    "subtasks": [...],
    "tags": [...],
    "todo_tags": [...]
  }
  ```
- Import endpoint `POST /api/todos/import` accepts same format; server:
  - Validates JSON schema (required fields, types)
  - Generates new UUIDs or incremental IDs for todos, subtasks, tags
  - Updates join table rows to new IDs accordingly
  - Ensures operations occur in a transaction; rollback on any error
- Client handles file reading, error display, and progress indicator.
- Support partial imports: if duplicate todos (title+due_date) detected, either skip or prompt user.

## UI Components
- Export button with confirmation (file size might be large).
- Import modal with file selector and error message area.
- Progress spinner during import.

## Edge Cases
- Imported file has invalid JSON or missing keys → reject with message.
- ID collisions with existing data are avoided by remapping.
- Large files (>5MB) should be handled gracefully (streaming import if necessary).

## Acceptance Criteria
1. Users can export all their data to a JSON file.
2. Importing the file recreates todos, subtasks, tags with correct relationships.
3. Import validation prevents malformed data from corrupting the database.

## Testing Requirements
- E2E test exporting then importing in a fresh session and comparing counts.
- Unit tests for ID remapping logic and validation schema.
- Integration test simulating partial duplicate detection policy.

## Out of Scope
- CSV export/import.
- Cross-account sharing of exported files (security concerns).

## Success Metrics
- Backup feature used by at least 25% of active users within first month.
- No data loss incidents reported due to export/import bugs.
