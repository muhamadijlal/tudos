import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useState } from "react";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const YEARS_PER_PAGE = 12;

// Caption bulan/tahun di kalender day-grid dibikin clickable (ganti default
// react-day-picker-nya) — klik "September" pindah ke grid pilih bulan, klik
// "2026" pindah ke grid pilih tahun. Cuma panel pertama (displayIndex 0) yang
// interaktif buat DateRangePicker (numberOfMonths=2) — panel kedua cuma label
// biasa, biar gak ambigu bulan/tahun mana yang lagi "dipilih" pas drill-down.
function CalendarCaption({ calendarMonth, displayIndex, onPickMonth, onPickYear }) {
  const date = calendarMonth.date;
  if (displayIndex !== 0) {
    return (
      <div className="flex h-(--cell-size) w-full items-center justify-center px-(--cell-size) text-sm font-medium select-none">
        {date.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
      </div>
    );
  }
  return (
    <div className="flex h-(--cell-size) w-full items-center justify-center gap-1 px-(--cell-size)">
      <button
        type="button"
        onClick={onPickMonth}
        className="rounded-(--cell-radius) px-1.5 py-0.5 text-sm font-medium hover:bg-accent"
      >
        {date.toLocaleDateString("id-ID", { month: "long" })}
      </button>
      <button
        type="button"
        onClick={onPickYear}
        className="rounded-(--cell-radius) px-1.5 py-0.5 text-sm font-medium hover:bg-accent"
      >
        {date.getFullYear()}
      </button>
    </div>
  );
}

function GridNav({ label, onLabelClick, onPrev, onNext, prevLabel, nextLabel }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <Button type="button" variant="ghost" size="icon-sm" onClick={onPrev} aria-label={prevLabel}>
        <CaretLeft />
      </Button>
      {onLabelClick ? (
        <button
          type="button"
          onClick={onLabelClick}
          className="rounded-(--cell-radius) px-1.5 py-0.5 text-sm font-medium hover:bg-accent"
        >
          {label}
        </button>
      ) : (
        <span className="text-sm font-medium">{label}</span>
      )}
      <Button type="button" variant="ghost" size="icon-sm" onClick={onNext} aria-label={nextLabel}>
        <CaretRight />
      </Button>
    </div>
  );
}

function MonthGrid({ year, currentMonth, currentYear, onSelect, onYearNav, onLabelClick }) {
  return (
    <div className="w-56 p-3">
      <GridNav
        label={String(year)}
        onLabelClick={onLabelClick}
        onPrev={() => onYearNav(-1)}
        onNext={() => onYearNav(1)}
        prevLabel="Tahun sebelumnya"
        nextLabel="Tahun berikutnya"
      />
      <div className="grid grid-cols-3 gap-1.5">
        {MONTH_LABELS.map((label, index) => (
          <Button
            key={label}
            type="button"
            variant={year === currentYear && index === currentMonth ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSelect(index)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function YearGrid({ pageStart, currentYear, onSelect, onPageNav }) {
  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => pageStart + i);
  return (
    <div className="w-56 p-3">
      <GridNav
        label={`${pageStart} – ${pageStart + YEARS_PER_PAGE - 1}`}
        onPrev={() => onPageNav(-1)}
        onNext={() => onPageNav(1)}
        prevLabel="Halaman tahun sebelumnya"
        nextLabel="Halaman tahun berikutnya"
      />
      <div className="grid grid-cols-3 gap-1.5">
        {years.map((year) => (
          <Button
            key={year}
            type="button"
            variant={year === currentYear ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSelect(year)}
          >
            {year}
          </Button>
        ))}
      </div>
    </div>
  );
}

// Calendar (react-day-picker) dengan caption bulan/tahun yang bisa diklik buat
// drill-down: hari -> bulan -> tahun (mirip date picker Material/Ant), bukan
// native <select> bawaan react-day-picker (captionLayout="dropdown") yang gak
// konsisten gaya-nya lintas browser/OS.
export function DateNavCalendar({ className, month: monthProp, onMonthChange, ...calendarProps }) {
  const [month, setMonth] = useState(monthProp);
  const [view, setView] = useState("days");
  const [monthGridYear, setMonthGridYear] = useState(() => monthProp.getFullYear());
  const [yearPageStart, setYearPageStart] = useState(
    () => Math.floor(monthProp.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE,
  );

  function updateMonth(next) {
    setMonth(next);
    onMonthChange?.(next);
  }

  if (view === "months") {
    return (
      <MonthGrid
        year={monthGridYear}
        currentMonth={month.getMonth()}
        currentYear={month.getFullYear()}
        onYearNav={(delta) => setMonthGridYear((y) => y + delta)}
        onLabelClick={() => {
          setYearPageStart(Math.floor(monthGridYear / YEARS_PER_PAGE) * YEARS_PER_PAGE);
          setView("years");
        }}
        onSelect={(monthIndex) => {
          updateMonth(new Date(monthGridYear, monthIndex, 1));
          setView("days");
        }}
      />
    );
  }

  if (view === "years") {
    return (
      <YearGrid
        pageStart={yearPageStart}
        currentYear={month.getFullYear()}
        onPageNav={(delta) => setYearPageStart((s) => s + delta * YEARS_PER_PAGE)}
        onSelect={(year) => {
          updateMonth(new Date(year, month.getMonth(), 1));
          setView("days");
        }}
      />
    );
  }

  return (
    <Calendar
      {...calendarProps}
      month={month}
      onMonthChange={updateMonth}
      className={cn(className)}
      components={{
        MonthCaption: (props) => (
          <CalendarCaption
            {...props}
            onPickMonth={() => {
              setMonthGridYear(month.getFullYear());
              setView("months");
            }}
            onPickYear={() => {
              setYearPageStart(Math.floor(month.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE);
              setView("years");
            }}
          />
        ),
      }}
    />
  );
}
