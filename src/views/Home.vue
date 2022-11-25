<template>
  <div class="home">
    <header>
      <h1><a href="/">#mem</a></h1>

      <div v-show="!user" class="signin">
        <input
          v-model="signInEmail"
          type="email"
          class="email"
          name="email"
          placeholder="email"
        />
        <input
          v-model="signInPassword"
          type="password"
          class="password"
          name="password"
        />
        <button class="signin-button" @click="signIn">Sign In</button>
      </div>

      <div v-if="user" v-show="user">Signed in as {{ user.email }}</div>

      <div v-if="user" class="functions">
        <a href="/data">export/import json</a>
      </div>
    </header>
    <section class="summary">
      <a class="tag" href="#" @click.prevent="filterBy('')">New</a>
      <a class="tag" href="#" @click.prevent="filterBy('*archived')"
        >Archived</a
      >
      <a
        v-for="tag in allTags"
        :key="tag.tag"
        class="tag"
        href="#"
        @click.prevent="filterBy(tag.tag)"
        >{{ tag.tag }} ({{ tag.count }})</a
      >
    </section>
    <main>
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
      <div class="pager">
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

  import MemList from '../components/MemList.vue'
  import MemAdd from '../components/MemAdd.vue'

  import { db, unwrapDocs } from '../firebase'
  import { Mem } from '../../functions/core/mems'
  import { parseText, extractEntities } from '../../functions/core/parser'

  type TagIndex = { [field: string]: number }

  export default defineComponent({
    components: {
      MemList,
      MemAdd,
    },

    data() {
      return {
        user: null as firebase.User | null,
        signInEmail: '',
        signInPassword: '',
        allMems: [] as Mem[],
        mems: [] as Mem[],
        showTags: [] as string[],
        showArchivedStatus: 'new',
        unsubscribeListener: null as (() => void) | null,
        nextQuery: undefined as firebase.firestore.Query | undefined,
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

    mounted() {
      // this.$firebase
      //   .auth()
      //   .setPersistence(this.$firebase.auth.Auth.Persistence.LOCAL);
      this.$firebase.auth().onAuthStateChanged((user: firebase.User) => {
        this.user = user
        this.bindMems()
        this.reloadMems()

        console.log('Signed in user:', this.user)
      })
    },
    methods: {
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
      nextCursor(
        subQuery: firebase.firestore.Query,
        docs: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>[],
      ): firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>[] {
        let q = subQuery
        if (docs.size > 0) {
          this.nextQuery = q.startAt(docs.docs[docs.size - 1])
        } else {
          this.nextQuery = undefined
        }
        return docs
      },
      async reloadMems() {
        if (this.showTags.length) {
          let q = this.memsCollection()
            .where('tags', 'array-contains-any', this.showTags)
            .orderBy('addedMs', 'desc')
          if (this.nextQuery) {
            q = this.nextQuery
          }
          this.mems = await q
            .limit(this.pageSize)
            .get()
            .then(docs => unwrapDocs(docs))
        } else if (this.showArchivedStatus == 'archived') {
          let q = this.memsCollection()
            .where('new', '==', false)
            .orderBy('addedMs', 'desc')
          if (this.nextQuery) {
            q = this.nextQuery
          }
          this.mems = await q
            .limit(this.pageSize)
            .get()
            .then(docs => unwrapDocs(docs))
        } else {
          let q = this.memsCollection()
            .where('new', '==', true)
            .orderBy('addedMs', 'desc')
          if (this.nextQuery) {
            q = this.nextQuery
          }
          this.mems = await q
            .limit(this.pageSize)
            .get()
            .then(docs => unwrapDocs(docs))
        }
        this.allMems = await this.memsCollection()
          .get()
          .then(docs => unwrapDocs(docs))
      },

      signIn() {
        this.$firebase
          .auth()
          .signInWithEmailAndPassword(this.signInEmail, this.signInPassword)
          .then((userCredential: firebase.auth.UserCredential) => {
            console.log('signed in', userCredential)
            this.user = userCredential.user
          })
          .catch((error: { code: any; message: any }) => {
            const errorCode = error.code
            const errorMessage = error.message
            console.log(errorCode, errorMessage)
          })
      },

      memsCollection() {
        if (!this.user) {
          return db.collection('users').doc('1').collection('mems')
        }
        return db.collection('users').doc(this.user.uid).collection('mems')
      },

      // computed proper

      prevPage() {
        this.nextQuery = undefined
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

<style lang="scss" scoped>
  @import 'src/layout';
  @import 'src/colors';

  .functions {
    margin: 1rem 0;
  }

  header {
    flex-grow: 0;
    width: 200px;
    min-width: 200px;
    max-height: 100vh;
    font-size: 0.9rem;

    padding: 5rem 1rem 1rem 2rem;

    display: flex;
    flex-direction: column;

    h1 {
      font-size: 1.2rem;
      a {
        text-decoration: none;
      }
    }

    .signin-button {
      color: white;
      background: black;
    }
  }

  section.summary {
    display: block;
    flex-grow: 0;

    width: 200px;
    min-width: 200px;
    max-height: 100vh;

    padding: 5rem 1rem 1rem 1rem;

    a.tag {
      display: block;
      margin-right: 0.5rem;
      color: $color-grey;
    }
  }

  main {
    flex-grow: 1;
    padding: 2rem 1rem;
  }

  .home {
    display: flex;
    flex-direction: row;
    min-height: 100vh;
    width: 100vw;
  }

  .add {
    display: flex;
    flex-direction: column;
    width: 400px;
    padding: 1rem 1rem;
    margin: 1rem 0;

    input,
    textarea {
      font-family: inherit;
      padding: 0.5rem 0.5rem;
      margin: 0.2rem 0;
      border-radius: 10px;
      border: 1px solid rgb(240, 240, 240);
    }

    textarea {
      height: 4rem;
    }
  }

  .pager {
    width: 400px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin: 1rem 0;
  }

  @media (max-width: $layout-mobile-width) {
    .home {
      flex-direction: column;
      width: 100vw;
      overflow-x: hidden;
    }

    header {
      margin-top: 0;
      padding: 1rem 2rem;
      min-width: 100vw;
      max-width: 100vw;
      width: 100vw;
    }

    section.summary {
      min-width: 100vw;
      max-width: 100vw;
      width: 100vw;

      padding: 1rem 2rem;

      a.tag {
        display: inline-block;
      }
    }

    main {
      padding: 1rem 1rem;
      max-width: 100vw;
    }

    .add {
      padding: 0 1rem;
      width: 100%;
    }
  }
</style>
