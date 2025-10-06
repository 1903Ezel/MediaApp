<script setup>
import { defineProps } from 'vue';

defineProps({
  label: String
});
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 p-4
              bg-black/40 backdrop-blur-sm
              rounded-2xl aspect-square
              border border-white/10
              hover:bg-white/20 transition-colors duration-300
              cursor-pointer">
    <slot></slot>
    <span class="text-sm font-semibold text-white/90 text-center">{{ label }}</span>
  </div>
</template>