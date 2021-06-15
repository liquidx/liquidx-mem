A structured note-taking service that is designed to simple.

The goal is to have a generalized storage that is easy to add to,
expanding to many different types of data, and facilitating visualizing
and recalling easily.

The input is to be as simple as possible, using only text.

The data is stored in Firebase Firestore as a flat list and all processing
is done using Firebase Functions or in the browser.

# Setup

Instructions to set up for yourself is still work in progress, but the basics are:

1. Setup a Firebase project with Firestore, Hosting and Functions enabled.
   a. Run firebase init and select the above.
   b. Overwrite .firebaserc to use your firebase project.

2. Create a [service account](https://firebase.google.com/docs/admin/setup) for Firebase/Google by following the instructions.

3. Place credentials in `credentials-firebase-web.json` that have the following :
```
{
   "apiKey": "AIza...HY",
   "authDomain": "project-name.firebaseapp.com",
   "projectId": "project-name",
   "storageBucket": "project-name.appspot.com",
   "messagingSenderId": "...",
   "appId": "1:5...:web:62...",
   "measurementId": "G-..."
}
   ```
