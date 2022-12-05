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
    <span v-for="tag in allTags" :key="tag.tag">
      <router-link
        :to="'/tag/' + tag.tag.slice(1)"
        class="block p-0.5 whitespace-nowrap hover:underline"
      >
        {{ tag.tag }} ({{ tag.count }})
      </router-link>
    </span>
  </section>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import toPairs from 'lodash/toPairs'
  import orderBy from 'lodash/orderBy'

  import { Mem } from '../../functions/core/mems'
  import type { PropType } from 'vue'

  type TagIndex = { [field: string]: number }

  export default defineComponent({
    props: {
      mems: {
        type: Array as PropType<Mem[]>,
        default: [] as Mem[],
      },
    },
    emits: {
      'tag-selected': (tag: string) => true,
    },
    computed: {
      allTags(): { tag: string; count: number }[] {
        //console.log('getAllTags:', this.mems)
        const tags: TagIndex = {}
        this.mems.forEach((mem: Mem) => {
          if (mem.tags) {
            for (const tag of mem.tags) {
              tags[tag] = tags[tag] ? tags[tag] + 1 : 1
            }
          }
        })

        return orderBy(toPairs(tags), [1], ['desc']).map(o => ({
          tag: o[0],
          count: o[1],
        }))
      },
    },
    methods: {
      selectTag(tag: string) {
        this.$emit('tag-selected', tag)
      },
    },
  })
</script>
