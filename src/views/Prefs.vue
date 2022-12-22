<template>
  <div class="p-4">
    <div class="mb-4">
      <div class="font-bold">Shared Secret:</div>
    <div>
      <input
        type="text"
        v-model="writeSecret"
        class="my-1 px-2 py-1 border border-gray-200"
      />
      <button
        class="mx-2 px-2 py-1 bg-gray-200 active:bg-gray-400"
        @click="saveSecret"
      >
        Save
      </button>
    </div>
    </div>
   
    <div class="mb-4">
      <div class="font-bold">Views</div>
    <div v-for="(view, index) in views" :key="index">
      <input
        type="text"
        :value="view"
        class="my-1 px-2 py-1 border border-gray-200"
      />
      <button class="mx-2 px-2 py-1 bg-gray-200 active:bg-gray-400" @click="deleteView(index)">Delete</button>

      </div>
    </div>
    <div class="flex flex-row">
      <input type="text" v-model="newView" class="my-1 px-2 py-1 border border-gray-200" />
      <button class="mx-2 px-2 py-1 bg-gray-200 active:bg-gray-400" @click="addView">Add</button>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'

  import {
    getFirestore,
    collection,
    doc,
    getDoc,
    updateDoc,
  } from 'firebase/firestore'

  import { getViews } from '../lib/prefs-get'

  // Types
  import { User } from 'firebase/auth'

  export default defineComponent({
    props: {
      user: {
        type: Object as () => User | null,
        default: null,
      },
    },
    data() {
      return {
        writeSecret: '',
        views: [] as string[],
        newView: '',
      }
    },
    watch: {
      user() {
        this.getSecret()
        this.getViews()
      },
    },
    mounted() {
      console.log('Mounted')
      if (this.user) {
        this.getSecret()
        this.getViews()
      }
    },
    methods: {
      getViews() {
        if (this.user) {
          let db = getFirestore(this.$firebase)
          getViews(this.user.uid, db).then(result => {
            if (result) {
              this.views = result
            }
          })
        }
      },
      saveViews() {
        if (this.user) {
          console.log('saveViews')
          let db = getFirestore(this.$firebase)
          let prefsCollection = collection(
            doc(collection(db, 'users'), this.user.uid),
            'prefs',
          )
          let viewsDoc = doc(prefsCollection, 'views')
          updateDoc(viewsDoc, {
            views: this.views,
          })
          console.log('updated views')
        }
      },
      addView() {
        this.views.push(this.newView)
        this.newView = ''
        this.saveViews()
      },
      deleteView(index: number) {
        this.views.splice(index, 1)
        this.saveViews()
      },
      getSecret() {
        if (this.user) {
          console.log('getSecret')
          let db = getFirestore(this.$firebase)
          let prefsCollection = collection(
            doc(collection(db, 'users'), this.user.uid),
            'prefs',
          )
          let secretsDoc = doc(prefsCollection, 'secrets')
          getDoc(secretsDoc)
            .then(doc => {
              if (doc.exists()) {
                let secrets = doc.data()
                if (secrets.writeSecret) {
                  this.writeSecret = secrets.writeSecret
                }
              } else {
                // doc.data() will be undefined in this case
                console.log('No such document!')
              }
            })
            .catch(error => {
              console.log('Error getting document:', error)
            })
        }
      },
      saveSecret() {
        if (this.user) {
          console.log('getSecret')
          let db = getFirestore(this.$firebase)
          let prefsCollection = collection(
            doc(collection(db, 'users'), this.user.uid),
            'prefs',
          )
          let secretsDoc = doc(prefsCollection, 'secrets')
          updateDoc(secretsDoc, {
            writeSecret: this.writeSecret,
          })
          console.log('updated secret')
        }
      },
    },
  })
</script>
