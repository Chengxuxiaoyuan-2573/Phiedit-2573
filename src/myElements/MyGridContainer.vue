<template>
    <div
        class="grid-container"
        v-bind="$attrs"
        :style="{
            gridTemplateColumns: `repeat(${props.columns}, 1fr)`,
            gap: `${props.gap}px`
        }"
    >
        <slot />
    </div>
</template>
<script setup lang="ts">
const props = withDefaults(defineProps<{
    columns?: number,
    gap?: number
}>(),{
    columns: 1,
    gap: 10
});
</script>
<style scoped>
.grid-container {
    width: 100%;
    display: grid;
}
</style>