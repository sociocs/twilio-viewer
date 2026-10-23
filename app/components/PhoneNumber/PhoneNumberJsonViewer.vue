<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import VueJsonPretty from "vue-json-pretty";
import type { EnrichedIncomingPhoneNumber } from "~/types";

const props = defineProps<{
  phoneNumber: EnrichedIncomingPhoneNumber;
}>();

const { copy } = useClipboard();
const toast = useToast();
const colorMode = useColorMode();

const isDark = computed(() => colorMode.value === "dark");

// Selected sub-resource tab
const selectedSource = ref<"all" | "number" | "services" | "tollfree">("all");

// Tree depth level
const jsonDepth = ref<number>(2);
const showLineNumbers = ref<boolean>(true);
const isCopied = ref<boolean>(false);

// Extract pure Twilio IncomingPhoneNumber API response fields
const rawNumberOnly = computed(() => {
  const {
    linkedMessagingServices: _services,
    tollfreeVerification: _tf,
    isLoadingDetails: _loading,
    ...pureNumber
  } = props.phoneNumber;
  return pureNumber;
});

type JSONDataType = string | number | boolean | unknown[] | Record<string, unknown> | null;

const currentJsonData = computed<JSONDataType>(() => {
  let result: unknown;
  switch (selectedSource.value) {
    case "number":
      result = rawNumberOnly.value;
      break;
    case "services":
      result = props.phoneNumber.linkedMessagingServices || [];
      break;
    case "tollfree":
      result = props.phoneNumber.tollfreeVerification || {
        status: "none",
        message: "No toll-free verification record associated with this phone number.",
      };
      break;
    case "all":
    default:
      result = {
        incoming_phone_number: rawNumberOnly.value,
        linked_messaging_services: props.phoneNumber.linkedMessagingServices || [],
        tollfree_verification: props.phoneNumber.tollfreeVerification || null,
      };
      break;
  }
  return result as JSONDataType;
});

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

function handleCopyJson(): void {
  const jsonString = JSON.stringify(currentJsonData.value, null, 2);
  copy(jsonString);
  isCopied.value = true;
  setTimeout(() => {
    isCopied.value = false;
  }, 2000);

  const labels: Record<string, string> = {
    all: "Combined Phone Number",
    number: "Phone Number Resource",
    services: "Linked Messaging Services",
    tollfree: "Toll-Free Verification",
  };

  toast.add({
    title: "JSON Copied",
    description: `Copied ${labels[selectedSource.value] || "Raw"} JSON payload to clipboard.`,
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
          :class="selectedSource === 'number'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="selectedSource = 'number'">
          <UIcon name="i-lucide-file-json" class="size-3" />
          Number Only
        </button>

        <button
          type="button"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="selectedSource === 'services'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="selectedSource = 'services'">
          <UIcon name="i-lucide-message-square-code" class="size-3" />
          Messaging Services ({{ props.phoneNumber.linkedMessagingServices?.length ?? 0 }})
        </button>

        <button
          v-if="props.phoneNumber.tollfreeVerification"
          type="button"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="selectedSource === 'tollfree'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="selectedSource = 'tollfree'">
          <UIcon name="i-lucide-shield-check" class="size-3" />
          Toll-Free Verification
        </button>
      </div>

      <!-- Actions & Depth Stepper -->
      <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
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

    <!-- JSON Viewer -->
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

    <!-- Footer Stats -->
    <div class="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 pt-1">
      <span class="flex items-center gap-1">
        <UIcon name="i-lucide-info" class="size-3" />
        Click brackets or arrows to expand/collapse nodes.
      </span>
      <span class="font-mono">
        {{ jsonStats.lines }} lines &bull; {{ jsonStats.sizeFormatted }}
      </span>
    </div>
  </div>
</template>
