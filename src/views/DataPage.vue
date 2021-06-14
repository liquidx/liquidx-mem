<template>
  <div class="data">
    <main>
      <h2>Data Tools</h2>
      <p>
        <ul>
          <li><a href="#" @click.prevent="exportData">Export Data as JSON</a> .<a id="download" :href="downloadUrl" v-if="downloadUrl"> ... Download</a></li>
          <li><a href="#" @click.prevent="startImportData">Import Data from JSON</a> 
            <input type="file" id="input" @change="fileSelectionDidChange"  style="display:none">
            <a href="#" v-if="importMems.length" id="finishImport" @click.prevent="finishImport"> ... Import</a>
            </li>
        </ul>
      </p>
    </main>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import firebase from "firebase/app";
import { db } from "../firebase";
import { Mem, memFromJson } from "../../functions/core/mems";

@Component({
  components: {},
})
export default class Home extends Vue {
  // Typescript declarations.
  $firebase: any; // firebase.app.App

  // Vue data
  mems: Mem[] = [];
  downloadUrl = "";
  importMems: Mem[] = [];
  user: firebase.User | null = null;

  mounted(): void {
    // this.$firebase
    //   .auth()
    //   .setPersistence(this.$firebase.auth.Auth.Persistence.LOCAL);
    this.$firebase.auth().onAuthStateChanged((user: firebase.User) => {
      this.user = user;
      this.$bind("mems", this.memsCollection());

      console.log("Signed in user:", this.user.uid);
    });
  }

  get signedIn(): boolean {
    return !!this.user;
  }

  memsCollection(): firebase.firestore.CollectionReference<firebase.firestore.DocumentData> {
    if (!this.user) {
      return db.collection("users").doc("1").collection("mems");
    }
    return db.collection("users").doc(this.user.uid).collection("mems");
  }

  download(url: string): void {
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "data.json";
    document.body.appendChild(a);
    a.click();
  }

  exportData(): void {
    const blob = new Blob([JSON.stringify(this.mems, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    this.download(url);
    window.URL.revokeObjectURL(url);
  }

  startImportData(): void {
    const selectorElement = document.querySelector(
      "#input"
    ) as HTMLInputElement;
    if (selectorElement) {
      selectorElement.click();
    }
  }

  async finishImport(): Promise<void> {
    console.log(this.importMems);
    for (const mem of this.importMems) {
      if (mem.id) {
        await this.memsCollection().doc(mem.id).set(mem);
      } else {
        await this.memsCollection().add(mem);
      }
    }
  }

  fileSelectionDidChange(): void {
    const selectorElement = document.querySelector(
      "#input"
    ) as HTMLInputElement;
    if (selectorElement) {
      const fileList = selectorElement.files;
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
  }
}
</script>