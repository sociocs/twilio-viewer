<script setup lang="ts">
import { useMainStore } from "~/stores/main";

const store = useMainStore();
const config = useRuntimeConfig();
const appVersion = computed(() => (config.public.version as string) || "2.0.0");
const colorMode = useColorMode();
const switcherModalOpen = ref(false);

onMounted(async () => {
  await store.loadConnections();
});

const isDark = computed({
  get() {
    return colorMode.value === "dark";
  },
  set() {
    colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
  },
});
</script>

<template>
  <div
    class="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
    <!-- Global Header -->
    <header
      class="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <!-- Brand -->
        <NuxtLink to="/" class="flex items-center gap-3 group focus:outline-none">
          <div
            class="size-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-sm shadow-red-500/20 group-hover:scale-105 transition-transform">
            <UIcon name="i-lucide-layout-dashboard" class="size-5" />
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-lg tracking-tight text-neutral-900 dark:text-white">
              Twilio Viewer
            </span>
            <UBadge color="neutral" variant="subtle" size="xs" class="font-mono">
              v{{ appVersion }}
            </UBadge>
          </div>
        </NuxtLink>

        <!-- Right Side Nav Actions -->
        <div class="flex items-center gap-2">
          <!-- Active Account Indicator if connected -->
          <NuxtLink
            v-if="store.activeAccount"
            :to="`/accounts/${store.activeAccount.account_sid}`"
            class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 transition-colors text-xs font-medium group">
            <span class="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span
              class="max-w-[140px] truncate font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
              {{ store.activeAccount.name }}
            </span>
            <span class="text-neutral-400">|</span>
            <span class="font-mono text-neutral-500 dark:text-neutral-400">
              {{ store.activeAccount.account_sid.slice(0, 6) }}...{{ store.activeAccount.account_sid.slice(-4) }}
            </span>
          </NuxtLink>

          <!-- Manage Accounts / Switch Account in Top Navbar -->
          <UButton
            v-if="store.hasSavedAccounts"
            color="neutral"
            variant="outline"
            size="sm"
            @click="switcherModalOpen = true">
            <template #leading>
              <UIcon name="i-lucide-users" class="size-4" />
            </template>
            <span class="hidden sm:inline">Manage Accounts</span>
            <span class="sm:hidden">Accounts</span>
            <UBadge
              v-if="store.savedConnections.length > 0"
              color="neutral"
              variant="subtle"
              size="xs"
              class="font-mono ml-0.5 px-1.5 py-0">
              {{ store.savedConnections.length }}
            </UBadge>
          </UButton>

          <!-- Theme Toggle -->
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
            @click="isDark = !isDark">
            <template #leading>
              <UIcon :name="isDark ? 'i-lucide-moon' : 'i-lucide-sun'" class="size-4" />
            </template>
          </UButton>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Global Account Switcher / Management Modal -->
    <DashboardAccountSwitcherModal v-model:open="switcherModalOpen" />

    <!-- Global Footer -->
    <footer
      class="border-t border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 py-4 text-xs text-neutral-500 dark:text-neutral-400">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <span>Twilio Viewer {{ appVersion }}</span>
          <span>&bull;</span>
          <span>Open Source & 100% Client-Side</span>
          <span>&bull;</span>
          <span>Unofficial / Community Tool for Twilio</span>
        </div>

        <div class="flex items-center gap-4">
          <a href="https://www.sociocs.com/" target="_blank" rel="noopener noreferrer"
            class="hover:text-neutral-900 dark:hover:text-white underline decoration-neutral-300 dark:decoration-neutral-700 transition-colors">
            Sociocs (Two-way & Bulk Twilio Messaging)
          </a>
          <span>&bull;</span>
          <a href="https://github.com/sociocs/twilio-viewer" target="_blank" rel="noopener noreferrer"
            aria-label="GitHub Repository" title="GitHub Repository"
            class="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors inline-flex items-center">
            <UIcon name="i-simple-icons-github" class="size-4" />
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>
