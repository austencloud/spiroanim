;(() => {
  const returnLink = document.querySelector('#return-to-app')
  if (!(returnLink instanceof HTMLAnchorElement)) return

  const returnTarget = new URLSearchParams(window.location.search).get('returnTo')
  if (returnTarget) {
    try {
      const targetUrl = new URL(returnTarget, window.location.origin)
      if (targetUrl.origin === window.location.origin) {
        returnLink.href = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`
        return
      }
    } catch {
      // Invalid and cross-origin targets fall back to the same-tab history behavior below.
    }
  }

  const returnFlagKey = 'spiroanim:docs-return-through-history'
  const legacyReturnFlagKey = 'spiroanim:vtg-return-through-history'
  let canReturnThroughHistory = false

  try {
    const referrer = document.referrer ? new URL(document.referrer) : null
    const nonAppPaths = [
      '/',
      '/about',
      '/tips',
      '/reset',
      '/reset/',
      '/vtg-reference',
      '/vtg-reference/',
      '/vtg3',
      '/vtg3/',
    ]
    const arrivedFromApp =
      referrer?.origin === window.location.origin && !nonAppPaths.includes(referrer.pathname)

    if (arrivedFromApp) sessionStorage.setItem(returnFlagKey, 'true')
    canReturnThroughHistory =
      arrivedFromApp ||
      sessionStorage.getItem(returnFlagKey) === 'true' ||
      sessionStorage.getItem(legacyReturnFlagKey) === 'true'
  } catch {
    canReturnThroughHistory = false
  }

  if (!canReturnThroughHistory) return

  returnLink.addEventListener('click', (event) => {
    event.preventDefault()
    sessionStorage.removeItem(returnFlagKey)
    sessionStorage.removeItem(legacyReturnFlagKey)
    history.back()
  })
})()
