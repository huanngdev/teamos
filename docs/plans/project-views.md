# Project Views

Status: implemented.

A view belongs to one project. It stores a filter configuration, not a copy of the issues. Personal views are visible only to their owner. Project views are visible to anyone who can see the project, and only a lead, owner, or admin can change them. A view does not change issue permissions.

`assignee.includeCurrentUser` stays symbolic in the saved definition. The issue list resolves `assignee=me` to the caller's organization member id when the request runs. `high` does not include `urgent`.

Dragging a card on a filtered board changes its status and places it at the top of the destination column. The client does not send a filtered index. Column order stays the project's workflow order.

Filters are chosen in the create and edit dialog and saved with the view. The board shows those saved filters. A stale `revision` returns `409 CONFLICT`.
