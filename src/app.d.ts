import type { MongoClient } from "mongodb";

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      mongoClient: MongoClient;
    }
    // interface PageData {}
    // interface Platform {}
  }
}

export {};
