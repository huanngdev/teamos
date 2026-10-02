import {
  emptyIssueViewDefinition,
  getIssueViewVisibilityLabel,
  issuePriorities,
  issueStatusCategories,
  issueViewVisibilitySchema,
  normalizeIssueViewDefinition,
  type IssueViewDefinition,
  type IssueViewFilters,
  type IssueViewSummary,
  type IssueViewVisibility,
} from "@teamos/shared";
import { useState } from "react";

import {
  browserTimeZone,
  selectedAssigneeIds,
  setAssignees,
  setFilterDate,
  setFilterNumber,
  setFilterText,
  toggleFilterValue,
} from "../lib/issue-view-draft";

type IssueViewFormMode = "closed" | "create" | "edit";

type IssueViewFormSubmit =
  | {
      definition: IssueViewDefinition;
      mode: "create";
      name: string;
      visibility: IssueViewVisibility;
    }
  | {
      definition: IssueViewDefinition;
      expectedRevision: number;
      id: string;
      mode: "edit";
      name: string;
      visibility: IssueViewVisibility;
    };

interface IssueViewFormState {
  definition: IssueViewDefinition;
  errorMessage: string | null;
  isPending: boolean;
  isValid: boolean;
  mode: IssueViewFormMode;
  name: string;
  onClearCategories: () => void;
  onClearPriorities: () => void;
  onClearStatuses: () => void;
  onResetFilters: () => void;
  onSetDate: (
    field: "createdFrom" | "createdTo" | "updatedFrom" | "updatedTo",
    value: string,
  ) => void;
  onSetDateRange: (field: "created" | "updated", from: string, to: string) => void;
  onSetNumber: (bound: "max" | "min", value: string) => void;
  onSetAssignees: (tokens: readonly string[]) => void;
  onSetText: (field: "description" | "q" | "title", value: string) => void;
  onToggleCategory: (category: string) => void;
  onTogglePriority: (priority: string) => void;
  onToggleStatus: (statusId: string) => void;
  reset: () => void;
  selectedAssignees: string[];
  selectedCategories: string[];
  selectedPriorities: string[];
  selectedStatuses: string[];
  setErrorMessage: (message: string | null) => void;
  setName: (value: string) => void;
  setVisibility: (value: string | null) => void;
  showVisibility: boolean;
  submit: () => void;
  visibility: IssueViewVisibility;
  visibilityLabel: string;
}

function useIssueViewForm(options: {
  canCreateProjectView: boolean;
  isPending: boolean;
  onSubmit: (value: IssueViewFormSubmit) => void;
}): IssueViewFormState & {
  openCreate: () => void;
  openEdit: (view: IssueViewSummary) => void;
} {
  const [mode, setMode] = useState<IssueViewFormMode>("closed");
  const [name, setName] = useState("");
  const [visibility, setVisibilityState] = useState<IssueViewVisibility>("personal");
  const [filters, setFilters] = useState<IssueViewFilters>(
    emptyIssueViewDefinition(browserTimeZone()).filters,
  );
  const [viewId, setViewId] = useState<string | null>(null);
  const [expectedRevision, setExpectedRevision] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const definition: IssueViewDefinition = { filters, version: 1 };

  function reset() {
    setMode("closed");
    setName("");
    setVisibilityState("personal");
    setFilters(emptyIssueViewDefinition(browserTimeZone()).filters);
    setViewId(null);
    setExpectedRevision(null);
    setErrorMessage(null);
  }

  function openCreate() {
    reset();
    setMode("create");
  }

  function openEdit(view: IssueViewSummary) {
    setMode("edit");
    setName(view.name);
    setVisibilityState(view.visibility);
    setFilters(view.definition.filters);
    setViewId(view.id);
    setExpectedRevision(view.revision);
    setErrorMessage(null);
  }

  return {
    definition,
    errorMessage,
    isPending: options.isPending,
    isValid: name.trim().length > 0 && name.trim().length <= 80,
    mode,
    name,
    onClearCategories: () => {
      setFilters((current) => ({ ...current, categories: undefined }));
    },
    onClearPriorities: () => {
      setFilters((current) => ({ ...current, priorities: undefined }));
    },
    onClearStatuses: () => {
      setFilters((current) => ({ ...current, statusIds: undefined }));
    },
    onResetFilters: () => {
      setFilters((current) => ({ timeZone: current.timeZone }));
    },
    onSetDate: (field, value) => {
      setFilters((current) => setFilterDate(current, field, value));
    },
    onSetDateRange: (field, from, to) => {
      setFilters((current) =>
        setFilterDate(
          setFilterDate(current, field === "created" ? "createdFrom" : "updatedFrom", from),
          field === "created" ? "createdTo" : "updatedTo",
          to,
        ),
      );
    },
    onSetNumber: (bound, value) => {
      setFilters((current) => setFilterNumber(current, bound, value));
    },
    onSetAssignees: (tokens) => {
      setFilters((current) => setAssignees(current, tokens));
    },
    onSetText: (field, value) => {
      setFilters((current) => setFilterText(current, field, value));
    },
    onToggleCategory: (category) => {
      const parsed = issueStatusCategories.find((item) => item === category);

      if (parsed === undefined) {
        return;
      }

      setFilters((current) => ({
        ...current,
        categories: toggleFilterValue(current.categories, parsed),
      }));
    },
    onTogglePriority: (priority) => {
      const parsed = issuePriorities.find((item) => item === priority);

      if (parsed === undefined) {
        return;
      }

      setFilters((current) => ({
        ...current,
        priorities: toggleFilterValue(current.priorities, parsed),
      }));
    },
    onToggleStatus: (statusId) => {
      setFilters((current) => ({
        ...current,
        statusIds: toggleFilterValue(current.statusIds, statusId),
      }));
    },
    openCreate,
    openEdit,
    reset,
    selectedAssignees: selectedAssigneeIds(filters),
    selectedCategories: filters.categories ?? [],
    selectedPriorities: filters.priorities ?? [],
    selectedStatuses: filters.statusIds ?? [],
    setErrorMessage,
    setName,
    setVisibility: (value) => {
      const parsed = issueViewVisibilitySchema.safeParse(value);

      if (parsed.success && (parsed.data === "personal" || options.canCreateProjectView)) {
        setVisibilityState(parsed.data);
      }
    },
    showVisibility: options.canCreateProjectView,
    submit: () => {
      if (mode === "closed" || name.trim().length === 0 || options.isPending) {
        return;
      }

      let next: IssueViewDefinition;

      try {
        next = normalizeIssueViewDefinition({ filters, version: 1 });
      } catch {
        setErrorMessage("These filters are not valid.");
        return;
      }

      if (mode === "create") {
        options.onSubmit({
          definition: next,
          mode,
          name: name.trim(),
          visibility,
        });
        return;
      }

      if (viewId === null || expectedRevision === null) {
        return;
      }

      options.onSubmit({
        definition: next,
        expectedRevision,
        id: viewId,
        mode,
        name: name.trim(),
        visibility,
      });
    },
    visibility,
    visibilityLabel: getIssueViewVisibilityLabel(visibility),
  };
}

export { useIssueViewForm, type IssueViewFormState, type IssueViewFormSubmit };
