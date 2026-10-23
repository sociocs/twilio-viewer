import { defineStore } from "pinia";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfYear,
  endOfYear,
  subYears,
  format,
} from "date-fns";
import type {
  AuthCredentials,
  TwilioAccountBalance,
  TwilioUsageRecord,
  EnrichedUsageRecord,
  UsageGroup,
} from "~/types";
import {
  twloFetchAccountBalance,
  twloFetchUsageRecords,
} from "~/utils/call-twilio-api";
import { getCategoryConfig } from "~/utils/billing-category-map";

export type DatePresetKey = "tm" | "lm" | "tq" | "lq" | "ty" | "ly" | "custom";

export const useBillingStore = defineStore("billing", () => {
  // Balance state
  const balance = ref<TwilioAccountBalance | null>(null);
  const isLoadingBalance = ref<boolean>(false);
  const balanceError = ref<string | null>(null);
  const balanceLastFetchedAt = ref<number | null>(null);
  const isSubaccountBalanceUnavailable = ref<boolean>(false);

  // Usage records state
  const usageRecords = ref<TwilioUsageRecord[]>([]);
  const totalsRecord = ref<TwilioUsageRecord | null>(null);
  const isLoadingUsage = ref<boolean>(false);
  const usageError = ref<string | null>(null);
  const usageLastFetchedAt = ref<number | null>(null);

  // Query filter state
  const fromDate = ref<string>("");
  const toDate = ref<string>("");
  const includeSubaccounts = ref<boolean>(false);
  const activePreset = ref<DatePresetKey>("tm");

  // In-page client filters
  const searchQuery = ref<string>("");
  const selectedGroup = ref<string>("all");
  const expandedGroups = ref<Record<string, boolean>>({});

  /**
   * Format numeric price into standard currency string.
   */
  function formatPrice(val: number | string | null | undefined, currency?: string): string {
    if (val === null || val === undefined || val === "") {
      return "—";
    }
    const num = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(num)) {
      return "—";
    }
    const curr = (currency || currencyCode.value || "USD").toUpperCase();
    const formatted = Math.abs(num).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
    return `${curr} $${formatted}`;
  }

  /**
   * Format count with count_unit if provided.
   */
  function formatCount(record: { count?: string; count_unit?: string }): string {
    const countNum = parseInt(record.count || "0", 10);
    const formatted = countNum.toLocaleString("en-US");
    if (record.count_unit) {
      return `${formatted} ${record.count_unit}`;
    }
    return formatted;
  }

  /**
   * Format usage (chargeable quantity) with usage_unit if provided.
   */
  function formatUsage(record: { usage?: string; usage_unit?: string }): string {
    const usageNum = parseFloat(record.usage || "0");
    const formatted = usageNum.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
    if (record.usage_unit) {
      return `${formatted} ${record.usage_unit}`;
    }
    return formatted;
  }

  /**
   * Sets date inputs based on a preset key.
   */
  function setPreset(option: DatePresetKey): void {
    const today = new Date();
    let from: Date;
    let to: Date;

    switch (option) {
      case "tm":
        from = startOfMonth(today);
        to = today;
        break;
      case "lm": {
        const lastMonth = subMonths(today, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      }
      case "tq":
        from = startOfQuarter(today);
        to = today;
        break;
      case "lq": {
        const lastQuarter = subQuarters(today, 1);
        from = startOfQuarter(lastQuarter);
        to = endOfQuarter(lastQuarter);
        break;
      }
      case "ty":
        from = startOfYear(today);
        to = today;
        break;
      case "ly": {
        const lastYear = subYears(today, 1);
        from = startOfYear(lastYear);
        to = endOfYear(lastYear);
        break;
      }
      default:
        activePreset.value = "custom";
        return;
    }

    fromDate.value = format(from, "yyyy-MM-dd");
    toDate.value = format(to, "yyyy-MM-dd");
    activePreset.value = option;

    // Persist to localStorage
    if (import.meta.client) {
      localStorage.setItem("billing_search_from_date", fromDate.value);
      localStorage.setItem("billing_search_to_date", toDate.value);
    }
  }

  /**
   * Initializes date range filters from localStorage or default preset.
   */
  function initializeFilters(): void {
    if (!import.meta.client) {
      setPreset("tm");
      return;
    }

    const lsFrom = localStorage.getItem("billing_search_from_date");
    const lsTo = localStorage.getItem("billing_search_to_date");
    const lsSub = localStorage.getItem("billing_search_include_subaccounts");

    includeSubaccounts.value = lsSub === "true";

    if (lsFrom && lsTo) {
      fromDate.value = lsFrom;
      toDate.value = lsTo;
      activePreset.value = "custom";
    } else {
      setPreset("tm");
    }
  }

  /**
   * Persists current custom dates to localStorage.
   */
  function persistCustomFilters(): void {
    if (!import.meta.client) return;
    localStorage.setItem("billing_search_from_date", fromDate.value);
    localStorage.setItem("billing_search_to_date", toDate.value);
    localStorage.setItem("billing_search_include_subaccounts", String(includeSubaccounts.value));
  }

  /**
   * Loads primary account balance from Twilio API.
   */
  async function loadBalance(creds: AuthCredentials, refreshCache = false): Promise<void> {
    isLoadingBalance.value = true;
    balanceError.value = null;
    isSubaccountBalanceUnavailable.value = false;

    try {
      const [err, res] = await twloFetchAccountBalance({
        accountSid: creds.account_sid,
        authCredentials: creds,
        refreshCache,
      });

      if (err) {
        if (err.includes("404") || err.toLowerCase().includes("not found")) {
          isSubaccountBalanceUnavailable.value = true;
          balance.value = null;
        } else {
          balanceError.value = err;
        }
      } else if (res) {
        balance.value = res;
        balanceLastFetchedAt.value = Date.now();
      }
    } catch (err: unknown) {
      balanceError.value = (err as Error).message || "Failed to load balance.";
    } finally {
      isLoadingBalance.value = false;
    }
  }

  /**
   * Loads usage records from Twilio API for the selected date range.
   */
  async function loadUsage(creds: AuthCredentials, refreshCache = false): Promise<void> {
    isLoadingUsage.value = true;
    usageError.value = null;

    try {
      persistCustomFilters();

      const [err, res] = await twloFetchUsageRecords({
        accountSid: creds.account_sid,
        authCredentials: creds,
        fromDate: fromDate.value.trim() || undefined,
        toDate: toDate.value.trim() || undefined,
        includeSubaccounts: includeSubaccounts.value,
        refreshCache,
      });

      if (err || !res) {
        usageError.value = err || "Failed to load usage records from Twilio.";
        usageRecords.value = [];
        totalsRecord.value = null;
      } else {
        const rawRecords = res.usage_records || [];
        const total = rawRecords.find(
          r => r.category === "totalprice" || r.category === "total-price",
        );
        totalsRecord.value = total || null;
        usageRecords.value = rawRecords;
        usageLastFetchedAt.value = Date.now();

        // Expand all groups by default on fresh load
        const groupNames = new Set<string>();
        for (const r of rawRecords) {
          const cfg = getCategoryConfig(r.category);
          if (!cfg.ignore) {
            groupNames.add(cfg.group);
          }
        }
        for (const g of groupNames) {
          if (expandedGroups.value[g] === undefined) {
            expandedGroups.value[g] = true;
          }
        }
      }
    } catch (err: unknown) {
      usageError.value = (err as Error).message || "An unexpected error occurred.";
      usageRecords.value = [];
      totalsRecord.value = null;
    } finally {
      isLoadingUsage.value = false;
    }
  }

  /**
   * Loads both balance and usage data together.
   */
  async function loadAll(creds: AuthCredentials, refreshCache = false): Promise<void> {
    await Promise.all([
      loadBalance(creds, refreshCache),
      loadUsage(creds, refreshCache),
    ]);
  }

  // Active non-zero, non-ignored billable records enriched with group & descriptions
  const enrichedRecords = computed<EnrichedUsageRecord[]>(() => {
    // 1. Collect all non-zero active category keys present in the response
    const activeCategoryKeys = new Set(
      usageRecords.value
        .filter((x) => {
          if (x.category === "totalprice" || x.category === "total-price") {
            return false;
          }
          const countNum = parseInt(x.count || "0", 10);
          const usageNum = parseFloat(x.usage || "0");
          const priceNum = Math.abs(parseFloat(x.price || "0"));
          return countNum > 0 || usageNum > 0 || priceNum > 0;
        })
        .map(x => x.category.toLowerCase().trim()),
    );

    return usageRecords.value
      .filter((x) => {
        if (x.category === "totalprice" || x.category === "total-price") {
          return false;
        }
        const countNum = parseInt(x.count || "0", 10);
        const usageNum = parseFloat(x.usage || "0");
        const priceNum = Math.abs(parseFloat(x.price || "0"));
        return countNum > 0 || usageNum > 0 || priceNum > 0;
      })
      .map((x) => {
        const config = getCategoryConfig(x.category);
        const parentKey = config.parentCategory?.toLowerCase().trim();
        const catKey = x.category.toLowerCase().trim();
        const isBreakdownOfPresentParent = Boolean(
          (parentKey && activeCategoryKeys.has(parentKey))
          || (catKey === "a2p-10dlc-registrationfees-campaigncharges" && (activeCategoryKeys.has("a2p-registration-fees") || activeCategoryKeys.has("a2p-10dlc-registrationfees-monthly")))
          || (catKey === "authy-sms-outbound" && activeCategoryKeys.has("sms-outbound"))
          || (catKey === "authy-calls-outbound" && activeCategoryKeys.has("calls-outbound"))
          || (catKey.startsWith("experiment-") && activeCategoryKeys.has("sms-outbound")),
        );
        return {
          ...x,
          ...config,
          isBreakdownOfPresentParent,
        };
      })
      .filter(x => !x.ignore);
  });

  // Unique list of groups found in the records
  const availableGroups = computed<string[]>(() => {
    const set = new Set<string>();
    for (const r of enrichedRecords.value) {
      set.add(r.group);
    }
    return Array.from(set).sort();
  });

  // Grouped and sorted usage records with deduplicated subtotals
  const groupedUsage = computed<UsageGroup[]>(() => {
    const groupMap = new Map<string, EnrichedUsageRecord[]>();
    let currency = totalsRecord.value?.price_unit?.toUpperCase() || "USD";

    for (const r of enrichedRecords.value) {
      if (r.price_unit) {
        currency = r.price_unit.toUpperCase();
      }
      const list = groupMap.get(r.group) || [];
      list.push(r);
      groupMap.set(r.group, list);
    }

    const groups: UsageGroup[] = [];
    for (const [groupName, records] of groupMap.entries()) {
      // Sort by order ascending, then level, then description
      records.sort((a, b) => (
        a.order - b.order
        || a.level - b.level
        || a.description.localeCompare(b.description)
      ));

      // Calculate true deduplicated subtotal: exclude subservice breakdowns whose parent is present
      const totalPrice = records
        .filter(r => !r.isBreakdownOfPresentParent)
        .reduce((sum, r) => sum + Math.abs(parseFloat(r.price || "0")), 0);

      const hasBreakdownItems = records.some(r => r.isBreakdownOfPresentParent);

      groups.push({
        group: groupName,
        totalPrice,
        currency,
        hasBreakdownItems,
        children: records,
      });
    }

    return groups.sort((a, b) => a.group.localeCompare(b.group));
  });

  // Filtered groups according to in-page search query and selected group dropdown
  const filteredGroups = computed<UsageGroup[]>(() => {
    const q = searchQuery.value.trim().toLowerCase();
    const sel = selectedGroup.value;

    return groupedUsage.value
      .filter((g) => {
        if (sel !== "all" && g.group !== sel) {
          return false;
        }
        return true;
      })
      .map((g) => {
        if (!q) {
          return g;
        }
        if (g.group.toLowerCase().includes(q)) {
          return g;
        }
        const matched = g.children.filter(
          c =>
            c.description.toLowerCase().includes(q)
            || c.category.toLowerCase().includes(q)
            || Boolean(c.category_desc && c.category_desc.toLowerCase().includes(q)),
        );
        return {
          ...g,
          children: matched,
        };
      })
      .filter(g => g.children.length > 0);
  });

  // Currency code deduced from records or balance
  const currencyCode = computed<string>(() => {
    return (
      totalsRecord.value?.price_unit?.toUpperCase()
      || balance.value?.currency?.toUpperCase()
      || "USD"
    );
  });

  // Total period spend
  const totalSpend = computed<number>(() => {
    if (totalsRecord.value?.price) {
      return Math.abs(parseFloat(totalsRecord.value.price));
    }
    return groupedUsage.value.reduce((sum, g) => sum + g.totalPrice, 0);
  });

  // Count of active categories
  const activeCategoriesCount = computed<number>(() => {
    return enrichedRecords.value.length;
  });

  // Highest spend category group
  const highestSpendGroup = computed<{ group: string; amount: number } | null>(() => {
    if (!groupedUsage.value.length) return null;
    let max = { group: "", amount: 0 };
    for (const g of groupedUsage.value) {
      if (g.totalPrice > max.amount) {
        max = { group: g.group, amount: g.totalPrice };
      }
    }
    return max.amount > 0 ? max : null;
  });

  function toggleGroup(groupName: string): void {
    expandedGroups.value[groupName] = !expandedGroups.value[groupName];
  }

  function expandAllGroups(): void {
    for (const g of groupedUsage.value) {
      expandedGroups.value[g.group] = true;
    }
  }

  function collapseAllGroups(): void {
    for (const g of groupedUsage.value) {
      expandedGroups.value[g.group] = false;
    }
  }

  /**
   * Export loaded usage records to CSV.
   */
  function exportToCsv(): void {
    if (!enrichedRecords.value.length) return;

    const headers = [
      "Group",
      "Level",
      "Category",
      "Description",
      "Count",
      "Count Unit",
      "Usage",
      "Usage Unit",
      "Price",
      "Currency",
      "Start Date",
      "End Date",
    ];

    const rows = enrichedRecords.value.map(r => [
      `"${r.group.replaceAll("\"", "\"\"")}"`,
      r.level,
      `"${r.category}"`,
      `"${r.description.replaceAll("\"", "\"\"")}"`,
      r.count || "0",
      `"${r.count_unit || ""}"`,
      r.usage || "0",
      `"${r.usage_unit || ""}"`,
      r.price || "0.00",
      r.price_unit?.toUpperCase() || "USD",
      r.start_date || "",
      r.end_date || "",
    ]);

    // Append total row
    if (totalsRecord.value) {
      rows.push([
        "\"TOTAL\"",
        1,
        "\"totalprice\"",
        "\"Grand Total\"",
        "",
        "",
        "",
        "",
        totalsRecord.value.price || "0.00",
        totalsRecord.value.price_unit?.toUpperCase() || "USD",
        totalsRecord.value.start_date || "",
        totalsRecord.value.end_date || "",
      ]);
    }

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `twilio_usage_${fromDate.value || "from"}_to_${toDate.value || "to"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return {
    // State
    balance,
    isLoadingBalance,
    balanceError,
    balanceLastFetchedAt,
    isSubaccountBalanceUnavailable,
    usageRecords,
    totalsRecord,
    isLoadingUsage,
    usageError,
    usageLastFetchedAt,
    fromDate,
    toDate,
    includeSubaccounts,
    activePreset,
    searchQuery,
    selectedGroup,
    expandedGroups,

    // Getters / Computed
    enrichedRecords,
    availableGroups,
    groupedUsage,
    filteredGroups,
    currencyCode,
    totalSpend,
    activeCategoriesCount,
    highestSpendGroup,

    // Methods
    formatPrice,
    formatCount,
    formatUsage,
    setPreset,
    initializeFilters,
    persistCustomFilters,
    loadBalance,
    loadUsage,
    loadAll,
    toggleGroup,
    expandAllGroups,
    collapseAllGroups,
    exportToCsv,
  };
});
