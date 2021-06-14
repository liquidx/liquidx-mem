<template>
  <div class="home">
    <header>
      <h1><a href="/">#mem</a></h1>

      <div v-show="!user" class="signin">
        <input
          type="email"
          v-model="signInEmail"
          class="email"
          name="email"
          placeholder="email"
        />
        <input
          type="password"
          v-model="signInPassword"
          class="password"
          name="password"
        />
        <button class="signin-button" @click="signIn">Sign In</button>
      </div>

      <div v-if="user" v-show="user">Signed in as {{ user.email }}</div>
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
    flex-grow: 0;
    width: 150px;
    min-width: 150px;
    margin-top: 50px;
    max-height: 100vh;

    display: flex;
    flex-direction: column;

    h1 {
      font-size: 1.2rem;
    }

    .signin-button {
      color: white;
      background: black;
    }
  }

  main {
    flex-grow: 1;
  }
}

.add {
  display: flex;
  flex-direction: column;
  width: 40rem;
  padding: 1rem 1rem;
  margin: 1rem 0;

  h2 {
  }

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
  // Typescript declarations.
  $firebase: any; // firebase.app.App

  // Vue data
  mems: Mem[] = [];
  rawInput = "";
  user: firebase.User | null = null;
  signInEmail = "";
  signInPassword = "";

  mounted(): void {
    // this.$firebase
    //   .auth()
    //   .setPersistence(this.$firebase.auth.Auth.Persistence.LOCAL);
    this.$firebase.auth().onAuthStateChanged((user: firebase.User) => {
      this.user = user;
      console.log("Signed in user:", this.user);
    });
  }

  get signedIn(): boolean {
    return !!this.user;
  }

  get orderMems(): Mem[] {
    const mems = this.mems.map((o: Mem) => {
      return Object.assign(o, { addedDate: o.added ? o.added.toDate() : null });
    });
    return orderBy(mems, ["added"], ["desc"]);
  }

  signIn(): void {
    this.$firebase
      .auth()
      .signInWithEmailAndPassword(this.signInEmail, this.signInPassword)
      .then((userCredential: firebase.auth.UserCredential) => {
        console.log("signed in", userCredential);
        this.user = userCredential.user;
      })
      .catch((error: { code: any; message: any }) => {
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(errorCode, errorMessage);
      });
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
