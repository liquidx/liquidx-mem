<template>
  <div class="p-4 flex flex-col w-full overflow-x-hidden md:flex-row">
    <header class="mt-0 p-2 w-screen md:min-h-screen md:w-48">
      <h1 class="text-md py-2 font-bold text-gray-800"><a href="/">#mem</a></h1>

      <mem-auth @did-sign-in="didSignIn" @did-sign-out="didSignOut"></mem-auth>

      <div class="py-2" v-if="user" v-show="user">
        <ul>
          <li><a class="underline" href="/data">export/import json</a></li>
        </ul>
      </div>
    </header>
    <section>
      <mem-tag-list :mems="allMems" @tag-selected="selectTag"></mem-tag-list>
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

  import MemAuth from '../components/MemAuth.vue'
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
      MemAuth,
      MemList,
      MemAdd,
    },

    data() {
      return {
        user: null as User | null,
        allMems: [] as Mem[],
        mems: [] as Mem[],
        showTags: [] as string[],
        showArchivedStatus: 'new',
        unsubscribeListener: null as (() => void) | null,
        pageSize: 30,
      }
    },

    watch: {
      $route(to, from) {
        if (to.path.startsWith('/tag')) {
          this.reloadMems()
        }

        // react to route changes...
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

    willUnmount() {
      this.unbindMems()
    },

    methods: {
      didSignIn(user: User) {
        this.user = user
        this.bindMems()
        this.reloadMems()
      },

      didSignOut() {
        this.user = null
        this.unbindMems()
        this.reloadMems()
      },

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

        console.log('filterTags', filterTags)

        if (filterTags.length) {
          this.mems = await queryForTaggedMems(
            this.userMemCollection,
            filterTags,
            filterStrategy,
            this.pageSize,
          )
          console.log('tag search', this.mems)
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

      selectTag(tag: string) {
        if (tag && tag.startsWith('#')) {
          let tagValue = tag.slice(1)
          this.$router.push({ path: `/tag/${tagValue}` })
        }

        // if (tag && tag.startsWith('#')) {
        //   this.showTags = [tag]
        // } else if (tag && tag.startsWith('*')) {
        //   this.showArchivedStatus = 'archived'
        // } else {
        //   this.showTags = []
        //   this.showArchivedStatus = 'new'
        // }
        // this.reloadMems()
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
