<template>
    <v-btn icon="mdi-cached" :loading="loading" :disabled="loading" @click="$emit('update:modelValue', $event)"
        title="Refresh">
    </v-btn>
</template>

<script setup lang="ts">
defineProps(["loading"]);
defineEmits(["on:click"]);
</script>