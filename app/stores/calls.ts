import { defineStore } from "pinia";
import { format } from "date-fns";
import type {
  AuthCredentials,
  EnrichedTwilioCall,
  TwilioCall,
} from "~/types";
import {
  twloFetchCalls,
  twloFetchCallRecordings,
  twloFetchRecordingAudioBlob,
} from "~/utils/call-twilio-api";
import { usePhoneNumbersStore } from "~/stores/phone-numbers";

export const useCallsStore = defineStore("calls", () => {
  const calls = ref<EnrichedTwilioCall[]>([]);
  const isLoading = ref<boolean>(false);
  const isLoadingMore = ref<boolean>(false);
  const isSearching = ref<boolean>(false);
  const isExporting = ref<boolean>(false);
  const error = ref<string | null>(null);
  const lastFetchedAt = ref<number | null>(null);
  const nextPageUri = ref<string | null>(null);

  // Server-side filter parameters for API queries
  const formFrom = ref<string>("");
  const formTo = ref<string>("");
  const formStatus = ref<string>("all");
  const formFromDate = ref<string>("");
  const formToDate = ref<string>("");

  // Client-side quick filters & search
  const searchQuery = ref<string>("");
  const filterDirection = ref<string>("all"); // "all" | "inbound" | "outbound"
  const filterStatus = ref<string>("all"); // "all" | "completed" | "no-answer" | "busy" | "failed" | "canceled"

  /**
   * Correlates calls with known phone numbers in the account.
   */
  function correlateCalls(rawCalls: TwilioCall[]): EnrichedTwilioCall[] {
    const phoneNumbersStore = usePhoneNumbersStore();
    const knownPhoneNumbers = new Set(
      phoneNumbersStore.phoneNumbers.map(p => p.phone_number),
    );

    return rawCalls.map((call) => {
      const isFromOurNumber = knownPhoneNumbers.has(call.from);
      const isToOurNumber = knownPhoneNumbers.has(call.to);

      return {
        ...call,
        recordings: undefined,
        isLoadingRecordings: false,
        isFromOurNumber,
        isToOurNumber,
      };
    });
  }

  /**
   * Loads initial voice calls or refreshes data from Twilio API.
   */
  async function loadCalls(
    creds: AuthCredentials,
    refreshCache = false,
  ): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const phoneNumbersStore = usePhoneNumbersStore();
      if (!phoneNumbersStore.phoneNumbers.length) {
        phoneNumbersStore.loadPhoneNumbers(creds).catch(() => {});
      }

      const [err, res] = await twloFetchCalls({
        accountSid: creds.account_sid,
        from: formFrom.value.trim() || undefined,
        to: formTo.value.trim() || undefined,
        status: formStatus.value !== "all" ? formStatus.value : undefined,
        startTimeAfter: formFromDate.value.trim() || undefined,
        endTimeBefore: formToDate.value.trim() || undefined,
        pageSize: 50,
        authCredentials: creds,
        refreshCache,
      });

      if (err || !res) {
        error.value = err || "Failed to load voice calls from Twilio.";
        isLoading.value = false;
        return;
      }

      const enriched = correlateCalls(res.calls || []);
      calls.value = enriched;
      nextPageUri.value = res.next_page_uri || null;
      lastFetchedAt.value = Date.now();
      isLoading.value = false;
    } catch (err: unknown) {
      error.value = (err as Error).message || "An unexpected error occurred.";
      isLoading.value = false;
    }
  }

  /**
   * Loads the next page of voice calls using Twilio cursor pagination.
   */
  async function loadMore(creds: AuthCredentials): Promise<void> {
    if (!nextPageUri.value || isLoadingMore.value) {
      return;
    }

    isLoadingMore.value = true;
    try {
      const [err, res] = await twloFetchCalls({
        accountSid: creds.account_sid,
        nextPageUrl: nextPageUri.value,
        authCredentials: creds,
        refreshCache: true,
      });

      if (err || !res) {
        nextPageUri.value = null;
        isLoadingMore.value = false;
        return;
      }

      const enriched = correlateCalls(res.calls || []);
      calls.value.push(...enriched);
      nextPageUri.value = res.next_page_uri || null;
      isLoadingMore.value = false;
    } catch {
      nextPageUri.value = null;
      isLoadingMore.value = false;
    }
  }

  /**
   * Fetches call recordings list and audio blob URLs for a specific call.
   */
  async function fetchRecordingsForCall(
    callSid: string,
    creds: AuthCredentials,
  ): Promise<void> {
    const targetCall = calls.value.find(c => c.sid === callSid);
    if (!targetCall || targetCall.isLoadingRecordings) {
      return;
    }

    targetCall.isLoadingRecordings = true;
    try {
      const [err, items] = await twloFetchCallRecordings({
        accountSid: creds.account_sid,
        callSid,
        authCredentials: creds,
      });

      if (!err && items) {
        const recordingsWithBlobs = await Promise.all(
          items.map(async (rec) => {
            let audioBlobUrl: string | undefined = undefined;
            if (rec.uri) {
              const [blobErr, blob] = await twloFetchRecordingAudioBlob({
                recordingUri: rec.uri,
                authCredentials: creds,
              });
              if (!blobErr && blob) {
                audioBlobUrl = URL.createObjectURL(blob);
              }
            }
            return {
              ...rec,
              audioBlobUrl,
            };
          }),
        );
        targetCall.recordings = recordingsWithBlobs;
      }
    } finally {
      targetCall.isLoadingRecordings = false;
    }
  }

  /**
   * Resets all search parameters and reloads default calls list.
   */
  async function resetSearch(creds: AuthCredentials): Promise<void> {
    formFrom.value = "";
    formTo.value = "";
    formStatus.value = "all";
    formFromDate.value = "";
    formToDate.value = "";
    searchQuery.value = "";
    filterDirection.value = "all";
    filterStatus.value = "all";
    await loadCalls(creds, true);
  }

  /**
   * Filtered voice calls list based on live client filters.
   */
  const filteredCalls = computed<EnrichedTwilioCall[]>(() => {
    let list = calls.value;

    // Search query filter (SID, from, to, or caller name)
    const query = searchQuery.value.trim().toLowerCase();
    if (query) {
      list = list.filter((c) => {
        const sidMatch = c.sid.toLowerCase().includes(query);
        const fromMatch = c.from?.toLowerCase().includes(query)
          || c.from_formatted?.toLowerCase().includes(query);
        const toMatch = c.to?.toLowerCase().includes(query)
          || c.to_formatted?.toLowerCase().includes(query);
        const nameMatch = c.caller_name?.toLowerCase().includes(query);
        return sidMatch || fromMatch || toMatch || Boolean(nameMatch);
      });
    }

    // Direction filter
    if (filterDirection.value === "inbound") {
      list = list.filter(c => c.direction.toLowerCase().includes("inbound"));
    } else if (filterDirection.value === "outbound") {
      list = list.filter(c => c.direction.toLowerCase().includes("outbound"));
    }

    // Status filter
    if (filterStatus.value !== "all") {
      list = list.filter(c => c.status.toLowerCase() === filterStatus.value.toLowerCase());
    }

    return list;
  });

  /**
   * Aggregate statistics across all currently loaded voice calls.
   */
  const stats = computed(() => {
    let inbound = 0;
    let outbound = 0;
    let completed = 0;
    let failedOrMissed = 0;
    let totalDurationSeconds = 0;
    let totalCostUsd = 0;

    for (const call of calls.value) {
      const dir = call.direction.toLowerCase();
      if (dir.includes("inbound")) {
        inbound += 1;
      } else if (dir.includes("outbound")) {
        outbound += 1;
      }

      const st = call.status.toLowerCase();
      if (st === "completed") {
        completed += 1;
      } else if (["busy", "failed", "no-answer", "canceled"].includes(st)) {
        failedOrMissed += 1;
      }

      const dur = parseInt(call.duration || "0", 10);
      if (!isNaN(dur)) {
        totalDurationSeconds += dur;
      }

      if (call.price) {
        const p = Math.abs(parseFloat(call.price));
        if (!isNaN(p)) {
          totalCostUsd += p;
        }
      }
    }

    // Format duration nicely
    const hours = Math.floor(totalDurationSeconds / 3600);
    const minutes = Math.floor((totalDurationSeconds % 3600) / 60);
    const seconds = totalDurationSeconds % 60;
    let formattedDuration = `${seconds}s`;
    if (hours > 0) {
      formattedDuration = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      formattedDuration = `${minutes}m ${seconds}s`;
    }

    return {
      total: calls.value.length,
      inbound,
      outbound,
      completed,
      failedOrMissed,
      totalDurationSeconds,
      formattedDuration,
      estimatedCost: `$${totalCostUsd.toFixed(4)}`,
    };
  });

  /**
   * Has more records to load from Twilio.
   */
  const hasMore = computed(() => Boolean(nextPageUri.value));

  /**
   * Formats a call duration number in seconds into a friendly string.
   */
  function formatCallDuration(durationInSeconds?: string | number | null): string {
    if (!durationInSeconds) {
      return "0s";
    }
    const totalSec = typeof durationInSeconds === "string"
      ? parseInt(durationInSeconds, 10)
      : durationInSeconds;
    if (isNaN(totalSec) || totalSec <= 0) {
      return "0s";
    }
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  /**
   * Exports the currently filtered calls list to a CSV file.
   */
  async function exportToCsv(): Promise<void> {
    isExporting.value = true;
    try {
      const records = filteredCalls.value;
      if (!records.length) {
        return;
      }

      const headers = [
        "Call SID",
        "Direction",
        "Status",
        "From",
        "To",
        "Start Time",
        "End Time",
        "Duration (sec)",
        "Duration (formatted)",
        "Price",
        "Currency",
        "Caller Name",
        "Date Created",
      ];

      const rows = records.map((c) => {
        return [
          `"${c.sid}"`,
          `"${c.direction}"`,
          `"${c.status}"`,
          `"${c.from || ""}"`,
          `"${c.to || ""}"`,
          `"${c.start_time || ""}"`,
          `"${c.end_time || ""}"`,
          `"${c.duration || "0"}"`,
          `"${formatCallDuration(c.duration)}"`,
          `"${c.price || "0"}"`,
          `"${c.price_unit || "USD"}"`,
          `"${c.caller_name || ""}"`,
          `"${c.date_created || ""}"`,
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
      link.setAttribute("href", url);
      link.setAttribute("download", `twilio-voice-calls-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      isExporting.value = false;
    }
  }

  return {
    calls,
    isLoading,
    isLoadingMore,
    isSearching,
    isExporting,
    error,
    lastFetchedAt,
    nextPageUri,
    hasMore,
    formFrom,
    formTo,
    formStatus,
    formFromDate,
    formToDate,
    searchQuery,
    filterDirection,
    filterStatus,
    filteredCalls,
    stats,
    loadCalls,
    loadMore,
    fetchRecordingsForCall,
    resetSearch,
    formatCallDuration,
    exportToCsv,
  };
});
