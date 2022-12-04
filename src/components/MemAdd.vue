<template>
  <div class="flex flex-col w-full md:w-64 py-1 px-0 md:px-1 m-1">
    <textarea
      v-model="state.rawInput"
      placeholder="Enter text, urls, #tags here."
      class="p-0.5 m-0.5 rounded-md border-gray-800 h-16"
    />
    <input type="button" value="Add" @click="addNewMem" />
  </div>
</template>

<script lang="ts" setup>
  import { DateTime } from 'luxon'
  import { reactive, defineProps } from 'vue'
  import { parseText } from '../../functions/core/parser'
  import { db } from '../firebase'

  const state = reactive({
    rawInput: '' as string,
  })

  const props = defineProps({
    user: {
      type: Object,
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
