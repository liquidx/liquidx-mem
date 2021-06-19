<template>
  <div class="mem-list">
    <mem-row
      v-for="mem in orderedMems"
      :key="mem.id"
      :mem="mem"
      class="mem-row"
      @archive="archiveMem"
      @delete="deleteMem"
      @annotate="annotateMem"
      @note-changed="updateNoteForMem"
      @description-changed="updateDescriptionForMem"
      @title-changed="updateTitleForMem"
    />
  </div>
</template>

<style lang="scss" scoped>
.mem-row {
  margin-bottom: 2rem;
}
</style>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import orderBy from "lodash/orderBy";

import MemRow from "@/components/MemRow.vue";
import { Mem } from "../../functions/core/mems";

@Component({
  components: {
    MemRow,
  },
})
export default class Home extends Vue {
  @Prop() private mems!: Mem[];

  get orderedMems(): Mem[] {
    return orderBy(this.mems, ["addedMs"], ["desc"]);
  }

  archiveMem(mem: Mem): void {
    this.$emit("archive", mem);
  }

  deleteMem(mem: Mem): void {
    this.$emit("delete", mem);
  }

  annotateMem(mem: Mem): void {
    this.$emit("annotate", mem);
  }

  updateNoteForMem(changed: { mem: Mem; note: string }): void {
    this.$emit("note-changed", changed);
  }

  updateTitleForMem(changed: { mem: Mem; title: string }): void {
    this.$emit("title-changed", changed);
  }
  updateDescriptionForMem(changed: { mem: Mem; description: string }): void {
    this.$emit("description-changed", changed);
  }
}
</script>