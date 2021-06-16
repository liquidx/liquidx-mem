<template>
  <div class="mem" :title="mem.id">
    <div class="contents">
      <div v-if="mem.url" class="title">
        <a :href="mem.url" target="_blank">
          {{ prettyTitle }}
        </a>
      </div>
      <div v-if="!mem.url" class="note">
        {{ mem.raw }}
      </div>
      <div v-if="mem.description" class="note">{{ mem.description }}</div>
      <div v-if="mem.note" class="note">{{ mem.note }}</div>
      <div v-if="mem.videos" class="videos">
        <div v-for="video in mem.videos" :key="video.mediaUrl">
          <video :src="video.mediaUrl" class="video-player"></video>
        </div>
      </div>
      <div v-if="mem.photos" class="photos">
        <div v-for="photo in mem.photos" :key="photo.mediaUrl">
          <img :src="photo.mediaUrl" />
        </div>
      </div>

      <div class="date">{{ prettyDate }}</div>
    </div>
    <div class="controls">
      <a href="#" @click.prevent="$emit('delete', mem)">
        <span class="material-icons md-18">&#xE872;</span>
      </a>
      <a href="#" @click.prevent="$emit('update', mem)">
        <span class="material-icons md-18">&#xe863;</span>
      </a>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mem {
  margin: 0.5rem 0;
  padding: 0.5rem 1rem;

  display: flex;
  flex-direction: row;

  .title a {
    font-weight: 700;
    text-decoration: none;
  }

  .contents {
    flex-grow: 1;
  }

  .controls {
    width: 2rem;
    flex-grow: 0;
    .material-icons {
      color: rgba(0, 0, 0, 0.5);
    }
    a {
      text-decoration: none;
    }
  }

  .date {
    margin: 0.5rem 0;
    font-size: 0.8rem;
    line-height: 1.1rem;
    color: rgb(220, 220, 220);
  }

  .videos {
    .video-player {
      max-width: 400px;
    }
  }

  .photos {
    img {
      max-width: 400px;
    }
  }

  .note {
    margin: 0.5rem 0;
    font-size: 0.9rem;
    line-height: 1.1rem;
    max-width: 400px;
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
    } else if (this.mem.description) {
      return this.mem.description;
    } else if (this.mem.url) {
      return this.mem.url.replace(/http[s]:\/\//, "");
    } else {
      return "";
    }
  }

  get prettyDate(): string {
    if (!this.mem.addedMs) {
      return "";
    }

    const date = new Date(this.mem.addedMs);
    return DateTime.fromJSDate(date).toFormat("yyyy-MM-dd hh:mm");
  }
}
</script>
