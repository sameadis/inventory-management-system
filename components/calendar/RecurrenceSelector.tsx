import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Repeat, Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface RecurrenceConfig {
  frequency: "none" | "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
  monthlyType?: "dayOfMonth" | "weekday";
  weekOfMonth?: number;
  dayOfWeekForMonth?: number;
  endType: "never" | "on" | "after";
  endDate?: string;
  occurrences?: number;
}

interface RecurrenceSelectorProps {
  value: RecurrenceConfig;
  onChange: (config: RecurrenceConfig) => void;
  startDate?: string;
}

const DAYS_OF_WEEK = [
  { label: "S", fullLabel: "Sunday", value: 0 },
  { label: "M", fullLabel: "Monday", value: 1 },
  { label: "T", fullLabel: "Tuesday", value: 2 },
  { label: "W", fullLabel: "Wednesday", value: 3 },
  { label: "T", fullLabel: "Thursday", value: 4 },
  { label: "F", fullLabel: "Friday", value: 5 },
  { label: "S", fullLabel: "Saturday", value: 6 },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEK_ORDINALS = [
  { label: "First", value: 1 },
  { label: "Second", value: 2 },
  { label: "Third", value: 3 },
  { label: "Fourth", value: 4 },
  { label: "Last", value: -1 },
];

function getWeekOrdinalOfDate(date: Date): number {
  const dayOfMonth = date.getDate();

  const nextWeekSameDay = new Date(date);
  nextWeekSameDay.setDate(dayOfMonth + 7);
  if (nextWeekSameDay.getMonth() !== date.getMonth()) {
    return -1;
  }

  return Math.ceil(dayOfMonth / 7);
}

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  value,
  onChange,
  startDate,
}) => {
  const [isExpanded, setIsExpanded] = useState(value.frequency !== "none");

  const updateConfig = (updates: Partial<RecurrenceConfig>) => {
    onChange({ ...value, ...updates });
  };

  const toggleDayOfWeek = (day: number) => {
    const currentDays = value.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort((a, b) => a - b);
    updateConfig({ daysOfWeek: newDays });
  };

  useEffect(() => {
    if (
      value.frequency === "weekly" &&
      (!value.daysOfWeek || value.daysOfWeek.length === 0) &&
      startDate
    ) {
      const startDay = new Date(startDate).getDay();
      updateConfig({ daysOfWeek: [startDay] });
    }
  }, [value.frequency, startDate]);

  useEffect(() => {
    setIsExpanded(value.frequency !== "none");
  }, [value.frequency]);

  const handleFrequencyChange = (freq: string) => {
    const newFreq = freq as RecurrenceConfig["frequency"];

    if (newFreq === "none") {
      updateConfig({
        frequency: "none",
        interval: 1,
        endType: "never",
        daysOfWeek: undefined,
        dayOfMonth: undefined,
        monthOfYear: undefined,
        monthlyType: undefined,
        weekOfMonth: undefined,
        dayOfWeekForMonth: undefined,
        endDate: undefined,
        occurrences: undefined,
      });
    } else {
      const startDateObj = startDate ? new Date(startDate) : null;
      updateConfig({
        frequency: newFreq,
        interval: 1,
        endType: "never",
        daysOfWeek:
          newFreq === "weekly" && startDateObj
            ? [startDateObj.getDay()]
            : undefined,
        dayOfMonth:
          (newFreq === "monthly" || newFreq === "yearly") && startDateObj
            ? startDateObj.getDate()
            : undefined,
        monthOfYear:
          newFreq === "yearly" && startDateObj
            ? startDateObj.getMonth() + 1
            : undefined,
        monthlyType: newFreq === "monthly" ? "dayOfMonth" : undefined,
        weekOfMonth:
          newFreq === "monthly" && startDateObj
            ? getWeekOrdinalOfDate(startDateObj)
            : undefined,
        dayOfWeekForMonth:
          newFreq === "monthly" && startDateObj
            ? startDateObj.getDay()
            : undefined,
      });
    }
  };

  if (value.frequency === "none") {
    return (
      <div className="space-y-2">
        <Label htmlFor="recurrence" className="text-sm font-medium">
          Recurrence
        </Label>
        <Select
          value={value.frequency}
          onValueChange={handleFrequencyChange}
        >
          <SelectTrigger id="recurrence" className="h-10">
            <SelectValue placeholder="Does not repeat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Does not repeat</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold">Recurring Event</Label>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFrequencyChange("none")}
          className="h-8 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="mr-1 h-3 w-3" />
          Remove
        </Button>
      </div>

      <div className="space-y-4 rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label
              htmlFor="freq-select"
              className="text-xs font-medium text-muted-foreground"
            >
              Repeats
            </Label>
            <Select
              value={value.frequency}
              onValueChange={handleFrequencyChange}
            >
              <SelectTrigger id="freq-select" className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="interval"
              className="text-xs font-medium text-muted-foreground"
            >
              Every
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="interval"
                type="number"
                min="1"
                max="99"
                value={value.interval}
                onChange={(e) =>
                  updateConfig({
                    interval: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="h-9 bg-background"
              />
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {value.frequency === "daily" &&
                  (value.interval === 1 ? "day" : "days")}
                {value.frequency === "weekly" &&
                  (value.interval === 1 ? "week" : "weeks")}
                {value.frequency === "monthly" &&
                  (value.interval === 1 ? "month" : "months")}
                {value.frequency === "yearly" &&
                  (value.interval === 1 ? "year" : "years")}
              </span>
            </div>
          </div>
        </div>

        {value.frequency === "weekly" && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Repeat on
            </Label>
            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = (value.daysOfWeek || []).includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDayOfWeek(day.value)}
                    title={day.fullLabel}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-md text-xs font-semibold transition-all duration-200",
                      "border-2 hover:scale-105 active:scale-95",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border bg-background hover:border-primary/50 hover:bg-primary/5",
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            {(!value.daysOfWeek || value.daysOfWeek.length === 0) && (
              <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                <span className="h-1 w-1 rounded-full bg-destructive" />
                Please select at least one day
              </p>
            )}
          </div>
        )}

        {value.frequency === "monthly" && (
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">
              Repeat on
            </Label>
            <RadioGroup
              value={value.monthlyType || "dayOfMonth"}
              onValueChange={(type) =>
                updateConfig({
                  monthlyType: type as "dayOfMonth" | "weekday",
                })
              }
              className="space-y-2"
            >
              <div
                className={cn(
                  "flex items-center space-x-3 rounded-md p-2.5 transition-all",
                  value.monthlyType === "dayOfMonth" || !value.monthlyType
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50",
                )}
              >
                <RadioGroupItem value="dayOfMonth" id="dayOfMonth-radio" />
                <div className="flex flex-1 items-center gap-2">
                  <Label
                    htmlFor="dayOfMonth-radio"
                    className="cursor-pointer text-sm font-normal"
                  >
                    Day
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={value.dayOfMonth || 1}
                    onChange={(e) =>
                      updateConfig({
                        dayOfMonth: Math.min(
                          31,
                          Math.max(1, parseInt(e.target.value) || 1),
                        ),
                        monthlyType: "dayOfMonth",
                      })
                    }
                    onClick={() =>
                      updateConfig({
                        monthlyType: "dayOfMonth",
                      })
                    }
                    className={cn(
                      "h-8 w-16 bg-background text-xs",
                      value.monthlyType !== "dayOfMonth" &&
                        value.monthlyType &&
                        "opacity-50",
                    )}
                    disabled={value.monthlyType === "weekday"}
                  />
                  <span className="text-xs text-muted-foreground">
                    of the month
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  "flex items-center space-x-3 rounded-md p-2.5 transition-all",
                  value.monthlyType === "weekday"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50",
                )}
              >
                <RadioGroupItem value="weekday" id="weekday-radio" />
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <Select
                    value={String(value.weekOfMonth || 1)}
                    onValueChange={(week) =>
                      updateConfig({
                        weekOfMonth: parseInt(week),
                        monthlyType: "weekday",
                      })
                    }
                    disabled={value.monthlyType !== "weekday"}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-8 w-24 bg-background text-xs",
                        value.monthlyType !== "weekday" && "opacity-50",
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEK_ORDINALS.map((ordinal) => (
                        <SelectItem
                          key={ordinal.value}
                          value={String(ordinal.value)}
                        >
                          {ordinal.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(value.dayOfWeekForMonth ?? 0)}
                    onValueChange={(day) =>
                      updateConfig({
                        dayOfWeekForMonth: parseInt(day),
                        monthlyType: "weekday",
                      })
                    }
                    disabled={value.monthlyType !== "weekday"}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-8 w-28 bg-background text-xs",
                        value.monthlyType !== "weekday" && "opacity-50",
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={String(day.value)}>
                          {day.fullLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </RadioGroup>
          </div>
        )}

        {value.frequency === "yearly" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label
                htmlFor="monthOfYear"
                className="text-xs font-medium text-muted-foreground"
              >
                Month
              </Label>
              <Select
                value={String(value.monthOfYear || 1)}
                onValueChange={(month) =>
                  updateConfig({ monthOfYear: parseInt(month) })
                }
              >
                <SelectTrigger
                  id="monthOfYear"
                  className="h-9 bg-background"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="yearDayOfMonth"
                className="text-xs font-medium text-muted-foreground"
              >
                Day
              </Label>
              <Input
                id="yearDayOfMonth"
                type="number"
                min="1"
                max="31"
                value={value.dayOfMonth || 1}
                onChange={(e) =>
                  updateConfig({
                    dayOfMonth: Math.min(
                      31,
                      Math.max(1, parseInt(e.target.value) || 1),
                    ),
                  })
                }
                className="h-9 bg-background"
              />
            </div>
          </div>
        )}

        <div className="border-border/50 border-t" />

        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground">
            Ends
          </Label>
          <RadioGroup
            value={value.endType}
            onValueChange={(endType) =>
              updateConfig({
                endType: endType as RecurrenceConfig["endType"],
              })
            }
            className="space-y-2"
          >
            <div
              className={cn(
                "flex items-center space-x-3 rounded-md p-2.5 transition-all",
                value.endType === "never"
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50",
              )}
            >
              <RadioGroupItem value="never" id="never" />
              <Label
                htmlFor="never"
                className="flex-1 cursor-pointer text-sm font-normal"
              >
                Never
              </Label>
            </div>

            <div
              className={cn(
                "flex items-center space-x-3 rounded-md p-2.5 transition-all",
                value.endType === "on"
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50",
              )}
            >
              <RadioGroupItem value="on" id="on" />
              <div className="flex flex-1 items-center gap-2">
                <Label
                  htmlFor="on"
                  className="cursor-pointer text-sm font-normal"
                >
                  On
                </Label>
                <div className="relative flex-1">
                  <CalendarIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={value.endDate || ""}
                    onChange={(e) =>
                      updateConfig({
                        endDate: e.target.value,
                        endType: "on",
                      })
                    }
                    onClick={() =>
                      updateConfig({
                        endType: "on",
                      })
                    }
                    min={startDate}
                    className={cn(
                      "h-8 bg-background pl-8 text-xs",
                      value.endType !== "on" && "opacity-50",
                    )}
                    disabled={value.endType !== "on"}
                  />
                </div>
              </div>
            </div>

            <div
              className={cn(
                "flex items-center space-x-3 rounded-md p-2.5 transition-all",
                value.endType === "after"
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50",
              )}
            >
              <RadioGroupItem value="after" id="after" />
              <div className="flex flex-1 items-center gap-2">
                <Label
                  htmlFor="after"
                  className="cursor-pointer text-sm font-normal"
                >
                  After
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="999"
                  value={value.occurrences || 1}
                  onChange={(e) =>
                    updateConfig({
                      occurrences: Math.max(
                        1,
                        parseInt(e.target.value) || 1,
                      ),
                      endType: "after",
                    })
                  }
                  onClick={() =>
                    updateConfig({
                      endType: "after",
                    })
                  }
                  className={cn(
                    "h-8 w-16 bg-background text-xs",
                    value.endType !== "after" && "opacity-50",
                  )}
                  disabled={value.endType !== "after"}
                />
                <span className="text-xs text-muted-foreground">times</span>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="border-border/50 mt-4 border-t pt-3">
          <div className="flex items-start gap-2 rounded-md bg-background/80 p-3 backdrop-blur-sm">
            <Repeat className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Summary
              </p>
              <p className="text-sm leading-relaxed text-foreground">
                {getRecurrenceSummary(value)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function getRecurrenceSummary(config: RecurrenceConfig): string {
  if (config.frequency === "none") return "Does not repeat";

  let summary = `Repeats every ${config.interval > 1 ? config.interval + " " : ""}`;

  switch (config.frequency) {
    case "daily":
      summary += config.interval === 1 ? "day" : "days";
      break;
    case "weekly":
      summary += config.interval === 1 ? "week" : "weeks";
      if (config.daysOfWeek && config.daysOfWeek.length > 0) {
        const dayNames = config.daysOfWeek
          .map((d) => DAYS_OF_WEEK[d].fullLabel)
          .join(", ");
        summary += ` on ${dayNames}`;
      }
      break;
    case "monthly":
      summary += config.interval === 1 ? "month" : "months";
      if (
        config.monthlyType === "weekday" &&
        config.weekOfMonth !== undefined &&
        config.dayOfWeekForMonth !== undefined
      ) {
        const ordinalLabel =
          WEEK_ORDINALS.find((o) => o.value === config.weekOfMonth)?.label.toLowerCase() ||
          "";
        const dayLabel =
          DAYS_OF_WEEK[config.dayOfWeekForMonth]?.fullLabel || "";
        summary += ` on the ${ordinalLabel} ${dayLabel}`;
      } else if (config.dayOfMonth) {
        const suffix = getDaySuffix(config.dayOfMonth);
        summary += ` on the ${config.dayOfMonth}${suffix}`;
      }
      break;
    case "yearly":
      summary += config.interval === 1 ? "year" : "years";
      if (config.monthOfYear && config.dayOfMonth) {
        const suffix = getDaySuffix(config.dayOfMonth);
        summary += ` on ${
          MONTHS[config.monthOfYear - 1]
        } ${config.dayOfMonth}${suffix}`;
      }
      break;
  }

  if (config.endType === "on" && config.endDate) {
    const date = new Date(config.endDate);
    summary += `, until ${date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`;
  } else if (config.endType === "after" && config.occurrences) {
    summary += `, for ${config.occurrences} occurrence${
      config.occurrences > 1 ? "s" : ""
    }`;
  }

  return summary;
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function recurrenceConfigToRRule(
  config: RecurrenceConfig,
  _startDate: Date,
): string | null {
  if (config.frequency === "none") return null;

  const parts: string[] = [];

  parts.push(`FREQ=${config.frequency.toUpperCase()}`);

  if (config.interval > 1) {
    parts.push(`INTERVAL=${config.interval}`);
  }

  if (
    config.frequency === "weekly" &&
    config.daysOfWeek &&
    config.daysOfWeek.length > 0
  ) {
    const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const days = config.daysOfWeek.map((d) => dayMap[d]).join(",");
    parts.push(`BYDAY=${days}`);
  }

  if (
    config.frequency === "monthly" &&
    config.monthlyType === "weekday" &&
    config.weekOfMonth !== undefined &&
    config.dayOfWeekForMonth !== undefined
  ) {
    const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const dayCode = dayMap[config.dayOfWeekForMonth];
    parts.push(`BYDAY=${config.weekOfMonth}${dayCode}`);
  } else if (
    (config.frequency === "monthly" &&
      config.monthlyType !== "weekday" &&
      config.dayOfMonth) ||
    (config.frequency === "yearly" && config.dayOfMonth)
  ) {
    parts.push(`BYMONTHDAY=${config.dayOfMonth}`);
  }

  if (config.frequency === "yearly" && config.monthOfYear) {
    parts.push(`BYMONTH=${config.monthOfYear}`);
  }

  if (config.endType === "on" && config.endDate) {
    const endDate = new Date(config.endDate);
    endDate.setHours(23, 59, 59, 999);
    const until =
      endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    parts.push(`UNTIL=${until}`);
  } else if (config.endType === "after" && config.occurrences) {
    parts.push(`COUNT=${config.occurrences}`);
  }

  return parts.join(";");
}

export function rruleToRecurrenceConfig(
  rrule: string | null,
): RecurrenceConfig {
  if (!rrule) {
    return {
      frequency: "none",
      interval: 1,
      endType: "never",
    };
  }

  const config: RecurrenceConfig = {
    frequency: "none",
    interval: 1,
    endType: "never",
  };

  const parts = rrule.split(";");

  for (const part of parts) {
    const [key, value] = part.split("=");

    switch (key) {
      case "FREQ":
        config.frequency = value.toLowerCase() as RecurrenceConfig["frequency"];
        break;
      case "INTERVAL":
        config.interval = parseInt(value);
        break;
      case "BYDAY": {
        const dayMap: Record<string, number> = {
          SU: 0,
          MO: 1,
          TU: 2,
          WE: 3,
          TH: 4,
          FR: 5,
          SA: 6,
        };
        const ordinalMatch = value.match(/^(-?\d+)(SU|MO|TU|WE|TH|FR|SA)$/);
        if (ordinalMatch) {
          config.monthlyType = "weekday";
          config.weekOfMonth = parseInt(ordinalMatch[1]);
          config.dayOfWeekForMonth = dayMap[ordinalMatch[2]];
        } else {
          config.daysOfWeek = value
            .split(",")
            .map((d) => dayMap[d])
            .filter((d) => d !== undefined);
        }
        break;
      }
      case "BYMONTHDAY":
        config.dayOfMonth = parseInt(value);
        config.monthlyType = "dayOfMonth";
        break;
      case "BYMONTH":
        config.monthOfYear = parseInt(value);
        break;
      case "UNTIL":
        config.endType = "on";
        config.endDate = value
          .slice(0, 8)
          .replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
        break;
      case "COUNT":
        config.endType = "after";
        config.occurrences = parseInt(value);
        break;
    }
  }

  return config;
}


