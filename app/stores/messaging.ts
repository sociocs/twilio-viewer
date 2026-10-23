import { defineStore } from "pinia";
import type {
  AuthCredentials,
  EnrichedMessagingService,
  TwilioA2PCompliance,
  TwilioServicePhoneNumber,
  TwilioTollfreeVerification,
} from "~/types";
import {
  twloFetchA2PCompliance,
  twloFetchMessagingServices,
  twloFetchServicePhoneNumbers,
  twloFetchTollfreeVerifications,
} from "~/utils/call-twilio-api";

export const useMessagingStore = defineStore("messaging", () => {
  const services = ref<EnrichedMessagingService[]>([]);
  const tollfreeVerifications = ref<TwilioTollfreeVerification[]>([]);
  const isLoading = ref<boolean>(false);
  const error = ref<string>("");
  const lastFetchedAt = ref<number | null>(null);
  const searchQuery = ref<string>("");
  const filterStatus = ref<string>("all");

  /**
   * Loads all messaging services and toll-free verifications for the active account.
   */
  async function loadMessagingServices(
    creds: AuthCredentials,
    refreshCache = false,
  ): Promise<void> {
    isLoading.value = true;
    error.value = "";

    try {
      // Fetch both messaging services and toll-free verifications in parallel
      const [servicesResult, tollfreeResult] = await Promise.all([
        twloFetchMessagingServices({
          accountSid: creds.account_sid,
          authCredentials: creds,
          refreshCache,
        }),
        twloFetchTollfreeVerifications({
          authCredentials: creds,
          refreshCache,
        }),
      ]);

      const [servicesError, rawServices] = servicesResult;
      const [tollfreeError, rawVerifications] = tollfreeResult;

      tollfreeVerifications.value = rawVerifications || [];
      if (tollfreeError) {
        console.warn("Could not load tollfree verifications:", tollfreeError);
      }

      if (servicesError) {
        error.value = servicesError;
        isLoading.value = false;
        return;
      }

      // Initialize enriched services
      const enriched: EnrichedMessagingService[] = (rawServices || []).map(srv => ({
        ...srv,
        a2pCompliance: null,
        phoneNumbers: [],
        tollfreeVerifications: [],
        isLoadingDetails: true,
      }));

      services.value = enriched;
      lastFetchedAt.value = Date.now();
      isLoading.value = false;

      // Asynchronously load compliance and sender pool phone numbers for each service
      await loadDetailsForServices(creds, refreshCache);
    } catch (err: unknown) {
      error.value = (err as Error).message || "Failed to load messaging services.";
      isLoading.value = false;
    }
  }

  /**
   * Fetches A2P 10DLC compliance and sender pool phone numbers for all messaging services.
   */
  async function loadDetailsForServices(
    creds: AuthCredentials,
    refreshCache = false,
  ): Promise<void> {
    const list = services.value;

    await Promise.all(
      list.map(async (service) => {
        try {
          const [complianceRes, numbersRes] = await Promise.all([
            service.us_app_to_person_registered
              ? twloFetchA2PCompliance({
                serviceSid: service.sid,
                authCredentials: creds,
                refreshCache,
              })
              : Promise.resolve([null, null] as [null, TwilioA2PCompliance | null]),
            twloFetchServicePhoneNumbers({
              serviceSid: service.sid,
              authCredentials: creds,
              refreshCache,
            }),
          ]);

          const [, complianceData] = complianceRes;
          const [, phoneNumbersData] = numbersRes;

          service.a2pCompliance = complianceData;
          service.phoneNumbers = (phoneNumbersData as TwilioServicePhoneNumber[]) || [];

          // Correlate phone numbers in this service with account toll-free verifications
          if (service.phoneNumbers.length > 0 && tollfreeVerifications.value.length > 0) {
            const matchedVerifications = tollfreeVerifications.value.filter(verif =>
              service.phoneNumbers?.some((pn) => {
                if (verif.tollfree_phone_number_sid && pn.sid === verif.tollfree_phone_number_sid) {
                  return true;
                }
                const pnClean = pn.phone_number?.replace(/\D/g, "");
                const vClean = verif.tollfree_phone_number?.replace(/\D/g, "");
                return (Boolean(pnClean) && Boolean(vClean) && pnClean === vClean) || pn.phone_number === verif.tollfree_phone_number;
              }),
            );
            service.tollfreeVerifications = matchedVerifications;
          }
        } catch (detailErr) {
          console.warn(`Failed to fetch details for service ${service.sid}:`, detailErr);
        } finally {
          service.isLoadingDetails = false;
        }
      }),
    );
  }

  /**
   * Refreshes a single messaging service's compliance and sender pool.
   */
  async function refreshSingleService(
    serviceSid: string,
    creds: AuthCredentials,
  ): Promise<void> {
    const service = services.value.find(s => s.sid === serviceSid);
    if (!service) {
      return;
    }

    service.isLoadingDetails = true;
    try {
      const [complianceRes, numbersRes] = await Promise.all([
        twloFetchA2PCompliance({
          serviceSid,
          authCredentials: creds,
          refreshCache: true,
        }),
        twloFetchServicePhoneNumbers({
          serviceSid,
          authCredentials: creds,
          refreshCache: true,
        }),
      ]);

      const [, complianceData] = complianceRes;
      const [, phoneNumbersData] = numbersRes;

      service.a2pCompliance = complianceData;
      service.phoneNumbers = (phoneNumbersData as TwilioServicePhoneNumber[]) || [];

      if (service.phoneNumbers.length > 0 && tollfreeVerifications.value.length > 0) {
        service.tollfreeVerifications = tollfreeVerifications.value.filter(verif =>
          service.phoneNumbers?.some((pn) => {
            if (verif.tollfree_phone_number_sid && pn.sid === verif.tollfree_phone_number_sid) {
              return true;
            }
            const pnClean = pn.phone_number?.replace(/\D/g, "");
            const vClean = verif.tollfree_phone_number?.replace(/\D/g, "");
            return (Boolean(pnClean) && Boolean(vClean) && pnClean === vClean) || pn.phone_number === verif.tollfree_phone_number;
          }),
        );
      }
    } finally {
      service.isLoadingDetails = false;
    }
  }

  /**
   * Filtered services based on search query and filter status.
   */
  const filteredServices = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const filter = filterStatus.value;

    return services.value.filter((srv) => {
      // Search matching
      const matchesSearch
        = !query
          || srv.friendly_name.toLowerCase().includes(query)
          || srv.sid.toLowerCase().includes(query)
          || (srv.usecase && srv.usecase.toLowerCase().includes(query))
          || (srv.a2pCompliance?.campaign_id
            && srv.a2pCompliance.campaign_id.toLowerCase().includes(query))
          || (srv.a2pCompliance?.brand_registration_sid
            && srv.a2pCompliance.brand_registration_sid.toLowerCase().includes(query));

      if (!matchesSearch) {
        return false;
      }

      // Filter status matching
      if (filter === "all") {
        return true;
      }

      if (filter === "a2p_verified") {
        return (
          srv.us_app_to_person_registered
          && srv.a2pCompliance?.campaign_status?.toUpperCase() === "VERIFIED"
        );
      }

      if (filter === "a2p_pending") {
        const st = srv.a2pCompliance?.campaign_status?.toUpperCase();
        return (
          srv.us_app_to_person_registered
          && (st === "PENDING" || st === "IN_PROGRESS" || !st)
        );
      }

      if (filter === "tollfree_verified") {
        return srv.tollfreeVerifications?.some(
          v =>
            v.status.toUpperCase() === "APPROVED"
            || v.status.toUpperCase() === "TWILIO_APPROVED"
            || v.status.toUpperCase() === "VERIFIED",
        );
      }

      if (filter === "needs_attention") {
        const a2pFailed
          = srv.a2pCompliance?.campaign_status?.toUpperCase() === "FAILED";
        const tfRejected = srv.tollfreeVerifications?.some(
          v =>
            v.status.toUpperCase() === "REJECTED"
            || v.status.toUpperCase() === "TWILIO_REJECTED",
        );
        return a2pFailed || tfRejected;
      }

      return true;
    });
  });

  /**
   * Overall summary metrics for display cards.
   */
  const metrics = computed(() => {
    const total = services.value.length;
    let a2pVerified = 0;
    let a2pPending = 0;
    let tollfreeVerified = 0;
    let needsAttention = 0;

    for (const srv of services.value) {
      const a2pStatus = srv.a2pCompliance?.campaign_status?.toUpperCase();
      if (srv.us_app_to_person_registered && a2pStatus === "VERIFIED") {
        a2pVerified++;
      } else if (
        srv.us_app_to_person_registered
        && (a2pStatus === "PENDING" || a2pStatus === "IN_PROGRESS")
      ) {
        a2pPending++;
      }

      if (
        srv.tollfreeVerifications?.some(
          v =>
            v.status.toUpperCase() === "APPROVED"
            || v.status.toUpperCase() === "TWILIO_APPROVED"
            || v.status.toUpperCase() === "VERIFIED",
        )
      ) {
        tollfreeVerified++;
      }

      if (
        a2pStatus === "FAILED"
        || srv.tollfreeVerifications?.some(
          v =>
            v.status.toUpperCase() === "REJECTED"
            || v.status.toUpperCase() === "TWILIO_REJECTED",
        )
      ) {
        needsAttention++;
      }
    }

    return {
      total,
      a2pVerified,
      a2pPending,
      tollfreeVerified,
      needsAttention,
    };
  });

  return {
    services,
    tollfreeVerifications,
    isLoading,
    error,
    lastFetchedAt,
    searchQuery,
    filterStatus,
    filteredServices,
    metrics,

    loadMessagingServices,
    loadDetailsForServices,
    refreshSingleService,
  };
});
