# Tag System

## Feature Overview
Introduce color-coded labels (tags) that can be applied to todos.  Tags support many-to-many relationships and can be created, edited, deleted and used for filtering.

## User Stories
- **Categorizer**: As a user I want to label todos with tags like "work" or "personal".
- **Finder**: As a user I want to filter my list by one or more tags.
- **Manager**: As a user I want to create new tags, rename them, and delete unused ones.

## User Flow
1. Create or edit a todo; click the tags field to open a dropdown or modal listing available tags.
2. Select existing tags or type a new name to create on the fly.
3. Tag badges appear next to the title of each todo.
4. On the main page, open the tags filter control and select tags; the list updates to show todos matching any selected tag.
5. Manage tags via a dedicated page or within the filter control (rename/delete).

## Technical Requirements
- Schema changes:
  - `tags` table: `id`, `user_id`, `name`, `color` (optional hex)
  - `todo_tags` join table: `todo_id`, `tag_id` (composite PK)
- CRUD methods: `createTag`, `updateTag`, `deleteTag`, `listTagsForUser`, `addTagToTodo`, `removeTagFromTodo`, `listTagsForTodo`.
- Foreign keys with cascade on delete: deleting a todo removes join rows; deleting a tag removes join rows.
- API endpoints:
  - `/api/tags` GET/POST/PUT/DELETE
  - `/api/todos/[id]/tags` POST/DELETE
- Client type definitions: 
  ```ts
  interface Tag { id: string; name: string; color?: string; }
  ```
- When importing/exporting, tags must be included (see export/import PRP).

## UI Components
- Tag picker component with autocomplete and color circles.
- Tag badges displayed on todos using their assigned color; fallback to a default palette.
- Filter control with multiselect tag dropdown.
- Tag management dialog or page listing all tags with edit/delete actions.

## Edge Cases
- Duplicate tag names (enforce unique per user, case-insensitive).
- Deleting a tag that’s assigned to many todos; remove associations without affecting todos.
- Tag color contrast issues in dark mode; ensure readability.
- Tags created offline should sync once online.

## Acceptance Criteria
1. Users can create, rename, delete tags and assign/unassign them to todos.
2. Tag filters operate correctly with multiple selections.
3. Color-coded badges render consistently across light/dark themes.
4. Deleting a tag removes it from all todos and the database.

## Testing Requirements
- E2E tests creating and managing tags, assigning to todos and filtering.
- Unit tests for unique-name validation and join-table operations.
- Integration tests ensuring cascade behavior.

## Out of Scope
- Hierarchical or nested tags.
- Tag suggestions based on content (smart tagging).

## Success Metrics
- Tags enabled for 60% of todos within first month.
- Filter usage increases session length by 15%.
