<!-- Copyright © 2025 程序小袁_2573. All rights reserved. -->
<!-- Licensed under MIT (https://opensource.org/licenses/MIT) -->

<template>
    <div
        :class="`grid-container ${props.class}`"
        v-bind="$attrs"
        :style="{
            gap: `${props.gap}px`,
            gridTemplateRows: props.height ? props.height.map(num => num + 'fr').join(' ') : `repeat(${props.rows}, 1fr)`,
            gridTemplateColumns: props.width ? props.width.map(num => num + 'fr').join(' ') : `repeat(${props.columns}, 1fr)`
        }"
    >
        <slot />
    </div>
</template>
<script setup lang="ts">
const props = withDefaults(defineProps<{
    columns?: number,
    rows?: number,
    gap?: number,
    class?: string,
    width?: number[],
    height?: number[]
}>(), {
    columns: 1,
    rows: 1,
    gap: 5,
    class: "",
    width: undefined,
    height: undefined
});
</script>
<style scoped>
.grid-container {
    width: 100%;
    display: grid;
}
</style>