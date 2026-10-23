import { defineStore } from "pinia";
import type { Connection, Subaccount, AuthCredentials } from "~/types";
import {
  dbDeleteConnection,
  dbDeleteSubaccounts,
  dbGetAllConnections,
  dbGetSubaccounts,
  dbResetInUse,
  dbSaveConnection,
  dbSaveSubaccounts,
  dbSetInUse,
  dbUpdateConnectionFriendlyName,
  dbUpdateConnectionName,
} from "~/utils/db";
import {
  twloFetchAccount,
  twloFetchSubaccounts,
  twloUpdateAccountName,
} from "~/utils/call-twilio-api";

export const useMainStore = defineStore("main", () => {
  const savedConnections = ref<Connection[]>([]);
  const activeAccountSid = ref<string>("");
  const activeAuthToken = ref<string>("");
  const activeConnectionName = ref<string>("");
  const subaccounts = ref<Subaccount[]>([]);
  const isInitializing = ref<boolean>(true);
  const isFetchingSubaccounts = ref<boolean>(false);
  const isRefreshingTwilioName = ref<boolean>(false);
  const isUpdatingTwilioName = ref<boolean>(false);

  const activeAccount = computed<Connection | undefined>(() => {
    return savedConnections.value.find(conn => conn.account_sid === activeAccountSid.value);
  });

  const hasSavedAccounts = computed<boolean>(() => {
    return savedConnections.value.length > 0;
  });

  const activeCredentials = computed<AuthCredentials | null>(() => {
    if (!activeAccountSid.value || !activeAuthToken.value) {
      return null;
    }
    return {
      account_sid: activeAccountSid.value,
      auth_token: activeAuthToken.value,
    };
  });

  const isSubaccount = computed<boolean>(() => {
    return Boolean(activeAccount.value?.owner_account_sid);
  });

  const parentAccount = computed<Connection | undefined>(() => {
    if (!activeAccount.value?.owner_account_sid) {
      return undefined;
    }
    return savedConnections.value.find(c => c.account_sid === activeAccount.value?.owner_account_sid);
  });

  async function loadConnections(): Promise<void> {
    isInitializing.value = true;
    try {
      const connections = await dbGetAllConnections();
      savedConnections.value = connections;

      if (connections.length > 0) {
        const inUseConn = connections.find(c => c.in_use) || connections[0];
        if (inUseConn) {
          activeAccountSid.value = inUseConn.account_sid;
          activeAuthToken.value = inUseConn.auth_token;
          activeConnectionName.value = inUseConn.name;

          if (!inUseConn.in_use) {
            await dbSetInUse(inUseConn.account_sid);
          }

          await loadSubaccounts(inUseConn.account_sid);
        }
      } else {
        clearActive();
      }
    } catch (error) {
      console.error("Failed to load connections from database:", error);
    } finally {
      isInitializing.value = false;
    }
  }

  async function loadSubaccounts(ownerSid: string): Promise<void> {
    try {
      const list = await dbGetSubaccounts(ownerSid);
      subaccounts.value = list;
    } catch (error) {
      console.error("Failed to load subaccounts:", error);
    }
  }

  async function fetchAndPersistSubaccounts(creds: AuthCredentials): Promise<{ success: boolean; count: number; error?: string }> {
    isFetchingSubaccounts.value = true;
    try {
      const [error, rawAccounts] = await twloFetchSubaccounts({ authCredentials: creds, refreshCache: true });
      if (error || !rawAccounts) {
        console.warn("Could not fetch subaccounts:", error);
        return { success: false, count: subaccounts.value.length, error: error || "Unknown error" };
      }

      const subs: Subaccount[] = [];
      const now = Date.now();

      for (const acc of rawAccounts) {
        if (acc.sid !== acc.owner_account_sid) {
          subs.push({
            sid: acc.sid,
            owner_account_sid: acc.owner_account_sid,
            name: acc.friendly_name || acc.sid,
            status: acc.status,
            created_at: new Date(acc.date_created).getTime(),
            loaded_at: now,
            auth_token: acc.auth_token,
          });
        }
      }

      await dbDeleteSubaccounts(creds.account_sid);
      if (subs.length > 0) {
        await dbSaveSubaccounts(subs);
      }
      subaccounts.value = subs;

      return { success: true, count: subs.length };
    } catch (error) {
      console.error("Error fetching subaccounts from Twilio API:", error);
      return { success: false, count: subaccounts.value.length, error: (error as Error).message };
    } finally {
      isFetchingSubaccounts.value = false;
    }
  }

  async function addAndActivateConnection({
    accountSid,
    authToken,
    name,
    friendlyName,
    status,
    createdAt,
  }: {
    accountSid: string;
    authToken: string;
    name: string;
    friendlyName?: string;
    status: string;
    createdAt: number;
  }): Promise<void> {
    await dbResetInUse();

    const newConnection: Connection = {
      account_sid: accountSid,
      auth_token: authToken,
      name,
      friendly_name: friendlyName,
      in_use: true,
      status,
      created_at: createdAt,
      saved_at: Date.now(),
    };

    await dbSaveConnection(newConnection);

    activeAccountSid.value = accountSid;
    activeAuthToken.value = authToken;
    activeConnectionName.value = name;

    await loadConnections();

    // Fetch subaccounts asynchronously
    fetchAndPersistSubaccounts({ account_sid: accountSid, auth_token: authToken });
  }

  async function switchActiveConnection(accountSid: string): Promise<void> {
    await dbResetInUse();
    await dbSetInUse(accountSid);

    const target = savedConnections.value.find(c => c.account_sid === accountSid);
    if (target) {
      activeAccountSid.value = target.account_sid;
      activeAuthToken.value = target.auth_token;
      activeConnectionName.value = target.name;
      await loadSubaccounts(target.account_sid);
    }

    const updated = await dbGetAllConnections();
    savedConnections.value = updated;
  }

  /**
   * Switches to or saves and activates a subaccount as a local connection.
   * If not already present in savedConnections, it inherits credentials and creates a Connection record.
   */
  async function switchToSubaccount(sub: Subaccount): Promise<void> {
    const existing = savedConnections.value.find(c => c.account_sid === sub.sid);
    if (existing) {
      await switchActiveConnection(existing.account_sid);
      return;
    }

    const parent = savedConnections.value.find(c => c.account_sid === sub.owner_account_sid) || activeAccount.value;
    const token = sub.auth_token || parent?.auth_token || "";

    const newConnection: Connection = {
      account_sid: sub.sid,
      auth_token: token,
      name: sub.name,
      friendly_name: sub.name,
      in_use: true,
      status: sub.status || "active",
      created_at: sub.created_at || Date.now(),
      saved_at: Date.now(),
      owner_account_sid: sub.owner_account_sid,
    };

    await dbResetInUse();
    await dbSaveConnection(newConnection);
    await dbSetInUse(sub.sid);

    activeAccountSid.value = sub.sid;
    activeAuthToken.value = token;
    activeConnectionName.value = sub.name;

    await loadConnections();
  }

  async function removeConnection(accountSid: string): Promise<void> {
    const isCurrent = activeAccountSid.value === accountSid;
    await dbDeleteConnection(accountSid);

    const updated = await dbGetAllConnections();
    savedConnections.value = updated;

    if (isCurrent) {
      if (updated.length > 0 && updated[0]) {
        await switchActiveConnection(updated[0].account_sid);
      } else {
        clearActive();
      }
    }
  }

  async function updateConnectionName(accountSid: string, newName: string): Promise<void> {
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    await dbUpdateConnectionName(accountSid, trimmed);

    const target = savedConnections.value.find(c => c.account_sid === accountSid);
    if (target) {
      target.name = trimmed;
    }

    if (activeAccountSid.value === accountSid) {
      activeConnectionName.value = trimmed;
    }
  }

  /**
   * Refreshes Twilio Account details (friendly_name, status) from Twilio API.
   * Calls GET /2010-04-01/Accounts/{accountSid}.json.
   */
  async function refreshTwilioAccountName(accountSid?: string): Promise<{ success: boolean; data?: TwilioAccountRaw; error?: string }> {
    const targetSid = accountSid || activeAccountSid.value;
    if (!targetSid) {
      return { success: false, error: "No active account SID." };
    }

    const conn = savedConnections.value.find(c => c.account_sid === targetSid);
    if (!conn) {
      return { success: false, error: "Account not found in local storage." };
    }

    isRefreshingTwilioName.value = true;
    try {
      const [error, accountData] = await twloFetchAccount({
        accountSid: targetSid,
        authCredentials: {
          account_sid: conn.account_sid,
          auth_token: conn.auth_token,
        },
        refreshCache: true,
      });

      if (error || !accountData) {
        return { success: false, error: error || "Failed to fetch account from Twilio." };
      }

      conn.friendly_name = accountData.friendly_name;
      conn.status = accountData.status;

      await dbUpdateConnectionFriendlyName(targetSid, accountData.friendly_name);

      return { success: true, data: accountData };
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || "An unexpected error occurred while refreshing account.";
      return { success: false, error: errorMsg };
    } finally {
      isRefreshingTwilioName.value = false;
    }
  }

  /**
   * Updates Twilio Account Friendly Name via Twilio API.
   * Calls POST /2010-04-01/Accounts/{accountSid}.json with FriendlyName form param.
   */
  async function updateTwilioAccountName({
    accountSid,
    newFriendlyName,
    syncConnectionLabel = false,
  }: {
    accountSid: string;
    newFriendlyName: string;
    syncConnectionLabel?: boolean;
  }): Promise<{ success: boolean; data?: TwilioAccountRaw; error?: string }> {
    const conn = savedConnections.value.find(c => c.account_sid === accountSid);
    if (!conn) {
      return { success: false, error: "Account not found in local storage." };
    }

    const trimmed = newFriendlyName.trim();
    if (!trimmed) {
      return { success: false, error: "Twilio account name cannot be empty." };
    }

    isUpdatingTwilioName.value = true;
    try {
      const [error, accountData] = await twloUpdateAccountName({
        accountSid,
        authCredentials: {
          account_sid: conn.account_sid,
          auth_token: conn.auth_token,
        },
        friendlyName: trimmed,
      });

      if (error || !accountData) {
        return { success: false, error: error || "Failed to update account name on Twilio." };
      }

      conn.friendly_name = accountData.friendly_name;
      await dbUpdateConnectionFriendlyName(accountSid, accountData.friendly_name);

      if (syncConnectionLabel) {
        conn.name = accountData.friendly_name;
        await dbUpdateConnectionName(accountSid, accountData.friendly_name);
        if (activeAccountSid.value === accountSid) {
          activeConnectionName.value = accountData.friendly_name;
        }
      }

      return { success: true, data: accountData };
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || "An unexpected error occurred while updating account on Twilio.";
      return { success: false, error: errorMsg };
    } finally {
      isUpdatingTwilioName.value = false;
    }
  }

  function clearActive(): void {
    activeAccountSid.value = "";
    activeAuthToken.value = "";
    activeConnectionName.value = "";
    subaccounts.value = [];
  }

  return {
    savedConnections,
    activeAccountSid,
    activeAuthToken,
    activeConnectionName,
    subaccounts,
    isInitializing,
    isFetchingSubaccounts,
    isRefreshingTwilioName,
    isUpdatingTwilioName,
    activeAccount,
    hasSavedAccounts,
    activeCredentials,
    isSubaccount,
    parentAccount,

    loadConnections,
    addAndActivateConnection,
    switchActiveConnection,
    switchToSubaccount,
    removeConnection,
    updateConnectionName,
    refreshTwilioAccountName,
    updateTwilioAccountName,
    clearActive,
    loadSubaccounts,
    fetchAndPersistSubaccounts,
  };
});
