import { createApp } from "vue";
import App from "./App.vue";
import router from "./router/index.js";
import { firebaseApp } from "./firebase";

//import { configureCompat } from 'vue'

// default everything to Vue 3 behavior, and only enable compat
// for certain features
// configureCompat({
//   MODE: 3,
//   ATTR_ENUMERATED_COERCION: false
// })

const app = createApp(App);
app.config.globalProperties.$firebase = firebaseApp;
app.use(router)
app.mount('#app')
