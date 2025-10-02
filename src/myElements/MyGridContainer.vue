<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div
        :class="`grid-container ${props.class}`"
        v-bind="$attrs"
        :style="{
            gridTemplateColumns: `repeat(${props.columns}, 1fr)`,
            gap: `${props.gap}px`,
        }"
    >
        <slot />
    </div>
</template>
<script setup lang="ts">
const props = withDefaults(defineProps<{
    columns?: number,
    gap?: number,
    class?: string,
}>(), {
    columns: 1,
    gap: 5,
    class: ""
});
</script>
<style scoped>
.grid-container {
    width: 100%;
    display: grid;
}
</style>