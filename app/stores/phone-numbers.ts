import { defineStore } from "pinia";
import type {
  AuthCredentials,
  EnrichedIncomingPhoneNumber,
  LinkedMessagingServiceRef,
  TwilioIncomingPhoneNumber,
} from "~/types";
import {
  twloFetchIncomingPhoneNumber,
  twloFetchIncomingPhoneNumbers,
} from "~/utils/call-twilio-api";
import { useMessagingStore } from "~/stores/messaging";

export const usePhoneNumbersStore = defineStore("phoneNumbers", () => {
  const phoneNumbers = ref<EnrichedIncomingPhoneNumber[]>([]);
  const isLoading = ref<boolean>(false);
  const error = ref<string>("");
  const lastFetchedAt = ref<number | null>(null);

  // Search and filter states
  const searchQuery = ref<string>("");
  const filterCapability = ref<string>("all"); // "all" | "sms" | "voice" | "mms"
  const filterType = ref<string>("all"); // "all" | "tollfree" | "local"
  const filterService = ref<string>("all"); // "all" | "in_service" | "standalone" | specific service SID

  /**
   * Loads all incoming phone numbers and cross-correlates them with messaging services.
   */
  async function loadPhoneNumbers(
    creds: AuthCredentials,
    refreshCache = false,
  ): Promise<void> {
    isLoading.value = true;
    error.value = "";

    const messagingStore = useMessagingStore();

    try {
      // Fetch incoming phone numbers and ensure messaging services / toll-free verifications are loaded in parallel
      const shouldLoadMessaging = refreshCache
        || messagingStore.services.length === 0
        || messagingStore.tollfreeVerifications.length === 0;

      const [numbersResult] = await Promise.all([
        twloFetchIncomingPhoneNumbers({
          accountSid: creds.account_sid,
          authCredentials: creds,
          refreshCache,
        }),
        shouldLoadMessaging
          ? messagingStore.loadMessagingServices(creds, refreshCache)
          : Promise.resolve(),
      ]);

      const [numbersError, rawNumbers] = numbersResult;

      if (numbersError) {
        error.value = numbersError;
        isLoading.value = false;
        return;
      }

      // Map raw numbers and cross-reference with messaging services and toll-free verifications
      const enriched = correlatePhoneNumbers(rawNumbers || [], messagingStore);

      phoneNumbers.value = enriched;
      lastFetchedAt.value = Date.now();
      isLoading.value = false;
    } catch (err: unknown) {
      error.value = (err as Error).message || "Failed to load phone numbers.";
      isLoading.value = false;
    }
  }

  /**
   * Correlates incoming phone numbers with messaging services and toll-free verification records.
   */
  function correlatePhoneNumbers(
    rawNumbers: TwilioIncomingPhoneNumber[],
    messagingStore: ReturnType<typeof useMessagingStore>,
  ): EnrichedIncomingPhoneNumber[] {
    const services = messagingStore.services;
    const tollfreeVerifs = messagingStore.tollfreeVerifications;

    return rawNumbers.map((pn) => {
      const pnClean = pn.phone_number?.replace(/\D/g, "");

      // Find all messaging services containing this phone number in their sender pool
      const linkedServices: LinkedMessagingServiceRef[] = [];

      for (const service of services) {
        const inPool = service.phoneNumbers?.some((poolPn) => {
          if (poolPn.sid === pn.sid) {
            return true;
          }
          const poolClean = poolPn.phone_number?.replace(/\D/g, "");
          if (pnClean && poolClean && pnClean === poolClean) {
            return true;
          }
          return poolPn.phone_number === pn.phone_number;
        });
        if (inPool) {
          linkedServices.push({
            sid: service.sid,
            friendly_name: service.friendly_name,
            usecase: service.usecase,
          });
        }
      }

      // Match toll-free verification if applicable
      const matchedVerif = tollfreeVerifs.find((v) => {
        if (v.tollfree_phone_number_sid && v.tollfree_phone_number_sid === pn.sid) {
          return true;
        }
        const vClean = v.tollfree_phone_number?.replace(/\D/g, "");
        if (pnClean && vClean && pnClean === vClean) {
          return true;
        }
        return v.tollfree_phone_number === pn.phone_number;
      });

      return {
        ...pn,
        linkedMessagingServices: linkedServices,
        tollfreeVerification: matchedVerif || null,
        isLoadingDetails: false,
      };
    });
  }

  /**
   * Refreshes a single phone number's details from Twilio API.
   */
  async function refreshSingleNumber(
    phoneNumberSid: string,
    creds: AuthCredentials,
  ): Promise<void> {
    const item = phoneNumbers.value.find(n => n.sid === phoneNumberSid);
    if (!item) {
      return;
    }

    item.isLoadingDetails = true;
    try {
      const [err, updated] = await twloFetchIncomingPhoneNumber({
        accountSid: creds.account_sid,
        phoneNumberSid,
        authCredentials: creds,
        refreshCache: true,
      });

      if (!err && updated) {
        const messagingStore = useMessagingStore();
        const correlated = correlatePhoneNumbers([updated], messagingStore);
        if (correlated[0]) {
          Object.assign(item, correlated[0]);
        }
      }
    } finally {
      item.isLoadingDetails = false;
    }
  }

  /**
   * Helper: checks if a phone number string is US/Canada toll-free.
   */
  function isTollfreeNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, "");
    return (
      cleaned.startsWith("1800")
      || cleaned.startsWith("1888")
      || cleaned.startsWith("1877")
      || cleaned.startsWith("1866")
      || cleaned.startsWith("1855")
      || cleaned.startsWith("1844")
      || cleaned.startsWith("1833")
    );
  }

  /**
   * Filtered phone numbers based on search query, capability, type, and messaging service.
   */
  const filteredPhoneNumbers = computed<EnrichedIncomingPhoneNumber[]>(() => {
    let list = phoneNumbers.value;

    // Search query filter
    const query = searchQuery.value.trim().toLowerCase();
    if (query) {
      list = list.filter((pn) => {
        const numberMatch = pn.phone_number.toLowerCase().includes(query);
        const nameMatch = pn.friendly_name?.toLowerCase().includes(query);
        const sidMatch = pn.sid.toLowerCase().includes(query);
        const serviceMatch = pn.linkedMessagingServices?.some(s =>
          s.friendly_name.toLowerCase().includes(query) || s.sid.toLowerCase().includes(query),
        );
        return numberMatch || nameMatch || sidMatch || serviceMatch;
      });
    }

    // Capability filter
    if (filterCapability.value === "sms") {
      list = list.filter(pn => Boolean(pn.capabilities?.sms));
    } else if (filterCapability.value === "voice") {
      list = list.filter(pn => Boolean(pn.capabilities?.voice));
    } else if (filterCapability.value === "mms") {
      list = list.filter(pn => Boolean(pn.capabilities?.mms));
    }

    // Number Type filter
    if (filterType.value === "tollfree") {
      list = list.filter(pn => isTollfreeNumber(pn.phone_number));
    } else if (filterType.value === "local") {
      list = list.filter(pn => !isTollfreeNumber(pn.phone_number));
    }

    // Messaging service association filter
    if (filterService.value === "in_service") {
      list = list.filter(pn => (pn.linkedMessagingServices?.length ?? 0) > 0);
    } else if (filterService.value === "standalone") {
      list = list.filter(pn => (pn.linkedMessagingServices?.length ?? 0) === 0);
    } else if (filterService.value !== "all") {
      list = list.filter(pn =>
        pn.linkedMessagingServices?.some(s => s.sid === filterService.value),
      );
    }

    return list;
  });

  /**
   * Summary metric counts.
   */
  const stats = computed(() => {
    const all = phoneNumbers.value;
    const total = all.length;
    const sms = all.filter(n => Boolean(n.capabilities?.sms)).length;
    const voice = all.filter(n => Boolean(n.capabilities?.voice)).length;
    const mms = all.filter(n => Boolean(n.capabilities?.mms)).length;
    const tollfree = all.filter(n => isTollfreeNumber(n.phone_number)).length;
    const inService = all.filter(n => (n.linkedMessagingServices?.length ?? 0) > 0).length;
    const standalone = total - inService;

    return {
      total,
      sms,
      voice,
      mms,
      tollfree,
      inService,
      standalone,
    };
  });

  return {
    phoneNumbers,
    isLoading,
    error,
    lastFetchedAt,
    searchQuery,
    filterCapability,
    filterType,
    filterService,
    filteredPhoneNumbers,
    stats,
    loadPhoneNumbers,
    refreshSingleNumber,
    isTollfreeNumber,
  };
});
