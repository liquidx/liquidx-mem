<template>
  <div class="mem-list">
    <mem-row
      v-for="mem in orderedMems"
      :key="mem.id"
      :mem="mem"
      class="mb-6"
      @archive="archiveMem"
      @delete="deleteMem"
      @annotate="annotateMem"
      @note-changed="updateNoteForMem"
      @description-changed="updateDescriptionForMem"
      @title-changed="updateTitleForMem"
    />
  </div>
</template>

<script lang="ts">
  import orderBy from 'lodash/orderBy'
  import { defineComponent } from 'vue'
  import MemRow from '@/components/MemRow.vue'
  import { Mem } from '../../functions/core/mems'
  import type { PropType } from 'vue'

  export default defineComponent({
    components: {
      MemRow,
    },
    emits: {
      archive(mem: Mem): boolean {
        return true
      },
      delete(mem: Mem): boolean {
        return true
      },
      annotate(mem: Mem): boolean {
        return true
      },
      noteChanged(mem: Mem, note: string): boolean {
        return true
      },
      descriptionChanged(mem: Mem, description: string): boolean {
        return true
      },
      titleChanged(mem: Mem, title: string): boolean {
        return true
      },
    },
    props: {
      mems: {
        type: Array as PropType<Mem[]>,
        required: true,
      },
    },
    data() {
      return {
        count: 1,
      }
    },
    computed: {
      orderedMems() {
        return orderBy(this.mems, ['addedMs'], ['desc'])
      },
    },
    methods: {
      archiveMem(mem: Mem) {
        this.$emit('archive', mem)
      },
      deleteMem(mem: Mem) {
        this.$emit('delete', mem)
      },
      annotateMem(mem: Mem) {
        this.$emit('annotate', mem)
      },
      updateNoteForMem(mem: Mem, note: string) {
        this.$emit('noteChanged', mem, note)
      },
      updateDescriptionForMem(mem: Mem, description: string) {
        this.$emit('descriptionChanged', mem, description)
      },
      updateTitleForMem(mem: Mem, title: string) {
        this.$emit('titleChanged', mem, title)
      },
    },
  })
</script>
