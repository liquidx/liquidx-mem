<template>
  <div>
    <mem-add></mem-add>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import { User } from 'firebase/auth'

  defineComponent({
    data() {
      return {
        user: null as User | null,
        text: '',
      }
    },

    onMounted() {
      this.text = 'Hello World'
    },
    methods: {
      onChange() {
        console.log(this.text)
      },
    },
  })
</script>
