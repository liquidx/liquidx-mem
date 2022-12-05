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
  import { User } from 'firebase/auth'
  import { db } from '../firebase'
  import { Mem } from '../../functions/core/mems'
  import { getUserMemCollection } from '@/lib/mem-data-collection'
  import { addMem } from '@/lib/mem-data-modifiers'
  import type { PropType } from 'vue'

  const state = reactive({
    rawInput: '' as string,
  })

  const props = defineProps({
    user: {
      type: Object as PropType<User | null>,
      required: true,
    },
  })

  const addNewMem = () => {
    if (!props.user) {
      return
    }

    const mem = parseText(state.rawInput)
    // TODO: Probably there's a better way to get milliseconds?
    mem.new = true
    mem.addedMs = DateTime.utc().toMillis()

    let collection = getUserMemCollection(db, props.user)
    addMem(mem, collection).then(() => {
      state.rawInput = ''
    })
  }
</script>
