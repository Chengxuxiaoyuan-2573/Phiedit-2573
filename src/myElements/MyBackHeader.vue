<template>
    <div class="back-header">
        <ArrowLeft
            class="back-arrow"
            @click="emit('back')"
        />
        <h2 :class="props.class + ' title'" />
    </div>
</template>
<script setup lang="ts">
import { ArrowLeft } from "@element-plus/icons-vue";
const emit = defineEmits(["back"]);
const props = defineProps<{
    class?: string;
}>();
</script>
<style scoped>
.back-header {
    height: 25px;
    display: flex;
}

.back-arrow {
    cursor: pointer;
    height: 1.5em;
    vertical-align: middle;
    float: left;
    justify-self: flex-start;
}

.title {
    font-size: 1.1em;
    justify-self: center;
    align-self: center;
    line-height: 25px;
}
</style>