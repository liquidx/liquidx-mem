<template>TODO</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Mem } from '../../functions/core/mems'
import { User } from 'firebase/auth'

export default defineComponent({
  name: 'Single',
  props: {
    id: {
      type: String,
      required: true,
    },
    user: {
      type: Object as () => User | null,
      default: null,
    },
  },
  data() {
    return {
      mem: null as Mem | null,
      unsubscribeListener: null as (() => void) | null,
    }
  },
  computed: {
    memId(): string {
      return this.id
    },
  },
  watch: {
    memId() {
      this.fetchMem()
    },
  },
  mounted() {
    this.fetchMem()
  },
  methods: {
    fetchMem() {
      // const memCollection = getUserMemCollection(this.$props.user)
      // const memRef = memCollection.doc(this.memId)
      // const unsubscribe = onSnapshot(memRef, doc => {
      //   this.mem = doc.data() as Mem
      // })
      // this.unsubscribeListener = unsubscribe
    },
  },
  beforeUnmount() {
    if (this.unsubscribeListener) {
      this.unsubscribeListener()
    }
  },
})
</script>