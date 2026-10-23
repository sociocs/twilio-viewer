<script setup lang="ts">
import { z } from "zod";
import { format } from "date-fns";
import { useClipboard } from "@vueuse/core";
import { useMainStore } from "~/stores/main";
import { twloFetchAccount, twloFetchSubaccounts } from "~/utils/call-twilio-api";
import type { TwilioAccountRaw } from "~/types";

const props = withDefaults(
  defineProps<{
    inModal?: boolean;
  }>(),
  {
    inModal: false,
  },
);

const emit = defineEmits<{
  (e: "saved"): void;
}>();

const store = useMainStore();
const toast = useToast();
const { copy } = useClipboard();

const guideModalOpen = ref(false);
const showAuthToken = ref(false);
const isTesting = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");
const verifiedAccount = ref<TwilioAccountRaw | null>(null);
const subaccountsCount = ref(0);

const connectSchema = z.object({
  accountSid: z
    .string()
    .trim()
    .min(1, "Account SID is required.")
    .regex(/^AC[a-zA-Z0-9]{32}$/, "Must be a valid 34-character Twilio Account SID starting with 'AC'."),
  authToken: z
    .string()
    .trim()
    .min(32, "Auth Token must be at least 32 characters long."),
  connectionName: z
    .string()
    .trim()
    .optional(),
});

type ConnectSchema = z.infer<typeof connectSchema>;

const formState = reactive<ConnectSchema>({
  accountSid: "",
  authToken: "",
  connectionName: "",
});

async function handleTestConnection(): Promise<void> {
  errorMessage.value = "";
  verifiedAccount.value = null;

  const result = connectSchema.safeParse(formState);
  if (!result.success) {
    const firstIssue = result.error.issues[0]?.message || "Invalid credentials format.";
    errorMessage.value = firstIssue;
    return;
  }

  isTesting.value = true;
  try {
    const creds = {
      account_sid: formState.accountSid,
      auth_token: formState.authToken,
    };

    const [error, account] = await twloFetchAccount({
      accountSid: formState.accountSid,
      authCredentials: creds,
      refreshCache: true,
    });

    if (error || !account) {
      errorMessage.value = error || "Failed to authenticate with Twilio.";
      toast.add({
        title: "Authentication Failed",
        description: errorMessage.value,
        color: "error",
        icon: "i-lucide-shield-alert",
      });
      return;
    }

    verifiedAccount.value = account;
    if (!formState.connectionName) {
      formState.connectionName = account.friendly_name || account.sid;
    }

    // Attempt to probe subaccounts count
    const [subErr, subs] = await twloFetchSubaccounts({
      authCredentials: creds,
      refreshCache: true,
    });

    if (!subErr && subs) {
      subaccountsCount.value = subs.filter(s => s.sid !== s.owner_account_sid).length;
    }

    toast.add({
      title: "Twilio Connection Verified",
      description: `Successfully authenticated as "${account.friendly_name}".`,
      color: "success",
      icon: "i-lucide-check-circle",
    });
  } catch (error: unknown) {
    const err = error as Error;
    errorMessage.value = err?.message || "An unexpected error occurred.";
  } finally {
    isTesting.value = false;
  }
}

async function handleSaveAndConnect(): Promise<void> {
  // If not tested yet, test first
  if (!verifiedAccount.value) {
    await handleTestConnection();
    if (!verifiedAccount.value) {
      return;
    }
  }

  isSaving.value = true;
  try {
    const account = verifiedAccount.value;
    const finalName = formState.connectionName?.trim() || account.friendly_name || account.sid;
    const createdAt = account.date_created ? new Date(account.date_created).getTime() : Date.now();

    await store.addAndActivateConnection({
      accountSid: formState.accountSid.trim(),
      authToken: formState.authToken.trim(),
      name: finalName,
      friendlyName: account.friendly_name,
      status: account.status || "active",
      createdAt,
    });

    toast.add({
      title: "Account Added",
      description: `Saved "${finalName}" to your local browser storage.`,
      color: "success",
      icon: "i-lucide-check",
    });

    emit("saved");
    await navigateTo(`/accounts/${formState.accountSid.trim()}`);
  } catch (error: unknown) {
    const err = error as Error;
    errorMessage.value = err?.message || "Failed to save connection.";
  } finally {
    isSaving.value = false;
  }
}

function handleCopySid(sid: string): void {
  copy(sid);
  toast.add({
    title: "Copied SID",
    description: "Account SID copied to clipboard.",
    color: "success",
    icon: "i-lucide-check",
  });
}
</script>

<template>
  <div :class="props.inModal ? 'w-full' : 'max-w-2xl mx-auto px-4 sm:px-6'">
    <UCard
      :class="props.inModal ? 'shadow-none ring-0 bg-transparent' : 'shadow-xl ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md'"
      :ui="props.inModal ? { body: 'p-0 sm:p-0' } : undefined">
      <!-- Card Header (Only shown when on landing page, not inside modal) -->
      <div v-if="!props.inModal" class="space-y-2 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <div class="size-8 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <UIcon name="i-lucide-key" class="size-4" />
            </div>
            <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
              Connect Twilio Account
            </h2>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            @click="guideModalOpen = true">
            <template #leading>
              <UIcon name="i-lucide-help-circle" class="size-3.5" />
            </template>
            Where do I find these?
          </UButton>
        </div>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          Enter your Twilio API credentials to securely inspect your account directly from your browser.
        </p>
      </div>

      <!-- Quick helper link if in modal -->
      <div v-else class="flex justify-end -mt-1 pb-2">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          @click="guideModalOpen = true">
          <template #leading>
            <UIcon name="i-lucide-help-circle" class="size-3.5" />
          </template>
          Where do I find these?
        </UButton>
      </div>

      <!-- Form Section -->
      <div :class="props.inModal ? 'space-y-5' : 'pt-6 space-y-6'">
        <!-- Error Alert -->
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-shield-alert"
          :title="errorMessage"
          class="text-xs" />

        <UForm
          :schema="connectSchema"
          :state="formState"
          class="space-y-4"
          @submit="handleSaveAndConnect">
          <!-- Account SID Field -->
          <UFormField
            label="Account SID"
            name="accountSid"
            required
            help="Starts with 'AC' followed by 32 characters">
            <UInput
              v-model="formState.accountSid"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              size="lg"
              class="w-full font-mono text-sm"
              :disabled="isTesting || isSaving">
              <template #leading>
                <UIcon name="i-lucide-key" class="size-4 text-neutral-400" />
              </template>
            </UInput>
          </UFormField>

          <!-- Auth Token Field -->
          <UFormField
            label="Auth Token"
            name="authToken"
            required
            help="32-character primary auth token">
            <UInput
              v-model="formState.authToken"
              :type="showAuthToken ? 'text' : 'password'"
              placeholder="Enter your 32-character Auth Token"
              size="lg"
              class="w-full font-mono text-sm"
              :disabled="isTesting || isSaving">
              <template #leading>
                <UIcon name="i-lucide-lock" class="size-4 text-neutral-400" />
              </template>
              <template #trailing>
                <button
                  type="button"
                  class="cursor-pointer text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1"
                  :aria-label="showAuthToken ? 'Hide Auth Token' : 'Show Auth Token'"
                  @click="showAuthToken = !showAuthToken">
                  <UIcon :name="showAuthToken ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="size-4" />
                </button>
              </template>
            </UInput>
          </UFormField>

          <!-- Connection Label / Name (Optional) -->
          <UFormField
            label="Connection Label"
            name="connectionName"
            help="Friendly name for identifying this account (optional)">
            <UInput
              v-model="formState.connectionName"
              placeholder="e.g. Production Twilio or Client Account"
              size="lg"
              class="w-full text-sm"
              :disabled="isTesting || isSaving">
              <template #leading>
                <UIcon name="i-lucide-tag" class="size-4 text-neutral-400" />
              </template>
            </UInput>
          </UFormField>

          <!-- Action Buttons -->
          <div class="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              size="lg"
              class="w-full sm:w-auto flex-1 justify-center"
              :loading="isTesting"
              :disabled="!formState.accountSid || !formState.authToken || isSaving"
              @click="handleTestConnection">
              <template #leading>
                <UIcon name="i-lucide-refresh-cw" class="size-4" />
              </template>
              Test Connection
            </UButton>

            <UButton
              type="submit"
              color="primary"
              variant="solid"
              size="lg"
              class="w-full sm:w-auto flex-1 justify-center bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white"
              :loading="isSaving || isTesting"
              :disabled="!formState.accountSid || !formState.authToken">
              <template #leading>
                <UIcon name="i-lucide-arrow-right" class="size-4" />
              </template>
              Save & Open Dashboard
            </UButton>
          </div>
        </UForm>

        <!-- Verified Account Preview Card -->
        <div
          v-if="verifiedAccount"
          class="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-3 transition-all animate-fadeIn">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-check-circle" class="size-5 text-emerald-600 dark:text-emerald-400" />
              <span class="font-bold text-sm text-neutral-900 dark:text-white">
                {{ verifiedAccount.friendly_name || "Verified Twilio Account" }}
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              <UBadge color="success" variant="subtle" size="xs">
                {{ verifiedAccount.status }}
              </UBadge>
              <UBadge color="neutral" variant="subtle" size="xs">
                {{ verifiedAccount.type }}
              </UBadge>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-emerald-200/50 dark:border-emerald-800/40">
            <div>
              <span class="text-neutral-500 dark:text-neutral-400 block">Account SID:</span>
              <div class="flex items-center gap-1 mt-0.5 font-mono">
                <span class="truncate">{{ verifiedAccount.sid.slice(0, 10) }}...{{ verifiedAccount.sid.slice(-4) }}</span>
                <button
                  type="button"
                  class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                  title="Copy SID"
                  @click="handleCopySid(verifiedAccount.sid)">
                  <UIcon name="i-lucide-copy" class="size-3" />
                </button>
              </div>
            </div>

            <div>
              <span class="text-neutral-500 dark:text-neutral-400 block">Subaccounts:</span>
              <span class="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5 block">
                {{ subaccountsCount }} detected
              </span>
            </div>

            <div>
              <span class="text-neutral-500 dark:text-neutral-400 block">Created:</span>
              <span class="text-neutral-800 dark:text-neutral-200 mt-0.5 block">
                {{ verifiedAccount.date_created ? format(new Date(verifiedAccount.date_created), "PP") : "N/A" }}
              </span>
            </div>
          </div>
        </div>

        <!-- Security & Privacy Guarantee Notice -->
        <div class="p-3.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-800/60 flex items-start gap-3">
          <UIcon name="i-lucide-shield-check" class="size-5 text-neutral-500 dark:text-neutral-400 shrink-0 mt-0.5" />
          <p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <strong>Browser Storage Assurance:</strong> Credentials and cache records are stored strictly within your browser's local IndexedDB. No external servers or analytics ever access your Twilio credentials.
          </p>
        </div>
      </div>
    </UCard>

    <!-- Help Modal -->
    <LandingCredentialsModal v-model:open="guideModalOpen" />
  </div>
</template>
