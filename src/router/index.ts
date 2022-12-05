import { createRouter, createWebHistory } from 'vue-router';
import Home from "../views/Home.vue";
import DataPage from "../views/DataPage.vue";
import About from "../views/About.vue";
import Single from '../views/Single.vue';

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home
  },
  {
    path: "/tag/:tags",
    name: "TagList",
    component: Home
  },
  {
    path: "/mem/:id",
    name: "SingleMem",
    component: Single
  },
  {
    path: "/about",
    name: "About",
    component: About
  },
  {
    path: "/data",
    name: "DataPage",
    component: DataPage
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
})

