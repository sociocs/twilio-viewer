import type {
  AuthCredentials,
  TwilioAccountRaw,
  TwilioMessagingService,
  TwilioA2PCompliance,
  TwilioServicePhoneNumber,
  TwilioTollfreeVerification,
  TwilioIncomingPhoneNumber,
  TwilioMessagesResponse,
  TwilioMediaItem,
  TwilioCallsResponse,
  TwilioCallRecording,
  TwilioAlertsResponse,
  TwilioAuditEventsResponse,
  TwilioAccountBalance,
  TwilioUsageRecordsResponse,
} from "~/types";

export interface CallTwilioApiOptions {
  baseUrl?: string;
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  authCredentials?: AuthCredentials;
  refreshCache?: boolean;
}

export type ApiResponse<T> = [error: string | null, data: T | null];

export async function callTwilioAPI<T = unknown>({
  baseUrl = "https://api.twilio.com",
  path,
  method = "GET",
  headers,
  body,
  authCredentials,
  refreshCache = false,
}: CallTwilioApiOptions): Promise<ApiResponse<T>> {
  try {
    const creds = authCredentials;
    if (!creds?.account_sid || !creds?.auth_token) {
      return ["Twilio Account SID and Auth Token are required.", null];
    }

    const authString = btoa(`${creds.account_sid}:${creds.auth_token}`);

    const headersInit: Record<string, string> = {
      Authorization: `Basic ${authString}`,
      Accept: "application/json",
      ...headers,
    };

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      mode: "cors",
      cache: refreshCache ? "reload" : "force-cache",
      credentials: "omit",
      headers: headersInit,
      body,
    });

    if (response.ok) {
      const data = (await response.json()) as T;
      return [null, data];
    }

    // Try to parse Twilio's standard error payload
    let errorMessage = `${response.status} ${response.statusText}`;
    try {
      const errorJson = (await response.json()) as { message?: string; code?: number };
      if (errorJson?.message) {
        errorMessage = errorJson.code
          ? `[Twilio Error ${errorJson.code}] ${errorJson.message}`
          : errorJson.message;
      }
    } catch {
      // response body was not JSON
    }

    return [errorMessage, null];
  } catch (error: unknown) {
    const err = error as Error;
    return [err?.message || "A network error occurred while communicating with Twilio.", null];
  }
}

export async function twloFetchAccount({
  accountSid,
  authCredentials,
  refreshCache = false,
}: {
  accountSid: string;
  authCredentials: AuthCredentials;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioAccountRaw>> {
  return await callTwilioAPI<TwilioAccountRaw>({
    path: `/2010-04-01/Accounts/${accountSid}.json`,
    authCredentials,
    refreshCache,
  });
}

export async function twloFetchSubaccounts({
  authCredentials,
  refreshCache = false,
}: {
  authCredentials: AuthCredentials;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioAccountRaw[]>> {
  const [error, data] = await callTwilioAPI<{ accounts?: TwilioAccountRaw[] }>({
    path: "/2010-04-01/Accounts.json",
    authCredentials,
    refreshCache,
  });

  if (error) {
    return [error, null];
  }

  return [null, data?.accounts || []];
}

/**
 * Update Twilio Account Friendly Name via Twilio API.
 * Calls POST /2010-04-01/Accounts/{accountSid}.json with FriendlyName form param.
 */
export async function twloUpdateAccountName({
  accountSid,
  authCredentials,
  friendlyName,
}: {
  accountSid: string;
  authCredentials: AuthCredentials;
  friendlyName: string;
}): Promise<ApiResponse<TwilioAccountRaw>> {
  const formParams = new URLSearchParams();
  formParams.append("FriendlyName", friendlyName);

  return await callTwilioAPI<TwilioAccountRaw>({
    path: `/2010-04-01/Accounts/${accountSid}.json`,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formParams.toString(),
    authCredentials,
    refreshCache: true,
  });
}

/**
 * Fetch all Messaging Services for the account.
 * Calls GET https://messaging.twilio.com/v1/Services?AccountSid={accountSid}&PageSize=100
 */
export async function twloFetchMessagingServices({
  accountSid,
  authCredentials,
  refreshCache = false,
}: {
  accountSid: string;
  authCredentials: AuthCredentials;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioMessagingService[]>> {
  const [error, data] = await callTwilioAPI<{ services?: TwilioMessagingService[] }>({
    baseUrl: "https://messaging.twilio.com/v1",
    path: `/Services?AccountSid=${accountSid}&PageSize=100`,
    authCredentials,
    refreshCache,
  });

  if (error) {
    return [error, null];
  }

  return [null, data?.services || []];
}

/**
 * Fetch US A2P 10DLC campaign compliance status for a messaging service.
 * Calls GET https://messaging.twilio.com/v1/Services/{serviceSid}/Compliance/Usa2p
 * Note: If no campaign is registered, Twilio returns 404 which is handled gracefully as null.
 */
export async function twloFetchA2PCompliance({
  serviceSid,
  authCredentials,
  refreshCache = false,
}: {
  serviceSid: string;
  authCredentials: AuthCredentials;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioA2PCompliance | null>> {
  const [error, data] = await callTwilioAPI<{
    compliance?: TwilioA2PCompliance[];
    [key: string]: unknown;
  }>({
    baseUrl: "https://messaging.twilio.com/v1",
    path: `/Services/${serviceSid}/Compliance/Usa2p`,
    authCredentials,
    refreshCache,
  });

  if (error) {
    if (error.includes("404") || error.includes("20404")) {
      return [null, null];
    }
    return [error, null];
  }

  if (!data) {
    return [null, null];
  }

  // Handle standard Twilio list response: { compliance: [ { ... } ], meta: { ... } }
  if (Array.isArray(data.compliance)) {
    return [null, data.compliance[0] || null];
  }

  // Handle case where API might return the object directly
  if (typeof data === "object" && ("campaign_id" in data || "sid" in data)) {
    return [null, data as unknown as TwilioA2PCompliance];
  }

  return [null, null];
}

/**
 * Fetch phone numbers associated with a messaging service sender pool.
 * Calls GET https://messaging.twilio.com/v1/Services/{serviceSid}/PhoneNumbers?PageSize=100
 */
export async function twloFetchServicePhoneNumbers({
  serviceSid,
  authCredentials,
  refreshCache = false,
}: {
  serviceSid: string;
  authCredentials: AuthCredentials;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioServicePhoneNumber[]>> {
  const [error, data] = await callTwilioAPI<{ phone_numbers?: TwilioServicePhoneNumber[] }>({
    baseUrl: "https://messaging.twilio.com/v1",
    path: `/Services/${serviceSid}/PhoneNumbers?PageSize=100`,
    authCredentials,
    refreshCache,
  });

  if (error) {
    return [error, null];
  }

  return [null, data?.phone_numbers || []];
}

/**
 * Fetch toll-free verifications for the account.
 * Calls GET https://messaging.twilio.com/v1/Tollfree/Verifications?PageSize=50
 */
export async function twloFetchTollfreeVerifications({
  authCredentials,
  refreshCache = false,
}: {
  authCredentials: AuthCredentials;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioTollfreeVerification[]>> {
  const allVerifications: TwilioTollfreeVerification[] = [];
  let nextUrl: string | undefined = "/Tollfree/Verifications?PageSize=50";
  const baseUrl = "https://messaging.twilio.com/v1";

  while (nextUrl) {
    const currentTarget: string = nextUrl;
    const isFullUrl: boolean = currentTarget.startsWith("http");
    const [error, data]: ApiResponse<{
      verifications?: TwilioTollfreeVerification[];
      meta?: { next_page_url?: string | null };
    }> = await callTwilioAPI<{
      verifications?: TwilioTollfreeVerification[];
      meta?: { next_page_url?: string | null };
    }>({
      baseUrl: isFullUrl ? currentTarget : baseUrl,
      path: isFullUrl ? "" : currentTarget,
      authCredentials,
      refreshCache,
    });

    if (error) {
      if (error.includes("404") || error.includes("20404")) {
        return [null, allVerifications];
      }
      if (allVerifications.length > 0) {
        return [null, allVerifications];
      }
      return [error, null];
    }

    if (data?.verifications) {
      allVerifications.push(...data.verifications);
    }

    nextUrl = data?.meta?.next_page_url || undefined;
  }

  return [null, allVerifications];
}

/**
 * Fetch incoming phone numbers for the account.
 * Calls GET https://api.twilio.com/2010-04-01/Accounts/{accountSid}/IncomingPhoneNumbers.json?PageSize=100
 */
export async function twloFetchIncomingPhoneNumbers({
  accountSid,
  authCredentials,
  refreshCache = false,
}: {
  accountSid: string;
  authCredentials: AuthCredentials;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioIncomingPhoneNumber[]>> {
  const [error, data] = await callTwilioAPI<{
    incoming_phone_numbers?: TwilioIncomingPhoneNumber[];
  }>({
    path: `/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=100`,
    authCredentials,
    refreshCache,
  });

  if (error) {
    return [error, null];
  }

  return [null, data?.incoming_phone_numbers || []];
}

/**
 * Fetch a single incoming phone number by its SID.
 * Calls GET https://api.twilio.com/2010-04-01/Accounts/{accountSid}/IncomingPhoneNumbers/{phoneNumberSid}.json
 */
export async function twloFetchIncomingPhoneNumber({
  accountSid,
  phoneNumberSid,
  authCredentials,
  refreshCache = false,
}: {
  accountSid: string;
  phoneNumberSid: string;
  authCredentials: AuthCredentials;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioIncomingPhoneNumber | null>> {
  const [error, data] = await callTwilioAPI<TwilioIncomingPhoneNumber>({
    path: `/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
    authCredentials,
    refreshCache,
  });

  if (error) {
    return [error, null];
  }

  return [null, data || null];
}

export interface FetchMessagesOptions {
  accountSid: string;
  from?: string;
  to?: string;
  dateSent?: string;
  dateSentAfter?: string;
  dateSentBefore?: string;
  pageSize?: number;
  nextPageUrl?: string;
  authCredentials: AuthCredentials;
  refreshCache?: boolean;
}

/**
 * Fetch messages for a Twilio Account.
 * Calls GET https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages.json
 */
export async function twloFetchMessages({
  accountSid,
  from,
  to,
  dateSent,
  dateSentAfter,
  dateSentBefore,
  pageSize = 50,
  nextPageUrl,
  authCredentials,
  refreshCache = false,
}: FetchMessagesOptions): Promise<ApiResponse<TwilioMessagesResponse>> {
  let path = `/2010-04-01/Accounts/${accountSid}/Messages.json`;

  if (nextPageUrl) {
    path = nextPageUrl;
  } else {
    const params = new URLSearchParams();
    if (from) {
      params.append("From", from.trim());
    }
    if (to) {
      params.append("To", to.trim());
    }
    if (dateSent) {
      params.append("DateSent", dateSent);
    }
    if (dateSentAfter) {
      params.append("DateSent>", dateSentAfter);
    }
    if (dateSentBefore) {
      params.append("DateSent<", dateSentBefore);
    }
    if (pageSize) {
      params.append("PageSize", String(pageSize));
    }
    const qs = params.toString();
    if (qs) {
      path += `?${qs}`;
    }
  }

  const [error, data] = await callTwilioAPI<TwilioMessagesResponse>({
    path,
    authCredentials,
    refreshCache,
  });

  if (error) {
    return [error, null];
  }

  return [null, data];
}

/**
 * Fetch media list for an MMS message.
 * Calls GET https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages/{messageSid}/Media.json
 */
export async function twloFetchMessageMedia({
  accountSid,
  messageSid,
  authCredentials,
  refreshCache = false,
}: {
  accountSid: string;
  messageSid: string;
  authCredentials: AuthCredentials;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioMediaItem[]>> {
  const [error, data] = await callTwilioAPI<{ media_list?: TwilioMediaItem[] }>({
    path: `/2010-04-01/Accounts/${accountSid}/Messages/${messageSid}/Media.json`,
    authCredentials,
    refreshCache,
  });

  if (error) {
    return [error, null];
  }

  return [null, data?.media_list || []];
}

/**
 * Fetch media binary file as a Blob with authorization so that the browser does not prompt basic auth.
 */
export async function twloFetchMediaBlob({
  mediaUri,
  authCredentials,
}: {
  mediaUri: string;
  authCredentials: AuthCredentials;
}): Promise<ApiResponse<Blob>> {
  try {
    const authString = btoa(`${authCredentials.account_sid}:${authCredentials.auth_token}`);
    const normalizedPath = mediaUri.replace(".json", "");
    const url = normalizedPath.startsWith("http")
      ? normalizedPath
      : `https://api.twilio.com${normalizedPath}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${authString}`,
      },
      credentials: "omit",
      mode: "cors",
    });

    if (!res.ok) {
      return [`Failed to load media (HTTP ${res.status})`, null];
    }

    const blob = await res.blob();
    return [null, blob];
  } catch (err: unknown) {
    return [(err as Error).message || "Failed to download media.", null];
  }
}

/**
 * Fetch voice calls list from Twilio Programmable Voice API.
 * Calls GET https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Calls.json
 */
export async function twloFetchCalls({
  accountSid,
  authCredentials,
  from,
  to,
  status,
  startTimeAfter,
  endTimeBefore,
  pageSize = 50,
  nextPageUrl,
  refreshCache = false,
}: {
  accountSid: string;
  authCredentials: AuthCredentials;
  from?: string;
  to?: string;
  status?: string;
  startTimeAfter?: string;
  endTimeBefore?: string;
  pageSize?: number;
  nextPageUrl?: string;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioCallsResponse>> {
  let path = `/2010-04-01/Accounts/${accountSid}/Calls.json`;

  if (nextPageUrl) {
    path = nextPageUrl.startsWith("http")
      ? nextPageUrl.replace("https://api.twilio.com", "")
      : nextPageUrl;
  } else {
    const params = new URLSearchParams();
    if (from?.trim()) {
      params.append("From", from.trim());
    }
    if (to?.trim()) {
      params.append("To", to.trim());
    }
    if (status && status !== "all") {
      params.append("Status", status.trim());
    }
    if (startTimeAfter?.trim()) {
      params.append("StartTime>", startTimeAfter.trim());
    }
    if (endTimeBefore?.trim()) {
      params.append("EndTime<", endTimeBefore.trim());
    }
    if (pageSize) {
      params.append("PageSize", String(pageSize));
    }
    const qs = params.toString();
    if (qs) {
      path += `?${qs}`;
    }
  }

  return await callTwilioAPI<TwilioCallsResponse>({
    path,
    authCredentials,
    refreshCache,
  });
}

/**
 * Fetch recordings list for a given voice call.
 * Calls GET https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Calls/{callSid}/Recordings.json
 */
export async function twloFetchCallRecordings({
  accountSid,
  callSid,
  authCredentials,
  refreshCache = false,
}: {
  accountSid: string;
  callSid: string;
  authCredentials: AuthCredentials;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioCallRecording[]>> {
  const [error, data] = await callTwilioAPI<{ recordings?: TwilioCallRecording[] }>({
    path: `/2010-04-01/Accounts/${accountSid}/Calls/${callSid}/Recordings.json`,
    authCredentials,
    refreshCache,
  });

  if (error) {
    return [error, null];
  }

  return [null, data?.recordings || []];
}

/**
 * Fetch call recording audio file (.mp3) as a Blob with authorization so that the browser does not prompt basic auth.
 */
export async function twloFetchRecordingAudioBlob({
  recordingUri,
  authCredentials,
}: {
  recordingUri: string;
  authCredentials: AuthCredentials;
}): Promise<ApiResponse<Blob>> {
  try {
    const authString = btoa(`${authCredentials.account_sid}:${authCredentials.auth_token}`);
    const normalizedPath = recordingUri.replace(/\.json$/, "") + ".mp3";
    const url = normalizedPath.startsWith("http")
      ? normalizedPath
      : `https://api.twilio.com${normalizedPath}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${authString}`,
      },
      credentials: "omit",
      mode: "cors",
    });

    if (!res.ok) {
      return [`Failed to load recording audio (HTTP ${res.status})`, null];
    }

    const blob = await res.blob();
    return [null, blob];
  } catch (err: unknown) {
    return [(err as Error).message || "Failed to download recording audio.", null];
  }
}

/**
 * Fetch alerts from Twilio Monitor API.
 * Calls GET https://monitor.twilio.com/v1/Alerts
 */
export async function twloFetchAlerts({
  accountSid: _accountSid,
  authCredentials,
  logLevel,
  startDate,
  endDate,
  pageSize = 50,
  nextPageUrl,
  refreshCache = false,
}: {
  accountSid?: string;
  authCredentials: AuthCredentials;
  logLevel?: string;
  startDate?: string;
  endDate?: string;
  pageSize?: number;
  nextPageUrl?: string;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioAlertsResponse>> {
  let baseUrl = "https://monitor.twilio.com/v1";
  let path = "/Alerts";

  if (nextPageUrl) {
    if (nextPageUrl.startsWith("http")) {
      baseUrl = nextPageUrl;
      path = "";
    } else {
      path = nextPageUrl;
    }
  } else {
    const params = new URLSearchParams();
    if (logLevel && logLevel !== "all") {
      params.append("LogLevel", logLevel.trim());
    }
    if (startDate?.trim()) {
      params.append("StartDate", startDate.trim());
    }
    if (endDate?.trim()) {
      params.append("EndDate", endDate.trim());
    }
    if (pageSize) {
      params.append("PageSize", String(pageSize));
    }
    const qs = params.toString();
    if (qs) {
      path += `?${qs}`;
    }
  }

  return await callTwilioAPI<TwilioAlertsResponse>({
    baseUrl,
    path,
    authCredentials,
    refreshCache,
  });
}

/**
 * Fetch audit events from Twilio Monitor API.
 * Calls GET https://monitor.twilio.com/v1/Events
 */
export async function twloFetchAuditEvents({
  accountSid: _accountSid,
  authCredentials,
  eventType,
  resourceSid,
  startDate,
  endDate,
  pageSize = 50,
  nextPageUrl,
  refreshCache = false,
}: {
  accountSid?: string;
  authCredentials: AuthCredentials;
  eventType?: string;
  resourceSid?: string;
  startDate?: string;
  endDate?: string;
  pageSize?: number;
  nextPageUrl?: string;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioAuditEventsResponse>> {
  let baseUrl = "https://monitor.twilio.com/v1";
  let path = "/Events";

  if (nextPageUrl) {
    if (nextPageUrl.startsWith("http")) {
      baseUrl = nextPageUrl;
      path = "";
    } else {
      path = nextPageUrl;
    }
  } else {
    const params = new URLSearchParams();
    if (eventType?.trim()) {
      params.append("EventType", eventType.trim());
    }
    if (resourceSid?.trim()) {
      params.append("ResourceSid", resourceSid.trim());
    }
    if (startDate?.trim()) {
      params.append("StartDate", startDate.trim());
    }
    if (endDate?.trim()) {
      params.append("EndDate", endDate.trim());
    }
    if (pageSize) {
      params.append("PageSize", String(pageSize));
    }
    const qs = params.toString();
    if (qs) {
      path += `?${qs}`;
    }
  }

  return await callTwilioAPI<TwilioAuditEventsResponse>({
    baseUrl,
    path,
    authCredentials,
    refreshCache,
  });
}

export async function twloFetchAccountBalance({
  accountSid,
  authCredentials,
  refreshCache = false,
}: {
  accountSid: string;
  authCredentials: AuthCredentials;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioAccountBalance>> {
  return await callTwilioAPI<TwilioAccountBalance>({
    path: `/2010-04-01/Accounts/${accountSid}/Balance.json`,
    authCredentials,
    refreshCache,
  });
}

export async function twloFetchUsageRecords({
  accountSid,
  authCredentials,
  fromDate,
  toDate,
  includeSubaccounts,
  refreshCache = false,
}: {
  accountSid: string;
  authCredentials: AuthCredentials;
  fromDate?: string;
  toDate?: string;
  includeSubaccounts?: boolean;
  refreshCache?: boolean;
}): Promise<ApiResponse<TwilioUsageRecordsResponse>> {
  let path = `/2010-04-01/Accounts/${accountSid}/Usage/Records.json`;
  const params = new URLSearchParams({ PageSize: "1000" });

  if (fromDate?.trim()) {
    params.append("StartDate", fromDate.trim());
  }
  if (toDate?.trim()) {
    params.append("EndDate", toDate.trim());
  }
  if (includeSubaccounts !== undefined) {
    params.append("IncludeSubaccounts", includeSubaccounts ? "true" : "false");
  }

  const qs = params.toString();
  if (qs) {
    path += `?${qs}`;
  }

  return await callTwilioAPI<TwilioUsageRecordsResponse>({
    path,
    authCredentials,
    refreshCache,
  });
}
