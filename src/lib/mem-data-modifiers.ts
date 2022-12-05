import firebase from 'firebase/app'
import { Mem } from '../../functions/core/mems'
import { extractEntities } from '../../functions/core/parser'

export function deleteMem(
  mem: Mem,
  collection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>): Promise<void> {
  return collection.doc(mem.id).delete()
}

export function annotateMem(mem: Mem, uid: string): void {
  const url = `/api/annotate?user=${uid}&mem=${mem.id}`
  fetch(url)
    .then(response => response.text())
    .then(response => console.log(response))
}

export function archiveMem(
  mem: Mem,
  collection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>): Promise<void> {
  return collection.doc(mem.id).update({ new: false })
}

export function updateNoteForMem(
  mem: Mem,
  note: string,
  collection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>): Promise<void> {
  const entities = extractEntities(note)
  const updated = Object.assign({ note: note }, entities)
  return collection
    .doc(mem.id)
    .update(updated)
    .then(() => {
      console.log('Updated mem', mem.id, updated)
    })
}

export function updateTitleForMem(
  mem: Mem,
  title: string,
  collection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>): Promise<void> {
  const updated = {
    title: title,
  }
  return collection
    .doc(mem.id)
    .update(updated)
    .then(() => {
      console.log('Updated mem', mem.id, updated)
    })
}

export function updateDescriptionForMem(
  mem: Mem, description: string,
  collection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>): Promise<void> {
  const updated = {
    description: description,
  }
  return collection
    .doc(mem.id)
    .update(updated)
    .then(() => {
      console.log('Updated mem', mem.id, updated)
    })
}