<template>
  <div id="app" class="">
    <div class="p-4 flex flex-col w-full overflow-x-hidden md:flex-row">
      <header class="mt-0 p-2 w-screen md:min-h-screen md:w-48">
        <h1 class="text-md py-2 font-bold text-gray-800">
          <a href="/">#mem</a>
        </h1>

        <div class="py-2" v-if="user" v-show="user">
          <ul>
            <li>
              <router-link to="/" class="underline">Home</router-link>
            </li>
            <li>
              <router-link to="/prefs" class="underline"
                >Preferences</router-link
              >
            </li>
            <li>
              <router-link to="/data" class="underline">Data</router-link>
            </li>
            <li>
              <router-link to="/about" class="underline"
                >Help & About</router-link
              >
            </li>
          </ul>
        </div>

        <mem-auth
          @did-sign-in="didSignIn"
          @did-sign-out="didSignOut"
        ></mem-auth>
      </header>
      <router-view :user="user" />
    </div>
  </div>
</template>

<script lang="ts">
  import { User } from 'firebase/auth'
  import { defineComponent } from 'vue'

  import MemAuth from './components/MemAuth.vue'

  export default defineComponent({
    components: {
      MemAuth,
    },
    data() {
      return {
        user: null as User | null,
      }
    },
    methods: {
      didSignIn(user: User) {
        this.user = user
      },

      didSignOut() {
        this.user = null
      },
    },
  })
</script>
