/**
 * Utilitaire pour gérer les promesses asynchrones et éviter les erreurs
 * "Extension context invalidated" et les fuites mémoire
 */

class AsyncManager {
  constructor() {
    this.activeRequests = new Map()
    this.isMounted = true
  }

  /**
   * Wrapper pour les fetch qui gère les erreurs de contexte
   */
  async safeFetch(url, options = {}) {
    if (!this.isMounted) {
      throw new Error('Component unmounted')
    }

    const requestId = Math.random().toString(36).substr(2, 9)
    const controller = new AbortController()
    
    try {
      this.activeRequests.set(requestId, controller)
      
      const timeout = options.timeout || 30000
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (!this.isMounted) {
        throw new Error('Component unmounted')
      }
      
      return response
    } catch (err) {
      if (err.name === 'AbortError' && !this.isMounted) {
        console.warn('Request aborted due to component unmount')
        return null
      }
      throw err
    } finally {
      this.activeRequests.delete(requestId)
    }
  }

  /**
   * Wrapper pour les promesses avec gestion du contexte
   */
  async safePromise(promise) {
    if (!this.isMounted) {
      throw new Error('Component unmounted')
    }

    try {
      const result = await promise
      if (!this.isMounted) {
        console.warn('Promise resolved after component unmount')
        return null
      }
      return result
    } catch (err) {
      if (!this.isMounted) {
        console.warn('Promise rejected after component unmount:', err.message)
        return null
      }
      throw err
    }
  }

  /**
   * Annuler toutes les requêtes actives
   */
  cancelAll() {
    this.isMounted = false
    this.activeRequests.forEach(controller => {
      try {
        controller.abort()
      } catch (err) {
        console.error('Error aborting request:', err)
      }
    })
    this.activeRequests.clear()
  }

  /**
   * Marquer le composant comme démonté
   */
  unmount() {
    this.isMounted = false
    this.cancelAll()
  }

  /**
   * Réinitialiser le gestionnaire
   */
  reset() {
    this.isMounted = true
    this.activeRequests.clear()
  }
}

export default AsyncManager
