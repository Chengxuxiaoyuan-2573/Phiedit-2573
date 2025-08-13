<template>
    <div class="note-fill-panel">
        <Teleport :to="props.titleTeleport">
            填充曲线音符
        </Teleport>
        请选择2个音符作为填充曲线的起点和终点
        当前已选择{{ noteCount }}个音符
        <MySelectNoteType v-model="stateManager.cache.noteFill.type" />
        <MySelectEasing v-model="stateManager.cache.noteFill.easingType" />
        <MyInputNumber v-model="stateManager.cache.noteFill.density">
            <template #prepend>
                填充密度
            </template>
        </MyInputNumber>
        <MyButton
            type="primary"
            @click="catchErrorByMessage(() => globalEventEmitter.emit('FILL_NOTES', stateManager.cache.noteFill.type, stateManager.cache.noteFill.easingType, stateManager.cache.noteFill.density), '填充曲线音符')"
        >
            填充
        </MyButton>
    </div>
</template>
<script setup lang="ts">
import globalEventEmitter from '@/eventEmitter';
import { Note } from '@/models/note';
import MyInputNumber from '@/myElements/MyInputNumber.vue';
import MySelectEasing from '@/myElements/MySelectEasing.vue';
import MySelectNoteType from '@/myElements/MySelectNoteType.vue';
import store from '@/store';
import { catchErrorByMessage } from '@/tools/catchError';
import MyButton from '@/myElements/MyButton.vue';
import { computed } from 'vue';
const props = defineProps<{
    titleTeleport: string
}>();
const stateManager = store.useManager('stateManager');
const selectionManager = store.useManager('selectionManager');
const noteCount = computed(() => {
    return selectionManager.selectedElements.filter(e => e instanceof Note).length;
})
</script>
<style scoped>
.note-fill-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>