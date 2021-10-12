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
    <section class="summary">
      <a class="tag" href="#" @click.prevent="filterBy('')">New</a>
      <a class="tag" href="#" @click.prevent="filterBy('*archived')"
        >Archived</a
      >
      <a
        v-for="tag in allTags"
        :key="tag"
        class="tag"
        href="#"
        @click.prevent="filterBy(tag.tag)"
        >{{ tag.tag }} ({{tag.count}})</a
      >
    </section>
    <main>
      <div class="add">
        <textarea
          v-model="rawInput"
          placeholder="Enter text, urls, #tags here."
        >
        </textarea>
        <input type="button" value="Add" @click="addNewMem" />
      </div>

      <mem-list
        :mems="mems"
        @archive="archiveMem"
        @delete="deleteMem"
        @annotate="annotateMem"
        @note-changed="updateNoteForMem"
        @title-changed="updateTitleForMem"
        @description-changed="updateDescriptionForMem"
      />
    </main>
  </div>
</template>

<style lang="scss" scoped>
@import "src/layout";
@import "src/colors";

.functions {
  margin: 1rem 0;
}

header {
  flex-grow: 0;
  width: 200px;
  min-width: 200px;
  max-height: 100vh;
  font-size: 0.9rem;

  padding: 5rem 1rem 1rem 2rem;

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

section.summary {
  display: block;
  flex-grow: 0;

  width: 200px;
  min-width: 200px;
  max-height: 100vh;

  padding: 5rem 1rem 1rem 1rem;

  a.tag {
    display: block;
    margin-right: 0.5rem;
    color: $color-grey;
  }
}

main {
  flex-grow: 1;
  padding: 2rem 1rem;
}

.home {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
  width: 100vw;
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
    overflow-x: hidden;
  }

  header {
    margin-top: 0;
    padding: 1rem 2rem;
    min-width: 100vw;
    max-width: 100vw;
    width: 100vw;
  }

  section.summary {
    min-width: 100vw;
    max-width: 100vw;
    width: 100vw;

    padding: 1rem 2rem;

    a.tag {
      display: inline-block;
    }
  }

  main {
    padding: 1rem 1rem;
    max-width: 100vw;
  }

  .add {
    padding: 0 1rem;
    width: 100%;
  }
}
</style>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { DateTime } from "luxon";
import toPairs from "lodash/toPairs";
import orderBy from "lodash/orderBy";
import firebase from "firebase/app";

import MemList from "@/components/MemList.vue";

import { db } from "../firebase";
import { Mem } from "../../functions/core/mems";
import { parseText, extractEntities } from "../../functions/core/parser";

@Component({
  components: {
    MemList,
  },
})
export default class Home extends Vue {
  // Typescript declarations.
  $firebase: any; // firebase.app.App

  // Vue data
  allMems: Mem[] = [];
  mems: Mem[] = [];
  config: Record<string, any> = {};
  rawInput = "";

  // sign in.
  user: firebase.User | null = null;
  signInEmail = "";
  signInPassword = "";

  // filters.
  showTags: string[] = [];
  showArchivedStatus = "new";

  mounted(): void {
    // this.$firebase
    //   .auth()
    //   .setPersistence(this.$firebase.auth.Auth.Persistence.LOCAL);
    this.$firebase.auth().onAuthStateChanged((user: firebase.User) => {
      this.user = user;
      this.reloadMems();
      this.$bind("config", db.collection("users").doc(this.user.uid));
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
    } else if (this.showArchivedStatus == "archived") {
      this.$bind("mems", this.memsCollection().where("new", "==", false));
    } else {
      this.$bind("mems", this.memsCollection().where("new", "==", true));
    }

    this.$bind("allMems", this.memsCollection());
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

  // computed proper
  get allTags(): Array<Record<string, any>> {
    console.log("getAllTags");
    let tags: Record<string, number> = {};
    this.allMems.forEach((mem) => {
      if (mem.tags) {
        for (const tag of mem.tags) {
          tags[tag] = tags[tag] ? tags[tag] + 1 : 1;
        }
      }
    });

    return orderBy(toPairs(tags), [1], ['desc']).map(o => ({
      tag: o[0],
      count: o[1]
    }));
  }

  filterBy(tag: string): void {
    if (tag && tag.startsWith("#")) {
      this.showTags = [tag];
    } else if (tag && tag.startsWith("*")) {
      this.showArchivedStatus = "archived";
    } else {
      this.showTags = [];
      this.showArchivedStatus = "new";
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
    const entities = extractEntities(changed.note);
    const updated = Object.assign({ note: changed.note }, entities);
    this.memsCollection()
      .doc(changed.mem.id)
      .update(updated)
      .then(() => {
        console.log("Updated mem", changed.mem.id, updated);
      });
  }

  updateTitleForMem(changed: { mem: Mem; title: string }): void {
    const updated = {
      title: changed.title,
    };
    this.memsCollection()
      .doc(changed.mem.id)
      .update(updated)
      .then(() => {
        console.log("Updated mem", changed.mem.id, updated);
      });
  }

  updateDescriptionForMem(changed: { mem: Mem; description: string }): void {
    const updated = {
      description: changed.description,
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
