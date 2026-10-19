import { useCallback, useEffect, useState } from 'react'

export interface StorageInfo {
  supported: boolean
  usage?: number
  quota?: number
  persisted?: boolean
}

/** Browser storage usage and whether the data is protected from eviction. */
export function useStorageInfo() {
  const [info, setInfo] = useState<StorageInfo>({ supported: Boolean(navigator.storage?.estimate) })

  const refresh = useCallback(async () => {
    if (!navigator.storage?.estimate) return
    const [est, persisted] = await Promise.all([
      navigator.storage.estimate(),
      navigator.storage.persisted?.() ?? Promise.resolve(undefined),
    ])
    setInfo({ supported: true, usage: est.usage, quota: est.quota, persisted })
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const requestPersist = useCallback(async () => {
    const granted = (await navigator.storage?.persist?.()) ?? false
    await refresh()
    return granted
  }, [refresh])

  return { info, refresh, requestPersist }
}
