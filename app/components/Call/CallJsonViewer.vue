<script setup lang="ts">
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { useClipboard } from "@vueuse/core";
import type { EnrichedTwilioCall } from "~/types";

const props = defineProps<{
  call: EnrichedTwilioCall;
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
}>();

const { copy } = useClipboard();
const toast = useToast();
const colorMode = useColorMode();

const isOpen = computed({
  get: () => props.open,
  set: (val: boolean) => emit("update:open", val),
});

const currentDepth = ref<number>(2);

const rawJson = computed(() => {
  return {
    ...props.call,
  };
});

function handleCopyJson(): void {
  const jsonStr = JSON.stringify(rawJson.value, null, 2);
  copy(jsonStr);
  toast.add({
    title: "JSON Copied",
    description: `Copied raw JSON for call ${props.call.sid} to clipboard.`,
    color: "success",
    icon: "i-lucide-check",
  });
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="Raw Voice Call API JSON"
    :description="`${call.sid} • ${call.direction} • ${call.status}`"
    :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div class="space-y-4 py-1">
        <!-- Toolbar: Depth controls & Copy -->
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800 text-xs">
          <!-- Depth selector -->
          <div class="flex items-center gap-1.5">
            <span class="text-neutral-500 dark:text-neutral-400 font-medium mr-1">Depth:</span>
            <button
              v-for="d in [1, 2, 3]"
              :key="d"
              type="button"
              class="px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors cursor-pointer"
              :class="currentDepth === d
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
              @click="currentDepth = d">
              {{ d }}
            </button>
            <button
              type="button"
              class="px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors cursor-pointer"
              :class="currentDepth >= 10
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
              @click="currentDepth = 99">
              All
            </button>
          </div>

          <!-- Copy Button -->
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            @click="handleCopyJson">
            <template #leading>
              <UIcon name="i-lucide-copy" class="size-3.5" />
            </template>
            Copy JSON
          </UButton>
        </div>

        <!-- Pretty JSON View Container -->
        <div
          class="p-4 rounded-xl font-mono text-xs overflow-auto max-h-[60vh] border transition-colors bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
          :class="colorMode.value === 'dark' ? 'vjs-tree-dark' : 'vjs-tree-light'">
          <VueJsonPretty
            :data="rawJson"
            :deep="currentDepth"
            :show-length="true"
            :show-line="true"
            :show-double-quotes="true"
            :theme="colorMode.value === 'dark' ? 'dark' : 'light'" />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end w-full">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          @click="isOpen = false">
          Close
        </UButton>
      </div>
    </template>
  </UModal>
</template>
