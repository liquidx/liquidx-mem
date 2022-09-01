<template>
  <div class="add">
    <textarea
      v-model="state.rawInput"
      placeholder="Enter text, urls, #tags here."
    />
    <input type="button" value="Add" @click="addNewMem" />
  </div>
</template>

<style lang="scss" scoped>
  @import 'src/layout';
  @import 'src/colors';

  .add {
    display: flex;
    flex-direction: column;
    width: 400px;
    padding: 1rem 1rem;
    margin: 1rem 0;

    input,
    textarea {
      font-family: inherit;
      padding: 0.5rem 0.5rem;
      margin: 0.2rem 0;
      border-radius: 10px;
      border: 1px solid rgb(240, 240, 240);
    }

    textarea {
      height: 4rem;
    }
  }

  @media (max-width: $layout-mobile-width) {
    .add {
      padding: 0 1rem;
      width: 100%;
    }
  }
</style>

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
