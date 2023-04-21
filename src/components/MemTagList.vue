<template>
  <section
    class="w-screen p-2 md:w-48 text-gray-500 flex flex-row flex-wrap md:flex-col justify-start"
  >
    <router-link to="/" class="block p-0.5 whitespace-nowrap hover:underline"
      >New
    </router-link>
    <router-link
      to="/archive"
      class="block p-0.5 whitespace-nowrap hover:underline"
    >
      Archive
    </router-link>
    <span v-for="view in views" :key="view">
      <router-link
        :to="pathForView(view)"
        class="block p-0.5 whitespace-nowrap hover:underline"
        :class="isCurrent(view) ? 'font-bold' : ''"
      >
        {{ view }}
      </router-link>
    </span>
    <span v-for="tag in allTags" :key="tag.tag">
      <router-link
        :to="'/tag/' + tag.tag.slice(1)"
        class="block p-0.5 whitespace-nowrap hover:underline"
        :class="isCurrent(tag.tag) ? 'font-bold' : ''"
      >
        {{ tag.label }} ({{ tag.count }})
      </router-link>
    </span>
    <span v-if="!everything">
      <button
        @click.prevent="everything = true"
        class="block p-0.5 whitespace-nowrap hover:underline"
      >
        More..
      </button>
    </span>
  </section>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import { orderBy, toPairs } from 'lodash-es'

  import { Mem } from '../../functions/core/mems'
  import type { PropType } from 'vue'

  type TagIndex = { [field: string]: number }
  type TagListItem = { tag: string; label: string; count: number }

  export default defineComponent({
    props: {
      currentView: {
        type: String as PropType<string>,
        default: '',
      },
      mems: {
        type: Array as PropType<Mem[]>,
        default: [] as Mem[],
      },
      views: {
        type: Array as PropType<string[]>,
        default: [] as string[],
      },
    },
    data: () => ({
      everything: false,
      initialMaxTags: 30,
    }),
    emits: {
      'tag-selected': (tag: string) => true,
    },
    computed: {
      allTags(): TagListItem[] {
        //console.log('getAllTags:', this.mems)
        const tags: TagIndex = {}
        this.mems.forEach((mem: Mem) => {
          if (mem.tags) {
            for (const tag of mem.tags) {
              tags[tag] = tags[tag] ? tags[tag] + 1 : 1
            }
          }
        })

        let orderedTags = orderBy(toPairs(tags), [1], ['desc']).map(
          o =>
            ({
              tag: o[0],
              label: this.labelForTag(o[0]),
              count: o[1],
            } as TagListItem),
        )
        if (!this.everything) {
          orderedTags = orderedTags.slice(0, this.initialMaxTags)
        }
        return orderedTags
      },
    },
    methods: {
      isCurrent(expression: string) {
        return this.currentView === expression.replaceAll('#', '')
      },
      pathForView(view: string) {
        let hashesRemoved = view.replaceAll('#', '')
        return `/tag/${hashesRemoved}/`
      },
      selectTag(tag: string) {
        this.$emit('tag-selected', tag)
      },
      labelForTag(tag: string) {
        if (!tag) {
          return tag
        }
        switch (tag) {
          case '#art':
            return `🎨 ${tag}`
          case '#code':
            return `👨‍💻 ${tag}`
          case '#map':
            return `🗺️ ${tag}`
          case '#photo':
            return `📷 ${tag}`
          case '#japan':
          case '#japanese':
            return `🇯🇵 ${tag}`
          case '#tokyo':
            return `🗼 ${tag}`
          case '#hongkong':
            return `🇭🇰 ${tag}`
          case '#house':
            return `🏠 ${tag}`
          case '#look':
          case '#read':
          case '#watch':
            return `👀 ${tag}`
          case '#want':
            return `🤩 ${tag}`
          case '#3d':
            return `📦 ${tag}`
          case '#ml':
          case '#ml-generative':
          case '#generated':
          case '#ml-app':
          case '#dreambooth':
          case '#nerf':
          case '#cloudml':
          case '#stablediffusion':
          case '#dalle':
          case '#midjourney':
          case '#llm':
          case '#colab':
            return `🧠 ${tag}`
          case '#f1':
            return `🏎️ ${tag}`
          case '#snow':
            return `❄️ ${tag}`
          case '#datavis':
            return `📊 ${tag}`
          case '#design':
            return `🎨 ${tag}`
          case '#keyboard':
            return `⌨️ ${tag}`
          case '#web':
            return `🌐 ${tag}`
          case '#music':
            return `🎵 ${tag}`
          case '#game':
          case '#gaming':
            return `🎮 ${tag}`
          case '#place':
            return `📍 ${tag}`
          case '#snowboard':
            return `🏂 ${tag}`
          case '#furniture':
            return `🛋️ ${tag}`
          case '#watch':
            return `⌚ ${tag}`
          default:
            return tag
        }
      },
    },
  })
</script>
