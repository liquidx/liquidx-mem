import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import { firestorePlugin } from "vuefire";
import { firebaseApp } from "./firebase";

Vue.config.productionTip = false;
Vue.use(firestorePlugin);

Vue.prototype.$firebase = firebaseApp;

new Vue({
  router,
  render: h => h(App)
}).$mount("#app");
