<script setup lang="ts">
const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
}>();

const isOpen = computed({
  get: () => props.open,
  set: (val: boolean) => emit("update:open", val),
});
</script>

<template>
  <UModal v-model:open="isOpen" title="How to find your Twilio Credentials" description="Follow these quick steps in your Twilio Console.">
    <template #body>
      <div class="space-y-4 py-2 text-sm text-neutral-600 dark:text-neutral-300">
        <div class="flex items-start gap-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/60">
          <div class="size-7 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs shrink-0">
            1
          </div>
          <div>
            <h4 class="font-medium text-neutral-900 dark:text-white">
              Log in to the Twilio Console
            </h4>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Navigate to
              <a
                href="https://console.twilio.com"
                target="_blank"
                rel="noopener noreferrer"
                class="text-red-500 hover:text-red-600 underline font-medium">
                console.twilio.com
                <UIcon name="i-lucide-external-link" class="inline size-3 ml-0.5" />
              </a>
              in your browser.
            </p>
          </div>
        </div>

        <div class="flex items-start gap-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/60">
          <div class="size-7 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs shrink-0">
            2
          </div>
          <div>
            <h4 class="font-medium text-neutral-900 dark:text-white">
              Locate "Account Info"
            </h4>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              On your Twilio Console home dashboard, scroll down to the <strong>Account Info</strong> section.
            </p>
          </div>
        </div>

        <div class="flex items-start gap-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/60">
          <div class="size-7 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs shrink-0">
            3
          </div>
          <div>
            <h4 class="font-medium text-neutral-900 dark:text-white">
              Copy Account SID & Auth Token
            </h4>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Copy the <strong>Account SID</strong> (starts with <code class="text-red-500 font-mono">AC</code>) and click "Show" to reveal and copy your <strong>Auth Token</strong>.
            </p>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2.5">
          <UIcon name="i-lucide-shield-check" class="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p class="text-xs text-emerald-800 dark:text-emerald-300">
            <strong>Security Notice:</strong> Your credentials are sent directly to Twilio API (<code class="font-mono">api.twilio.com</code>) through your browser and saved exclusively in your browser's IndexedDB. No backend servers ever touch them.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton
          label="Got it"
          color="neutral"
          variant="solid"
          size="sm"
          @click="isOpen = false" />
      </div>
    </template>
  </UModal>
</template>
