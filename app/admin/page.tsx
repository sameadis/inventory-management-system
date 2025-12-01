"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Eye, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EventDialog from "@/components/events/EventDialog";
import { RejectionReasonDialog } from "@/components/events/RejectionReasonDialog";
import {
  RecurringEventActionDialog,
  type RecurringActionScope,
} from "@/components/events/RecurringEventActionDialog";
import { formatDistance, format } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

type AdminEvent = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  created_by: string;
  is_recurring?: boolean | null;
  parent_event_id?: string | null;
  reviewer_notes?: string | null;
  rooms?: {
    name: string;
    color: string | null;
  } | null;
  room?: {
    name: string;
    color: string | null;
  } | null;
  creator?: {
    full_name?: string | null;
    ministry_name?: string | null;
  } | null;
};

const filterEvents = <T extends AdminEvent>(
  events: T[] | undefined,
  query: string,
): T[] => {
  if (!events) return [];
  if (!query.trim()) return events;

  const lowerQuery = query.toLowerCase();
  return events.filter((event) => {
    const title = event.title?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    const roomName = event.room?.name?.toLowerCase() || "";
    const creatorName = event.creator?.full_name?.toLowerCase() || "";
    const ministryName = event.creator?.ministry_name?.toLowerCase() || "";

    return (
      title.includes(lowerQuery) ||
      description.includes(lowerQuery) ||
      roomName.includes(lowerQuery) ||
      creatorName.includes(lowerQuery) ||
      ministryName.includes(lowerQuery)
    );
  });
};

export default function AdminPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { user, isSystemAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, user, router]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [eventToReject, setEventToReject] = useState<{
    id: string;
    title: string;
    is_recurring?: boolean;
    parent_event_id?: string | null;
  } | null>(null);
  const [rejectionLoading, setRejectionLoading] = useState(false);
  const [recurringRejectDialogOpen, setRecurringRejectDialogOpen] =
    useState(false);
  const [pendingRejectionReason, setPendingRejectionReason] = useState("");

  const isAdmin = isSystemAdmin;

  const { data: pendingEvents, refetch: refetchPending } = useQuery({
    queryKey: ["pending-events", currentOrganization?.id, user?.id, isAdmin],
    queryFn: async (): Promise<AdminEvent[]> => {
      if (!currentOrganization?.id) return [];

      let query = supabase
        .from("events")
        .select(
          `
          *,
          rooms(name, color)
        `,
        )
        .eq("organization_id", currentOrganization.id)
        .eq("status", "pending_review");

      if (!isAdmin && user?.id) {
        query = query.eq("created_by", user.id);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });
      if (error) throw error;

      const eventsWithCreators = await Promise.all(
        (data || []).map(async (event: any) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, ministry_name")
            .eq("id", event.created_by)
            .single();

          return {
            ...event,
            room: event.rooms,
            creator: profile || null,
          } as AdminEvent;
        }),
      );

      return eventsWithCreators;
    },
    enabled: !!currentOrganization?.id && !!user,
  });

  const { data: approvedEvents, refetch: refetchApproved } = useQuery({
    queryKey: ["approved-events", currentOrganization?.id, user?.id, isAdmin],
    queryFn: async (): Promise<AdminEvent[]> => {
      if (!currentOrganization?.id) return [];

      let query = supabase
        .from("events")
        .select(
          `
          *,
          rooms(name, color)
        `,
        )
        .eq("organization_id", currentOrganization.id)
        .eq("status", "approved");

      if (!isAdmin && user?.id) {
        query = query.eq("created_by", user.id);
      }

      const { data, error } = await query.order("starts_at", {
        ascending: true,
      });
      if (error) throw error;

      const eventsWithCreators = await Promise.all(
        (data || []).map(async (event: any) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, ministry_name")
            .eq("id", event.created_by)
            .single();

          return {
            ...event,
            room: event.rooms,
            creator: profile || null,
          } as AdminEvent;
        }),
      );

      return eventsWithCreators;
    },
    enabled: !!currentOrganization?.id && !!user,
  });

  const { data: publishedEvents, refetch: refetchPublished } = useQuery({
    queryKey: ["published-events", currentOrganization?.id, user?.id, isAdmin],
    queryFn: async (): Promise<AdminEvent[]> => {
      if (!currentOrganization?.id) return [];

      let query = supabase
        .from("events")
        .select(
          `
          *,
          rooms(name, color)
        `,
        )
        .eq("organization_id", currentOrganization.id)
        .eq("status", "published");

      if (!isAdmin && user?.id) {
        query = query.eq("created_by", user.id);
      }

      const { data, error } = await query.order("starts_at", {
        ascending: true,
      });
      if (error) throw error;

      const eventsWithCreators = await Promise.all(
        (data || []).map(async (event: any) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, ministry_name")
            .eq("id", event.created_by)
            .single();

          return {
            ...event,
            room: event.rooms,
            creator: profile || null,
          } as AdminEvent;
        }),
      );

      return eventsWithCreators;
    },
    enabled: !!currentOrganization?.id && !!user,
  });

  const { data: rejectedEvents, refetch: refetchRejected } = useQuery({
    queryKey: ["rejected-events", currentOrganization?.id, user?.id, isAdmin],
    queryFn: async (): Promise<AdminEvent[]> => {
      if (!currentOrganization?.id) return [];

      let query = supabase
        .from("events")
        .select(
          `
          *,
          rooms(name, color)
        `,
        )
        .eq("organization_id", currentOrganization.id)
        .eq("status", "rejected");

      if (!isAdmin && user?.id) {
        query = query.eq("created_by", user.id);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });
      if (error) throw error;

      const eventsWithCreators = await Promise.all(
        (data || []).map(async (event: any) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, ministry_name")
            .eq("id", event.created_by)
            .single();

          return {
            ...event,
            room: event.rooms,
            creator: profile || null,
          } as AdminEvent;
        }),
      );

      return eventsWithCreators;
    },
    enabled: !!currentOrganization?.id && !!user,
  });

  const filteredPendingEvents = useMemo(
    () => filterEvents(pendingEvents, searchQuery),
    [pendingEvents, searchQuery],
  );

  const filteredApprovedEvents = useMemo(
    () => filterEvents(approvedEvents, searchQuery),
    [approvedEvents, searchQuery],
  );

  const filteredPublishedEvents = useMemo(
    () => filterEvents(publishedEvents, searchQuery),
    [publishedEvents, searchQuery],
  );

  const filteredRejectedEvents = useMemo(
    () => filterEvents(rejectedEvents, searchQuery),
    [rejectedEvents, searchQuery],
  );

  const handleStatusChange = async (
    eventId: string,
    status: "approved" | "published" | "pending_review",
    isUnpublishing?: boolean,
  ) => {
    try {
      const finalStatus = status;

      const { data: event } = await supabase
        .from("events")
        .select(
          `
          *,
          rooms(name, color)
        `,
        )
        .eq("id", eventId)
        .single();

      if (!event) throw new Error("Event not found");

      const { data: creator } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", event.created_by)
        .single();

      const { error } = await supabase
        .from("events")
        .update({
          status: finalStatus,
          reviewer_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", eventId);

      if (error) throw error;

      let statusMessage = "";
      if (isUnpublishing) {
        statusMessage = "Event unpublished";
      } else if (status === "approved") {
        statusMessage = "Event approved";
      } else if (status === "published") {
        statusMessage = "Event published";
      } else {
        statusMessage = `Event ${finalStatus.replace("_", " ")}`;
      }

      toast({ title: statusMessage });

      if (creator?.email) {
        const emailStatus = finalStatus;

        try {
          const response = await supabase.functions.invoke(
            "send-event-notification",
            {
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
                roomName: event.rooms?.name || "Unknown Room",
                status: emailStatus,
                requesterName: creator.full_name || "User",
                reviewerNotes: event.reviewer_notes || undefined,
              },
            },
          );

          if ((response as any).error) {
            toast({
              title: "Warning",
              description:
                "Event status updated but email notification failed",
            });
          }
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
          toast({
            title: "Warning",
            description:
              "Event status updated but email notification failed",
          });
        }
      }

      refetchPending();
      refetchApproved();
      refetchPublished();
      refetchRejected();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const handleOpenRejectionDialog = (
    eventId: string,
    eventTitle: string,
    isRecurring?: boolean,
    parentEventId?: string | null,
  ) => {
    setEventToReject({
      id: eventId,
      title: eventTitle,
      is_recurring: isRecurring,
      parent_event_id: parentEventId,
    });
    setRejectionDialogOpen(true);
  };

  const handleRejectWithReason = async (reason: string) => {
    if (!eventToReject) return;

    if (eventToReject.is_recurring) {
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
    if (!eventToReject) return;

    setRejectionLoading(true);
    try {
      const { data: event } = await supabase
        .from("events")
        .select(
          `
          *,
          rooms(name, color)
        `,
        )
        .eq("id", eventToReject.id)
        .single();

      if (!event) throw new Error("Event not found");

      const { data: creator } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", event.created_by)
        .single();

      const reviewerId = (await supabase.auth.getUser()).data.user?.id;

      if (scope === "all") {
        const parentId = eventToReject.parent_event_id || eventToReject.id;

        await supabase
          .from("events")
          .update({
            status: "rejected",
            reviewer_id: reviewerId,
            reviewer_notes: reason,
          })
          .eq("id", parentId);

        await supabase
          .from("events")
          .update({
            status: "rejected",
            reviewer_id: reviewerId,
            reviewer_notes: reason,
          })
          .eq("parent_event_id", parentId);

        toast({ title: "All events in series rejected" });
      } else {
        const { error } = await supabase
          .from("events")
          .update({
            status: "rejected",
            reviewer_id: reviewerId,
            reviewer_notes: reason,
          })
          .eq("id", eventToReject.id);

        if (error) throw error;

        toast({ title: "Event rejected" });
      }

      if (creator?.email) {
        try {
          const response = await supabase.functions.invoke(
            "send-event-notification",
            {
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
                roomName: event.rooms?.name || "Unknown Room",
                status: "rejected",
                requesterName: creator.full_name || "User",
                reviewerNotes: reason,
              },
            },
          );

          if ((response as any).error) {
            console.error("Email notification error:", (response as any).error);
          }
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
        }
      }

      setRejectionDialogOpen(false);
      setEventToReject(null);
      refetchPending();
      refetchApproved();
      refetchPublished();
      refetchRejected();
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

  const handleUnapprove = async (eventId: string) => {
    try {
      const { data: event } = await supabase
        .from("events")
        .select(
          `
          *,
          rooms(name, color)
        `,
        )
        .eq("id", eventId)
        .single();

      if (!event) throw new Error("Event not found");

      const { data: creator } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", event.created_by)
        .single();

      const { error } = await supabase
        .from("events")
        .update({ status: "pending_review" })
        .eq("id", eventId);

      if (error) throw error;

      toast({ title: "Event moved to pending review" });

      if (creator?.email) {
        try {
          const response = await supabase.functions.invoke(
            "send-event-notification",
            {
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
                roomName: event.rooms?.name || "Unknown Room",
                status: "unapproved",
                requesterName: creator.full_name || "User",
                reviewerNotes: event.reviewer_notes || undefined,
              },
            },
          );

          if ((response as any).error) {
            console.error("Email notification error:", (response as any).error);
          }
        } catch (emailError) {
          console.error(
            "Failed to send email notification (unapprove):",
            emailError,
          );
        }
      }

      refetchPending();
      refetchApproved();
      refetchPublished();
      refetchRejected();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const handleViewEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setIsEventDialogOpen(true);
  };

  if (loading || !user) {
    return null;
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-500",
    pending_review: "bg-amber-500",
    approved: "bg-green-500",
    rejected: "bg-red-500",
    published: "bg-blue-500",
  };

  const isOrgLoaded = !!currentOrganization?.id;

  return (
    <AdminLayout
      title={isAdmin ? "Event Review" : "My Requests"}
      subtitle={
        isAdmin
          ? "Review and manage event submissions across branches and ministries"
          : "Track the status of your event requests"
      }
      activeSection="events"
      actions={
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, room, requester, or ministry..."
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      }
    >
      <div className="space-y-6">
        {currentOrganization && (
          <p className="text-sm text-slate-500">
            Organization:{" "}
            <span className="font-medium text-slate-900">
              {currentOrganization.name}
            </span>
          </p>
        )}

        {!isOrgLoaded && (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No organization selected or configured for this user.
              </p>
            </CardContent>
          </Card>
        )}

        {isOrgLoaded && (
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">
                Pending Review ({filteredPendingEvents.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({filteredApprovedEvents.length})
              </TabsTrigger>
              <TabsTrigger value="published">
                Published ({filteredPublishedEvents.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({filteredRejectedEvents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {filteredPendingEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                      {searchQuery
                        ? "No events match your search"
                        : "No events pending review"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredPendingEvents.map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">
                            {event.title}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={statusColors[event.status]}
                              >
                                {event.status.replace("_", " ")}
                              </Badge>
                              <span className="text-sm">
                                {event.room?.name} •{" "}
                                {format(
                                  new Date(event.starts_at),
                                  "MMM d, yyyy h:mm a",
                                )}{" "}
                                -{" "}
                                {format(
                                  new Date(event.ends_at),
                                  "h:mm a",
                                )}
                              </span>
                            </div>
                            {event.description && (
                              <p className="mt-2 text-sm">
                                {event.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-4 text-xs">
                              {event.creator && (
                                <div className="flex flex-col gap-0.5 text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>
                                      Requested by:{" "}
                                      <span className="font-medium text-foreground">
                                        {event.creator.full_name}
                                      </span>
                                    </span>
                                  </div>
                                  {event.creator.ministry_name && (
                                    <span className="ml-4 text-xs">
                                      {event.creator.ministry_name}
                                    </span>
                                  )}
                                </div>
                              )}
                              <span className="text-muted-foreground">
                                Submitted{" "}
                                {formatDistance(
                                  new Date(event.created_at),
                                  new Date(),
                                  { addSuffix: true },
                                )}
                              </span>
                            </div>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        {isAdmin && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() =>
                                handleStatusChange(event.id, "approved")
                              }
                            >
                              <Check className="mr-1 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleOpenRejectionDialog(
                                  event.id,
                                  event.title,
                                  event.is_recurring ?? undefined,
                                  event.parent_event_id ?? undefined,
                                )
                              }
                            >
                              <X className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewEvent(event.id)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              {filteredApprovedEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                      {searchQuery
                        ? "No events match your search"
                        : "No approved events"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredApprovedEvents.map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">
                            {event.title}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={statusColors[event.status]}
                              >
                                {event.status.replace("_", " ")}
                              </Badge>
                              <span className="text-sm">
                                {event.room?.name} •{" "}
                                {format(
                                  new Date(event.starts_at),
                                  "MMM d, yyyy h:mm a",
                                )}{" "}
                                -{" "}
                                {format(
                                  new Date(event.ends_at),
                                  "h:mm a",
                                )}
                              </span>
                            </div>
                            {event.description && (
                              <p className="mt-2 text-sm">
                                {event.description}
                              </p>
                            )}
                            {event.creator && (
                              <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>
                                    Requested by:{" "}
                                    <span className="font-medium text-foreground">
                                      {event.creator.full_name}
                                    </span>
                                  </span>
                                </div>
                                {event.creator.ministry_name && (
                                  <span className="ml-4 text-xs">
                                    {event.creator.ministry_name}
                                  </span>
                                )}
                              </div>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        {isAdmin && (
                          <>
                            <Button
                              onClick={() =>
                                handleStatusChange(event.id, "published")
                              }
                            >
                              Publish Event
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleUnapprove(event.id)}
                            >
                              Unapprove
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewEvent(event.id)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="published" className="space-y-4">
              {filteredPublishedEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                      {searchQuery
                        ? "No events match your search"
                        : "No published events"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredPublishedEvents.map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">
                            {event.title}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={statusColors[event.status]}
                              >
                                {event.status.replace("_", " ")}
                              </Badge>
                              <span className="text-sm">
                                {event.room?.name} •{" "}
                                {format(
                                  new Date(event.starts_at),
                                  "MMM d, yyyy h:mm a",
                                )}{" "}
                                -{" "}
                                {format(
                                  new Date(event.ends_at),
                                  "h:mm a",
                                )}
                              </span>
                            </div>
                            {event.description && (
                              <p className="mt-2 text-sm">
                                {event.description}
                              </p>
                            )}
                            {event.creator && (
                              <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>
                                    Requested by:{" "}
                                    <span className="font-medium text-foreground">
                                      {event.creator.full_name}
                                    </span>
                                  </span>
                                </div>
                                {event.creator.ministry_name && (
                                  <span className="ml-4 text-xs">
                                    {event.creator.ministry_name}
                                  </span>
                                )}
                              </div>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        {isAdmin && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() =>
                                handleStatusChange(
                                  event.id,
                                  "approved",
                                  true,
                                )
                              }
                            >
                              Unpublish Event
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleUnapprove(event.id)}
                            >
                              Unapprove
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewEvent(event.id)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {filteredRejectedEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                      {searchQuery
                        ? "No events match your search"
                        : "No rejected events"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredRejectedEvents.map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">
                            {event.title}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={statusColors[event.status]}
                              >
                                {event.status.replace("_", " ")}
                              </Badge>
                              <span className="text-sm">
                                {event.room?.name} •{" "}
                                {format(
                                  new Date(event.starts_at),
                                  "MMM d, yyyy h:mm a",
                                )}{" "}
                                -{" "}
                                {format(
                                  new Date(event.ends_at),
                                  "h:mm a",
                                )}
                              </span>
                            </div>
                            {event.description && (
                              <p className="mt-2 text-sm">
                                {event.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-4 text-xs">
                              {event.creator && (
                                <div className="flex flex-col gap-0.5 text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>
                                      Requested by:{" "}
                                      <span className="font-medium text-foreground">
                                        {event.creator.full_name}
                                      </span>
                                    </span>
                                  </div>
                                  {event.creator.ministry_name && (
                                    <span className="ml-4 text-xs">
                                      {event.creator.ministry_name}
                                    </span>
                                  )}
                                </div>
                              )}
                              <span className="text-muted-foreground">
                                Submitted{" "}
                                {formatDistance(
                                  new Date(event.created_at),
                                  new Date(),
                                  { addSuffix: true },
                                )}
                              </span>
                            </div>
                            {event.reviewer_notes && (
                              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                                <p className="text-sm font-medium text-red-800">
                                  Rejection Reason:
                                </p>
                                <p className="mt-1 text-sm text-red-700">
                                  {event.reviewer_notes}
                                </p>
                              </div>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        {isAdmin && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(
                                event.id,
                                "pending_review",
                              )
                            }
                          >
                            Move to Pending
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewEvent(event.id)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        <EventDialog
          open={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          eventId={selectedEventId}
          onSuccess={() => {
            refetchPending();
            refetchApproved();
            refetchPublished();
            refetchRejected();
            setIsEventDialogOpen(false);
          }}
        />

        <RejectionReasonDialog
          open={rejectionDialogOpen}
          onOpenChange={setRejectionDialogOpen}
          onConfirm={handleRejectWithReason}
          eventTitle={eventToReject?.title || ""}
          loading={rejectionLoading}
        />

        <RecurringEventActionDialog
          open={recurringRejectDialogOpen}
          onOpenChange={setRecurringRejectDialogOpen}
          onConfirm={handleRecurringRejectConfirm}
          actionType="reject"
          eventTitle={eventToReject?.title || ""}
          loading={rejectionLoading}
        />
      </div>
    </AdminLayout>
  );
}


