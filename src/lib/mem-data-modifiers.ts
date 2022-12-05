import firebase from 'firebase/app'
import { Mem } from '../../functions/core/mems'
import { extractEntities } from '../../functions/core/parser'
import { CollectionReference, DocumentData, doc, setDoc, addDoc, updateDoc, deleteDoc, DocumentReference } from 'firebase/firestore'

export function addMem(mem: Mem, collection: CollectionReference<DocumentData>): Promise<DocumentReference<DocumentData>> {
  return addDoc(collection, mem)
}

export function deleteMem(
  mem: Mem,
  collection: CollectionReference<DocumentData>): Promise<void> {
  return deleteDoc(doc(collection, mem.id))
}

export function annotateMem(mem: Mem, uid: string): void {
  const url = `/api/annotate?user=${uid}&mem=${mem.id}`
  fetch(url)
    .then(response => response.text())
    .then(response => console.log(response))
}

export function archiveMem(
  mem: Mem,
  collection: CollectionReference<DocumentData>): Promise<void> {
  return updateDoc(doc(collection, mem.id), { new: false })
}

export function updateNoteForMem(
  mem: Mem,
  note: string,
  collection: CollectionReference<DocumentData>): Promise<void> {
  const entities = extractEntities(note)
  const updated = Object.assign({ note: note }, entities)
  return updateDoc(doc(collection, mem.id), updated).then(() => {
    console.log('Updated mem', mem.id, updated)

  })
}

export function updateTitleForMem(
  mem: Mem,
  title: string,
  collection: CollectionReference<DocumentData>): Promise<void> {
  const updated = {
    title: title,
  }
  return updateDoc(doc(collection, mem.id), updated).then(() => {
    console.log('Updated mem', mem.id, updated)
  })

}

export function updateDescriptionForMem(
  mem: Mem, description: string,
  collection: CollectionReference<DocumentData>): Promise<void> {
  const updated = {
    description: description,
  }
  return updateDoc(doc(collection, mem.id), updated).then(() => {
    console.log('Updated mem', mem.id, updated)
  })
}