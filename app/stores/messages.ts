import { defineStore } from "pinia";
import { format } from "date-fns";
import type {
  AuthCredentials,
  EnrichedTwilioMessage,
  TwilioMessage,
} from "~/types";
import {
  twloFetchMessages,
  twloFetchMessageMedia,
  twloFetchMediaBlob,
} from "~/utils/call-twilio-api";
import { useMessagingStore } from "~/stores/messaging";
import { usePhoneNumbersStore } from "~/stores/phone-numbers";

export const useMessagesStore = defineStore("messages", () => {
  const messages = ref<EnrichedTwilioMessage[]>([]);
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
  const formFromDate = ref<string>("");
  const formToDate = ref<string>("");

  // Client-side quick filters & search
  const searchQuery = ref<string>("");
  const filterDirection = ref<string>("all"); // "all" | "inbound" | "outbound"
  const filterStatus = ref<string>("all"); // "all" | "delivered" | "sent" | "received" | "failed"
  const filterService = ref<string>("all"); // "all" | "MG..."

  /**
   * Correlates messages with known messaging services and phone numbers.
   */
  function correlateMessages(rawMessages: TwilioMessage[]): EnrichedTwilioMessage[] {
    const messagingStore = useMessagingStore();
    const phoneNumbersStore = usePhoneNumbersStore();

    const knownPhoneNumbers = new Set(
      phoneNumbersStore.phoneNumbers.map(p => p.phone_number),
    );

    return rawMessages.map((msg) => {
      let friendlyServiceName: string | null = null;
      if (msg.messaging_service_sid) {
        const matchedService = messagingStore.services.find(
          s => s.sid === msg.messaging_service_sid,
        );
        friendlyServiceName = matchedService?.friendly_name || null;
      }

      const isFromOurNumber = knownPhoneNumbers.has(msg.from);
      const isToOurNumber = knownPhoneNumbers.has(msg.to);

      return {
        ...msg,
        mediaList: undefined,
        isLoadingMedia: false,
        friendlyServiceName,
        isFromOurNumber,
        isToOurNumber,
      };
    });
  }

  /**
   * Loads initial messages or refreshes data from Twilio API.
   */
  async function loadMessages(
    creds: AuthCredentials,
    refreshCache = false,
  ): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      // Ensure messaging services and phone numbers are loaded for enrichment
      const messagingStore = useMessagingStore();
      const phoneNumbersStore = usePhoneNumbersStore();

      if (!messagingStore.services.length) {
        messagingStore.loadMessagingServices(creds).catch(() => {});
      }
      if (!phoneNumbersStore.phoneNumbers.length) {
        phoneNumbersStore.loadPhoneNumbers(creds).catch(() => {});
      }

      const [err, res] = await twloFetchMessages({
        accountSid: creds.account_sid,
        from: formFrom.value.trim() || undefined,
        to: formTo.value.trim() || undefined,
        dateSentAfter: formFromDate.value.trim() || undefined,
        dateSentBefore: formToDate.value.trim() || undefined,
        pageSize: 50,
        authCredentials: creds,
        refreshCache,
      });

      if (err || !res) {
        error.value = err || "Failed to load messages from Twilio.";
        isLoading.value = false;
        return;
      }

      const enriched = correlateMessages(res.messages || []);
      messages.value = enriched;
      nextPageUri.value = res.next_page_uri || null;
      lastFetchedAt.value = Date.now();
      isLoading.value = false;
    } catch (err: unknown) {
      error.value = (err as Error).message || "An unexpected error occurred.";
      isLoading.value = false;
    }
  }

  /**
   * Loads the next page of messages using Twilio cursor pagination.
   */
  async function loadMore(creds: AuthCredentials): Promise<void> {
    if (!nextPageUri.value || isLoadingMore.value) {
      return;
    }

    isLoadingMore.value = true;
    try {
      const [err, res] = await twloFetchMessages({
        accountSid: creds.account_sid,
        nextPageUrl: nextPageUri.value,
        authCredentials: creds,
        refreshCache: true,
      });

      if (err || !res) {
        // Stop pagination on error
        nextPageUri.value = null;
        isLoadingMore.value = false;
        return;
      }

      const enriched = correlateMessages(res.messages || []);
      messages.value.push(...enriched);
      nextPageUri.value = res.next_page_uri || null;
      isLoadingMore.value = false;
    } catch {
      nextPageUri.value = null;
      isLoadingMore.value = false;
    }
  }

  /**
   * Fetches MMS media list and blob previews for a specific message.
   */
  async function fetchMediaForMessage(
    messageSid: string,
    creds: AuthCredentials,
  ): Promise<void> {
    const msg = messages.value.find(m => m.sid === messageSid);
    if (!msg || msg.isLoadingMedia) {
      return;
    }

    msg.isLoadingMedia = true;
    try {
      const [err, items] = await twloFetchMessageMedia({
        accountSid: creds.account_sid,
        messageSid,
        authCredentials: creds,
      });

      if (!err && items) {
        // Fetch preview blob for image attachments to bypass basic auth prompt
        const mediaWithBlobs = await Promise.all(
          items.map(async (m) => {
            const isImage = m.content_type?.startsWith("image/");
            let blobUrl: string | undefined = undefined;

            if (isImage) {
              const [blobErr, blob] = await twloFetchMediaBlob({
                mediaUri: m.uri,
                authCredentials: creds,
              });
              if (!blobErr && blob) {
                blobUrl = URL.createObjectURL(blob);
              }
            }

            return {
              ...m,
              link: `https://api.twilio.com${m.uri.replace(".json", "")}`,
              blobUrl,
            };
          }),
        );

        msg.mediaList = mediaWithBlobs;
      }
    } finally {
      msg.isLoadingMedia = false;
    }
  }

  /**
   * Resets all search parameters and reloads default message list.
   */
  async function resetSearch(creds: AuthCredentials): Promise<void> {
    formFrom.value = "";
    formTo.value = "";
    formFromDate.value = "";
    formToDate.value = "";
    searchQuery.value = "";
    filterDirection.value = "all";
    filterStatus.value = "all";
    filterService.value = "all";
    await loadMessages(creds, true);
  }

  /**
   * Filtered messages list based on live client filters.
   */
  const filteredMessages = computed<EnrichedTwilioMessage[]>(() => {
    let list = messages.value;

    // Search query filter (body, SID, numbers, or service name)
    const query = searchQuery.value.trim().toLowerCase();
    if (query) {
      list = list.filter((m) => {
        const bodyMatch = m.body?.toLowerCase().includes(query);
        const sidMatch = m.sid.toLowerCase().includes(query);
        const fromMatch = m.from?.toLowerCase().includes(query);
        const toMatch = m.to?.toLowerCase().includes(query);
        const serviceMatch = m.friendlyServiceName?.toLowerCase().includes(query)
          || m.messaging_service_sid?.toLowerCase().includes(query);
        return bodyMatch || sidMatch || fromMatch || toMatch || serviceMatch;
      });
    }

    // Direction filter
    if (filterDirection.value === "inbound") {
      list = list.filter(m => m.direction.toLowerCase().includes("inbound"));
    } else if (filterDirection.value === "outbound") {
      list = list.filter(m => m.direction.toLowerCase().includes("outbound"));
    }

    // Status filter
    if (filterStatus.value === "delivered") {
      list = list.filter(m => m.status.toLowerCase() === "delivered");
    } else if (filterStatus.value === "sent") {
      list = list.filter(m => m.status.toLowerCase() === "sent");
    } else if (filterStatus.value === "received") {
      list = list.filter(m => m.status.toLowerCase() === "received");
    } else if (filterStatus.value === "failed") {
      list = list.filter(m =>
        m.status.toLowerCase() === "failed"
        || m.status.toLowerCase() === "undelivered"
        || Boolean(m.error_code),
      );
    }

    // Messaging service filter
    if (filterService.value !== "all") {
      list = list.filter(m => m.messaging_service_sid === filterService.value);
    }

    return list;
  });

  /**
   * Computed metric statistics across loaded messages.
   */
  const stats = computed(() => {
    const all = messages.value;
    const total = all.length;
    const inbound = all.filter(m => m.direction.toLowerCase().includes("inbound")).length;
    const outbound = all.filter(m => m.direction.toLowerCase().includes("outbound")).length;
    const delivered = all.filter(m => m.status.toLowerCase() === "delivered" || m.status.toLowerCase() === "received").length;
    const failed = all.filter(m =>
      m.status.toLowerCase() === "failed"
      || m.status.toLowerCase() === "undelivered"
      || Boolean(m.error_code),
    ).length;

    // Sum prices
    let totalCost = 0;
    let currency = "USD";
    for (const m of all) {
      if (m.price) {
        const val = Math.abs(parseFloat(m.price));
        if (!isNaN(val)) {
          totalCost += val;
        }
      }
      if (m.price_unit) {
        currency = m.price_unit.toUpperCase();
      }
    }

    return {
      total,
      inbound,
      outbound,
      delivered,
      failed,
      totalCost: totalCost.toFixed(4),
      currency,
    };
  });

  /**
   * Exports the currently filtered messages to a CSV file.
   */
  function exportToCsv(accountSid: string): void {
    isExporting.value = true;
    try {
      const records = filteredMessages.value;
      const headers = [
        "Message SID",
        "Direction",
        "From",
        "To",
        "Messaging Service SID",
        "Messaging Service Name",
        "Status",
        "Segments",
        "Media Count",
        "Price",
        "Price Unit",
        "Error Code",
        "Error Message",
        "Date Sent",
        "Date Created",
        "Body",
      ];

      const rows = records.map((m) => {
        const escape = (val: unknown): string => {
          if (val === null || val === undefined) {
            return "\"\"";
          }
          const str = String(val).replace(/"/g, "\"\"");
          return `"${str}"`;
        };

        return [
          escape(m.sid),
          escape(m.direction),
          escape(m.from),
          escape(m.to),
          escape(m.messaging_service_sid || ""),
          escape(m.friendlyServiceName || ""),
          escape(m.status),
          escape(m.num_segments),
          escape(m.num_media),
          escape(m.price || ""),
          escape(m.price_unit || ""),
          escape(m.error_code || ""),
          escape(m.error_message || ""),
          escape(m.date_sent || ""),
          escape(m.date_created || ""),
          escape(m.body || ""),
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = format(new Date(), "yyyyMMdd_HHmmss");
      link.href = url;
      link.setAttribute("download", `messages_${accountSid}_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      isExporting.value = false;
    }
  }

  return {
    messages,
    isLoading,
    isLoadingMore,
    isSearching,
    isExporting,
    error,
    lastFetchedAt,
    nextPageUri,
    hasMore: computed(() => Boolean(nextPageUri.value)),
    formFrom,
    formTo,
    formFromDate,
    formToDate,
    searchQuery,
    filterDirection,
    filterStatus,
    filterService,
    filteredMessages,
    stats,
    loadMessages,
    loadMore,
    fetchMediaForMessage,
    resetSearch,
    exportToCsv,
  };
});
