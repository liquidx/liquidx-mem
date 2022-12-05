import { unwrapDocs } from '@/firebase'
import { CollectionReference, DocumentData, doc, getDoc, getDocs, query, where, orderBy, limit, WhereFilterOp } from 'firebase/firestore'

export function queryForAllMems(collection: CollectionReference<DocumentData>): Promise<Array<DocumentData>> {
  return getDocs(collection).then(unwrapDocs)
}

export function queryForNewMems(collection: CollectionReference<DocumentData>, pageSize: number): Promise<Array<DocumentData>> {
  const q = query(collection, where('new', '==', true), orderBy('addedMs', 'desc'), limit(pageSize))
  return getDocs(q).then(unwrapDocs)
}

export function queryForArchivedMems(collection: CollectionReference<DocumentData>, pageSize: number): Promise<Array<DocumentData>> {
  const q = query(collection, where('new', '==', false), orderBy('addedMs', 'desc'), limit(pageSize))
  return getDocs(q).then(unwrapDocs)
}

export function queryForTaggedMems(collection: CollectionReference<DocumentData>,
  tags: Array<string>,
  matchOperator: string,
  pageSize: number): Promise<Array<DocumentData>> {
  let whereOperator: WhereFilterOp = 'array-contains-any'
  switch (matchOperator) {
    case 'any':
      whereOperator = 'array-contains-any'
    case 'all':
      whereOperator = 'array-contains'
  }
  const q = query(collection, where('tags', whereOperator, tags), orderBy('addedMs', 'desc'), limit(pageSize))
  return getDocs(q).then(unwrapDocs)
}