A note-taking service that is designed to simple.

The goal is to have a generalized storage that is easy to add to,
expanding to many different types of data, and facilitating visualizing
and recalling easily.

# Purpose

This is a free-form note taking service that serves allows you to
collect content from all over the internet and save it into
a storage system that you can easily import, export and modify.

Exposes a minimal interface to browse the notes, aggregate them,
edit them and visualize them. You should be able to export
groups, recombine these with other data to create content useful
to you.

# Aspiration

I want to be able to save the notes from any device, from any app
into this.
I want to be able to use this as a read-it-later-type
service.
I want to be able to collect content of a specific topic, or
a specific type and visualize it.
I want to be able to take many places and visualize it in a map.
I want to be able to take many pictures and visualize it as a photo grid.
I want to be able to take many articles and visualize it in a timeline.

# Principles

Input needs to be extremely simple. The only thing you need is
just put some text in the box. It should figure out what you
are trying to input rather than have you select it.

Input needs to be automated. You should be able to pipe notes
into the system from many different places if you have a
tiny bit of programming skill.

Data is fully exportable, modifyable and importable. The data
is exportable into something that is useful, allowing you
to do other things with it outside of the service.

# How it works

Each note is called a `mem`. All the mems are stored in a Firebase Firestore.

All mems are post-processed after storage using Cloud Functions, annotated
using OpenGraph headers, or specialized annotators for services like Twitter.

Data is exported as a flat JSON file through a web browser, or can be imported.

# Migration from Firebase to MongoDB

In 2024, Mem is being migrated from Firebase Firestore to MongoDB and from Firebase
Functions to regular SvelteKit functions.

We keep using Firebase Authentication, but all other functions are going to be migrated
to S3 compatible storage and MongoDB.

# Setup (Work in Progress)

Instructions to set up for yourself is still work in progress, but the basics are:

1. Setup a Firebase project Authentication enabled.
   a. Run firebase init and select the above.
   b. Overwrite .firebaserc to use your firebase project.

2. Create a [service account](https://firebase.google.com/docs/admin/setup) for Firebase/Google by following the instructions.

3. Place credentials in `.env` that have the following :

```
MEM_FIREBASE_ADMIN_KEY='{
   "apiKey": "AIza...HY",
   "authDomain": "project-name.firebaseapp.com",
   "projectId": "project-name",
   "storageBucket": "project-name.appspot.com",
   "messagingSenderId": "...",
   "appId": "1:5...:web:62...",
   "measurementId": "G-..."
}'
MONGO_DB_USERNAME='...'
MONGO_DB_PASSWORD='...'

S3_ACCESS_KEY="..."
S3_SECRET_KEY="..."
S3_BUCKET="..."
S3_REGION="..."
S3_SERVICE_URL="https://s3.ap-northeast-1...."


```

# Development

## Frontend

Frontend is written in Vue 3 with Typescript and Vite.

```
npm run dev
```

## Backend

Backend is using Firebase Functions and Firebase Firestore.

```
cd functions
npm run dev

# To run local cloud functions emulator
npm run server

# To run certain test commands locally
node tool.cjs
```

# Deployment

```
npm run build
npm run deploy

# Deploy Cloud Functions
cd functions
npm run deploy
```

# Editor

## Visual Studio Code

When using Visual Studio Code, install Volar and Typescript for Volar extensions.

# Unit Testing

`functions/test`

```
# Run all tests
npx mocha --reporter spec
# Run all twitter tests
npm run build && npx mocha --grep twitter
```

# Administration

Admin tool exists in `function/tool.mjs`

```
cd functions
# Gets all the mems
node tool.cjs get-all
# Mirrors any media that are on the mems to our own cloud storage
node tools.cjs mirror-all
```

# Database

## MongoDB

- For full text search to work, text indexes need to be me created:
  - https://www.digitalocean.com/community/tutorials/how-to-perform-full-text-search-in-mongodb
  - https://www.mongodb.com/docs/manual/tutorial/text-search-in-aggregation/
