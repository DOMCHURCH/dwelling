/**
 * Gestionnaire d'erreurs global pour éviter les erreurs de contexte invalidé
 * et les fuites mémoire
 */

class ErrorHandler {
  constructor() {
    this.errorListeners = []
    this.setupGlobalErrorHandlers()
  }

  /**
   * Configurer les gestionnaires d'erreurs globaux
   */
  setupGlobalErrorHandlers() {
    // Gérer les erreurs non capturées
    window.addEventListener('error', (event) => {
      if (event.message?.includes('Extension context invalidated')) {
        console.warn('Caught extension context invalidated error:', event)
        event.preventDefault()
      }
    })

    // Gérer les promesses rejetées non capturées
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('Extension context invalidated')) {
        console.warn('Caught unhandled promise rejection:', event.reason)
        event.preventDefault()
      }
    })
  }

  /**
   * Enregistrer un écouteur d'erreur
   */
  onError(callback) {
    this.errorListeners.push(callback)
    return () => {
      this.errorListeners = this.errorListeners.filter(cb => cb !== callback)
    }
  }

  /**
   * Émettre une erreur
   */
  emit(error) {
    this.errorListeners.forEach(callback => {
      try {
        callback(error)
      } catch (err) {
        console.error('Error in error listener:', err)
      }
    })
  }

  /**
   * Wrapper pour les appels API avec gestion des erreurs
   */
  async wrapApiCall(apiFunction, fallbackValue = null) {
    try {
      return await apiFunction()
    } catch (err) {
      // Ignorer les erreurs de contexte invalidé
      if (err.message?.includes('Extension context invalidated') || 
          err.message?.includes('context invalidated') ||
          err.name === 'AbortError') {
        console.warn('API call cancelled or context invalidated:', err.message)
        return fallbackValue
      }

      // Émettre l'erreur aux écouteurs
      this.emit(err)
      throw err
    }
  }

  /**
   * Wrapper pour les fetch avec timeout
   */
  async fetchWithTimeout(url, options = {}, timeout = 30000) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (err) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`)
      }
      throw err
    }
  }
}

export default new ErrorHandler()
