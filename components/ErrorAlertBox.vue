<template>
    <v-sheet class="pa-4">
        <v-alert type="error" title="Error" :text="text"></v-alert>
    </v-sheet>
</template>

<script setup lang="ts">
defineProps(["text"]);
</script>