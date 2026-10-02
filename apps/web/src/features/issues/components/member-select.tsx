/* eslint-disable shadcn/no-restyle */
import { getInitials } from "@teamos/shared";
import { ArrowsClockwiseIcon, CaretDownIcon, UserCircleIcon } from "@phosphor-icons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { IssueIconLabel } from "./issue-field-label";
import {
  currentUserMemberChoice,
  unassignedMemberChoice,
  type MemberChoice,
} from "../lib/member-choices";

interface MemberSelectShared {
  choices: readonly MemberChoice[];
  disabled?: boolean;
  error: string | null;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onSearch: (value: string) => void;
}

type MemberSelectProps = MemberSelectShared &
  (
    | {
        inline?: false;
        mode: "single";
        onValueChange: (value: MemberChoice | null) => void;
        value: MemberChoice;
      }
    | {
        inline?: boolean;
        mode: "multiple";
        onValueChange: (value: MemberChoice[]) => void;
        value: readonly MemberChoice[];
      }
  );

function MemberIdentity({ choice }: { choice: MemberChoice }) {
  if (choice.id === currentUserMemberChoice.id || choice.id === unassignedMemberChoice.id) {
    return <IssueIconLabel icon={UserCircleIcon} label={choice.name} />;
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar aria-hidden="true" className="size-5">
        <AvatarImage alt="" src={choice.image ?? undefined} />
        <AvatarFallback>{getInitials(choice.name)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 truncate">{choice.name}</span>
    </span>
  );
}

function MemberSelect(props: MemberSelectProps) {
  const anchor = useComboboxAnchor();

  if (props.mode === "single") {
    return <SingleMemberSelect {...props} />;
  }

  if (props.inline === true) {
    return <InlineMemberSelect {...props} />;
  }

  return <PopupMemberSelect {...props} anchor={anchor} />;
}

function SingleMemberSelect({
  choices,
  disabled = false,
  error,
  hasMore,
  loading,
  loadingMore,
  onLoadMore,
  onRetry,
  onSearch,
  onValueChange,
  value,
}: MemberSelectShared & {
  onValueChange: (value: MemberChoice | null) => void;
  value: MemberChoice;
}) {
  return (
    <Combobox
      autoHighlight
      disabled={disabled}
      filter={null}
      isItemEqualToValue={sameMember}
      itemToStringLabel={memberLabel}
      items={choices}
      onInputValueChange={(input) => {
        onSearch(input);
      }}
      onOpenChange={(open) => {
        if (!open) {
          onSearch("");
        }
      }}
      onValueChange={onValueChange}
      value={value}
    >
      <ComboboxTrigger
        render={
          <Button aria-label="Assignee" disabled={disabled} type="button" variant="outline" />
        }
      >
        <MemberIdentity choice={value} />
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput placeholder="Search name or email" showTrigger={false} />
        <MemberChoiceList
          error={error}
          hasMore={hasMore}
          loading={loading}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
          onRetry={onRetry}
        />
      </ComboboxContent>
    </Combobox>
  );
}

function PopupMemberSelect({
  anchor,
  choices,
  disabled = false,
  error,
  hasMore,
  loading,
  loadingMore,
  onLoadMore,
  onRetry,
  onSearch,
  onValueChange,
  value,
}: MemberSelectShared & {
  anchor: ReturnType<typeof useComboboxAnchor>;
  onValueChange: (value: MemberChoice[]) => void;
  value: readonly MemberChoice[];
}) {
  return (
    <Combobox
      autoHighlight
      disabled={disabled}
      filter={null}
      isItemEqualToValue={sameMember}
      itemToStringLabel={memberLabel}
      items={choices}
      multiple
      onInputValueChange={(input) => {
        onSearch(input);
      }}
      onOpenChange={(open) => {
        if (!open) {
          onSearch("");
        }
      }}
      onValueChange={onValueChange}
      value={[...value]}
    >
      <ComboboxChips className="min-w-56" ref={anchor}>
        <MemberChips choices={value} />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <MemberChoiceList
          error={error}
          hasMore={hasMore}
          loading={loading}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
          onRetry={onRetry}
        />
      </ComboboxContent>
    </Combobox>
  );
}

function InlineMemberSelect({
  choices,
  disabled = false,
  error,
  hasMore,
  loading,
  loadingMore,
  onLoadMore,
  onRetry,
  onSearch,
  onValueChange,
  value,
}: MemberSelectShared & {
  onValueChange: (value: MemberChoice[]) => void;
  value: readonly MemberChoice[];
}) {
  return (
    <Combobox
      autoHighlight
      disabled={disabled}
      filter={null}
      inline
      isItemEqualToValue={sameMember}
      itemToStringLabel={memberLabel}
      items={choices}
      multiple
      onInputValueChange={(input) => {
        onSearch(input);
      }}
      onValueChange={onValueChange}
      open
      value={[...value]}
    >
      <div
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
      >
        <ComboboxChips className="w-full">
          <MemberChips choices={value} />
        </ComboboxChips>
        <MemberChoiceList
          error={error}
          hasMore={hasMore}
          loading={loading}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
          onRetry={onRetry}
        />
      </div>
    </Combobox>
  );
}

function MemberChips({ choices }: { choices: readonly MemberChoice[] }) {
  return (
    <ComboboxValue>
      {(selected: readonly MemberChoice[]) => (
        <>
          {selected.map((choice) => (
            <ComboboxChip key={choice.id}>
              <MemberIdentity choice={choice} />
            </ComboboxChip>
          ))}
          <ComboboxChipsInput
            aria-label="Assignee"
            placeholder={choices.length === 0 ? "Search name or email" : ""}
          />
        </>
      )}
    </ComboboxValue>
  );
}

function MemberChoiceList({
  error,
  hasMore,
  loading,
  loadingMore,
  onLoadMore,
  onRetry,
}: {
  error: string | null;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  return (
    <>
      {loading ? (
        <div aria-busy="true" className="flex items-center gap-2 px-2 py-1.5" role="status">
          <Spinner />
          <span>Loading assignees</span>
        </div>
      ) : null}
      <ComboboxEmpty>No assignees</ComboboxEmpty>
      <ComboboxList className="max-h-64">
        {(choice: MemberChoice) => (
          <ComboboxItem key={choice.id} value={choice} className="p-0">
            {/* Member rows are the density case that uses the compact item size. */}
            <Item size="sm">
              <ItemContent>
                <ItemTitle>
                  <MemberIdentity choice={choice} />
                </ItemTitle>
              </ItemContent>
            </Item>
          </ComboboxItem>
        )}
      </ComboboxList>
      {error === null ? null : (
        <div className="flex flex-col gap-2 px-2 py-1.5">
          <p className="text-destructive">{error}</p>
          <Button
            className="w-full justify-start"
            onClick={onRetry}
            type="button"
            variant="outline"
          >
            <ArrowsClockwiseIcon data-icon="inline-start" />
            Retry
          </Button>
        </div>
      )}
      {hasMore ? (
        <Button
          className="w-full justify-start"
          disabled={loadingMore}
          onClick={onLoadMore}
          type="button"
          variant="ghost"
        >
          {loadingMore ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CaretDownIcon data-icon="inline-start" />
          )}
          Load more
        </Button>
      ) : null}
    </>
  );
}

function sameMember(item: MemberChoice, value: MemberChoice): boolean {
  return item.id === value.id;
}

function memberLabel(choice: MemberChoice): string {
  return choice.name;
}

export { MemberSelect };
