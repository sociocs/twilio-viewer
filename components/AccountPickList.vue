<template>
    <v-autocomplete class="mr-2" label="Account" hide-details="auto" density="compact" item-title="name" item-value="sid"
        :items="accounts_and_sub" variant="solo" :model-value="modelValue"
        @update:modelValue="$emit('update:modelValue', $event)">
        <template v-slot:item="{ props, item }">
            <v-list-item v-bind="props" :title="item?.raw?.name" :subtitle="item?.raw?.sid"></v-list-item>
        </template>
    </v-autocomplete>
</template>

<script setup lang="ts">
defineProps(["modelValue", "accounts_and_sub"]);
defineEmits(["update:modelValue"]);
</script>