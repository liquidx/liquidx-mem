<template>
  <div class="home">
    <header>
      <a href="/">#mem</a>

      <!-- <div v-show="notSignedIn" class="signin">
        <input type="email" class="email" name="email" placeholder="email" />
        <input type="password" class="password" name="password" />
        <a href="#" class="signinButton" @click="signIn">Sign In</a>
      </div>
    <div v-if="!notSignedIn" v-show="!notSignedIn">Signed in as {{ user.email }}</div> -->
    </header>
    <main>
      <div class="add">
        <textarea
          v-model="rawInput"
          placeholder="Enter text, urls, #tags here."
        >
        </textarea>
        <input type="button" value="Add" @click="addNewMem" />
      </div>
      <mem-row
        v-for="mem in orderMems"
        :key="mem.id"
        :mem="mem"
        @delete="deleteMem"
      />
    </main>
  </div>
</template>

<style lang="scss" scoped>
.home {
  display: flex;
  flex-direction: row;
  min-height: 100vh;

  header {
    width: 200px;
    max-height: 100vh;
    flex-grow: none;

    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}

.add {
  display: flex;
  flex-direction: column;
  width: 40rem;
  padding: 1rem 1rem;
  margin: 1rem 0;
  border: 1px solid rgb(240, 240, 240);

  h2 {
  }

  input,
  textarea {
    font-family: inherit;
    padding: 0.2rem 0.5rem;
    margin: 0.2rem 0;
  }

  textarea {
    height: 4rem;
  }
}
</style>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import MemRow from "@/components/MemRow.vue";

import firebase from "firebase/app";
import orderBy from "lodash/orderBy";
import { db } from "../firebase";
import { Mem } from "../../functions/core/mems";
import { parseText } from "../../functions/core/parser";

@Component({
  components: {
    MemRow,
  },
  firestore: {
    mems: db.collection("users").doc("1").collection("mems"),
  },
})
export default class Home extends Vue {
  mems: Mem[] = [];
  rawInput = "";
  // user = null;

  // mounted() {
  //   this.$firebase.auth().setPersistence(this.$firebase.auth.Auth.Persistence.LOCAL);
  //   this.$firebase.auth().onAuthStateChanged((user) => {
  //     // https://firebase.google.com/docs/reference/js/firebase.User
  //     this.user = user;
  //     console.log('Signed in user:', this.user);
  //   });
  // }

  // get signedIn() : boolean {
  //   return !!this.user;
  // }

  get orderMems(): Mem[] {
    const mems = this.mems.map((o: Mem) => {
      return Object.assign(o, { addedDate: o.added ? o.added.toDate() : null });
    });
    return orderBy(mems, ["added"], ["desc"]);
  }

  memsCollection(): firebase.firestore.CollectionReference<firebase.firestore.DocumentData> {
    return db.collection("users").doc("1").collection("mems");
  }

  addNewMem(): void {
    const mem = parseText(this.rawInput);
    mem.added = firebase.firestore.Timestamp.fromDate(new Date());
    this.memsCollection()
      .add(mem)
      .then(() => {
        this.rawInput = "";
      });
  }

  deleteMem(mem: Mem): void {
    this.memsCollection().doc(mem.id).delete();
  }
}
</script>
