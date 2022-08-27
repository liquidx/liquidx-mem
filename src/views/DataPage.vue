<template>
  <div class="data">
    <main>
      <h2>Data Tools</h2>
      <p>
        <ul>
          <li>
            <a
              href="#"
              @click.prevent="exportData"
            >Export Data as JSON</a> .<a
              v-if="downloadUrl"
              id="download"
              :href="downloadUrl"
            > ... Download</a>
          </li>
          <li>
            <a
              href="#"
              @click.prevent="startImportData"
            >Import Data from JSON</a> 
            <input
              id="input"
              type="file"
              style="display:none"
              @change="fileSelectionDidChange"
            >
            <a
              v-if="importMems.length"
              id="finishImport"
              href="#"
              @click.prevent="finishImport"
            > ... Import</a>
          </li>
          <li>
            <a
              href="#"
              @click.prevent="markAllAsNew"
            >Mark all mems as new</a>
          </li>
        </ul>
      </p>
    </main>
  </div>
</template>

<script lang="ts">
  import firebase from "firebase/app";
  import { defineComponent } from 'vue'

  import { Mem, memFromJson } from "../../functions/core/mems";
  import { db, unwrapDocs } from '../firebase'

  export default defineComponent({

    data() {
      return {
        mems: [] as Mem[],
        downloadUrl: "",
        importMems: [] as Mem[],
        user: null as firebase.User | null,
      }
    },
    mounted() {
      // this.$firebase
      //   .auth()
      //   .setPersistence(this.$firebase.auth.Auth.Persistence.LOCAL);
      this.$firebase.auth().onAuthStateChanged((user: firebase.User) => {
        this.user = user;
        this.loadMems();
        console.log("Signed in user:", this.user.uid);
      });
    },

    computed: {
      signedIn() {
        return this.user !== null;
      }
    },

    methods: {

      async loadMems() {
        this.mems = await this.memsCollection()
          .get()
          .then(docs => unwrapDocs(docs))
      },

      memsCollection() {
        if (!this.user) {
          return db.collection("users").doc("1").collection("mems");
        }
        return db.collection("users").doc(this.user.uid).collection("mems");
      },

      download(url: string) {
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "data.json";
        document.body.appendChild(a);
        a.click();
      },

      exportData() {
        const blob = new Blob([JSON.stringify(this.mems, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        this.download(url);
        window.URL.revokeObjectURL(url);
      },

      startImportData() {
        const el = document.querySelector("#input");
        if (el) {
          const inputElement = el as HTMLInputElement;
          inputElement.click();
        }
      },

      async finishImport() {
        console.log(this.importMems);
        for (const mem  of this.importMems) {
          if (mem.id) {
            await this.memsCollection().doc(mem.id).set(mem);
          } else {
            await this.memsCollection().add(mem);
          }
        }
      },

      fileSelectionDidChange() {
        const el = document.querySelector( "#input");
        if (el) {
          const fileSelectElement = el as HTMLInputElement;
          const fileList = fileSelectElement.files;
          if (fileList && fileList.length > 0) {
            const file = fileList[0];
            const reader = new FileReader();
            reader.onload = () => {
              if (reader.result) {
                this.importMems = JSON.parse(reader.result.toString()).map(
                  (o: Mem) => memFromJson(o)
                );
                console.log(this.importMems);
              }
            };
            reader.readAsText(file);
          }
        }
      },

      async markAllAsNew() {
        for (const mem of this.mems) {
          if (mem.id) {
            mem.new = true;
            await this.memsCollection().doc(mem.id).set(mem);
          }
        }
        console.log("Done.", this.mems.length);
      }
    }
  });
</script>