<template>
  <div class="flex flex-col w-full overflow-x-hidden md:flex-row">
    <section>
      <mem-tag-list :mems="allMems"></mem-tag-list>
    </section>

    <main class="p-2 max-w-screen flex-grow md:max-w-xl">
      <mem-add :user="user"></mem-add>

      <mem-list
        :mems="mems"
        @archive="archiveMem"
        @delete="deleteMem"
        @annotate="annotateMem"
        @note-changed="updateNoteForMem"
        @title-changed="updateTitleForMem"
        @description-changed="updateDescriptionForMem"
      />
      <div class="w-full flex flex-row justify-between m-1">
        <a href="#" @click.prevent="prevPage">Prev</a>
        <a href="#" @click.prevent="nextPage">Next</a>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'

  // Types
  import { User } from 'firebase/auth'
  import {
    CollectionReference,
    DocumentData,
    getFirestore,
    onSnapshot,
  } from 'firebase/firestore'

  import MemList from '../components/MemList.vue'
  import MemAdd from '../components/MemAdd.vue'
  import MemTagList from '../components/MemTagList.vue'

  import { Mem } from '../../functions/core/mems'
  import * as memModifiers from '../lib/mem-data-modifiers'
  import {
    queryForAllMems,
    queryForNewMems,
    queryForArchivedMems,
    queryForTaggedMems,
  } from '../lib/mem-data-queries'
  import { getUserMemCollection } from '../lib/mem-data-collection'

  export default defineComponent({
    components: {
      MemTagList,
      MemList,
      MemAdd,
    },

    props: {
      user: {
        type: Object as () => User | null,
        default: null,
      },
    },

    data() {
      return {
        allMems: [] as Mem[],
        mems: [] as Mem[],
        showArchivedStatus: 'new',
        unsubscribeListener: null as (() => void) | null,
        pageSize: 30,
      }
    },

    watch: {
      $route(to, from) {
        this.reloadMems()

        // react to route changes...
      },

      user() {
        if (this.user) {
          this.bindMems()
        } else {
          this.unbindMems()
        }
        this.reloadMems()
      },
    },

    computed: {
      signedIn() {
        return this.user !== null
      },
      userMemCollection(): CollectionReference<DocumentData> | null {
        if (this.user) {
          return getUserMemCollection(getFirestore(this.$firebase), this.user)
        }
        return null
      },
    },

    onMount() {
      if (this.user) {
        this.reloadMems()
      }
    },

    willUnmount() {
      this.unbindMems()
    },

    methods: {
      bindMems() {
        let collection = this.userMemCollection
        if (collection) {
          this.unsubscribeListener = onSnapshot(collection, () => {
            this.reloadMems()
          })
        }
      },
      unbindMems() {
        if (this.unsubscribeListener) {
          this.unsubscribeListener()
        }
      },

      async reloadMems() {
        if (!this.userMemCollection) {
          this.allMems = []
          this.mems = []
          return
        }

        let filterTags = [] as string[]
        let filterStrategy = 'any'
        if (
          this.$route &&
          this.$route.params.tags &&
          typeof this.$route.params.tags === 'string'
        ) {
          let tags = this.$route.params.tags
          if (tags.includes('+')) {
            filterStrategy = 'all'
            filterTags = tags.split('+').map(t => `#${t}`)
          } else {
            filterTags = tags.split('|').map(t => `#${t}`)
          }
        }

        if (this.$route && this.$route.path.startsWith('/archive')) {
          this.showArchivedStatus = 'archived'
        } else {
          this.showArchivedStatus = 'new'
        }

        if (filterTags.length) {
          this.mems = await queryForTaggedMems(
            this.userMemCollection,
            filterTags,
            filterStrategy,
            this.pageSize,
          )
        } else if (this.showArchivedStatus == 'archived') {
          this.mems = await queryForArchivedMems(
            this.userMemCollection,
            this.pageSize,
          )
        } else {
          this.mems = await queryForNewMems(
            this.userMemCollection,
            this.pageSize,
          )
        }

        // Get all the mems.
        this.allMems = await queryForAllMems(this.userMemCollection)
      },

      // computed proper

      prevPage() {
        this.reloadMems()
      },

      nextPage() {
        this.reloadMems()
        // TODO: animate
        window.scrollTo(0, 0)
      },

      annotateMem(mem: Mem): boolean {
        if (!this.user || !this.user.uid) {
          return false
        }

        memModifiers.annotateMem(mem, this.user.uid)
        return true
      },

      deleteMem(mem: Mem): boolean {
        if (!this.userMemCollection) {
          return false
        }
        memModifiers.deleteMem(mem, this.userMemCollection)
        return true
      },

      archiveMem(mem: Mem): boolean {
        if (!this.userMemCollection) {
          return false
        }
        memModifiers.archiveMem(mem, this.userMemCollection)
        return true
      },

      updateNoteForMem(mem: Mem, note: string): boolean {
        if (!this.userMemCollection) {
          return false
        }
        memModifiers.updateNoteForMem(mem, note, this.userMemCollection)
        return true
      },

      updateTitleForMem(mem: Mem, title: string): boolean {
        if (!this.userMemCollection) {
          return false
        }
        memModifiers.updateTitleForMem(mem, title, this.userMemCollection)
        return true
      },

      updateDescriptionForMem(mem: Mem, description: string): boolean {
        if (!this.userMemCollection) {
          return false
        }
        memModifiers.updateDescriptionForMem(
          mem,
          description,
          this.userMemCollection,
        )
        return true
      },
    },
  })
</script>
