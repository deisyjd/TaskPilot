'use client'

import { useEffect } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore } from '@/store/useUserStore'
import { useChatStore } from '@/store/useChatStore'

export function StoreHydrator() {
  useEffect(() => {
    useTaskStore.persist.rehydrate()
    useUserStore.persist.rehydrate()
    useChatStore.persist.rehydrate()
  }, [])
  return null
}
