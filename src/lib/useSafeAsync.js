import { useEffect, useRef, useCallback } from 'react'
import AsyncManager from './asyncManager'

/**
 * Hook personnalisé pour gérer les opérations asynchrones de manière sûre
 * Évite les erreurs "Extension context invalidated" et les fuites mémoire
 */
export function useSafeAsync() {
  const managerRef = useRef(null)

  // Initialiser le gestionnaire
  if (!managerRef.current) {
    managerRef.current = new AsyncManager()
  }

  // Nettoyer les ressources au démontage
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.unmount()
      }
    }
  }, [])

  // Wrapper pour fetch sécurisé
  const safeFetch = useCallback((url, options) => {
    if (!managerRef.current) return Promise.reject(new Error('Manager not initialized'))
    return managerRef.current.safeFetch(url, options)
  }, [])

  // Wrapper pour promesses sécurisées
  const safePromise = useCallback((promise) => {
    if (!managerRef.current) return Promise.reject(new Error('Manager not initialized'))
    return managerRef.current.safePromise(promise)
  }, [])

  // Vérifier si le composant est monté
  const isMounted = useCallback(() => {
    return managerRef.current?.isMounted ?? false
  }, [])

  return { safeFetch, safePromise, isMounted }
}

export default useSafeAsync
