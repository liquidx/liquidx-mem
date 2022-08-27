<template>
  <div class="mem">
    <div class="contents">
      <div
        class="note"
        :class="{ nocontent: !mem.note }"
        contenteditable="true"
        @blur="noteDidChange"
      >
        {{ mem.note }}
      </div>
      <div v-if="mem.url" class="title">
        <a :href="mem.url" target="_blank">
          <span class="title-text">{{ prettyTitle }}</span>
        </a>
        <a href="#" class="title-edit" @click.prevent="startEdit">
          <span class="material-icons">&#xe3c9;</span>
        </a>
      </div>
      <div
        v-if="mem.description"
        class="description"
        contenteditable="true"
        @blur="descriptionDidChange"
      >
        {{ shortDescription }}
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
          />
        </div>
      </div>
      <div v-if="mem.photos" class="photos">
        <div v-for="photo in mem.photos" :key="photo.mediaUrl">
          <img :src="photo.mediaUrl" />
        </div>
      </div>

      <div v-if="mem.media" class="photos">
        <img :src="mediaImageUrl" />
      </div>

      <div v-if="mem.links" class="links">
        <div v-for="link in mem.links" :key="link.url">
          <a :href="link.url" target="_blank">
            <span v-if="link.description">{{ link.description }}</span>
            <span v-else>{{ link.url }}</span>
          </a>
        </div>
      </div>

      <div class="date" :title="mem.id">
        {{ prettyDate }}
      </div>
    </div>
    <div class="controls">
      <a v-if="mem.new" href="#" @click.prevent="$emit('archive', mem)">
        <span class="material-icons">&#xe149;</span>
        Archive
      </a>
      <a v-if="!mem.new" href="#" @click.prevent="$emit('unarchive', mem)">
        <span class="material-icons">&#xe169;</span>
        Unarchive
      </a>
      <a href="#" @click.prevent="$emit('annotate', mem)">
        <span class="material-icons">&#xf071;</span>
        Annotate
      </a>
      <a href="#" class="delete" @click.prevent="$emit('delete', mem)">
        <span class="material-icons">&#xE872;</span>
        Delete
      </a>
    </div>
  </div>
</template>

<script lang="ts">
  import { Mem } from '../../functions/core/mems'
  import { DateTime } from 'luxon'
  import firebase from 'firebase/app'
  import 'firebase/storage'
  import { defineComponent } from 'vue'

  export default defineComponent({
    props: {
      mem: {
        type: Object,
        required: true,
      },
    },

    data() {
      return {
        maxChars: 1000,
        mediaImageUrl: '',
      }
    },

    emits: {
      archive(mem) {
        return true
      },
      unarchive(mem) {
        return true
      },
      annotate(mem) {
        return true
      },
      delete(mem) {
        return true
      },
      noteChanged(mem, note) {
        return true
      },
      descriptionChanged(mem, description) {
        return true
      },
      titleChanged(mem, title) {
        return true
      },
    },

    watch: {
      mem: {
        handler(mem) {
          this.getMediaImageUrl()
        },
        deep: true,
      },
    },

    computed: {
      prettyDate() {
        if (!this.mem.addedMs) {
          return ''
        }

        const date = new Date(this.mem.addedMs)
        return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd hh:mm')
      },
      prettyTitle() {
        if (!this.mem) {
          return ''
        }

        if (this.mem.title) {
          return this.mem.title
        } else if (this.mem.description) {
          return this.mem.description
        } else if (this.mem.url) {
          return this.mem.url.replace(/http[s]:\/\//, '')
        } else {
          return ''
        }
      },
      shortDescription() {
        if (!this.mem.description) {
          return ''
        }
        if (this.mem.description.length > this.maxChars) {
          return this.mem.description.substring(0, this.maxChars) + '...'
        }
        return this.mem.description
      },
    },

    mounted() {
      this.getMediaImageUrl()
    },

    methods: {
      noteDidChange(e) {
        const target = e.target
        if (!target) {
          return
        }
        const noteValue = target.innerText
        if (noteValue != this.mem.note) {
          this.$emit('noteChanged', { mem: this.mem, note: noteValue })
          target.innerText = noteValue
        }
      },
      descriptionDidChange(e) {
        const target = e.target
        if (!target) {
          return
        }
        const descriptionValue = target.innerText
        if (descriptionValue != this.mem.description) {
          this.$emit('descriptionChanged', {
            mem: this.mem,
            description: descriptionValue,
          })
        }
      },

      startEdit() {
        const titleEl = this.$el.querySelector('.title-text')
        if (titleEl) {
          const linkEl = titleEl.parentElement
          if (!linkEl) {
            return
          }
          const linkUrl = linkEl.getAttribute('href')
          linkEl.removeAttribute('href')

          titleEl.setAttribute('contenteditable', 'true')
          titleEl.focus()
          titleEl.onblur = () => {
            this.$emit('title-changed', {
              mem: this.mem,
              title: titleEl.innerText,
            })
            titleEl.removeAttribute('contenteditable')
            if (linkUrl) {
              linkEl.setAttribute('href', linkUrl)
            }
          }
        }
      },
      async getMediaImageUrl() {
        if (this.mem && this.mem.media && this.mem.media.path) {
          console.log('Getting url', this.mem.media.path)
          const url = await firebase
            .storage()
            .ref(this.mem.media.path)
            .getDownloadURL()
          console.log('Got url', this.mem.media.path)
          this.mediaImageUrl = url
        }
        return this.mediaImageUrl
      },
    },
  })
</script>

<style lang="scss" scoped>
  @import 'src/layout';
  @import 'src/colors';

  $highlight-border-width: 2px;
  $row-width: 400px;

  .mem {
    border-left: $highlight-border-width solid rgba(0, 0, 0, 0);
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;

    display: flex;
    flex-direction: column;

    .title {
      max-width: $row-width;
      padding: 0.5rem 0;
      a {
        font-weight: 700;
        text-decoration: none;
      }

      a.title-edit {
        display: none;
        color: $color-light-grey;

        .material-icons {
          padding: 0 0.5rem;
          font-size: 1rem;
          vertical-align: top;
        }
      }
      a.title-edit:hover {
        color: $color-grey;
      }
    }

    .title:hover {
      a.title-edit {
        display: inline;
      }
    }

    .contents {
      flex-grow: 1;
    }

    .controls {
      font-size: 0.8rem;

      a {
        color: $color-light-grey;
        text-decoration: none;
        margin-right: 1rem;

        .material-icons {
          font-size: 1rem;
          vertical-align: middle;
        }
      }

      a:hover {
        color: $color-grey;
      }

      a.delete:hover {
        color: rgb(255, 160, 160);
      }
    }

    .date {
      padding: 0.5rem 0;
      font-size: 0.8rem;
      line-height: 1.1rem;
      color: $color-very-light-grey;
    }

    .videos {
      .video-player {
        max-width: $row-width;
      }
    }

    .photos {
      img {
        max-width: $row-width;
      }
    }

    .links {
      a {
        color: $color-grey;
        font-size: 0.9rem;
      }

      border: 1px solid $color-light-grey;
      padding: 0.5rem;
      max-width: $row-width;
    }

    .description,
    .note {
      margin: 0.5rem 0;
      padding: 0.5rem 0;
      font-size: 0.9rem;
      line-height: 1.1rem;
      max-width: $row-width;
    }

    .note {
      background-color: $color-extremely-light-grey;
      border-left: 3px solid $color-medium-grey;
      padding: 1rem 1rem;
      transition: padding 200ms 0.2s;
    }

    .note.nocontent {
      padding: 0.2rem 1rem;
    }

    .note.nocontent:focus {
      padding: 1rem 0.5rem;
    }
  }

  .mem:hover {
    border-left: $highlight-border-width solid $color-very-light-grey;
    //background-color: $color-extremely-light-grey;
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
