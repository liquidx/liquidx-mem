import { unwrapDocs } from '@/firebase'
import { CollectionReference, DocumentData, QueryConstraint, Query, getDocs, query, where, orderBy, limit, WhereFilterOp } from 'firebase/firestore'

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

  if (matchOperator === 'all') {
    // Limitation of Firestore is that we can't combined multple array-contains conditions.
    // So we have to take the first tag and query for that, then filter the results.
    const firstTag = tags[0]
    const q = query(collection, where('tags', 'array-contains', firstTag), orderBy('addedMs', 'desc'), limit(pageSize))
    return getDocs(q).then(unwrapDocs).then(mems => {
      return mems.filter(mem => {
        return tags.every(tag => mem.tags.includes(tag))
      })
    })

  } else {
    const q = query(collection, where('tags', 'array-contains-any', tags), orderBy('addedMs', 'desc'), limit(pageSize))
    return getDocs(q).then(unwrapDocs)
  }
}