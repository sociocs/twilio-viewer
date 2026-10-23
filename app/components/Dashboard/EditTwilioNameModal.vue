<script setup lang="ts">
import { z } from "zod";
import { useMainStore } from "~/stores/main";

const props = defineProps<{
  open: boolean;
  accountSid: string;
  currentTwilioName: string;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "saved", newName: string): void;
}>();

const store = useMainStore();
const toast = useToast();

const isOpen = computed({
  get: () => props.open,
  set: (val: boolean) => emit("update:open", val),
});

const isSubmitting = ref(false);

const twilioNameSchema = z.object({
  friendlyName: z
    .string()
    .trim()
    .min(1, "Twilio account name is required.")
    .max(64, "Twilio account name must be 64 characters or fewer."),
  syncConnectionLabel: z.boolean().default(false),
});

type TwilioNameSchema = z.infer<typeof twilioNameSchema>;

const formState = reactive<TwilioNameSchema>({
  friendlyName: "",
  syncConnectionLabel: false,
});

watch(
  () => props.open,
  (opened) => {
    if (opened) {
      formState.friendlyName = props.currentTwilioName || "";
      formState.syncConnectionLabel = false;
    }
  },
  { immediate: true },
);

async function handleSubmit(): Promise<void> {
  const result = twilioNameSchema.safeParse(formState);
  if (!result.success) {
    const errorMsg = result.error.issues[0]?.message || "Invalid Twilio account name.";
    toast.add({
      title: "Validation Error",
      description: errorMsg,
      color: "error",
      icon: "i-lucide-alert-circle",
    });
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await store.updateTwilioAccountName({
      accountSid: props.accountSid,
      newFriendlyName: formState.friendlyName,
      syncConnectionLabel: formState.syncConnectionLabel,
    });

    if (res.success && res.data) {
      toast.add({
        title: "Twilio Account Name Updated",
        description: `Successfully updated to "${res.data.friendly_name}" via Twilio API.`,
        color: "success",
        icon: "i-lucide-check-circle",
      });
      emit("saved", res.data.friendly_name);
      isOpen.value = false;
    } else {
      toast.add({
        title: "Update Failed",
        description: res.error || "Failed to update account name on Twilio.",
        color: "error",
        icon: "i-lucide-shield-alert",
      });
    }
  } catch (error) {
    console.error("Failed to update Twilio account name:", error);
    toast.add({
      title: "Update Error",
      description: "An unexpected error occurred while communicating with Twilio API.",
      color: "error",
      icon: "i-lucide-shield-alert",
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="Edit Twilio Account Name"
    description="Update the Friendly Name for this account directly on Twilio."
    :ui="{ content: 'sm:max-w-md' }">
    <template #body>
      <UForm
        :schema="twilioNameSchema"
        :state="formState"
        class="space-y-4 py-1"
        @submit="handleSubmit">
        <!-- Account Info Badge -->
        <div class="text-xs font-mono text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60 p-2.5 rounded-lg flex items-center justify-between">
          <span class="text-neutral-400 font-sans">Account SID:</span>
          <span>{{ props.accountSid }}</span>
        </div>

        <!-- Twilio API Notice -->
        <div class="p-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-2.5">
          <UIcon name="i-lucide-cloud" class="size-4 text-red-500 shrink-0 mt-0.5" />
          <p>
            This action will execute a <strong>POST</strong> request to the Twilio Accounts API endpoint (<code class="font-mono text-neutral-800 dark:text-neutral-200">/2010-04-01/Accounts/{{ props.accountSid }}.json</code>) and update the FriendlyName on Twilio's servers.
          </p>
        </div>

        <!-- FriendlyName Field -->
        <UFormField
          label="Twilio Friendly Name"
          name="friendlyName"
          required
          help="Max 64 characters. Visible in your Twilio Console.">
          <UInput
            v-model="formState.friendlyName"
            placeholder="e.g. Acme Corp Production"
            size="md"
            class="w-full"
            :disabled="isSubmitting"
            autofocus>
            <template #leading>
              <UIcon name="i-lucide-tag" class="size-4 text-neutral-400" />
            </template>
          </UInput>
        </UFormField>

        <!-- Sync Local Connection Label Option -->
        <UFormField name="syncConnectionLabel">
          <div class="flex items-center gap-2 pt-1">
            <UCheckbox
              v-model="formState.syncConnectionLabel"
              :disabled="isSubmitting" />
            <span class="text-xs text-neutral-700 dark:text-neutral-300">
              Also update local connection label to match this name
            </span>
          </div>
        </UFormField>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="isSubmitting"
            @click="isOpen = false">
            Cancel
          </UButton>
          <UButton
            type="submit"
            color="primary"
            variant="solid"
            size="sm"
            :loading="isSubmitting">
            <template #leading>
              <UIcon name="i-lucide-cloud-upload" class="size-4" />
            </template>
            Save to Twilio
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
