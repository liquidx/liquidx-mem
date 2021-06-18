<template>
  <div class="mem">
    <div class="contents">
      <div v-if="mem.url" class="title">
        <a :href="mem.url" target="_blank">
          {{ prettyTitle }}
        </a>
      </div>
      <div v-if="!mem.url">
        {{ mem.raw }}
      </div>
      <div v-if="mem.description" class="description">
        {{ shortDescription }}
      </div>
      <div
        class="note"
        :class="{ nocontent: !mem.note }"
        contenteditable=""
        @blur="noteDidChange"
      >
        {{ mem.note }}
      </div>
      <div v-if="mem.videos" class="videos">
        <div v-for="video in mem.videos" :key="video.mediaUrl">
          <video
            :src="video.mediaUrl"
            class="video-player"
            :poster="video.posterUrl"
            playsinline
            controls
            loop
          ></video>
        </div>
      </div>
      <div v-if="mem.photos" class="photos">
        <div v-for="photo in mem.photos" :key="photo.mediaUrl">
          <img :src="photo.mediaUrl" />
        </div>
      </div>

      <div class="date" :title="mem.id">{{ prettyDate }}</div>
    </div>
    <div class="controls">
      <a href="#" @click.prevent="$emit('delete', mem)">
        <span class="material-icons">&#xE872;</span>
        Delete
      </a>
      <a href="#" @click.prevent="$emit('annotate', mem)">
        <span class="material-icons">&#xe863;</span>
        Annotate
      </a>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "src/layout";

.mem {
  margin: 0.5rem 0;
  padding: 0.5rem 1rem;

  display: flex;
  flex-direction: column;

  .title a {
    font-weight: 700;
    text-decoration: none;
  }

  .contents {
    flex-grow: 1;
  }

  .controls {
    font-size: 0.8rem;

    a {
      color: rgb(200, 200, 200);
      text-decoration: none;
      margin-right: 1rem;

      .material-icons {
        font-size: 1rem;
        vertical-align: middle;
      }
    }

    a:hover {
      color: rgb(160, 160, 160);
    }
  }

  .date {
    padding: 0.5rem 0;
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

  .description,
  .note {
    margin: 0.5rem 0;
    padding: 0.5rem 0;
    font-size: 0.9rem;
    line-height: 1.1rem;
    max-width: 400px;
  }

  .note {
    background-color: rgb(250, 250, 250);
    border-bottom: 1px solid rgb(240, 240, 240);
    padding: 1rem 0.5rem;
    transition: padding 200ms 0.2s;
  }

  .note.nocontent {
    padding: 0.2rem 0.5rem;
  }

  .note.nocontent:focus {
    padding: 1rem 0.5rem;
  }
}

@media (max-width: $layout-mobile-width) {
  .mem {
    flex-direction: column;

    .controls {
      width: 80vw;
    }

    .photos {
      img {
        max-width: 80vw;
      }
    }

    .videos {
      .video-player {
        max-width: 80vw;
      }
    }
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

  maxChars = 1000;

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

  get shortDescription(): string {
    if (!this.mem.description) {
      return "";
    }
    if (this.mem.description.length > this.maxChars) {
      return this.mem.description.substring(0, this.maxChars) + "...";
    }
    return this.mem.description;
  }

  noteDidChange(e: FocusEvent & EventTarget): void {
    const target: HTMLElement = e.target as HTMLElement;
    if (!target) {
      return;
    }
    const noteValue = target.innerText;
    if (noteValue != this.mem.note) {
      this.$emit("note-changed", { mem: this.mem, note: noteValue });
    }
  }
}
</script>
