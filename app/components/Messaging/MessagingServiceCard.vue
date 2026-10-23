<script setup lang="ts">
import { format, formatDistanceToNow } from "date-fns";
import { useClipboard } from "@vueuse/core";
import type { EnrichedMessagingService } from "~/types";

const props = defineProps<{
  service: EnrichedMessagingService;
}>();

const emit = defineEmits<{
  (e: "refresh", serviceSid: string): void;
}>();

const { copy } = useClipboard();
const toast = useToast();

const isExpanded = ref(false);
const activeTab = ref<"compliance" | "numbers" | "webhooks" | "json">("compliance");
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

const formattedCreatedDate = computed(() => {
  if (!props.service.date_created) {
    return "";
  }
  try {
    return format(new Date(props.service.date_created), "PPp");
  } catch {
    return props.service.date_created;
  }
});

const relativeCreatedDate = computed(() => {
  if (!props.service.date_created) {
    return "";
  }
  try {
    return formatDistanceToNow(new Date(props.service.date_created), { addSuffix: true });
  } catch {
    return "";
  }
});

// Safely resolve the A2P compliance record whether returned directly or as compliance array
const a2pRecord = computed<TwilioA2PCompliance | null>(() => {
  const raw = props.service.a2pCompliance;
  if (!raw) {
    return null;
  }
  if (Array.isArray((raw as unknown as { compliance?: unknown[] }).compliance)) {
    return (raw as unknown as { compliance: TwilioA2PCompliance[] }).compliance[0] || null;
  }
  return raw;
});

// A2P 10DLC Status Helper
const a2pStatusInfo = computed(() => {
  if (!props.service.us_app_to_person_registered) {
    return {
      label: "A2P 10DLC: Not Registered",
      color: "neutral" as const,
      icon: "i-lucide-shield-minus",
      description: "Service is not linked to a US A2P 10DLC Campaign.",
    };
  }

  const rawStatus = a2pRecord.value?.campaign_status?.toUpperCase() || "";

  if (rawStatus === "VERIFIED") {
    return {
      label: "A2P 10DLC: Verified",
      color: "success" as const,
      icon: "i-lucide-badge-check",
      description: "Campaign has been approved by US carriers.",
    };
  }

  if (rawStatus === "PENDING" || rawStatus === "IN_PROGRESS") {
    return {
      label: "A2P 10DLC: Pending Review",
      color: "warning" as const,
      icon: "i-lucide-clock",
      description: "Campaign is currently under review with TCR/carriers.",
    };
  }

  if (rawStatus === "FAILED") {
    return {
      label: "A2P 10DLC: Failed",
      color: "error" as const,
      icon: "i-lucide-alert-circle",
      description: "Campaign submission failed carrier compliance requirements.",
    };
  }

  return {
    label: "A2P 10DLC: Registered",
    color: "info" as const,
    icon: "i-lucide-shield-check",
    description: "A2P Campaign is registered.",
  };
});

// Toll-Free Verification Status Helper
const tollfreeStatusInfo = computed(() => {
  const verifs = props.service.tollfreeVerifications || [];
  const numbers = props.service.phoneNumbers || [];
  const hasTollfree = numbers.some(n =>
    n.phone_number.startsWith("+1800")
    || n.phone_number.startsWith("+1888")
    || n.phone_number.startsWith("+1877")
    || n.phone_number.startsWith("+1866")
    || n.phone_number.startsWith("+1855")
    || n.phone_number.startsWith("+1844")
    || n.phone_number.startsWith("+1833"),
  );

  if (!hasTollfree && verifs.length === 0) {
    return {
      label: "Toll-Free: N/A",
      color: "neutral" as const,
      icon: "i-lucide-phone",
      description: "No toll-free numbers associated with this service pool.",
      hasTollfree: false,
    };
  }

  const anyRejected = verifs.some(v => v.status?.toUpperCase() === "TWILIO_REJECTED");
  if (anyRejected) {
    return {
      label: "Toll-Free: Rejected",
      color: "error" as const,
      icon: "i-lucide-shield-alert",
      description: "One or more toll-free verification submissions were rejected.",
      hasTollfree: true,
    };
  }

  const allApproved
    = verifs.length > 0
      && verifs.every(
        v =>
          v.status?.toUpperCase() === "APPROVED"
          || v.status?.toUpperCase() === "TWILIO_APPROVED"
          || v.status?.toUpperCase() === "VERIFIED",
      );
  if (allApproved) {
    return {
      label: "Toll-Free: Verified",
      color: "success" as const,
      icon: "i-lucide-check-circle-2",
      description: "Toll-free number verification is approved.",
      hasTollfree: true,
    };
  }

  const anyInReview = verifs.some(
    v =>
      v.status?.toUpperCase() === "IN_REVIEW"
      || v.status?.toUpperCase() === "PENDING_REVIEW"
      || v.status?.toUpperCase() === "PENDING",
  );
  if (anyInReview) {
    return {
      label: "Toll-Free: In Review",
      color: "warning" as const,
      icon: "i-lucide-timer",
      description: "Toll-free verification is pending review.",
      hasTollfree: true,
    };
  }

  return {
    label: "Toll-Free: Unverified",
    color: "warning" as const,
    icon: "i-lucide-alert-triangle",
    description: "Toll-free number is present but not yet verified.",
    hasTollfree: true,
  };
});
</script>

<template>
  <UCard class="shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900 transition-all hover:shadow-md">
    <!-- Header Block -->
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <!-- Service Title and SID -->
        <div class="space-y-1.5 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-white truncate">
              {{ props.service.friendly_name }}
            </h3>
            <UBadge
              v-if="props.service.usecase"
              color="neutral"
              variant="subtle"
              size="xs"
              class="capitalize">
              {{ props.service.usecase }}
            </UBadge>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span class="font-mono">{{ props.service.sid }}</span>
            <button
              type="button"
              class="hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              title="Copy Service SID"
              @click="handleCopy(props.service.sid, 'Service SID')">
              <UIcon name="i-lucide-copy" class="size-3.5" />
            </button>
            <span>&bull;</span>
            <span :title="formattedCreatedDate">Created {{ relativeCreatedDate }}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 shrink-0">
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-code-2"
            title="View Raw JSON"
            aria-label="View Raw JSON"
            @click="isJsonModalOpen = true" />

          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="props.service.isLoadingDetails"
            icon="i-lucide-refresh-cw"
            title="Refresh Service Details"
            aria-label="Refresh Service Details"
            @click="emit('refresh', props.service.sid)" />

          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            @click="isExpanded = !isExpanded">
            <template #leading>
              <UIcon :name="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3.5" />
            </template>
            {{ isExpanded ? "Hide Details" : "View Details" }}
          </UButton>
        </div>
      </div>

      <!-- Registration & Approval Status Badges -->
      <div class="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
        <!-- A2P 10DLC Registration Badge -->
        <div
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
          :class="{
            'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800': a2pStatusInfo.color === 'success',
            'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800': a2pStatusInfo.color === 'warning',
            'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800': a2pStatusInfo.color === 'error',
            'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700': a2pStatusInfo.color === 'neutral',
          }"
          :title="a2pStatusInfo.description">
          <UIcon :name="a2pStatusInfo.icon" class="size-3.5" />
          <span>{{ a2pStatusInfo.label }}</span>
        </div>

        <!-- Toll-Free Verification Badge -->
        <div
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
          :class="{
            'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800': tollfreeStatusInfo.color === 'success',
            'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800': tollfreeStatusInfo.color === 'warning',
            'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800': tollfreeStatusInfo.color === 'error',
            'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700': tollfreeStatusInfo.color === 'neutral',
          }"
          :title="tollfreeStatusInfo.description">
          <UIcon :name="tollfreeStatusInfo.icon" class="size-3.5" />
          <span>{{ tollfreeStatusInfo.label }}</span>
        </div>

        <!-- Phone Numbers Count Badge (Clickable link to Phone Numbers page) -->
        <NuxtLink
          :to="`/accounts/${props.service.account_sid}/phone-numbers?service=${props.service.sid}`"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          title="Click to view numbers in this service pool">
          <UIcon name="i-lucide-phone" class="size-3.5 text-neutral-400" />
          <span>{{ props.service.phoneNumbers?.length ?? 0 }} Numbers in Pool</span>
          <UIcon name="i-lucide-arrow-right" class="size-3 text-neutral-400" />
        </NuxtLink>

        <!-- Message History Link (Clickable link to Message History filtered by this service) -->
        <NuxtLink
          :to="`/accounts/${props.service.account_sid}/message-history?service=${props.service.sid}`"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
          title="Click to view message history for this messaging service">
          <UIcon name="i-lucide-message-square" class="size-3.5 text-indigo-500" />
          <span>Message History</span>
          <UIcon name="i-lucide-arrow-right" class="size-3 text-indigo-400" />
        </NuxtLink>
      </div>

      <!-- Quick Feature Pill Row -->
      <div class="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 pt-1">
        <span class="flex items-center gap-1">
          <UIcon
            :name="props.service.sticky_sender ? 'i-lucide-check-circle-2' : 'i-lucide-circle-slash'"
            :class="props.service.sticky_sender ? 'text-emerald-500' : 'text-neutral-400'"
            class="size-3.5" />
          Sticky Sender
        </span>

        <span class="flex items-center gap-1">
          <UIcon
            :name="props.service.area_code_geomatch ? 'i-lucide-check-circle-2' : 'i-lucide-circle-slash'"
            :class="props.service.area_code_geomatch ? 'text-emerald-500' : 'text-neutral-400'"
            class="size-3.5" />
          Area Code Geomatch
        </span>

        <span class="flex items-center gap-1">
          <UIcon
            :name="props.service.smart_encoding ? 'i-lucide-check-circle-2' : 'i-lucide-circle-slash'"
            :class="props.service.smart_encoding ? 'text-emerald-500' : 'text-neutral-400'"
            class="size-3.5" />
          Smart Encoding
        </span>

        <span class="flex items-center gap-1">
          <UIcon
            :name="props.service.mms_converter ? 'i-lucide-check-circle-2' : 'i-lucide-circle-slash'"
            :class="props.service.mms_converter ? 'text-emerald-500' : 'text-neutral-400'"
            class="size-3.5" />
          MMS Converter
        </span>

        <span class="flex items-center gap-1">
          <UIcon
            :name="props.service.use_inbound_webhook_on_number ? 'i-lucide-check-circle-2' : 'i-lucide-circle-slash'"
            :class="props.service.use_inbound_webhook_on_number ? 'text-blue-500' : 'text-neutral-400'"
            class="size-3.5" />
          Webhook on Number
        </span>
      </div>
    </div>

    <!-- Expandable Detailed View -->
    <div v-if="isExpanded" class="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
      <!-- Tabs Selector -->
      <div class="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="activeTab === 'compliance'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="activeTab = 'compliance'">
          <UIcon name="i-lucide-shield-check" class="size-3.5" />
          Registration & Approval
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="activeTab === 'numbers'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="activeTab = 'numbers'">
          <UIcon name="i-lucide-phone" class="size-3.5" />
          Sender Pool ({{ props.service.phoneNumbers?.length ?? 0 }})
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="activeTab === 'webhooks'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="activeTab = 'webhooks'">
          <UIcon name="i-lucide-webhook" class="size-3.5" />
          Webhooks & Settings
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="activeTab === 'json'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="activeTab = 'json'">
          <UIcon name="i-lucide-code-2" class="size-3.5" />
          Raw JSON
        </button>
      </div>

      <!-- Tab 1: Registration & Approval Status -->
      <div v-if="activeTab === 'compliance'" class="space-y-6 pt-2">
        <!-- A2P 10DLC Section -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-lucide-layers" class="size-4 text-red-500" />
              US A2P 10DLC Campaign Registration
            </h4>
            <UBadge
              :color="a2pStatusInfo.color"
              variant="subtle"
              size="xs">
              {{ a2pStatusInfo.label }}
            </UBadge>
          </div>

          <!-- A2P Details Grid -->
          <div v-if="a2pRecord" class="space-y-3.5 bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span class="text-neutral-400 block mb-0.5">Campaign ID</span>
                <span class="font-mono font-bold text-neutral-900 dark:text-white">
                  {{ a2pRecord.campaign_id || "Not assigned yet" }}
                </span>
              </div>

              <div>
                <span class="text-neutral-400 block mb-0.5">Campaign Status</span>
                <UBadge
                  :color="a2pStatusInfo.color"
                  variant="subtle"
                  size="xs">
                  {{ a2pRecord.campaign_status || "UNKNOWN" }}
                </UBadge>
              </div>

              <div>
                <span class="text-neutral-400 block mb-0.5">Use Case</span>
                <span class="font-bold text-neutral-900 dark:text-white uppercase">
                  {{ a2pRecord.us_app_to_person_usecase || props.service.usecase || "Standard" }}
                </span>
              </div>

              <div>
                <span class="text-neutral-400 block mb-0.5">Compliance SID</span>
                <div class="flex items-center gap-1">
                  <span class="font-mono font-medium text-neutral-900 dark:text-white truncate">
                    {{ a2pRecord.sid || "N/A" }}
                  </span>
                  <button
                    v-if="a2pRecord.sid"
                    type="button"
                    class="hover:text-neutral-900 dark:hover:text-white cursor-pointer shrink-0"
                    title="Copy Compliance SID"
                    @click="handleCopy(a2pRecord.sid, 'Compliance SID')">
                    <UIcon name="i-lucide-copy" class="size-3" />
                  </button>
                </div>
              </div>

              <div class="sm:col-span-2">
                <span class="text-neutral-400 block mb-0.5">Brand Registration SID</span>
                <div class="flex items-center gap-1">
                  <span class="font-mono font-medium text-neutral-900 dark:text-white truncate">
                    {{ a2pRecord.brand_registration_sid || "None" }}
                  </span>
                  <button
                    v-if="a2pRecord.brand_registration_sid"
                    type="button"
                    class="hover:text-neutral-900 dark:hover:text-white cursor-pointer shrink-0"
                    title="Copy Brand Registration SID"
                    @click="handleCopy(a2pRecord.brand_registration_sid, 'Brand Registration SID')">
                    <UIcon name="i-lucide-copy" class="size-3" />
                  </button>
                </div>
              </div>

              <div v-if="a2pRecord.rate_limits" class="sm:col-span-2 flex flex-wrap items-center gap-4 text-xs">
                <div v-if="a2pRecord.rate_limits.att">
                  <span class="text-neutral-400">AT&T Throughput:</span>
                  <span class="ml-1 font-mono font-medium text-neutral-900 dark:text-white">
                    {{ a2pRecord.rate_limits.att.mps }} MPS (Class {{ a2pRecord.rate_limits.att.msg_class }})
                  </span>
                </div>
                <div v-if="a2pRecord.rate_limits.tmobile">
                  <span class="text-neutral-400">T-Mobile Tier:</span>
                  <span class="ml-1 font-medium text-neutral-900 dark:text-white">
                    {{ a2pRecord.rate_limits.tmobile.brand_tier }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Campaign Description -->
            <div v-if="a2pRecord.description" class="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
              <span class="text-neutral-400 block mb-0.5 font-medium">Campaign Description:</span>
              <p class="text-neutral-800 dark:text-neutral-200 italic">
                "{{ a2pRecord.description }}"
              </p>
            </div>

            <!-- Message Flow & Call to Action -->
            <div v-if="a2pRecord.message_flow" class="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
              <span class="text-neutral-400 block mb-0.5 font-medium">Message Flow & Call to Action:</span>
              <p class="text-neutral-800 dark:text-neutral-200">
                {{ a2pRecord.message_flow }}
              </p>
            </div>

            <!-- Message Samples -->
            <div v-if="a2pRecord.message_samples?.length" class="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
              <span class="text-neutral-400 block mb-1 font-medium">Registered Message Samples:</span>
              <ul class="space-y-1.5 list-disc list-inside text-neutral-700 dark:text-neutral-300">
                <li v-for="(sample, idx) in a2pRecord.message_samples" :key="idx" class="italic">
                  "{{ sample }}"
                </li>
              </ul>
            </div>

            <!-- Opt-In, Opt-Out, Help Keywords & Messages -->
            <div
              v-if="a2pRecord.opt_out_message || a2pRecord.help_message || a2pRecord.opt_in_message"
              class="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div v-if="a2pRecord.opt_out_message">
                <span class="text-neutral-400 block mb-0.5 font-medium">
                  Opt-Out Response ({{ a2pRecord.opt_out_keywords?.join(', ') || 'STOP' }}):
                </span>
                <p class="text-neutral-700 dark:text-neutral-300 italic">
                  "{{ a2pRecord.opt_out_message }}"
                </p>
              </div>

              <div v-if="a2pRecord.help_message">
                <span class="text-neutral-400 block mb-0.5 font-medium">
                  Help Response ({{ a2pRecord.help_keywords?.join(', ') || 'HELP' }}):
                </span>
                <p class="text-neutral-700 dark:text-neutral-300 italic">
                  "{{ a2pRecord.help_message }}"
                </p>
              </div>
            </div>
          </div>

          <div v-else-if="props.service.us_app_to_person_registered && props.service.isLoadingDetails" class="p-4 text-center text-xs text-neutral-500">
            <UIcon name="i-lucide-refresh-cw" class="size-4 animate-spin inline mr-1 text-red-500" />
            Loading A2P 10DLC campaign records...
          </div>

          <div v-else class="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 text-xs text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800">
            No active US A2P 10DLC campaign is registered for this messaging service. Messages sent to US 10-digit numbers may be subject to carrier filtering or unregistered surcharges.
          </div>
        </div>

        <!-- Toll-Free Verification Section -->
        <div class="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-lucide-phone-call" class="size-4 text-red-500" />
              Toll-Free Number Verification & Approval
            </h4>
            <UBadge
              :color="tollfreeStatusInfo.color"
              variant="subtle"
              size="xs">
              {{ tollfreeStatusInfo.label }}
            </UBadge>
          </div>

          <!-- Matched Toll-Free Verifications List -->
          <div v-if="props.service.tollfreeVerifications?.length" class="space-y-2">
            <div
              v-for="verif in props.service.tollfreeVerifications"
              :key="verif.sid"
              class="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-neutral-900 dark:text-white">
                    {{ verif.tollfree_phone_number }}
                  </span>
                  <span class="text-neutral-400 font-mono">({{ verif.tollfree_phone_number_sid }})</span>
                </div>
                <UBadge
                  :color="verif.status.toUpperCase() === 'APPROVED' || verif.status.toUpperCase() === 'TWILIO_APPROVED' || verif.status.toUpperCase() === 'VERIFIED' ? 'success' : verif.status.toUpperCase() === 'REJECTED' || verif.status.toUpperCase() === 'TWILIO_REJECTED' ? 'error' : 'warning'"
                  variant="subtle"
                  size="xs">
                  {{ verif.status }}
                </UBadge>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-300">
                <div v-if="verif.business_name">
                  <span class="text-neutral-400">Business:</span> {{ verif.business_name }}
                </div>
                <div v-if="verif.use_case_summary">
                  <span class="text-neutral-400">Use Case:</span> {{ verif.use_case_summary }}
                </div>
                <div v-if="verif.notification_email">
                  <span class="text-neutral-400">Notification Email:</span> {{ verif.notification_email }}
                </div>
                <div v-if="verif.date_created">
                  <span class="text-neutral-400">Submitted:</span> {{ format(new Date(verif.date_created), "PP") }}
                </div>
              </div>

              <!-- Rejection Details if rejected -->
              <div v-if="verif.rejection_reason || verif.rejection_reasons?.length" class="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                <span class="font-bold block mb-0.5">Rejection Reason:</span>
                <p>{{ verif.rejection_reason || verif.rejection_reasons?.join("; ") }}</p>
              </div>
            </div>
          </div>

          <div v-else-if="tollfreeStatusInfo.hasTollfree" class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
            Toll-free number(s) detected in this service sender pool, but no approved Toll-Free Verification record was found. Unverified toll-free traffic is subject to carrier blocking.
          </div>

          <div v-else class="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800">
            No toll-free numbers are assigned to this service pool. Toll-free verification is not required.
          </div>
        </div>
      </div>

      <!-- Tab 2: Sender Pool Phone Numbers -->
      <div v-if="activeTab === 'numbers'" class="space-y-3 pt-2">
        <div v-if="props.service.phoneNumbers?.length" class="space-y-2">
          <!-- Top directory link header -->
          <div class="flex items-center justify-between pb-1 text-xs">
            <span class="text-neutral-500 dark:text-neutral-400">
              {{ props.service.phoneNumbers.length }} number{{ props.service.phoneNumbers.length === 1 ? '' : 's' }} configured in this sender pool
            </span>
            <UButton
              :to="`/accounts/${props.service.account_sid}/phone-numbers?service=${props.service.sid}`"
              color="primary"
              variant="outline"
              size="xs">
              <template #leading>
                <UIcon name="i-lucide-external-link" class="size-3.5" />
              </template>
              View in Phone Numbers Directory
            </UButton>
          </div>

          <div
            v-for="pn in props.service.phoneNumbers"
            :key="pn.sid"
            class="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs">
            <div class="space-y-0.5 font-mono">
              <div class="font-bold text-neutral-900 dark:text-white text-sm">
                {{ pn.phone_number }}
              </div>
              <div class="text-neutral-500 dark:text-neutral-400">
                SID: {{ pn.sid }} &bull; Country: {{ pn.country_code }}
              </div>
            </div>

            <div class="flex items-center gap-2">
              <div class="hidden sm:flex items-center gap-1.5">
                <UBadge
                  v-for="cap in pn.capabilities"
                  :key="cap"
                  color="neutral"
                  variant="subtle"
                  size="xs">
                  {{ cap }}
                </UBadge>
              </div>

              <!-- Interlink to Phone Numbers page for this specific number -->
              <UButton
                :to="`/accounts/${props.service.account_sid}/phone-numbers?search=${encodeURIComponent(pn.phone_number)}`"
                color="neutral"
                variant="outline"
                size="xs">
                <template #leading>
                  <UIcon name="i-lucide-external-link" class="size-3" />
                </template>
                Number Details
              </UButton>
            </div>
          </div>
        </div>

        <div v-else class="p-6 text-center text-xs text-neutral-500 dark:text-neutral-400 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
          <UIcon name="i-lucide-phone-off" class="size-6 text-neutral-400 mx-auto" />
          <p>No phone numbers are currently attached to this messaging service sender pool.</p>
          <div>
            <UButton
              :to="`/accounts/${props.service.account_sid}/phone-numbers`"
              color="neutral"
              variant="outline"
              size="xs">
              <template #leading>
                <UIcon name="i-lucide-phone" class="size-3.5" />
              </template>
              Browse Account Phone Numbers
            </UButton>
          </div>
        </div>
      </div>

      <!-- Tab 3: Webhooks & Technical Settings -->
      <div v-if="activeTab === 'webhooks'" class="space-y-3 pt-2 text-xs">
        <div class="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-3.5">
          <!-- Inbound Webhook on Number Behavior Callout -->
          <div
            class="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            :class="props.service.use_inbound_webhook_on_number
              ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40'
              : 'bg-neutral-100/70 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700/60'">
            <div class="space-y-0.5">
              <div class="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white">
                <UIcon
                  :name="props.service.use_inbound_webhook_on_number ? 'i-lucide-phone-forwarded' : 'i-lucide-webhook'"
                  :class="props.service.use_inbound_webhook_on_number ? 'text-blue-500' : 'text-neutral-400'"
                  class="size-4 shrink-0" />
                <span>Use Inbound Webhook on Number:</span>
                <span class="font-bold">
                  {{ props.service.use_inbound_webhook_on_number ? "Enabled" : "Disabled" }}
                </span>
              </div>
              <p class="text-[11px] text-neutral-500 dark:text-neutral-400">
                <template v-if="props.service.use_inbound_webhook_on_number">
                  Inbound messages will be sent to the webhook configured on the individual phone number instead of this messaging service.
                </template>
                <template v-else>
                  Inbound messages will follow the Inbound Request URL configured on this messaging service below.
                </template>
              </p>
            </div>
            <UBadge
              :color="props.service.use_inbound_webhook_on_number ? 'info' : 'neutral'"
              variant="subtle"
              size="xs"
              class="self-start sm:self-auto shrink-0 font-mono">
              use_inbound_webhook_on_number: {{ props.service.use_inbound_webhook_on_number }}
            </UBadge>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <span class="text-neutral-400 block mb-0.5 font-medium">Inbound Request URL:</span>
              <span
                v-if="props.service.use_inbound_webhook_on_number"
                class="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                <UIcon name="i-lucide-info" class="size-3" />
                Bypassed by number webhook setting
              </span>
            </div>
            <span v-if="props.service.inbound_request_url" class="font-mono text-neutral-900 dark:text-white break-all">
              {{ props.service.inbound_request_url }} ({{ props.service.inbound_method || "POST" }})
            </span>
            <span v-else class="text-neutral-400 italic">Not configured</span>
          </div>

          <div>
            <span class="text-neutral-400 block mb-0.5 font-medium">Fallback URL:</span>
            <span v-if="props.service.fallback_url" class="font-mono text-neutral-900 dark:text-white break-all">
              {{ props.service.fallback_url }} ({{ props.service.fallback_method || "POST" }})
            </span>
            <span v-else class="text-neutral-400 italic">Not configured</span>
          </div>

          <div>
            <span class="text-neutral-400 block mb-0.5 font-medium">Status Callback URL:</span>
            <span v-if="props.service.status_callback" class="font-mono text-neutral-900 dark:text-white break-all">
              {{ props.service.status_callback }}
            </span>
            <span v-else class="text-neutral-400 italic">Not configured</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
            <div>
              <span class="text-neutral-400">Validity Period:</span>
              <span class="ml-1 font-medium text-neutral-900 dark:text-white">{{ props.service.validity_period }}s</span>
            </div>
            <div>
              <span class="text-neutral-400">Fallback to Long Code:</span>
              <span class="ml-1 font-medium text-neutral-900 dark:text-white">{{ props.service.fallback_to_long_code ? "Enabled" : "Disabled" }}</span>
            </div>
            <div>
              <span class="text-neutral-400">Webhook on Number:</span>
              <span class="ml-1 font-medium text-neutral-900 dark:text-white">{{ props.service.use_inbound_webhook_on_number ? "Enabled" : "Disabled" }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 4: Raw JSON Response -->
      <div v-if="activeTab === 'json'" class="pt-2">
        <MessagingServiceJsonViewer :service="props.service" />
      </div>
    </div>

    <!-- Raw API JSON Modal -->
    <UModal
      v-model:open="isJsonModalOpen"
      title="Raw API JSON Response"
      :description="`${props.service.friendly_name} (${props.service.sid})`"
      :ui="{ content: 'sm:max-w-4xl' }">
      <template #body>
        <div class="py-1">
          <MessagingServiceJsonViewer :service="props.service" />
        </div>
      </template>
    </UModal>
  </UCard>
</template>
