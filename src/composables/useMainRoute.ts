// src\composables\SpiroAnim\useMainRoute.ts

import { useQSMainStore } from '@/stores/useQSMainStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useSplitterStore } from '@/stores/useSplitterStore'
import { useMainPaneStore, viewKeysMain } from '@/stores/useMainPaneStore'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import type { ConceptKey } from '@/features/concepts/types'

import { findKeyByValue } from '@/utils/UtilFunc'
//import { encodeReadable } from '@/func/AnimReadableFunc'

const routeKeys = ['play', 'time', 'edit', 'cnc', 'vtg'] as const

const shortToView = {
  play: 'player',
  edit: 'editor',
  time: 'timeline',
  cnc: 'concepts',
  vtg: 'concepts',
} as const

type MainView = (typeof viewKeysMain)[number]
type ShortKey = keyof typeof shortToView

const fullToView = {
  player: 'player',
  editor: 'editor',
  timeline: 'timeline',
  concepts: 'concepts',
  vtg: 'concepts',
} as const satisfies Record<string, MainView>

type FullKey = keyof typeof fullToView

const isShortKey = (value: string): value is ShortKey => value in shortToView
const isFullKey = (value: string): value is FullKey => value in fullToView
const isConceptKey = (value: string): value is ConceptKey => value === 'vtg'

// Build all combo's for the two panes (also used in router/index.ts)
export const paneSplits: string[] = routeKeys.flatMap((a) =>
  routeKeys.filter((b) => shortToView[a] !== shortToView[b]).map((b) => `/${a}-${b}`),
)

export function useMainRoute() {
  const qsStore = useQSMainStore()
  const { encodeQS, decodeVer } = qsStore
  const { qsPause } = storeToRefs(qsStore)

  const playerStore = usePlayerStore('main')
  const { ROOT } = playerStore.raw()
  const { leftPerc } = storeToRefs(useSplitterStore('main'))

  const paneStore = useMainPaneStore()
  const { rotatePane, setViewInPane } = paneStore
  const { parents } = storeToRefs(paneStore)
  const { selectedConcept } = storeToRefs(useConceptsStore())

  const router = useRouter()
  const route = useRoute()
  const animationReady = ref(route.query.r === undefined)

  const page = route.path.substring(1)

  // Just in case something funky happened in the local storage
  if (!findKeyByValue(parents.value, 'left')) rotatePane('left')
  if (!findKeyByValue(parents.value, 'right')) rotatePane('right')

  let shouldCanonicalizeConceptRoute = false

  // Update panes, selected concept, and splitter for the requested page.
  if (page && page !== 'app')
    if (page.includes('-')) {
      // '-' splits short versions of the views
      const parts = page.split('-')
      const leftKey = parts[0]
      const rightKey = parts[1]

      if (leftKey && rightKey && isShortKey(leftKey) && isShortKey(rightKey)) {
        const left = shortToView[leftKey]
        const right = shortToView[rightKey]

        if (isConceptKey(leftKey)) selectedConcept.value = leftKey
        if (isConceptKey(rightKey)) selectedConcept.value = rightKey
        shouldCanonicalizeConceptRoute = leftKey === 'cnc' || rightKey === 'cnc'

        setViewInPane(left, 'left')
        setViewInPane(right, 'right')

        if (leftPerc.value == 0 || leftPerc.value == 100) leftPerc.value = 50
      }
    } else if (isFullKey(page)) {
      const view = fullToView[page]
      if (isConceptKey(page)) selectedConcept.value = page
      shouldCanonicalizeConceptRoute = page === 'concepts'

      switch (parents.value[view]) {
        case 'hidden':
          setViewInPane(view, 'left')
        // fall through to apply leftPerc = 100
        case 'left':
          leftPerc.value = 100
          break
        case 'right':
          leftPerc.value = 0
          break
      }
    }

  // Snapshot route state to avoid race conditions from simultaneous watcher updates
  let path = route.path
  let query = route.query

  // These are unnecessary, but just in case they're updated elsewhere
  watch(
    () => route.path,
    (val) => (path = val),
  )
  watch(
    () => route.query,
    (val) => (query = val),
  )

  const shortForView = (view: MainView) => {
    switch (view) {
      case 'player':
        return 'play'
      case 'editor':
        return 'edit'
      case 'timeline':
        return 'time'
      case 'concepts':
        return selectedConcept.value
    }
  }

  const updatePath = () => {
    let newPath: string | null = null
    const left = findKeyByValue(parents.value, 'left')
    const right = findKeyByValue(parents.value, 'right')

    //console.log('change', left, right)

    if (leftPerc.value == 100 && left) newPath = left === 'concepts' ? selectedConcept.value : left
    else if (leftPerc.value == 0 && right)
      newPath = right === 'concepts' ? selectedConcept.value : right
    else if (left && right) newPath = `${shortForView(left)}-${shortForView(right)}`

    if (newPath)
      router.replace({
        path: (path = `/${String(newPath)}`),
        query: /*route.*/ query,
        hash: route.hash,
        force: true,
      })
  }

  const showConceptsForEmptyAnimation = () => {
    if (!animationReady.value || ROOT.value.props.length > 0) return false

    setViewInPane('player', 'left')
    setViewInPane('concepts', 'right')
    leftPerc.value = 50
    return true
  }

  const switchedToConcepts = showConceptsForEmptyAnimation()

  // Update generic concept routes to the selected child and keep startup routes canonical.
  if (!page || page === 'app' || switchedToConcepts || shouldCanonicalizeConceptRoute) updatePath()

  // Watch for view/pane changes
  watch(parents, updatePath)

  // The selected child is part of the shareable pane layout path.
  watch(selectedConcept, updatePath)

  // Watch for "snap" values from the splitter
  watch(leftPerc, (nval, oval) => {
    const wasEdge = oval === 0 || oval === 100
    const isEdge = nval === 0 || nval === 100
    if (wasEdge !== isEdge) updatePath()
  })

  // Update query string when data changes
  watch(ROOT, (val) => {
    if (!qsPause.value)
      router.replace({
        path: /*route.*/ path,
        query: (query = encodeQS(val)),
        hash: route.hash,
        force: true,
      })
  })

  /*
  // Dump the data to console in JSON
  watch(
    () => route.query,
    () => {
      console.log(JSON.stringify(encodeReadable(toRaw(ROOT.value)), null, 2))
    }
  )
  */

  // Load data from query string
  if (route.query.r !== undefined) {
    decodeVer(route.query)
      .then((data) => (ROOT.value = data))
      .catch((error: unknown) => {
        console.warn('Failed to load animation data from the route.', error)
      })
      .finally(() => {
        animationReady.value = true
        if (showConceptsForEmptyAnimation()) updatePath()
      })
  }

  return {
    animationReady: readonly(animationReady),
  }
}
