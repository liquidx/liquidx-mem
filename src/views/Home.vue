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
  import firebase from 'firebase/app'

  import MemAuth from '../components/MemAuth.vue'
  import MemList from '../components/MemList.vue'
  import MemAdd from '../components/MemAdd.vue'
  import MemTagList from '../components/MemTagList.vue'

  import { db, unwrapDocs } from '../firebase'
  import { Mem } from '../../functions/core/mems'
  import * as memModifiers from '../lib/mem-data-modifiers'

  export default defineComponent({
    components: {
      MemTagList,
      MemAuth,
      MemList,
      MemAdd,
    },

    data() {
      return {
        user: null as firebase.User | null,
        allMems: [] as Mem[],
        mems: [] as Mem[],
        showTags: [] as string[],
        showArchivedStatus: 'new',
        unsubscribeListener: null as (() => void) | null,
        pageSize: 30,
      }
    },

    computed: {
      signedIn() {
        return this.user !== null
      },
    },

    willUnmount() {
      this.unbindMems()
    },

    methods: {
      didSignIn(user: firebase.User) {
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
        this.unsubscribeListener = this.memsCollection().onSnapshot(
          snapshot => {
            this.reloadMems()
          },
        )
      },
      unbindMems() {
        if (this.unsubscribeListener) {
          this.unsubscribeListener()
        }
      },

      async reloadMems() {
        if (this.showTags.length) {
          let q = this.memsCollection()
            .where('tags', 'array-contains-any', this.showTags)
            .orderBy('addedMs', 'desc')

          this.mems = await q
            .limit(this.pageSize)
            .get()
            .then(docs => unwrapDocs(docs))
        } else if (this.showArchivedStatus == 'archived') {
          let q = this.memsCollection()
            .where('new', '==', false)
            .orderBy('addedMs', 'desc')

          this.mems = await q
            .limit(this.pageSize)
            .get()
            .then(docs => unwrapDocs(docs))
        } else {
          let q = this.memsCollection()
            .where('new', '==', true)
            .orderBy('addedMs', 'desc')

          this.mems = await q
            .limit(this.pageSize)
            .get()
            .then(docs => unwrapDocs(docs))
        }

        // Get all the mems.
        this.allMems = await this.memsCollection()
          .get()
          .then(docs => unwrapDocs(docs))
      },

      memsCollection() {
        if (!this.user) {
          return db.collection('users').doc('1').collection('mems')
        }
        return db.collection('users').doc(this.user.uid).collection('mems')
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
          this.showTags = [tag]
        } else if (tag && tag.startsWith('*')) {
          this.showArchivedStatus = 'archived'
        } else {
          this.showTags = []
          this.showArchivedStatus = 'new'
        }
        this.reloadMems()
      },

      annotateMem(mem: Mem): boolean {
        if (!this.user || !this.user.uid) {
          return false
        }

        memModifiers.annotateMem(mem, this.user.uid)
        return true
      },

      deleteMem(mem: Mem): boolean {
        memModifiers.deleteMem(mem, this.memsCollection())
        return true
      },

      archiveMem(mem: Mem): boolean {
        memModifiers.archiveMem(mem, this.memsCollection())
        return true
      },

      updateNoteForMem(mem: Mem, note: string): boolean {
        memModifiers.updateNoteForMem(mem, note, this.memsCollection())
        return true
      },

      updateTitleForMem(mem: Mem, title: string): boolean {
        memModifiers.updateTitleForMem(mem, title, this.memsCollection())
        return true
      },

      updateDescriptionForMem(mem: Mem, description: string): boolean {
        memModifiers.updateDescriptionForMem(
          mem,
          description,
          this.memsCollection(),
        )
        return true
      },
    },
  })
</script>
