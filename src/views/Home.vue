<template>
  <div class="flex flex-col w-full overflow-x-hidden md:flex-row">
    <section>
      <mem-tag-list :mems="allMems" :views="savedViews" :currentView="currentView"></mem-tag-list>
    </section>

    <main class="p-2 max-w-screen flex-grow md:max-w-xl">
      <mem-add :user="user"></mem-add>

      <mem-list
        :mems="visibleMems"
        @archive="archiveMem"
        @delete="deleteMem"
        @annotate="annotateMem"
        @note-changed="updateNoteForMem"
        @title-changed="updateTitleForMem"
        @description-changed="updateDescriptionForMem"
      />
      <div class="w-full flex flex-row justify-between m-1" >
        <button v-if="moreMemsAvailable" @click.prevent="nextPage" class="px-6 py-1 rounded-xl bg-gray-700 text-gray-100 font-bold hover:bg-gray-400">More &gt;</button>
        <div v-else class="">That's it.</div>
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
    Query
  } from 'firebase/firestore'

  import { unwrapDocs } from '@/firebase'

  import MemList from '../components/MemList.vue'
  import MemAdd from '../components/MemAdd.vue'
  import MemTagList from '../components/MemTagList.vue'

  import { Mem } from '../../functions/core/mems'
  import * as memModifiers from '../lib/mem-data-modifiers'
  import { getViews } from '@/lib/prefs-get'

  import {
    queryForAllMems,
    queryForNewMems,
    queryForArchivedMems,
    executeQueryForTaggedMems,
    executeQuery,
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

        visiblePages: 1,

        currentViewQuery: null as Query | null, 
        currentView: '',
        savedViews: [] as string[],
      }
    },

    watch: {
      $route(to, from) {
        this.updateCurrentView(to)
        this.loadMems()
      },

      user() {
        this.loadViews()
        this.loadMems()
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
      visibleMems() : Mem[] {
        if (this.mems) {
          return this.mems.slice(0, this.pageSize * this.visiblePages)
        }
        return []
      },

      moreMemsAvailable() : boolean {
        return this.visibleMems.length < this.mems.length
      }
    },

    mounted() {
      if (this.user) {
        this.loadViews()
        this.loadMems()
      }
      this.updateCurrentView(this.$route)
    },

    beforeUnmount() {
      this.unsubscribeChanges()
    },

    methods: {
      updateCurrentView(route: any) {
        if (
          route &&
          route.params.tags &&
          typeof route.params.tags === 'string'
        ) {
          this.currentView = route.params.tags
        } else {
          this.currentView = ''
        }
      },
      subscribeChanges() {
        this.unsubscribeChanges();

        if (this.currentViewQuery) {
          this.unsubscribeListener = onSnapshot(this.currentViewQuery, (snapshot) => {
            this.mems = unwrapDocs(snapshot)
          })
        }
      },
      unsubscribeChanges() {
        if (this.unsubscribeListener) {
          this.unsubscribeListener()
          this.unsubscribeListener = null;
        }
      },

      async loadViews() {
        if (this.user) {
          getViews(this.user.uid, getFirestore(this.$firebase)).then(views => {
            if (views) {
              this.savedViews = views
            }
          })
        }
      },

      async loadMems() {
        console.log('Calling loadMems')
        if (!this.userMemCollection) {
          this.allMems = []
          this.mems = []
          this.visibleMems = []
          return
        }

        let filterTags = [] as string[]
        let filterStrategy = 'any'
        if (this.currentView) {
          let tags = this.currentView
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
          this.mems = await executeQueryForTaggedMems(
            this.userMemCollection,
            filterTags,
            filterStrategy,
            0,
          )
          //this.visibleMems = this.mems.slice(0, this.pageSize)
          this.visiblePages = 1
        } else if (this.showArchivedStatus == 'archived') {
          this.currentViewQuery = await queryForArchivedMems(
            this.userMemCollection,
            this.pageSize,
          )
          this.subscribeChanges()
          this.mems = await executeQuery(this.currentViewQuery)
          //this.visibleMems = this.mems.slice(0, this.pageSize)
          this.visiblePages = 1

        } else {
          this.currentViewQuery = queryForNewMems(
            this.userMemCollection,
            this.pageSize,
          )
          this.subscribeChanges()
          this.mems = await executeQuery(this.currentViewQuery)
          //this.visibleMems = this.mems.slice(0, this.pageSize)
          this.visiblePages = 1
        }

        // Get all the mems.
        let allQuery = queryForAllMems(this.userMemCollection)
        this.allMems = await executeQuery(allQuery)
      },

      nextPage() {
        this.visiblePages++
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
