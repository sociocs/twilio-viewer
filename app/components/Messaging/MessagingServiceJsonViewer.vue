<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import VueJsonPretty from "vue-json-pretty";
import type { EnrichedMessagingService } from "~/types";

const props = withDefaults(
  defineProps<{
    service: EnrichedMessagingService;
    initialSource?: "all" | "service" | "compliance" | "numbers" | "tollfree";
  }>(),
  {
    initialSource: "all",
  },
);

const { copy } = useClipboard();
const toast = useToast();
const colorMode = useColorMode();

const isDark = computed(() => colorMode.value === "dark");

// Selected sub-resource view filter
const selectedSource = ref<"all" | "service" | "compliance" | "numbers" | "tollfree">(props.initialSource);

// Tree collapse/expand depth level
const jsonDepth = ref<number>(2);

// Toggle line numbers
const showLineNumbers = ref<boolean>(true);

// State for copy feedback button
const isCopied = ref<boolean>(false);

// Extract pure Twilio Messaging Service API response fields (stripping client-side enrichment)
const rawServiceOnly = computed(() => {
  const {
    a2pCompliance: _a2p,
    phoneNumbers: _pns,
    tollfreeVerifications: _tf,
    isLoadingDetails: _loading,
    ...coreService
  } = props.service;
  return coreService;
});

// Safely resolve the A2P compliance record whether returned directly or as compliance array
const a2pRecord = computed(() => {
  const raw = props.service.a2pCompliance;
  if (!raw) {
    return null;
  }
  if (Array.isArray((raw as unknown as { compliance?: unknown[] }).compliance)) {
    return (raw as unknown as { compliance: unknown[] }).compliance[0] || null;
  }
  return raw;
});

type JSONDataType = string | number | boolean | unknown[] | Record<string, unknown> | null;

// Current active JSON data structure based on selected source tab
const currentJsonData = computed<JSONDataType>(() => {
  let result: unknown;
  switch (selectedSource.value) {
    case "service":
      result = rawServiceOnly.value;
      break;
    case "compliance":
      result = a2pRecord.value || {
        status: "none",
        message: "No US A2P 10DLC compliance record registered for this messaging service.",
      };
      break;
    case "numbers":
      result = props.service.phoneNumbers || [];
      break;
    case "tollfree":
      result = props.service.tollfreeVerifications || [];
      break;
    case "all":
    default:
      result = {
        service: rawServiceOnly.value,
        a2p_compliance: a2pRecord.value ?? null,
        tollfree_verifications: props.service.tollfreeVerifications ?? [],
        phone_numbers: props.service.phoneNumbers ?? [],
      };
      break;
  }
  return result as JSONDataType;
});

// JSON string length / line count summary
const jsonStats = computed(() => {
  const formatted = JSON.stringify(currentJsonData.value, null, 2);
  const lines = formatted.split("\n").length;
  const sizeBytes = new Blob([formatted]).size;
  const sizeFormatted = sizeBytes > 1024 ? `${(sizeBytes / 1024).toFixed(1)} KB` : `${sizeBytes} B`;
  return {
    lines,
    sizeFormatted,
  };
});

// Copy JSON string to clipboard with feedback
function handleCopyJson(): void {
  const jsonString = JSON.stringify(currentJsonData.value, null, 2);
  copy(jsonString);
  isCopied.value = true;
  setTimeout(() => {
    isCopied.value = false;
  }, 2000);

  const sourceLabels: Record<string, string> = {
    all: "Combined Messaging Service",
    service: "Service Resource",
    compliance: "A2P Compliance",
    numbers: "Phone Numbers",
    tollfree: "Toll-Free Verifications",
  };

  toast.add({
    title: "JSON Copied",
    description: `Copied ${sourceLabels[selectedSource.value] || "Raw"} JSON payload to clipboard.`,
    color: "success",
    icon: "i-lucide-check",
  });
}
</script>

<template>
  <div class="space-y-3">
    <!-- Top Controls Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-neutral-200 dark:border-neutral-800">
      <!-- Sub-Resource Pill Tabs -->
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="selectedSource === 'all'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="selectedSource = 'all'">
          <UIcon name="i-lucide-layers" class="size-3" />
          Combined
        </button>

        <button
          type="button"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="selectedSource === 'service'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="selectedSource = 'service'">
          <UIcon name="i-lucide-file-json" class="size-3" />
          Service Only
        </button>

        <button
          type="button"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="selectedSource === 'compliance'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="selectedSource = 'compliance'">
          <UIcon name="i-lucide-shield-check" class="size-3" />
          A2P Compliance
        </button>

        <button
          type="button"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="selectedSource === 'numbers'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="selectedSource = 'numbers'">
          <UIcon name="i-lucide-phone" class="size-3" />
          Phone Numbers ({{ props.service.phoneNumbers?.length ?? 0 }})
        </button>

        <button
          type="button"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="selectedSource === 'tollfree'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="selectedSource = 'tollfree'">
          <UIcon name="i-lucide-phone-call" class="size-3" />
          Toll-Free ({{ props.service.tollfreeVerifications?.length ?? 0 }})
        </button>
      </div>

      <!-- Actions & Depth Controller -->
      <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <!-- Depth Stepper -->
        <div class="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5 text-xs">
          <span class="text-[11px] text-neutral-500 dark:text-neutral-400 px-1.5 font-medium">Depth:</span>
          <button
            type="button"
            class="px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer"
            :class="jsonDepth === 1
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
            title="Collapse to Root"
            @click="jsonDepth = 1">
            1
          </button>
          <button
            type="button"
            class="px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer"
            :class="jsonDepth === 2
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
            title="Default Level"
            @click="jsonDepth = 2">
            2
          </button>
          <button
            type="button"
            class="px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer"
            :class="jsonDepth === 3
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
            title="Deep Level"
            @click="jsonDepth = 3">
            3
          </button>
          <button
            type="button"
            class="px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer"
            :class="jsonDepth >= 10
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
            title="Expand All"
            @click="jsonDepth = 10">
            All
          </button>
        </div>

        <!-- Copy JSON Button -->
        <UButton
          color="neutral"
          variant="outline"
          size="xs"
          :icon="isCopied ? 'i-lucide-check' : 'i-lucide-copy'"
          @click="handleCopyJson">
          {{ isCopied ? "Copied" : "Copy JSON" }}
        </UButton>
      </div>
    </div>

    <!-- JSON Viewer Container -->
    <div class="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-4 font-mono text-xs overflow-x-auto max-h-[500px] overflow-y-auto">
      <VueJsonPretty
        :data="currentJsonData"
        :deep="jsonDepth"
        :show-line="true"
        :show-line-number="showLineNumbers"
        :show-icon="true"
        :show-length="true"
        :collapsed-on-click-brackets="true"
        :theme="isDark ? 'dark' : 'light'" />
    </div>

    <!-- Footer Stats and Hint -->
    <div class="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 pt-1">
      <span class="flex items-center gap-1">
        <UIcon name="i-lucide-info" class="size-3" />
        Click any bracket or arrow to expand/collapse individual nodes.
      </span>
      <span class="font-mono">
        {{ jsonStats.lines }} lines &bull; {{ jsonStats.sizeFormatted }}
      </span>
    </div>
  </div>
</template>
