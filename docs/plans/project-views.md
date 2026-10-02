# Project Views

Status: implemented.

A view belongs to one project. It stores a filter configuration, not a copy of the issues. Personal views are visible only to their owner. Project views are visible to anyone who can see the project, and only a lead, owner, or admin can change them. A view does not change issue permissions.

`assignee.includeCurrentUser` stays symbolic in the saved definition. The issue list resolves `assignee=me` to the caller's organization member id when the request runs. `high` does not include `urgent`.

Dragging a card on a filtered board keeps the drop position, including a reorder inside the same column. The client sends `placement` anchored to the loaded cards, not a raw index into the full column. A view does not reorder workflow columns. Column order stays the project's workflow order.

Filters are chosen in the create and edit dialog and saved with the view. The board shows those saved filters. A stale `revision` returns `409 CONFLICT`.
