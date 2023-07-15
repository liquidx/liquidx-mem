export type FilterStrategy = 'any' | 'all'
export type FilterTags = string[]
export type FilterCondition = {
  filterTags: FilterTags
  filterStrategy: FilterStrategy
}

export const getFilterCondition = (tags: string) : FilterCondition => {
  let filterTags = [] as string[]
  let filterStrategy : FilterStrategy = 'any'
  if (tags === '') {
    return { filterTags, filterStrategy }
  }
  
  if (tags.includes('+')) {
    filterStrategy = 'all'
    filterTags = tags.split('+').map(t => `#${t}`)
  } else {
    filterTags = tags.split('|').map(t => `#${t}`)
  }
  return { filterTags, filterStrategy }
}
