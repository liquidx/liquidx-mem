<template>
  <div class="mem-list">
    <mem-row
      v-for="mem in orderedMems"
      :key="mem.id"
      :mem="mem"
      @archive="archiveMem"
      @delete="deleteMem"
      @annotate="annotateMem"
      @note-changed="updateNoteForMem"
    />
  </div>
</template>

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
}
</script>