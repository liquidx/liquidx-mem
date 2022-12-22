import { unwrapDocs } from '@/firebase'
import { CollectionReference, DocumentData, QueryConstraint, Query, getDocs, query, where, orderBy, limit, WhereFilterOp } from 'firebase/firestore'

export function queryForAllMems(collection: CollectionReference<DocumentData>): Query {
  return query(collection, orderBy('addedMs', 'desc'))
}

export function queryForNewMems(collection: CollectionReference<DocumentData>, pageSize: number): Query {
  let constraints : QueryConstraint[] = []
  constraints.push(where('new', '==', true))
  constraints.push(orderBy('addedMs', 'desc'))
  if (pageSize > 0) {
    constraints.push(limit(pageSize))
  }
  return query(collection, ...constraints)
}

export function queryForArchivedMems(collection: CollectionReference<DocumentData>, pageSize: number): Query {
  let constraints : QueryConstraint[] = []
  constraints.push(where('new', '==', false))
  constraints.push(orderBy('addedMs', 'desc'))
  if (pageSize > 0) {
    constraints.push(limit(pageSize))
  }
  return query(collection, ...constraints)
}

export function executeQueryForTaggedMems(collection: CollectionReference<DocumentData>,
  tags: Array<string>,
  matchOperator: string,
  pageSize: number): Promise<Array<DocumentData>> {

  let constraints : QueryConstraint[] = []

  if (matchOperator === 'all') {
    // Limitation of Firestore is that we can't combined multple array-contains conditions.
    // So we have to take the first tag and query for that, then filter the results.
    const firstTag = tags[0]
    constraints.push(where('tags', 'array-contains', firstTag))
    constraints.push(orderBy('addedMs', 'desc'))
    if (pageSize > 0) {
      constraints.push(limit(pageSize))
    }
    const q = query(collection, ...constraints)
    return getDocs(q).then(unwrapDocs).then(mems => {
      return mems.filter(mem => {
        return tags.every(tag => mem.tags.includes(tag))
      })
    })

  } else {
    constraints.push(where('tags', 'array-contains-any', tags))
    constraints.push(orderBy('addedMs', 'desc'))
    if (pageSize > 0) {
      constraints.push(limit(pageSize))
    }
    const q = query(collection, ...constraints)
    return getDocs(q).then(unwrapDocs)
  }
}

export function executeQuery(query: Query) : Promise<Array<DocumentData>> {
  return getDocs(query).then(unwrapDocs)
}