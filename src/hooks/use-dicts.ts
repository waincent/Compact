'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api-client'

export interface DictItem {
  label: string
  value: string
  dictType: string
  sortOrder: number
}

/** 加载数据字典,返回 { dicts, getLabel(type, value), options(type) } */
export function useDicts(types: string[]) {
  const [dicts, setDicts] = useState<Record<string, DictItem[]>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    api
      .get<Record<string, DictItem[]>>('/api/dict/list', { types: types.join(',') })
      .then((data) => {
        if (active) {
          setDicts(data)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [types.join(',')])

  const getLabel = useCallback(
    (type: string, value: number | string | null | undefined): string => {
      if (value === null || value === undefined || value === '') return '-'
      return dicts[type]?.find((d) => d.value === String(value))?.label ?? String(value)
    },
    [dicts],
  )

  const options = useCallback(
    (type: string): DictItem[] => dicts[type] ?? [],
    [dicts],
  )

  return useMemo(() => ({ dicts, getLabel, options, loaded }), [dicts, getLabel, options, loaded])
}
