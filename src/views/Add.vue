<template>
  <div>
    <mem-add :user="user"></mem-add>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'

  defineComponent({
    data() {
      return {
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
