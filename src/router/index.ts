import { createRouter, createWebHistory } from 'vue-router';
import Home from "../views/Home.vue";
import DataPage from "../views/DataPage.vue";
import About from "../views/About.vue";
import Single from '../views/Single.vue';
import Prefs from '../views/Prefs.vue';

const routes = [
  {
    path: "/",
    name: "home",
    component: Home
  },
  {
    path: "/tag/:tags",
    name: "tag",
    component: Home
  },
  {
    path: "/archive",
    name: "archive",
    component: Home
  },
  {
    path: "/mem/:id",
    name: "mem",
    component: Single
  },
  {
    path: "/about",
    name: "about",
    component: About
  },
  {
    path: "/data",
    name: "data",
    component: DataPage
  },
  {
    path: "/prefs",
    name: "prefs",
    component: Prefs
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
})

