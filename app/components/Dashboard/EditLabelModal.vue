<script setup lang="ts">
import { z } from "zod";
import { useMainStore } from "~/stores/main";

const props = defineProps<{
  open: boolean;
  accountSid: string;
  currentName: string;
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

const labelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Connection label is required.")
    .max(60, "Connection label must be 60 characters or fewer."),
});

type LabelSchema = z.infer<typeof labelSchema>;

const formState = reactive<LabelSchema>({
  name: "",
});

watch(
  () => props.open,
  (opened) => {
    if (opened) {
      formState.name = props.currentName || "";
    }
  },
  { immediate: true },
);

async function handleSubmit(): Promise<void> {
  const result = labelSchema.safeParse(formState);
  if (!result.success) {
    const errorMsg = result.error.issues[0]?.message || "Invalid label.";
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
    await store.updateConnectionName(props.accountSid, formState.name);
    toast.add({
      title: "Label Updated",
      description: `Connection label was changed to "${formState.name}".`,
      color: "success",
      icon: "i-lucide-check-circle",
    });
    emit("saved", formState.name);
    isOpen.value = false;
  } catch (error) {
    console.error("Failed to update connection label:", error);
    toast.add({
      title: "Update Failed",
      description: "Could not save the new label to local storage.",
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
    title="Edit Connection Label"
    description="Update the display name for this saved Twilio account."
    :ui="{ content: 'sm:max-w-md' }">
    <template #body>
      <UForm
        :schema="labelSchema"
        :state="formState"
        class="space-y-4 py-1"
        @submit="handleSubmit">
        <div class="text-xs font-mono text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60 p-2.5 rounded-lg flex items-center justify-between">
          <span class="text-neutral-400 font-sans">Account SID:</span>
          <span>{{ props.accountSid }}</span>
        </div>

        <UFormField
          label="Connection Label"
          name="name"
          required
          help="A friendly name to identify this account (e.g. Production, Staging, Subaccount).">
          <UInput
            v-model="formState.name"
            placeholder="e.g. Production Twilio"
            size="md"
            class="w-full"
            :disabled="isSubmitting"
            autofocus>
            <template #leading>
              <UIcon name="i-lucide-tag" class="size-4 text-neutral-400" />
            </template>
          </UInput>
        </UFormField>

        <div class="flex items-center justify-end gap-2 pt-2">
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
            Save Changes
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
