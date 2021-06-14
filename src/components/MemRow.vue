<template>
  <div class="mem" :title="mem.id">
    <div class="controls">
      <a href="#" @click.prevent="$emit('delete', mem)">❌</a>
    </div>
    <div class="contents">
      <div class="title">
        <a :href="mem.url" target="_blank">
          {{ prettyTitle }}
        </a>
      </div>
      <div v-if="mem.note" class="note">{{ mem.note }}</div>
      <div class="date">{{ prettyDate }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mem {
  margin: 0.5rem 0;
  padding: 0.5rem 1rem;
  border: 1px solid rgb(240, 240, 240);

  display: flex;
  flex-direction: row;

  .controls {
    width: 2rem;
    a {
      border: none;
    }
  }

  .date {
    font-size: 0.9rem;
    line-height: 1.1rem;
  }
  .note {
    font-size: 0.9rem;
    line-height: 1.1rem;
  }
}
</style>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Mem } from "../../functions/core/mems";
import { DateTime } from "luxon";

@Component
export default class MemRow extends Vue {
  @Prop() private mem!: Mem;

  get prettyTitle(): string {
    if (!this.mem) {
      return "";
    }

    if (this.mem.title) {
      return this.mem.title;
    } else if (this.mem.url) {
      return this.mem.url.replace(/http[s]:\/\//, "");
    } else {
      return "";
    }
  }

  get prettyDate(): string {
    if (!this.mem.added) {
      return "";
    }

    const date = this.mem.added.toDate();
    return DateTime.fromJSDate(date).toFormat("yyyy-MM-dd hh:mm");
  }
}
</script>
