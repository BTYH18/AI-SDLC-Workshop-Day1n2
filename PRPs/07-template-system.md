# Template System

## Feature Overview
Enable users to save reusable todo patterns (templates) including subtasks and tags.  Templates calculate due dates using an offset from the time of use.

## User Stories
- **Power User**: As a user I want to quickly create a standard task (e.g. "Weekly report") without retyping everything.
- **Team Member**: As a user I want to share templates across my account to standardise workflows.

## User Flow
1. While viewing or editing a todo, click **Save as Template**.
2. Enter a template name and optionally a category; subtasks and tags are captured and serialized as JSON.
3. To use a template, open the templates menu and select one; the app creates a new todo prefilled with template data.
4. Due date is calculated based on an offset field stored in the template (e.g., due 3 days from creation).

## Technical Requirements
- `templates` table:
  - `id`, `user_id`, `name`, `category` (optional), `subtasks_json` (text), `tags_json` (text), `due_offset_days` (integer)
- CRUD methods: `createTemplate`, `listTemplatesForUser`, `updateTemplate`, `deleteTemplate`.
- When a template is used, call a helper that:
  - Parses JSON for subtasks and tags
  - Calculates `due_date = getSingaporeNow() + due_offset_days`
  - Creates todo with inherited priority, reminders, recurrence pattern if templates include them (optional)
- API endpoints under `/api/templates` for management and `/api/templates/[id]/use` for instantiation.

## UI Components
- Template creation modal with name, category, offset field.
- Templates list/view with search/filter by category.
- Use button that clones the template into a new todo form for final adjustments.

## Edge Cases
- Templates with malformed JSON (should be sanitized before saving).
- Using a template when offline; queue creation.
- Changing a template should not alter todos already created from it.

## Acceptance Criteria
1. Users can save the current todo as a template with subtasks and tags preserved.
2. Creating a todo from a template correctly applies the due date offset and associated metadata.
3. Templates can be renamed and deleted.

## Testing Requirements
- E2E tests creating a template from a todo and then using it to generate another todo.
- Unit tests for JSON serialization/deserialization and offset calculation.
- Integration tests ensuring templates belong only to the creating user.

## Out of Scope
- Template sharing between users; each account has its own templates.
- Complex scheduling inside templates (only offset-based due dates).

## Success Metrics
- 40% of users create at least one template within the first two weeks.
- Template-based todo creation reduces manual entry time by 50% for returning users.
