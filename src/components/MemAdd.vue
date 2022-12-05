<template>
  <div class="flex flex-col w-full py-1 px-0 md:px-1 m-1">
    <textarea
      v-model="state.rawInput"
      placeholder="Enter text, urls, #tags here."
      class="p-2 m-0.5 rounded-md border border-gray-200 w-full h-16"
    />
    <input
      type="button"
      class="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 m-1 p-2 text-gray-700"
      value="Add"
      @click="addNewMem"
    />
  </div>
</template>

<script lang="ts" setup>
  import { DateTime } from 'luxon'
  import { reactive, defineProps } from 'vue'
  import { parseText } from '../../functions/core/parser'
  import { db } from '../firebase'
  import firebase from 'firebase/app'
  import type { PropType } from 'vue'

  const state = reactive({
    rawInput: '' as string,
  })

  const props = defineProps({
    user: {
      type: Object as PropType<firebase.User | null>,
      required: true,
    },
  })

  const memsCollection = () => {
    let uid = '1'
    if (props.user) {
      uid = props.user.uid
    }

    return db.collection('users').doc(uid).collection('mems')
  }

  const addNewMem = () => {
    const mem = parseText(state.rawInput)
    // TODO: Probably there's a better way to get milliseconds?
    mem.new = true
    mem.addedMs = DateTime.utc().toMillis()
    memsCollection()
      .add(mem)
      .then(() => {
        state.rawInput = ''
      })
  }
</script>
