export interface PageSeo {
  appTitle: string
  canonicalPath: string
  description: string
  robots: 'index, follow' | 'noindex, nofollow'
  title: string
}

export const SITE_ORIGIN = 'https://spiroanim.com'
export const SOCIAL_IMAGE_URL = `${SITE_ORIGIN}/images/app-icons/pwa-512x512.png`

const defaultSeo: PageSeo = {
  appTitle: 'Flow Arts Concepts',
  canonicalPath: '/',
  description: 'Explore, build, and play advanced flow arts concepts.',
  robots: 'noindex, nofollow',
  title: 'SpiroAnim - Flow Arts Concepts',
}

const pageSeo: Record<string, PageSeo> = {
  '/': {
    appTitle: 'Flow Arts Concepts',
    canonicalPath: '/',
    description:
      'Explore SpiroAnim, an open-source tool for building and visualizing advanced flow arts concepts.',
    robots: 'index, follow',
    title: 'SpiroAnim - Flow Arts Concepts',
  },
  '/about': {
    appTitle: 'About - Open-Source Flow Arts Rendering',
    canonicalPath: '/about',
    description:
      'Learn about SpiroAnim, its years of development, open-source license, and upcoming improvements.',
    robots: 'index, follow',
    title: 'About SpiroAnim - Open-Source Flow Arts Rendering',
  },
  '/tips': {
    appTitle: 'Tips - Keyboard Shortcuts and Timeline Controls',
    canonicalPath: '/tips',
    description:
      'Learn SpiroAnim keyboard shortcuts, timeline selection gestures, and navigation controls.',
    robots: 'index, follow',
    title: 'SpiroAnim Tips - Shortcuts and Timeline Controls',
  },
}

export function getPageSeo(path: string): PageSeo {
  return pageSeo[path === '/index' ? '/' : path] ?? defaultSeo
}
