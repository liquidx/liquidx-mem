<template>
  <div class="p-4">
    <div>Shared Secret:</div>
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
      }
    },
    watch: {
      user() {
        this.getSecret()
      },
    },
    onMount() {
      if (this.user) {
        this.getSecret()
      }
    },
    methods: {
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
