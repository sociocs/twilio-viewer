<script setup lang="ts">
import { format, formatDistanceToNow } from "date-fns";
import { useClipboard } from "@vueuse/core";
import type { EnrichedTwilioAlert } from "~/types";

const props = defineProps<{
  alert: EnrichedTwilioAlert;
  accountSid: string;
}>();

const { copy } = useClipboard();
const toast = useToast();

const isExpanded = ref(false);
const isJsonModalOpen = ref(false);

function handleCopy(text: string, label: string): void {
  copy(text);
  toast.add({
    title: "Copied",
    description: `Copied ${label} to clipboard.`,
    color: "success",
    icon: "i-lucide-check",
  });
}

const formattedDate = computed(() => {
  const d = props.alert.date_generated || props.alert.date_created;
  if (!d) return "";
  try {
    return format(new Date(d), "PPp");
  } catch {
    return d;
  }
});

const relativeDate = computed(() => {
  const d = props.alert.date_generated || props.alert.date_created;
  if (!d) return "";
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "";
  }
});

const logLevelColor = computed(() => {
  const lvl = props.alert.log_level?.toLowerCase();
  if (lvl === "error") return "error" as const;
  if (lvl === "warning") return "warning" as const;
  if (lvl === "notice") return "info" as const;
  return "neutral" as const;
});

const logLevelIcon = computed(() => {
  const lvl = props.alert.log_level?.toLowerCase();
  if (lvl === "error") return "i-lucide-alert-circle";
  if (lvl === "warning") return "i-lucide-alert-triangle";
  if (lvl === "notice") return "i-lucide-info";
  return "i-lucide-bug";
});
</script>

<template>
  <div
    class="rounded-2xl border transition-all duration-200 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs">
    <!-- Header Summary Row -->
    <div class="p-5 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Left: Log Level, Error Code, Resource Link -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Log Level Badge -->
          <UBadge
            :color="logLevelColor"
            variant="subtle"
            size="sm"
            class="capitalize font-medium gap-1.5">
            <UIcon :name="logLevelIcon" class="size-3.5" />
            {{ alert.log_level }}
          </UBadge>

          <!-- Twilio Error Code Chip linking to Twilio Docs -->
          <a
            v-if="alert.error_code"
            :href="alert.more_info || `https://www.twilio.com/docs/errors/${alert.error_code}`"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 transition-colors">
            <UIcon name="i-lucide-alert-triangle" class="size-3" />
            <span>Error {{ alert.error_code }}</span>
            <UIcon name="i-lucide-external-link" class="size-2.5 opacity-70 ml-0.5" />
          </a>

          <!-- Resource SID & Interlink if recognized -->
          <div v-if="alert.resource_sid" class="flex items-center gap-1.5 text-xs">
            <span class="font-mono text-neutral-600 dark:text-neutral-400">{{ alert.resource_sid }}</span>
            <button
              type="button"
              class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              title="Copy Resource SID"
              @click="handleCopy(alert.resource_sid!, 'Resource SID')">
              <UIcon name="i-lucide-copy" class="size-3" />
            </button>

            <!-- Resource Quick Link Button -->
            <NuxtLink
              v-if="alert.resourceLink"
              :to="alert.resourceLink"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors">
              <UIcon
                :name="alert.resourceType === 'message'
                  ? 'i-lucide-message-square'
                  : alert.resourceType === 'call'
                    ? 'i-lucide-phone-call'
                    : alert.resourceType === 'service'
                      ? 'i-lucide-message-square-code'
                      : 'i-lucide-phone'"
                class="size-3" />
              <span class="capitalize">View {{ alert.resourceType }}</span>
              <UIcon name="i-lucide-arrow-right" class="size-2.5" />
            </NuxtLink>
          </div>
        </div>

        <!-- Right: Timestamp & Action Buttons -->
        <div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span :title="formattedDate" class="hidden sm:inline">
            {{ relativeDate }}
          </span>

          <span class="hidden sm:inline text-neutral-300 dark:text-neutral-700">•</span>

          <!-- View Raw JSON -->
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            title="Inspect raw Twilio API JSON"
            aria-label="Inspect raw Twilio API JSON"
            @click="isJsonModalOpen = true">
            <template #leading>
              <UIcon name="i-lucide-code" class="size-3.5" />
            </template>
          </UButton>

          <!-- Expand / Collapse Details -->
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            @click="isExpanded = !isExpanded">
            <template #leading>
              <UIcon
                :name="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="size-3.5" />
            </template>
            {{ isExpanded ? "Hide" : "Details" }}
          </UButton>
        </div>
      </div>

      <!-- Alert Description / Tokens Box -->
      <div
        v-if="alert.parsedTokens?.length || alert.alert_text || alert.more_info || alert.request_url"
        class="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-800/80 space-y-2">
        <!-- Render parsed tokens if structured -->
        <div v-if="alert.parsedTokens?.length" class="space-y-1.5">
          <div
            v-for="(token, idx) in alert.parsedTokens"
            :key="idx"
            class="text-xs flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
            <span class="font-semibold text-neutral-700 dark:text-neutral-300 capitalize shrink-0">
              {{ token.label }}:
            </span>
            <span class="text-neutral-800 dark:text-neutral-200 break-all select-text font-mono">
              {{ token.value || "None" }}
            </span>
          </div>
        </div>

        <!-- Fallback to raw text if provided -->
        <p v-else-if="alert.alert_text" class="text-xs text-neutral-800 dark:text-neutral-200 select-text leading-relaxed">
          {{ alert.alert_text }}
        </p>

        <!-- Or fallback to error guidance if alert_text was null -->
        <div v-else-if="alert.more_info" class="text-xs text-neutral-600 dark:text-neutral-400 select-text leading-relaxed flex flex-wrap items-center gap-1.5">
          <span>Error documentation:</span>
          <a
            :href="alert.more_info"
            target="_blank"
            rel="noopener noreferrer"
            class="text-red-600 dark:text-red-400 font-mono text-[11px] underline hover:no-underline inline-flex items-center gap-1">
            <span>{{ alert.more_info }}</span>
            <UIcon name="i-lucide-external-link" class="size-3 shrink-0" />
          </a>
        </div>

        <!-- Subtle fallback if completely empty -->
        <p v-else class="text-xs text-neutral-400 dark:text-neutral-500 italic">
          No additional debugger payload logged for this event.
        </p>

        <!-- Request Method & URL if available -->
        <div
          v-if="alert.request_url"
          class="flex items-center gap-2 pt-2 mt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 text-xs">
          <UBadge color="neutral" variant="subtle" size="xs" class="font-mono uppercase">
            {{ alert.request_method || 'POST' }}
          </UBadge>
          <span class="font-mono text-neutral-700 dark:text-neutral-300 truncate max-w-lg select-text">
            {{ alert.request_url }}
          </span>
          <button
            type="button"
            class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer shrink-0"
            title="Copy Request URL"
            @click="handleCopy(alert.request_url!, 'Request URL')">
            <UIcon name="i-lucide-copy" class="size-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- Expanded Technical Details -->
    <div
      v-if="isExpanded"
      class="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 p-5 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Alert SID</span>
          <div class="flex items-center gap-1.5 font-mono text-neutral-900 dark:text-white truncate">
            <span>{{ alert.sid }}</span>
            <button
              type="button"
              class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              @click="handleCopy(alert.sid, 'Alert SID')">
              <UIcon name="i-lucide-copy" class="size-3" />
            </button>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Date Generated</span>
          <div class="text-neutral-900 dark:text-white font-mono">{{ alert.date_generated || alert.date_created }}</div>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Resource SID</span>
          <div class="text-neutral-900 dark:text-white font-mono">{{ alert.resource_sid || 'None' }}</div>
        </div>

        <div v-if="alert.service_sid" class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Service SID</span>
          <div class="text-neutral-900 dark:text-white font-mono">{{ alert.service_sid }}</div>
        </div>

        <div v-if="alert.error_code" class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Twilio Documentation</span>
          <div>
            <a
              :href="alert.more_info || `https://www.twilio.com/docs/errors/${alert.error_code}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
              <span>View Docs for Error {{ alert.error_code }}</span>
              <UIcon name="i-lucide-external-link" class="size-3" />
            </a>
          </div>
        </div>
      </div>

      <!-- Response Body if available -->
      <div v-if="alert.response_body" class="space-y-1 text-xs">
        <span class="font-medium text-neutral-700 dark:text-neutral-300">Webhook Response Body</span>
        <pre class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono text-[11px] overflow-auto max-h-40 whitespace-pre-wrap select-text text-neutral-800 dark:text-neutral-200">{{ alert.response_body }}</pre>
      </div>

      <!-- Request Variables if available -->
      <div v-if="alert.request_variables" class="space-y-1 text-xs">
        <span class="font-medium text-neutral-700 dark:text-neutral-300">Request Variables</span>
        <pre class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono text-[11px] overflow-auto max-h-40 whitespace-pre-wrap select-text text-neutral-800 dark:text-neutral-200">{{ alert.request_variables }}</pre>
      </div>
    </div>

    <!-- Raw JSON Inspector Modal -->
    <MonitorAlertJsonViewer
      v-model:open="isJsonModalOpen"
      :item="alert"
      :title="`Twilio Alert: ${alert.sid}`"
      :subtitle="`${alert.log_level} • Error ${alert.error_code || 'N/A'}`" />
  </div>
</template>
