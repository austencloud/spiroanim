type TouchNavigator = Pick<Navigator, 'maxTouchPoints' | 'userAgent'>

export function isTouchDevice(source: TouchNavigator = navigator): boolean {
  const legacyMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    source.userAgent,
  )
  const modernIPad = source.userAgent.includes('Macintosh') && source.maxTouchPoints > 1

  return legacyMobile || modernIPad
}
