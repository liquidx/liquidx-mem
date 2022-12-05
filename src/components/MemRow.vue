<template>
  <div class="mem flex flex-col border-l-2 m-0.5 p-1 hover:border-l-red-800">
    <div class="grow">
      <div
        class="p-2 bg-gray-50 border border-gray-200 min-h-[1rem]"
        :class="{ nocontent: !mem.note }"
        contenteditable="true"
        @blur="noteDidChange"
      >
        {{ mem.note }}
      </div>

      <div v-if="mem.url" class="text-lg px-1 py-1">
        <a :href="mem.url" target="_blank" class="font-bold">
          <span class="title-text">{{ prettyTitle }}</span>
        </a>
        <a
          href="#"
          class="text-gray-500 hover:text-gray-800"
          @click.prevent="startEdit"
        >
          <span class="material-icons mx-2 text-sm">&#xe3c9;</span>
        </a>
      </div>
      <div
        v-if="mem.description"
        class="p-0.5 text-gray-400"
        contenteditable="true"
        @blur="descriptionDidChange"
      >
        {{ shortDescription }}
      </div>

      <div v-if="mem.videos" class="videos">
        <div v-for="video in mem.videos" :key="video.mediaUrl">
          <video
            :src="video.mediaUrl"
            class="mx-4"
            :poster="video.posterUrl"
            playsinline
            controls
            loop
          />
        </div>
      </div>
      <div v-if="mem.photos" class="photos">
        <div v-for="photo in mem.photos" :key="photo.mediaUrl">
          <img :src="photo.mediaUrl" class="mx-4" />
        </div>
      </div>

      <div v-if="mem.media" class="photos">
        <img :src="mediaImageUrl" />
      </div>

      <div v-if="mem.links" class="border-1 border-gray-500 p-0.5">
        <div v-for="link in mem.links" :key="link.url">
          <a :href="link.url" target="_blank" class="text-gray-500">
            <span v-if="link.description">{{ link.description }}</span>
            <span v-else>{{ link.url }}</span>
          </a>
        </div>
      </div>

      <div class="p-0.5 text-gray-400" :title="mem.id">
        {{ prettyDate }}
      </div>
    </div>
    <div class="mx-4 text-gray-400">
      <a v-if="mem.new" href="#" @click.prevent="$emit('archive', mem)">
        <span class="material-icons text-sm align-middle">&#xe149;</span>
        Archive
      </a>
      <a v-if="!mem.new" href="#" @click.prevent="$emit('unarchive', mem)">
        <span class="material-icons text-sm align-middle">&#xe169;</span>
        Unarchive
      </a>
      <a href="#" @click.prevent="$emit('annotate', mem)">
        <span class="material-icons text-sm align-middle">&#xf071;</span>
        Annotate
      </a>
      <a
        href="#"
        class="hover:text-red-400"
        @click.prevent="$emit('delete', mem)"
      >
        <span class="material-icons text-sm align-middle">&#xE872;</span>
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
      archive(mem: Mem) {
        return true
      },
      unarchive(mem: Mem) {
        return true
      },
      annotate(mem: Mem) {
        return true
      },
      delete(mem: Mem) {
        return true
      },
      noteChanged(mem: Mem, note: string) {
        return true
      },
      descriptionChanged(mem: Mem, description: string) {
        return true
      },
      titleChanged(mem: Mem, title: string) {
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
      noteDidChange(e: FocusEvent): void {
        const target: HTMLElement = e.target as HTMLElement
        if (!target) {
          return
        }
        const noteValue = target.innerText
        if (noteValue != this.mem.note) {
          this.$emit('noteChanged', { mem: this.mem, note: noteValue })
          target.innerText = noteValue
        }
      },
      descriptionDidChange(e: FocusEvent): void {
        const target: HTMLElement = e.target as HTMLElement
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
