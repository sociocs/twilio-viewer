import { defineStore } from "pinia";
import { format } from "date-fns";
import type {
  AuthCredentials,
  EnrichedTwilioAlert,
  TwilioAlert,
  TwilioAuditEvent,
  AlertTextToken,
} from "~/types";
import {
  twloFetchAlerts,
  twloFetchAuditEvents,
} from "~/utils/call-twilio-api";

export const useMonitorStore = defineStore("monitor", () => {
  const activeTab = ref<"alerts" | "events">("alerts");

  // --- Alerts State ---
  const alerts = ref<EnrichedTwilioAlert[]>([]);
  const isLoadingAlerts = ref<boolean>(false);
  const isLoadingMoreAlerts = ref<boolean>(false);
  const alertsNextPageUrl = ref<string | null>(null);
  const alertsError = ref<string | null>(null);
  const alertsLastFetchedAt = ref<number | null>(null);
  const isExportingAlerts = ref<boolean>(false);

  // Alerts Server-Side Filters
  const formLogLevel = ref<string>("all");
  const formStartDate = ref<string>("");
  const formEndDate = ref<string>("");

  // Alerts Client-Side Quick Filters
  const alertsSearchQuery = ref<string>("");
  const filterLogLevel = ref<string>("all");

  // --- Events State ---
  const events = ref<TwilioAuditEvent[]>([]);
  const isLoadingEvents = ref<boolean>(false);
  const isLoadingMoreEvents = ref<boolean>(false);
  const eventsNextPageUrl = ref<string | null>(null);
  const eventsError = ref<string | null>(null);
  const eventsLastFetchedAt = ref<number | null>(null);
  const isExportingEvents = ref<boolean>(false);

  // Events Server-Side Filters
  const formEventType = ref<string>("");
  const formResourceSid = ref<string>("");
  const formEventStartDate = ref<string>("");
  const formEventEndDate = ref<string>("");

  // Events Client-Side Quick Filters
  const eventsSearchQuery = ref<string>("");

  /**
   * Parses URL-encoded alert_text strings into friendly label-value pairs.
   */
  function parseAlertTokens(text?: string | null): AlertTextToken[] {
    if (!text?.trim() || !text.includes("=")) {
      return [];
    }

    const parts = text.split("&");
    return parts.map((part) => {
      const [k, ...rest] = part.split("=");
      const rawVal = rest.join("=");
      let decodedVal = rawVal;
      try {
        decodedVal = decodeURIComponent(rawVal.replace(/\+/g, " "));
      } catch {
        // keep raw if decode fails
      }
      return {
        label: k?.trim() || "",
        value: decodedVal?.trim(),
      };
    }).filter(t => Boolean(t.label));
  }

  /**
   * Enriches an alert with recognized resource type and interlinks.
   */
  function enrichAlert(alert: TwilioAlert, accountSid: string): EnrichedTwilioAlert {
    let resourceType: "message" | "call" | "number" | "service" | "unknown" = "unknown";
    let resourceLink: string | undefined = undefined;

    if (alert.resource_sid) {
      const sid = alert.resource_sid;
      if (sid.startsWith("SM") || sid.startsWith("MM")) {
        resourceType = "message";
        resourceLink = `/accounts/${accountSid}/message-history?number=${encodeURIComponent(sid)}`;
      } else if (sid.startsWith("CA")) {
        resourceType = "call";
        resourceLink = `/accounts/${accountSid}/voice-call-history?from=${encodeURIComponent(sid)}`;
      } else if (sid.startsWith("PN")) {
        resourceType = "number";
        resourceLink = `/accounts/${accountSid}/phone-numbers?search=${encodeURIComponent(sid)}`;
      } else if (sid.startsWith("MG")) {
        resourceType = "service";
        resourceLink = `/accounts/${accountSid}/messaging-services?service=${encodeURIComponent(sid)}`;
      }
    }

    const parsedTokens = parseAlertTokens(alert.alert_text);

    return {
      ...alert,
      resourceType,
      resourceLink,
      parsedTokens,
    };
  }

  /**
   * Loads initial alerts from Twilio Monitor API.
   */
  async function loadAlerts(creds: AuthCredentials, refreshCache = false): Promise<void> {
    isLoadingAlerts.value = true;
    alertsError.value = null;

    try {
      const [err, res] = await twloFetchAlerts({
        accountSid: creds.account_sid,
        authCredentials: creds,
        logLevel: formLogLevel.value !== "all" ? formLogLevel.value : undefined,
        startDate: formStartDate.value.trim() || undefined,
        endDate: formEndDate.value.trim() || undefined,
        pageSize: 50,
        refreshCache,
      });

      if (err || !res) {
        alertsError.value = err || "Failed to load alerts from Twilio Monitor.";
        isLoadingAlerts.value = false;
        return;
      }

      alerts.value = (res.alerts || []).map(a => enrichAlert(a, creds.account_sid));
      alertsNextPageUrl.value = res.meta?.next_page_url || null;
      alertsLastFetchedAt.value = Date.now();
      isLoadingAlerts.value = false;
    } catch (err: unknown) {
      alertsError.value = (err as Error).message || "An unexpected error occurred.";
      isLoadingAlerts.value = false;
    }
  }

  /**
   * Loads more alerts using cursor pagination.
   */
  async function loadMoreAlerts(creds: AuthCredentials): Promise<void> {
    if (!alertsNextPageUrl.value || isLoadingMoreAlerts.value) {
      return;
    }

    isLoadingMoreAlerts.value = true;
    try {
      const [err, res] = await twloFetchAlerts({
        accountSid: creds.account_sid,
        authCredentials: creds,
        nextPageUrl: alertsNextPageUrl.value,
        refreshCache: true,
      });

      if (err || !res) {
        alertsNextPageUrl.value = null;
        isLoadingMoreAlerts.value = false;
        return;
      }

      const enriched = (res.alerts || []).map(a => enrichAlert(a, creds.account_sid));
      alerts.value.push(...enriched);
      alertsNextPageUrl.value = res.meta?.next_page_url || null;
      isLoadingMoreAlerts.value = false;
    } catch {
      alertsNextPageUrl.value = null;
      isLoadingMoreAlerts.value = false;
    }
  }

  /**
   * Loads initial audit events from Twilio Monitor API.
   */
  async function loadEvents(creds: AuthCredentials, refreshCache = false): Promise<void> {
    isLoadingEvents.value = true;
    eventsError.value = null;

    try {
      const [err, res] = await twloFetchAuditEvents({
        accountSid: creds.account_sid,
        authCredentials: creds,
        eventType: formEventType.value.trim() || undefined,
        resourceSid: formResourceSid.value.trim() || undefined,
        startDate: formEventStartDate.value.trim() || undefined,
        endDate: formEventEndDate.value.trim() || undefined,
        pageSize: 50,
        refreshCache,
      });

      if (err || !res) {
        eventsError.value = err || "Failed to load audit events from Twilio Monitor.";
        isLoadingEvents.value = false;
        return;
      }

      events.value = res.events || [];
      eventsNextPageUrl.value = res.meta?.next_page_url || null;
      eventsLastFetchedAt.value = Date.now();
      isLoadingEvents.value = false;
    } catch (err: unknown) {
      eventsError.value = (err as Error).message || "An unexpected error occurred.";
      isLoadingEvents.value = false;
    }
  }

  /**
   * Loads more audit events using cursor pagination.
   */
  async function loadMoreEvents(creds: AuthCredentials): Promise<void> {
    if (!eventsNextPageUrl.value || isLoadingMoreEvents.value) {
      return;
    }

    isLoadingMoreEvents.value = true;
    try {
      const [err, res] = await twloFetchAuditEvents({
        accountSid: creds.account_sid,
        authCredentials: creds,
        nextPageUrl: eventsNextPageUrl.value,
        refreshCache: true,
      });

      if (err || !res) {
        eventsNextPageUrl.value = null;
        isLoadingMoreEvents.value = false;
        return;
      }

      events.value.push(...(res.events || []));
      eventsNextPageUrl.value = res.meta?.next_page_url || null;
      isLoadingMoreEvents.value = false;
    } catch {
      eventsNextPageUrl.value = null;
      isLoadingMoreEvents.value = false;
    }
  }

  /**
   * Filtered alerts list based on live client filters.
   */
  const filteredAlerts = computed<EnrichedTwilioAlert[]>(() => {
    let list = alerts.value;

    const query = alertsSearchQuery.value.trim().toLowerCase();
    if (query) {
      list = list.filter((a) => {
        const codeMatch = a.error_code?.toLowerCase().includes(query);
        const textMatch = a.alert_text?.toLowerCase().includes(query);
        const sidMatch = a.resource_sid?.toLowerCase().includes(query)
          || a.sid.toLowerCase().includes(query);
        const urlMatch = a.request_url?.toLowerCase().includes(query);
        return codeMatch || textMatch || sidMatch || urlMatch;
      });
    }

    if (filterLogLevel.value !== "all") {
      list = list.filter(a => a.log_level.toLowerCase() === filterLogLevel.value.toLowerCase());
    }

    return list;
  });

  /**
   * Filtered audit events list based on live client search.
   */
  const filteredEvents = computed<TwilioAuditEvent[]>(() => {
    let list = events.value;

    const query = eventsSearchQuery.value.trim().toLowerCase();
    if (query) {
      list = list.filter((e) => {
        const typeMatch = e.event_type.toLowerCase().includes(query);
        const sidMatch = e.resource_sid?.toLowerCase().includes(query)
          || e.sid.toLowerCase().includes(query);
        const descMatch = e.description?.toLowerCase().includes(query);
        const actorMatch = e.actor_sid?.toLowerCase().includes(query);
        return typeMatch || sidMatch || descMatch || actorMatch;
      });
    }

    return list;
  });

  /**
   * Aggregate statistics for loaded alerts.
   */
  const alertsStats = computed(() => {
    let errors = 0;
    let warnings = 0;
    let notices = 0;
    let debugs = 0;

    for (const alert of alerts.value) {
      const lvl = alert.log_level.toLowerCase();
      if (lvl === "error") {
        errors++;
      } else if (lvl === "warning") {
        warnings++;
      } else if (lvl === "notice") {
        notices++;
      } else if (lvl === "debug") {
        debugs++;
      }
    }

    return {
      total: alerts.value.length,
      errors,
      warnings,
      notices,
      debugs,
    };
  });

  /**
   * Exports filtered alerts to CSV.
   */
  async function exportAlertsToCsv(accountSid: string): Promise<void> {
    isExportingAlerts.value = true;
    try {
      const records = filteredAlerts.value;
      if (!records.length) {
        return;
      }

      const headers = [
        "Alert SID",
        "Log Level",
        "Error Code",
        "Resource SID",
        "Date Generated",
        "Request Method",
        "Request URL",
        "Alert Details",
        "More Info URL",
      ];

      const rows = records.map((a) => {
        return [
          `"${a.sid}"`,
          `"${a.log_level}"`,
          `"${a.error_code || ""}"`,
          `"${a.resource_sid || ""}"`,
          `"${a.date_generated || a.date_created}"`,
          `"${a.request_method || ""}"`,
          `"${(a.request_url || "").replace(/"/g, "\"\"")}"`,
          `"${(a.alert_text || "").replace(/"/g, "\"\"")}"`,
          `"${a.more_info || ""}"`,
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
      link.setAttribute("href", url);
      link.setAttribute("download", `twilio-alerts-${accountSid}-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      isExportingAlerts.value = false;
    }
  }

  /**
   * Exports filtered events to CSV.
   */
  async function exportEventsToCsv(accountSid: string): Promise<void> {
    isExportingEvents.value = true;
    try {
      const records = filteredEvents.value;
      if (!records.length) {
        return;
      }

      const headers = [
        "Event SID",
        "Event Type",
        "Resource SID",
        "Resource Type",
        "Actor SID",
        "Actor Type",
        "Source",
        "Date",
        "Description",
      ];

      const rows = records.map((e) => {
        return [
          `"${e.sid}"`,
          `"${e.event_type}"`,
          `"${e.resource_sid || ""}"`,
          `"${e.resource_type || ""}"`,
          `"${e.actor_sid || ""}"`,
          `"${e.actor_type || ""}"`,
          `"${e.source || ""}"`,
          `"${e.event_date}"`,
          `"${(e.description || "").replace(/"/g, "\"\"")}"`,
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
      link.setAttribute("href", url);
      link.setAttribute("download", `twilio-audit-events-${accountSid}-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      isExportingEvents.value = false;
    }
  }

  return {
    activeTab,
    alerts,
    isLoadingAlerts,
    isLoadingMoreAlerts,
    alertsNextPageUrl,
    alertsError,
    alertsLastFetchedAt,
    isExportingAlerts,
    formLogLevel,
    formStartDate,
    formEndDate,
    alertsSearchQuery,
    filterLogLevel,
    filteredAlerts,
    alertsStats,
    loadAlerts,
    loadMoreAlerts,
    exportAlertsToCsv,

    events,
    isLoadingEvents,
    isLoadingMoreEvents,
    eventsNextPageUrl,
    eventsError,
    eventsLastFetchedAt,
    isExportingEvents,
    formEventType,
    formResourceSid,
    formEventStartDate,
    formEventEndDate,
    eventsSearchQuery,
    filteredEvents,
    loadEvents,
    loadMoreEvents,
    exportEventsToCsv,
  };
});
