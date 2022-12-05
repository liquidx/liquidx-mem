<template>
  <div class="p-4 flex flex-col w-full overflow-x-hidden md:flex-row">
    <header class="mt-0 p-2 w-screen md:min-h-screen md:w-48">
      <h1 class="text-md py-2 font-bold text-gray-800"><a href="/">#mem</a></h1>

      <MemAuth @did-sign-in="didSignIn" @did-sign-out="didSignOut"></MemAuth>

      <div class="py-2" v-if="user" v-show="user">
        <ul>
          <li><a class="underline" href="/data">export/import json</a></li>
        </ul>
      </div>
    </header>
    <section
      class="w-screen p-2 md:w-48 text-gray-500 flex flex-row flex-wrap md:flex-col justify-start"
    >
      <a
        class="block p-0.5 whitespace-nowrap"
        href="#"
        @click.prevent="filterBy('')"
        >New</a
      >
      <a
        class="block py-0.5 whitespace-nowrap"
        href="#"
        @click.prevent="filterBy('*archived')"
        >Archived</a
      >
      <a
        v-for="tag in allTags"
        :key="tag.tag"
        class="block p-0.5 whitespace-nowrap"
        href="#"
        @click.prevent="filterBy(tag.tag)"
        >{{ tag.tag }} ({{ tag.count }})</a
      >
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
  import toPairs from 'lodash/toPairs'
  import orderBy from 'lodash/orderBy'
  import { defineComponent } from 'vue'
  import firebase from 'firebase/app'

  import MemAuth from '../components/MemAuth.vue'
  import MemList from '../components/MemList.vue'
  import MemAdd from '../components/MemAdd.vue'

  import { db, unwrapDocs } from '../firebase'
  import { Mem } from '../../functions/core/mems'
  import { parseText, extractEntities } from '../../functions/core/parser'

  type TagIndex = { [field: string]: number }

  export default defineComponent({
    components: {
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
      allTags(): { tag: string; count: number }[] {
        console.log('getAllTags')
        const tags: TagIndex = {}
        this.allMems.forEach((mem: Mem) => {
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

      filterBy(tag: string) {
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

      deleteMem(mem: Mem) {
        this.memsCollection().doc(mem.id).delete()
      },

      annotateMem(mem: Mem) {
        if (!this.user || !this.user.uid) {
          return
        }

        // TODO: make this work for dev too.
        const url = `/api/annotate?user=${this.user.uid}&mem=${mem.id}`
        fetch(url)
          .then(response => response.text())
          .then(response => console.log(response))
      },

      archiveMem(mem: Mem) {
        this.memsCollection().doc(mem.id).update({ new: false })
      },

      updateNoteForMem(changed: { mem: Mem; note: string }) {
        const entities = extractEntities(changed.note)
        const updated = Object.assign({ note: changed.note }, entities)
        this.memsCollection()
          .doc(changed.mem.id)
          .update(updated)
          .then(() => {
            console.log('Updated mem', changed.mem.id, updated)
          })
      },

      updateTitleForMem(changed: { mem: Mem; title: string }) {
        const updated = {
          title: changed.title,
        }
        this.memsCollection()
          .doc(changed.mem.id)
          .update(updated)
          .then(() => {
            console.log('Updated mem', changed.mem.id, updated)
          })
      },

      updateDescriptionForMem(changed: { mem: Mem; description: string }) {
        const updated = {
          description: changed.description,
        }
        this.memsCollection()
          .doc(changed.mem.id)
          .update(updated)
          .then(() => {
            console.log('Updated mem', changed.mem.id, updated)
          })
      },
    },
  })
</script>
