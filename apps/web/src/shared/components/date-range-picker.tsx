import { formatDate } from "@teamos/shared";
import { CalendarBlankIcon } from "@phosphor-icons/react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function DateRangePicker({
  from,
  id,
  onChange,
  to,
}: {
  from: string;
  id?: string;
  onChange: (from: string, to: string) => void;
  to: string;
}) {
  const selected = toDateRange(from, to);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button className="w-full justify-start" id={id} type="button" variant="outline">
            <CalendarBlankIcon data-icon="inline-start" />
            <span className="min-w-0 truncate">{rangeLabel(selected)}</span>
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto">
        <DateRangeCalendar from={from} months={2} onChange={onChange} to={to} />
      </PopoverContent>
    </Popover>
  );
}

function DateRangeCalendar({
  from,
  months = 1,
  onChange,
  to,
}: {
  from: string;
  months?: number;
  onChange: (from: string, to: string) => void;
  to: string;
}) {
  const selected = toDateRange(from, to);

  return (
    <Calendar
      defaultMonth={selected?.from}
      mode="range"
      numberOfMonths={months}
      onSelect={(range) => {
        onChange(toCalendarKey(range?.from), toCalendarKey(range?.to));
      }}
      selected={selected}
    />
  );
}

function toDateRange(from: string, to: string): DateRange | undefined {
  const start = fromCalendarKey(from);

  if (start === undefined) {
    return undefined;
  }

  return { from: start, to: fromCalendarKey(to) };
}

function fromCalendarKey(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match === null) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }

  return date;
}

function toCalendarKey(date: Date | undefined): string {
  if (date === undefined) {
    return "";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function rangeLabel(range: DateRange | undefined): string {
  if (range?.from === undefined) {
    return "Select dates";
  }

  if (range.to === undefined) {
    return formatDate(range.from);
  }

  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
}

export { DateRangeCalendar, DateRangePicker };
