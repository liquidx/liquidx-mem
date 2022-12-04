import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router/index";
import { firebaseApp } from "./firebase";
import './index.css'

const app = createApp(App);
app.config.globalProperties.$firebase = firebaseApp;
app.use(router)
app.mount('#app')
