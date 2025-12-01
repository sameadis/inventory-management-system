"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, MapPin, User, Repeat } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  RejectionReasonDialog,
} from "@/components/events/RejectionReasonDialog";
import {
  RecurringActionScope,
  RecurringEventActionDialog,
} from "@/components/events/RecurringEventActionDialog";
import {
  RecurrenceConfig,
  RecurrenceSelector,
  recurrenceConfigToRRule,
  rruleToRecurrenceConfig,
} from "@/components/calendar/RecurrenceSelector";

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string | null;
  initialDate?: Date | null;
  onSuccess: () => void;
  allEvents?: any[];
  onEventSelect?: (eventId: string) => void;
}

const eventSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
    description: z.string().max(1000, "Description too long").optional(),
    room_id: z.string().uuid("Invalid room"),
    starts_at: z.string().min(1, "Start time is required"),
    ends_at: z.string().min(1, "End time is required"),
  })
  .refine(
    (data) => new Date(data.ends_at) > new Date(data.starts_at),
    {
      message: "End time must be after start time",
      path: ["ends_at"],
    },
  );

const EventDialog = ({
  open,
  onOpenChange,
  eventId,
  initialDate,
  onSuccess,
  allEvents = [],
  onEventSelect,
}: EventDialogProps) => {
  const supabase = createClient();
  const { user, isSystemAdmin } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    room_id: "",
    starts_at: "",
    ends_at: "",
  });

  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({
    frequency: "none",
    interval: 1,
    endType: "never",
  });

  const [validationError, setValidationError] = useState("");
  const [roomConflict, setRoomConflict] = useState<{
    hasConflict: boolean;
    conflictingEvent?: any;
    creatorName?: string;
  }>({ hasConflict: false });
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionLoading, setRejectionLoading] = useState(false);
  const [recurringDeleteDialogOpen, setRecurringDeleteDialogOpen] =
    useState(false);
  const [recurringRejectDialogOpen, setRecurringRejectDialogOpen] =
    useState(false);
  const [recurringUpdateDialogOpen, setRecurringUpdateDialogOpen] =
    useState(false);
  const [pendingRejectionReason, setPendingRejectionReason] = useState("");
  const [pendingUpdateData, setPendingUpdateData] = useState<any>(null);

  const isAdmin = isSystemAdmin;

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  const { data: rooms } = useQuery({
    queryKey: ["rooms", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("organization_id", currentOrganization.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.id,
  });

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (event) {
      const startsAt = new Date(event.starts_at);
      const endsAt = new Date(event.ends_at);

      setFormData({
        title: event.title,
        description: event.description || "",
        room_id: event.room_id,
        starts_at: formatDateTimeLocal(startsAt),
        ends_at: formatDateTimeLocal(endsAt),
      });

      if (event.recurrence_rule) {
        setRecurrence(rruleToRecurrenceConfig(event.recurrence_rule));
      } else {
        setRecurrence({
          frequency: "none",
          interval: 1,
          endType: "never",
        });
      }
    } else {
      const baseDate = initialDate || new Date();
      let startDate: Date;
      if (initialDate) {
        const hasTime =
          baseDate.getHours() !== 0 || baseDate.getMinutes() !== 0;
        startDate = hasTime
          ? baseDate
          : new Date(
              baseDate.getFullYear(),
              baseDate.getMonth(),
              baseDate.getDate(),
              9,
              0,
            );
      } else {
        startDate = baseDate;
      }
      const oneHourLater = new Date(startDate.getTime() + 60 * 60 * 1000);

      setFormData({
        title: "",
        description: "",
        room_id: "",
        starts_at: formatDateTimeLocal(startDate),
        ends_at: formatDateTimeLocal(oneHourLater),
      });

      setRecurrence({
        frequency: "none",
        interval: 1,
        endType: "never",
      });
    }
    setValidationError("");
  }, [event, initialDate]);

  const dateTimeLocalToISO = (dateTimeLocal: string): string => {
    const date = new Date(dateTimeLocal);
    return date.toISOString();
  };

  const checkRoomConflict = async () => {
    if (!formData.room_id || !formData.starts_at || !formData.ends_at) {
      setRoomConflict({ hasConflict: false });
      return;
    }

    try {
      const selectedRoom = rooms?.find((r: any) => r.id === formData.room_id);
      if (selectedRoom?.allow_overlap) {
        setRoomConflict({ hasConflict: false });
        return;
      }

      const startISO = dateTimeLocalToISO(formData.starts_at);
      const endISO = dateTimeLocalToISO(formData.ends_at);

      const { data: conflictingEvents, error } = await supabase
        .from("events")
        .select(
          `
          id,
          title,
          starts_at,
          ends_at,
          status,
          created_by
        `,
        )
        .eq("room_id", formData.room_id)
        .in("status", ["pending_review", "approved", "published"])
        .or(`and(starts_at.lt.${endISO},ends_at.gt.${startISO})`);

      if (error) throw error;

      const conflicts =
        conflictingEvents?.filter((e: any) => e.id !== eventId) || [];

      if (conflicts.length > 0) {
        const conflict = conflicts[0];

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", conflict.created_by)
          .single();

        const creatorName = profile?.full_name || "Another user";
        setRoomConflict({
          hasConflict: true,
          conflictingEvent: conflict,
          creatorName,
        });
      } else {
        setRoomConflict({ hasConflict: false });
      }
    } catch (error) {
      console.error("Error checking room conflicts:", error);
    }
  };

  useEffect(() => {
    if (formData.starts_at && formData.ends_at) {
      const start = new Date(formData.starts_at);
      const end = new Date(formData.ends_at);

      if (end <= start) {
        setValidationError("End time must be after start time");
      } else {
        setValidationError("");
      }
    }
  }, [formData.starts_at, formData.ends_at]);

  useEffect(() => {
    checkRoomConflict();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.room_id, formData.starts_at, formData.ends_at, eventId, rooms]);

  const handleStartTimeChange = (value: string) => {
    setFormData({ ...formData, starts_at: value });

    if (value && formData.ends_at) {
      const start = new Date(value);
      const end = new Date(formData.ends_at);

      if (end <= start) {
        const newEnd = new Date(start.getTime() + 60 * 60 * 1000);
        setFormData({
          ...formData,
          starts_at: value,
          ends_at: formatDateTimeLocal(newEnd),
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!currentOrganization?.id) {
        toast({
          title: "Error",
          description: "No organization selected",
        });
        setLoading(false);
        return;
      }

      const validated = eventSchema.parse(formData);

      if (
        recurrence.frequency === "weekly" &&
        (!recurrence.daysOfWeek || recurrence.daysOfWeek.length === 0)
      ) {
        toast({
          title: "Validation error",
          description: "Please select at least one day for weekly recurrence",
        });
        setLoading(false);
        return;
      }

      const startsAt = dateTimeLocalToISO(validated.starts_at);
      const endsAt = dateTimeLocalToISO(validated.ends_at);

      const eventData = {
        title: validated.title,
        description: validated.description,
        room_id: validated.room_id,
        starts_at: startsAt,
        ends_at: endsAt,
        organization_id: currentOrganization.id,
      };

      if (eventId) {
        const shouldAutoSubmit =
          !isAdmin &&
          event &&
          (event.status === "draft" || event.status === "pending_review");

        const updatePayload = shouldAutoSubmit
          ? { ...eventData, status: "pending_review" as const }
          : eventData;

        if (event?.is_recurring) {
          setPendingUpdateData({ updatePayload, shouldAutoSubmit });
          setLoading(false);
          setRecurringUpdateDialogOpen(true);
          return;
        }

        const { error } = await supabase
          .from("events")
          .update(updatePayload)
          .eq("id", eventId);

        if (error) throw error;

        toast({
          title: shouldAutoSubmit
            ? "Event updated and submitted for review"
            : "Event updated successfully",
          description: shouldAutoSubmit
            ? "Your changes have been sent to admins for approval"
            : undefined,
        });
      } else {
        if (recurrence.frequency !== "none") {
          const rrule = recurrenceConfigToRRule(recurrence, new Date(startsAt));

          let recurrenceEndDate: string | null = null;
          if (recurrence.endType === "on" && recurrence.endDate) {
            recurrenceEndDate = new Date(recurrence.endDate).toISOString();
          }

          const parentEvent = {
            ...eventData,
            created_by: user!.id,
            status: "pending_review" as const,
            is_recurring: true,
            recurrence_rule: rrule,
            recurrence_end_date: recurrenceEndDate,
          };

          const { data: parent, error: parentError } = await supabase
            .from("events")
            .insert([parentEvent])
            .select()
            .single();

          if (parentError) throw parentError;

          const instances = generateRecurringInstances(
            new Date(startsAt),
            new Date(endsAt),
            recurrence,
            parent.id,
            100,
          );

          const instancesData = instances.map((inst) => ({
            title: validated.title,
            description: validated.description,
            room_id: validated.room_id,
            starts_at: inst.starts_at.toISOString(),
            ends_at: inst.ends_at.toISOString(),
            created_by: user!.id,
            status: "pending_review" as const,
            is_recurring: true,
            parent_event_id: parent.id,
            organization_id: currentOrganization.id,
          }));

          if (instancesData.length > 0) {
            const { error: instancesError } = await supabase
              .from("events")
              .insert(instancesData);

            if (instancesError) throw instancesError;
          }

          toast({
            title: "Recurring event created",
            description: `Created ${
              instancesData.length + 1
            } event${instancesData.length > 0 ? "s" : ""} and submitted for review`,
          });
        } else {
          const { error } = await supabase.from("events").insert([
            {
              ...eventData,
              created_by: user!.id,
              status: "pending_review" as const,
              is_recurring: false,
            },
          ]);

          if (error) throw error;

          toast({
            title: "Event created and submitted for review",
            description: "Your event has been sent to admins for approval",
          });
        }
      }

      onSuccess();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0]?.message,
        });
      } else {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "An error occurred",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getNthWeekdayOfMonth = (
    year: number,
    month: number,
    dayOfWeek: number,
    weekOfMonth: number,
  ): Date | null => {
    if (weekOfMonth === -1) {
      const lastDay = new Date(year, month + 1, 0);
      const lastDayOfWeek = lastDay.getDay();
      let diff = lastDayOfWeek - dayOfWeek;
      if (diff < 0) diff += 7;
      const result = new Date(year, month, lastDay.getDate() - diff);
      return result;
    }
    if (weekOfMonth >= 1 && weekOfMonth <= 4) {
      const firstDay = new Date(year, month, 1);
      const firstDayOfWeek = firstDay.getDay();
      let diff = dayOfWeek - firstDayOfWeek;
      if (diff < 0) diff += 7;
      const firstOccurrence = 1 + diff;
      const nthOccurrence = firstOccurrence + (weekOfMonth - 1) * 7;

      const result = new Date(year, month, nthOccurrence);
      if (result.getMonth() !== month) {
        return null;
      }
      return result;
    }
    return null;
  };

  const generateRecurringInstances = (
    startDate: Date,
    endDate: Date,
    config: RecurrenceConfig,
    _parentId: string,
    maxInstances: number,
  ): Array<{ starts_at: Date; ends_at: Date }> => {
    const instances: Array<{ starts_at: Date; ends_at: Date }> = [];
    const duration = endDate.getTime() - startDate.getTime();

    let currentDate = new Date(startDate);
    let count = 0;

    const maxDate =
      config.endType === "on" && config.endDate
        ? new Date(config.endDate)
        : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    const maxCount =
      config.endType === "after" && config.occurrences
        ? config.occurrences - 1
        : maxInstances;

    while (count < maxCount && currentDate <= maxDate) {
      let nextDate: Date | null = null;

      switch (config.frequency) {
        case "daily":
          currentDate.setDate(currentDate.getDate() + config.interval);
          nextDate = new Date(currentDate);
          break;
        case "weekly": {
          let daysAdded = 0;
          const maxDaysToCheck = 7 * config.interval;

          while (daysAdded < maxDaysToCheck) {
            currentDate.setDate(currentDate.getDate() + 1);
            daysAdded++;

            const dayOfWeek = currentDate.getDay();
            const weeksSinceStart = Math.floor(
              (currentDate.getTime() - startDate.getTime()) /
                (7 * 24 * 60 * 60 * 1000),
            );

            if (
              config.daysOfWeek?.includes(dayOfWeek) &&
              weeksSinceStart % config.interval === 0
            ) {
              nextDate = new Date(currentDate);
              break;
            }
          }
          break;
        }
        case "monthly":
          currentDate.setMonth(currentDate.getMonth() + config.interval);
          if (
            config.monthlyType === "weekday" &&
            config.weekOfMonth !== undefined &&
            config.dayOfWeekForMonth !== undefined
          ) {
            nextDate = getNthWeekdayOfMonth(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              config.dayOfWeekForMonth,
              config.weekOfMonth,
            );
            if (nextDate) {
              nextDate.setHours(
                startDate.getHours(),
                startDate.getMinutes(),
                startDate.getSeconds(),
              );
              currentDate = new Date(nextDate);
            }
          } else if (config.dayOfMonth) {
            currentDate.setDate(
              Math.min(
                config.dayOfMonth,
                new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth() + 1,
                  0,
                ).getDate(),
              ),
            );
            nextDate = new Date(currentDate);
          } else {
            nextDate = new Date(currentDate);
          }
          break;
        case "yearly":
          currentDate.setFullYear(currentDate.getFullYear() + config.interval);
          if (config.monthOfYear) {
            currentDate.setMonth(config.monthOfYear - 1);
          }
          if (config.dayOfMonth) {
            currentDate.setDate(
              Math.min(
                config.dayOfMonth,
                new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth() + 1,
                  0,
                ).getDate(),
              ),
            );
          }
          nextDate = new Date(currentDate);
          break;
      }

      if (!nextDate || nextDate > maxDate) break;

      const instanceEnd = new Date(nextDate.getTime() + duration);
      instances.push({
        starts_at: nextDate,
        ends_at: instanceEnd,
      });

      count++;
    }

    return instances;
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!eventId || !event) return;

    setLoading(true);
    try {
      const updateData: any = { status: newStatus };

      if (newStatus === "approved" || newStatus === "rejected") {
        updateData.reviewer_id = user!.id;
      }

      const { data: creator } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", event.created_by)
        .single();

      const selectedRoom = rooms?.find((r: any) => r.id === event.room_id);

      const { error } = await supabase
        .from("events")
        .update(updateData)
        .eq("id", eventId);

      if (error) throw error;

      toast({ title: `Event ${newStatus}` });

      if (creator?.email) {
        const emailStatus =
          newStatus === "published"
            ? "published"
            : newStatus === "rejected"
              ? "rejected"
              : "approved";

        try {
          await supabase.functions.invoke("send-event-notification", {
            body: {
              to: creator.email,
              eventTitle: event.title,
              eventStartTime: new Date(event.starts_at).toLocaleString(
                "en-US",
                {
                  dateStyle: "full",
                  timeStyle: "short",
                },
              ),
              eventEndTime: new Date(event.ends_at).toLocaleString("en-US", {
                timeStyle: "short",
              }),
              roomName: selectedRoom?.name || "Unknown Room",
              status: emailStatus,
              requesterName: creator.full_name || "User",
              reviewerNotes: event.reviewer_notes || undefined,
            },
          });
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
        }
      }

      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectWithReason = async (reason: string) => {
    if (!eventId || !event) return;

    if (event.is_recurring) {
      setPendingRejectionReason(reason);
      setRejectionDialogOpen(false);
      setRecurringRejectDialogOpen(true);
      return;
    }

    await executeRejection(reason, "single");
  };

  const handleRecurringRejectConfirm = async (scope: RecurringActionScope) => {
    await executeRejection(pendingRejectionReason, scope);
    setRecurringRejectDialogOpen(false);
    setPendingRejectionReason("");
  };

  const executeRejection = async (
    reason: string,
    scope: RecurringActionScope,
  ) => {
    if (!eventId || !event) return;

    setRejectionLoading(true);
    try {
      const { data: creator } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", event.created_by)
        .single();

      const selectedRoom = rooms?.find((r: any) => r.id === event.room_id);

      if (scope === "all") {
        const parentId = event.parent_event_id || eventId;

        await supabase
          .from("events")
          .update({
            status: "rejected",
            reviewer_id: user!.id,
            reviewer_notes: reason,
          })
          .eq("id", parentId);

        await supabase
          .from("events")
          .update({
            status: "rejected",
            reviewer_id: user!.id,
            reviewer_notes: reason,
          })
          .eq("parent_event_id", parentId);

        toast({ title: "All events in series rejected" });
      } else {
        const { error } = await supabase
          .from("events")
          .update({
            status: "rejected",
            reviewer_id: user!.id,
            reviewer_notes: reason,
          })
          .eq("id", eventId);

        if (error) throw error;

        toast({ title: "Event rejected" });
      }

      if (creator?.email) {
        try {
          await supabase.functions.invoke("send-event-notification", {
            body: {
              to: creator.email,
              eventTitle: event.title,
              eventStartTime: new Date(event.starts_at).toLocaleString(
                "en-US",
                {
                  dateStyle: "full",
                  timeStyle: "short",
                },
              ),
              eventEndTime: new Date(event.ends_at).toLocaleString("en-US", {
                timeStyle: "short",
              }),
              roomName: selectedRoom?.name || "Unknown Room",
              status: "rejected",
              requesterName: creator.full_name || "User",
              reviewerNotes: reason,
            },
          });
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
        }
      }

      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setRejectionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!eventId || !event) return;

    if (event.is_recurring) {
      setRecurringDeleteDialogOpen(true);
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to delete this event? This action cannot be undone.",
      )
    ) {
      return;
    }

    await executeDelete("single");
  };

  const handleRecurringDeleteConfirm = async (scope: RecurringActionScope) => {
    await executeDelete(scope);
    setRecurringDeleteDialogOpen(false);
  };

  const executeDelete = async (scope: RecurringActionScope) => {
    if (!eventId || !event) return;

    setLoading(true);
    try {
      if (scope === "all") {
        const parentId = event.parent_event_id || eventId;

        await supabase
          .from("events")
          .delete()
          .eq("parent_event_id", parentId);

        await supabase.from("events").delete().eq("id", parentId);

        toast({ title: "All events in series deleted" });
      } else {
        const { error } = await supabase
          .from("events")
          .delete()
          .eq("id", eventId);

        if (error) throw error;

        toast({ title: "Event deleted successfully" });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecurringUpdateConfirm = async (scope: RecurringActionScope) => {
    if (!eventId || !event || !pendingUpdateData) return;

    setLoading(true);
    try {
      const { updatePayload, shouldAutoSubmit } = pendingUpdateData;

      if (scope === "all") {
        const parentId = event.parent_event_id || eventId;

        await supabase
          .from("events")
          .update(updatePayload)
          .eq("id", parentId);

        await supabase
          .from("events")
          .update(updatePayload)
          .eq("parent_event_id", parentId);

        toast({
          title: shouldAutoSubmit
            ? "All events updated and submitted for review"
            : "All events in series updated",
          description: shouldAutoSubmit
            ? "Your changes have been sent to admins for approval"
            : undefined,
        });
      } else {
        const { error } = await supabase
          .from("events")
          .update(updatePayload)
          .eq("id", eventId);

        if (error) throw error;

        toast({
          title: shouldAutoSubmit
            ? "Event updated and submitted for review"
            : "Event updated successfully",
          description: shouldAutoSubmit
            ? "Your changes have been sent to admins for approval"
            : undefined,
        });
      }

      setRecurringUpdateDialogOpen(false);
      setPendingUpdateData(null);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const canEdit = !event || event.created_by === user?.id || isAdmin;

  const filterDate = initialDate || (event ? new Date(event.starts_at) : new Date());

  const isSameDay = (date1: Date, date2: Date) =>
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();

  const eventsForDate = allEvents.filter((e) =>
    isSameDay(parseISO(e.starts_at), filterDate),
  );

  const pendingEvents = eventsForDate.filter(
    (e) => e.status === "pending_review",
  );
  const publishedEvents = eventsForDate.filter(
    (e) => e.status === "published",
  );
  const approvedEvents = eventsForDate.filter(
    (e) => e.status === "approved",
  );
  const draftEvents = eventsForDate.filter((e) => e.status === "draft");

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-500",
      pending_review: "bg-amber-500",
      approved: "bg-green-500",
      rejected: "bg-red-500",
      published: "bg-blue-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusLabel = (status: string) =>
    status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const EventItem = ({ event: evt }: { event: any }) => {
    const isOwnEvent = user?.id && evt.created_by === user.id;

    return (
      <div
        onClick={() => onEventSelect && onEventSelect(evt.id)}
        className={cn(
          "group cursor-pointer rounded-lg border-l-4 bg-background p-3 shadow-sm transition-colors hover:bg-accent hover:shadow-md",
        )}
        style={{
          borderLeftColor: evt.room?.color || "#888",
        }}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="line-clamp-2 text-sm font-semibold transition-colors group-hover:text-primary">
              {evt.title}
            </h4>
            <Badge
              className={cn(
                "h-auto shrink-0 px-1.5 py-0.5 text-[9px] text-white",
                getStatusColor(evt.status),
              )}
            >
              {getStatusLabel(evt.status)}
            </Badge>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>
                {format(parseISO(evt.starts_at), "MMM d, h:mm a")} -{" "}
                {format(parseISO(evt.ends_at), "h:mm a")}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              <span
                className="font-medium"
                style={{ color: evt.room?.color }}
              >
                {evt.room?.name}
              </span>
            </div>

            {evt.creator && (
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3" />
                <span
                  className={cn(
                    isOwnEvent && "font-medium text-foreground",
                  )}
                >
                  {isOwnEvent ? "You" : evt.creator.full_name}
                  {evt.creator.ministry_name &&
                    ` (${evt.creator.ministry_name})`}
                </span>
              </div>
            )}

            {evt.is_recurring && (
              <div className="flex items-center gap-1.5">
                <Repeat className="h-3 w-3 text-primary" />
                <span className="font-medium text-primary">
                  Recurring event
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const EventList = ({
    events: evts,
    emptyMessage,
  }: {
    events: any[];
    emptyMessage: string;
  }) => (
    <ScrollArea className="h-[400px]">
      {evts.length > 0 ? (
        <div className="space-y-2 pr-4">
          {evts.map((evt) => (
            <EventItem key={evt.id} event={evt} />
          ))}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </ScrollArea>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-6xl"
        aria-describedby="event-dialog-description"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
          <div className="flex max-h-[calc(90vh-2rem)] flex-col">
            <DialogHeader>
              <DialogTitle>{eventId ? "Edit Event" : "Create Event"}</DialogTitle>
            </DialogHeader>
            <p id="event-dialog-description" className="sr-only">
              {eventId
                ? "Edit event details including title, description, room, and timing"
                : "Create a new event by filling in the details below"}
            </p>

            <ScrollArea className="flex-1 -mr-4 pr-4">
              <form onSubmit={handleSubmit} className="space-y-4 pb-4">
                {validationError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                )}

                {roomConflict.hasConflict && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This room is already booked for &quot;
                      {roomConflict.conflictingEvent?.title}
                      &quot;
                      {roomConflict.creatorName &&
                        ` by ${roomConflict.creatorName}`}
                      {roomConflict.conflictingEvent?.status ===
                        "pending_review" && " (pending review)"}
                      {roomConflict.conflictingEvent?.status ===
                        "approved" && " (approved)"}
                      {roomConflict.conflictingEvent?.status ===
                        "published" && " (published)"}{" "}
                      during this time. Please choose a different time or room.
                    </AlertDescription>
                  </Alert>
                )}

                {!isAdmin && !eventId && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Your event will be automatically submitted for admin
                      review after creation.
                    </AlertDescription>
                  </Alert>
                )}

                {!isAdmin &&
                  event &&
                  (event.status === "draft" ||
                    event.status === "pending_review") && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Any changes will be automatically submitted for admin
                        review.
                      </AlertDescription>
                    </Alert>
                  )}

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        title: e.target.value,
                      })
                    }
                    disabled={!canEdit || loading}
                    maxLength={200}
                    required
                    className="border-2 border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    disabled={!canEdit || loading}
                    maxLength={1000}
                    className="border-2 border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="room">Room *</Label>
                  <Select
                    value={formData.room_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, room_id: value })
                    }
                    disabled={!canEdit || loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms?.map((room: any) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="starts_at">Start Time *</Label>
                    <Input
                      id="starts_at"
                      type="datetime-local"
                      value={formData.starts_at}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      disabled={!canEdit || loading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="ends_at"
                      className={validationError ? "text-destructive" : ""}
                    >
                      End Time *
                    </Label>
                    <Input
                      id="ends_at"
                      type="datetime-local"
                      value={formData.ends_at}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ends_at: e.target.value,
                        })
                      }
                      disabled={!canEdit || loading}
                      className={validationError ? "border-destructive" : ""}
                      required
                    />
                    {validationError && (
                      <p className="text-sm text-destructive">
                        {validationError}
                      </p>
                    )}
                  </div>
                </div>

                <RecurrenceSelector
                  value={recurrence}
                  onChange={setRecurrence}
                  startDate={formData.starts_at}
                />

                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={
                        loading || !!validationError || roomConflict.hasConflict
                      }
                    >
                      {eventId
                        ? !isAdmin &&
                            event &&
                            (event.status === "draft" ||
                              event.status === "pending_review")
                          ? "Update & Submit for Review"
                          : "Update"
                        : !isAdmin
                          ? "Create & Submit for Review"
                          : "Create"}
                    </Button>
                    {eventId &&
                      event &&
                      (isAdmin || event.created_by === user?.id) && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={loading}
                        >
                          Delete
                        </Button>
                      )}
                  </div>
                )}

                {isAdmin && event && event.status === "pending_review" && (
                  <div className="flex gap-2 border-t pt-4">
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => handleStatusChange("approved")}
                      disabled={loading}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setRejectionDialogOpen(true)}
                      disabled={loading}
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {isAdmin && event && event.status === "approved" && (
                  <div className="flex gap-2 border-t pt-4">
                    <Button
                      type="button"
                      onClick={() => handleStatusChange("published")}
                      disabled={loading}
                    >
                      Publish Event
                    </Button>
                  </div>
                )}
              </form>
            </ScrollArea>
          </div>

          <div className="hidden border-l pl-6 lg:block">
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Events</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {format(filterDate, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pending" className="relative text-xs">
                    Pending
                    {pendingEvents.length > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-1 flex h-4 w-4 items-center justify-center p-0 text-[9px]"
                      >
                        {pendingEvents.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="text-xs">
                    Approved
                    {approvedEvents.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 flex h-4 w-4 items-center justify-center p-0 text-[9px]"
                      >
                        {approvedEvents.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="published" className="text-xs">
                    Published
                    {publishedEvents.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 flex h-4 w-4 items-center justify-center p-0 text-[9px]"
                      >
                        {publishedEvents.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="draft" className="text-xs">
                    Draft
                    {draftEvents.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 flex h-4 w-4 items-center justify-center p-0 text-[9px]"
                      >
                        {draftEvents.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4">
                  <TabsContent value="pending" className="m-0">
                    <EventList
                      events={pendingEvents}
                      emptyMessage="No pending events"
                    />
                  </TabsContent>

                  <TabsContent value="approved" className="m-0">
                    <EventList
                      events={approvedEvents}
                      emptyMessage="No approved events"
                    />
                  </TabsContent>

                  <TabsContent value="published" className="m-0">
                    <EventList
                      events={publishedEvents}
                      emptyMessage="No published events"
                    />
                  </TabsContent>

                  <TabsContent value="draft" className="m-0">
                    <EventList
                      events={draftEvents}
                      emptyMessage="No draft events"
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>

      <RejectionReasonDialog
        open={rejectionDialogOpen}
        onOpenChange={setRejectionDialogOpen}
        onConfirm={handleRejectWithReason}
        eventTitle={event?.title || ""}
        loading={rejectionLoading}
      />

      <RecurringEventActionDialog
        open={recurringDeleteDialogOpen}
        onOpenChange={setRecurringDeleteDialogOpen}
        onConfirm={handleRecurringDeleteConfirm}
        actionType="delete"
        eventTitle={event?.title || ""}
        loading={loading}
      />

      <RecurringEventActionDialog
        open={recurringRejectDialogOpen}
        onOpenChange={setRecurringRejectDialogOpen}
        onConfirm={handleRecurringRejectConfirm}
        actionType="reject"
        eventTitle={event?.title || ""}
        loading={rejectionLoading}
      />

      <RecurringEventActionDialog
        open={recurringUpdateDialogOpen}
        onOpenChange={(dialogOpen) => {
          setRecurringUpdateDialogOpen(dialogOpen);
          if (!dialogOpen) setPendingUpdateData(null);
        }}
        onConfirm={handleRecurringUpdateConfirm}
        actionType="update"
        eventTitle={event?.title || ""}
        loading={loading}
      />
    </Dialog>
  );
};

export default EventDialog;


