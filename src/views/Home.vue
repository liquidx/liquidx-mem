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

      <div v-if="user" class="functions">
        <a href="/data">export/import json</a>
      </div>
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
      <div class="tags">
        <a class="tag" href="#" @click.prevent="filterBy('')">New</a>
        <a class="tag" href="#" @click.prevent="filterBy('#art')">#art</a>
        <a class="tag" href="#" @click.prevent="filterBy('#code')">#code</a>
        <a class="tag" href="#" @click.prevent="filterBy('#work')">#work</a>
        <a class="tag" href="#" @click.prevent="filterBy('#place')">#place</a>
        <a class="tag" href="#" @click.prevent="filterBy('#podcast')"
          >#podcast</a
        >
        <a class="tag" href="#" @click.prevent="filterBy('#hongkong')"
          >#hongkong</a
        >
      </div>
      <mem-list
        :mems="mems"
        @archive="archiveMem"
        @delete="deleteMem"
        @annotate="annotateMem"
        @note-changed="updateNoteForMem"
      />
    </main>
  </div>
</template>

<style lang="scss" scoped>
@import "src/layout";

.functions {
  margin: 1rem 0;
}

.tags {
  margin: 1rem 1rem;

  .tag {
    margin-right: 0.5rem;
    color: rgb(200, 200, 200);
  }
}

.home {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
  width: 100vw;

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
      a {
        text-decoration: none;
      }
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
  .home {
    flex-direction: column;
    width: 100vw;
    header {
      margin-top: 0;
      padding: 1rem 2rem;
      min-width: 100vw;
      width: 100vw;
    }
    main {
      max-width: 100vw;
    }
  }

  .add {
    width: 80vw;
  }
}
</style>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { DateTime } from "luxon";
import firebase from "firebase/app";

import MemList from "@/components/MemList.vue";

import { db } from "../firebase";
import { Mem } from "../../functions/core/mems";
import { parseText, extractTags } from "../../functions/core/parser";

@Component({
  components: {
    MemList,
  },
})
export default class Home extends Vue {
  // Typescript declarations.
  $firebase: any; // firebase.app.App

  // Vue data
  mems: Mem[] = [];
  rawInput = "";

  // sign in.
  user: firebase.User | null = null;
  signInEmail = "";
  signInPassword = "";

  // filters.
  showTags: string[] = [];

  mounted(): void {
    // this.$firebase
    //   .auth()
    //   .setPersistence(this.$firebase.auth.Auth.Persistence.LOCAL);
    this.$firebase.auth().onAuthStateChanged((user: firebase.User) => {
      this.user = user;
      this.reloadMems();
      console.log("Signed in user:", this.user);
    });
  }

  reloadMems(): void {
    //this.$unbind("mems");
    if (this.showTags.length) {
      this.$bind(
        "mems",
        this.memsCollection().where("tags", "array-contains-any", this.showTags)
      );
    } else {
      this.$bind("mems", this.memsCollection().where("new", "==", true));
    }
  }

  get signedIn(): boolean {
    return !!this.user;
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
    if (!this.user) {
      return db.collection("users").doc("1").collection("mems");
    }
    return db.collection("users").doc(this.user.uid).collection("mems");
  }

  filterBy(tag: string): void {
    if (tag) {
      this.showTags = [tag];
    } else {
      this.showTags = [];
    }
    this.reloadMems();
  }

  addNewMem(): void {
    const mem = parseText(this.rawInput);
    // TODO: Probably there's a better way to get milliseconds?
    mem.new = true;
    mem.addedMs = DateTime.utc().toMillis();
    this.memsCollection()
      .add(mem)
      .then(() => {
        this.rawInput = "";
      });
  }

  deleteMem(mem: Mem): void {
    this.memsCollection().doc(mem.id).delete();
  }

  annotateMem(mem: Mem): void {
    if (!this.user || !this.user.uid) {
      return;
    }

    fetch(`/api/annotate?user=${this.user.uid}&mem=${mem.id}`)
      .then((response) => response.text())
      .then((response) => console.log(response));
  }

  archiveMem(mem: Mem): void {
    this.memsCollection().doc(mem.id).update({ new: false });
  }

  updateNoteForMem(changed: { mem: Mem; note: string }): void {
    //const updated = Object.assign({}, mem, {note: note, id: undefined});
    const updated = {
      note: changed.note,
      tags: extractTags(changed.note),
    };
    this.memsCollection()
      .doc(changed.mem.id)
      .update(updated)
      .then(() => {
        console.log("Updated mem", changed.mem.id, updated);
      });
  }
}
</script>
