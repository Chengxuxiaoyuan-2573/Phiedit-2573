<template>
    <div class="note-fill-panel">
        <Teleport :to="props.titleTeleport">
            填充曲线音符
        </Teleport>
        请选择2个音符作为填充曲线的起点和终点
        当前已选择{{ selectionManager.selectedElements.filter(e => e instanceof Note).length }}个音符
        <MySelectNoteType v-model="type" />
        <MySelectEasing v-model="easingType" />
        <MyInputNumber v-model="density">
            <template #prepend>
                填充密度
            </template>
        </MyInputNumber>
        <ElButton @click="catchErrorByMessage(() => globalEventEmitter.emit('FILL_NOTES', type, easingType, density))">
            填充
        </ElButton>
    </div>
</template>
<script setup lang="ts">
import globalEventEmitter from '@/eventEmitter';
import { EasingType } from '@/models/easing';
import { Note, NoteType } from '@/models/note';
import MyInputNumber from '@/myElements/MyInputNumber.vue';
import MySelectEasing from '@/myElements/MySelectEasing.vue';
import MySelectNoteType from '@/myElements/MySelectNoteType.vue';
import store from '@/store';
import { catchErrorByMessage } from '@/tools/catchError';
import { ElButton } from 'element-plus';
import { ref } from 'vue';
const props = defineProps<{
    titleTeleport: string
}>();
const selectionManager = store.useManager('selectionManager');
const type = ref(NoteType.Drag);
const easingType = ref(EasingType.Linear);
const density = ref(4);
</script>