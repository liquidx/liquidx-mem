import axios from 'axios'
import { Mem } from '../../functions/core/mems'
import { extractEntities } from '../../functions/core/parser'
import { CollectionReference, DocumentData, doc, addDoc, updateDoc, deleteDoc, DocumentReference } from 'firebase/firestore'
import { User } from 'firebase/auth';

//const serverUrl = '/api'
const serverUrl = 'http://localhost:5001/liquidx-mem/us-central1'

export function addMem(mem: Mem, collection: CollectionReference<DocumentData>): Promise<DocumentReference<DocumentData>> {
  return addDoc(collection, mem)
}

export function deleteMem(
  mem: Mem,
  collection: CollectionReference<DocumentData>): Promise<void> {
  return deleteDoc(doc(collection, mem.id))
}

export function annotateMem(mem: Mem, uid: string): void {
  const url = `${serverUrl}/annotate?user=${uid}&mem=${mem.id}`
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
  console.log('updateDescriptionForMem', mem);

  return updateDoc(doc(collection, mem.id), updated).then(() => {
    console.log('Updated mem', mem.id, updated)
  })
}

export async function uploadFilesForMem(
  mem: Mem,
  files: FileList,
  user: User): Promise<void> {

  let authToken = await user.getIdToken()
  if (!authToken) {
    console.error('No auth token')
    return;
  }

  console.log(files)

  await axios({
    url: `${serverUrl}/attach?mem=${mem.id}`,
    method: 'POST',
    data: {
      mem: mem.id,
      'files[]': files,
    },
    headers: {
      "Authorization": `Bearer ${authToken}`,
      "Content-Type": "multipart/form-data",
    },
  })
}