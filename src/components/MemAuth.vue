<template>
  <div class="py-2">
    <div v-if="user">
      Hi, {{ user.email }}.
      <button class="underline text-color-500" @click="signOutDidClick">
        Sign out
      </button>
    </div>
    <div v-if="!user">
      <input
        v-model="signInEmail"
        type="email"
        class="my-1 p-1 border border-gray-200"
        name="email"
        placeholder="email"
      />
      <input
        v-model="signInPassword"
        type="password"
        class="my-1 p-1 border border-gray-200"
        name="password"
      />
      <button
        class="px-2 py-1 my-1 text-xs bg-gray-800 text-gray-300 hover:bg-gray-600"
        @click="signIn"
      >
        Sign In
      </button>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import {
    User,
    UserCredential,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
  } from 'firebase/auth'

  export default defineComponent({
    data() {
      return {
        user: null as User | null,
        signInEmail: '',
        signInPassword: '',

        unsubscribeListener: null as (() => void) | null,
      }
    },

    emits: {
      didSignIn(user: User) {
        return true
      },
      didSignOut() {
        return true
      },
    },

    mounted() {
      // this.$firebase
      //   .auth()
      //   .setPersistence(this.$firebase.auth.Auth.Persistence.LOCAL);
      const auth = getAuth(this.$firebase)
      onAuthStateChanged(auth, (user: User | null) => {
        this.user = user
        this.$emit('didSignIn', user)
        console.log('Signed in user:', this.user)
      })
    },

    methods: {
      signIn() {
        const auth = getAuth(this.$firebase)
        signInWithEmailAndPassword(auth, this.signInEmail, this.signInPassword)
          .then((userCredential: UserCredential) => {
            console.log('signed in', userCredential)
            this.user = userCredential.user
            this.$emit('didSignIn', this.user)
          })
          .catch((error: { code: any; message: any }) => {
            const errorCode = error.code
            const errorMessage = error.message
            console.log(errorCode, errorMessage)
          })
      },

      signOutDidClick() {
        const auth = getAuth(this.$firebase)
        signOut(auth).then(() => {
          console.log('signed out')
          this.user = null
          this.$emit('didSignOut')
        })
      },
    },
  })
</script>
