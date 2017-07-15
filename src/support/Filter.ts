
import { get, groupBy, flatten, isArray } from 'lodash'

export default class Filter {
  private data: any[] = []
  private filtered: any[] = []

  setData(data: any[]|Function) {
    if (isArray(data)) {
      this.data = [...data]
      this.filtered = [...data]
    } else {
      const newData = data([...this.data])
      this.data = [...newData]
      this.filtered = [...newData]
    }

    return this
  }

  reset() {
    this.filtered = [...this.data]
    return this
  }

  filterBy(key: string, value: any, sortFunc: (a: any, b: any) => number) {
    this.filtered = this.filtered.filter(item => {
      return get(item, key) === value
    }).sort(sortFunc)
    return this
  }

  groupBy(key: string, sortFunc: (a: any, b: any) => number) {
    const grouped = groupBy(this.filtered, key)

    const flattened = flatten(
      Object.keys(grouped)
        .map(item => grouped[item].sort(sortFunc))
    )

    this.filtered = flattened

    return this
  }

  get() {
    return this.filtered
  }
}