<template>
  <div
    class="mem flex flex-col border-l-2 m-0.5 py-2 px-6 hover:border-l-gray-800"
  >
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
        <button
          class="text-gray-500 hover:text-gray-800"
          @click.prevent="startEdit"
        >
          <span class="material-icons mx-2 text-sm">&#xe3c9;</span>
        </button>
      </div>

      <div
        v-if="mem.description"
        class="my-2 text-gray-400"
        contenteditable="true"
        @blur="descriptionDidChange"
      >
        {{ shortDescription }}
      </div>
      <div v-else>
        <div
          class="my-2 text-gray-400"
          contenteditable="true"
          @blur="descriptionDidChange"
        >
          No description
        </div>
      </div>

      <div v-if="displayVideos" class="videos">
        <div v-for="video in displayVideos" :key="video.url">
          <video
            :src="video.url"
            :alt="video.status"
            :title="video.status"
            class="my-4"
            playsinline
            controls
            loop
          />
        </div>
      </div>
      <div v-if="displayPhotos" class="photos">
        <div v-for="photo in displayPhotos" :key="photo.url">
          <img
            :src="photo.url"
            :alt="photo.status"
            :title="photo.status"
            class="my-4"
          />
        </div>
      </div>

      <div v-if="mem.media" class="photos">
        <img :src="mediaImageUrl" />
      </div>

      <ul v-if="mem.links" class="border-1 border-gray-500 my-2">
        <li v-for="link in mem.links" :key="link.url">
          <a :href="link.url" target="_blank" class="text-gray-500">
            <span v-if="link.description">{{ link.description }}</span>
            <span v-else>{{ link.url }}</span>
          </a>
        </li>
      </ul>

      <div class="my-2 text-gray-400" :title="mem.id">
        <div>{{ prettyDate }}</div>
        <div class="text-gray-200">
          <router-link :to="'/mem/' + mem.id">{{ mem.id }}</router-link>
        </div>
      </div>
    </div>
    <div class="text-gray-400 flex flex-row flex-nowrap gap-1">
      <button
        v-if="mem.new"
        class="pr-2 py-1 hover:text-gray-500"
        @click.prevent="$emit('archive', mem)"
      >
        <span class="material-icons text-sm align-middle">&#xe149;</span>
        Archive
      </button>
      <button
        v-if="!mem.new"
        class="pr-2 py-1 hover:text-gray-500"
        @click.prevent="$emit('unarchive', mem)"
      >
        <span class="material-icons text-sm align-middle">&#xe169;</span>
        Unarchive
      </button>
      <button
        class="pr-2 py-1 hover:text-gray-500"
        @click.prevent="$emit('annotate', mem)"
      >
        <span class="material-icons text-sm align-middle">&#xf071;</span>
        Annotate
      </button>
      <button
        class="pr-2 py-1 hover:text-red-400"
        @click.prevent="$emit('delete', mem)"
      >
        <span class="material-icons text-sm align-middle">&#xE872;</span>
        Delete
      </button>
    </div>
  </div>
</template>

<script lang="ts">
  import { Mem } from '../../functions/core/mems'
  import { DateTime } from 'luxon'
  import { getStorage, ref, getDownloadURL } from 'firebase/storage'

  import { defineComponent } from 'vue'

  type MediaUrl = {
    url: string
    posterUrl?: string
    status?: string
  }

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
        displayPhotos: [] as MediaUrl[],
        displayVideos: [] as MediaUrl[],
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
          this.getMediaUrls()
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
      this.getMediaUrls()
    },

    methods: {
      noteDidChange(e: FocusEvent): void {
        const target: HTMLElement = e.target as HTMLElement
        if (!target) {
          return
        }
        const noteValue = target.innerText
        if (noteValue != this.mem.note) {
          this.$emit('noteChanged', this.mem, noteValue)
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
          this.$emit('descriptionChanged', this.mem, descriptionValue)
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
            this.$emit('title-changed', this.mem, titleEl.innerText)
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
          const storage = getStorage(this.$firebase)
          const storageRef = ref(storage, this.mem.media.path)
          try {
            const url = await getDownloadURL(storageRef)
            console.log('Got url', this.mem.media.path)
            this.mediaImageUrl = url
          } catch (e) {
            // Silent fail
          }
        }
        return this.mediaImageUrl
      },
      async getMediaUrls() {
        if (this.mem && this.mem.photos) {
          const displayPhotos = []
          const storage = getStorage(this.$firebase)
          for (let photo of this.mem.photos) {
            if (photo.cachedMediaPath) {
              const storageRef = ref(storage, photo.cachedMediaPath)
              try {
                const url = await getDownloadURL(storageRef)
                displayPhotos.push({ url: url, status: 'cached' })
              } catch (e) {
                // Silent fail
                console.log('Error getting cached image', e)
              }
            } else {
              displayPhotos.push({ url: photo.mediaUrl, status: 'live' })
            }
          }
          this.displayPhotos = displayPhotos
        }
        if (this.mem && this.mem.videos) {
          const displayVideos = []
          const storage = getStorage(this.$firebase)
          for (let video of this.mem.videos) {
            if (video.cachedMediaPath) {
              const storageRef = ref(storage, video.cachedMediaPath)
              try {
                const url = await getDownloadURL(storageRef)
                displayVideos.push({
                  url: url,
                  posterUrl: video.posterUrl,
                  status: 'cached',
                })
              } catch (e) {
                console.log('Error getting cached video', e)
              }
            } else {
              displayVideos.push({
                url: video.mediaUrl,
                posterUrl: video.posterUrl,
                status: 'live',
              })
            }
          }
          this.displayVideos = displayVideos
        }
      },
    },
  })
</script>
