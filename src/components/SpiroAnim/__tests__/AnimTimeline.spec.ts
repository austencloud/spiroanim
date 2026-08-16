import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AnimTimeline from '@/components/SpiroAnim/AnimTimeline.vue'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { useMainPaneStore } from '@/stores/useMainPaneStore'
import { usePlayerStore } from '@/stores/usePlayerStore'

interface WorkerRequest {
  id?: string
  type: string
  data: unknown
}

class FakeWorker extends EventTarget {
  static instances: FakeWorker[] = []
  readonly imageRequests: WorkerRequest[] = []
  terminate = vi.fn<() => void>()

  constructor() {
    super()
    FakeWorker.instances.push(this)
  }

  postMessage(message: WorkerRequest): void {
    if (message.id === undefined) return

    if (message.type === 'reqimgs') {
      this.imageRequests.push(message)
      return
    }

    const data =
      message.type === 'warnStr' ? message.data : message.type === 'initialize' ? true : undefined
    queueMicrotask(() => {
      this.dispatchEvent(
        new MessageEvent('message', {
          data: { id: message.id, type: message.type, data },
        }),
      )
    })
  }

  respondToImageRequest(index: number, data: Record<number, string>): void {
    const request = this.imageRequests[index]
    if (request?.id === undefined) throw new Error(`Missing image request ${index}`)

    this.dispatchEvent(
      new MessageEvent('message', {
        data: { id: request.id, type: request.type, data },
      }),
    )
  }
}

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  readonly observed = new Set<Element>()
  disconnect = vi.fn<() => void>()
  observe = vi.fn<(target: Element) => void>((target) => {
    this.observed.add(target)
  })
  unobserve = vi.fn<(target: Element) => void>((target) => {
    this.observed.delete(target)
  })

  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this)
  }

  showObserved(): void {
    this.callback(
      [...this.observed].map(
        (target) =>
          ({
            target,
            isIntersecting: true,
          }) as IntersectionObserverEntry,
      ),
      this as unknown as IntersectionObserver,
    )
  }
}

class FakeResizeObserver {
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
}

describe('AnimTimeline', () => {
  const scrollIntoView = vi.fn<() => void>()

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    FakeWorker.instances = []
    FakeIntersectionObserver.instances = []
    vi.stubGlobal('Worker', FakeWorker)
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn<(id: number) => void>())
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
  })

  afterEach(() => {
    delete (Element.prototype as { scrollIntoView?: () => void }).scrollIntoView
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders unique animation times and selects a range on thumbnail double click', async () => {
    const store = usePlayerStore('timeline')
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [{ anim: [{ beats: 1 }, { beats: 1 }, { beats: 1 }], motion: [] }],
    }
    await nextTick()

    const wrapper = mount(AnimTimeline, {
      props: {
        store: 'timeline',
        dim: { width: 600, height: 400, perc: 50 },
      },
    })
    await flushPromises()

    const thumbs = wrapper.findAll('img.thumb')
    expect(thumbs).toHaveLength(3)
    expect(
      wrapper.findAll('.timeline-cell').map((cell) => cell.classes('timeline-cell--selected')),
    ).toEqual([true, false, false])
    expect(wrapper.text()).toContain('2: 1')
    expect(thumbs[0]!.attributes()).toMatchObject({
      alt: 'Animation thumbnail 1',
      role: 'button',
      tabindex: '0',
    })

    await thumbs[0]!.trigger('keydown', { key: 'Enter' })
    expect(store.raw().CURRENT.value).toBe(0)

    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(700)
      .mockReturnValueOnce(800)
    await thumbs[1]!.trigger('click')
    expect(store.SELECTION).toBe(false)
    expect(
      wrapper.findAll('.timeline-cell').map((cell) => cell.classes('timeline-cell--selected')),
    ).toEqual([false, true, false])

    await thumbs[1]!.trigger('click')
    await thumbs[1]!.trigger('click')

    expect(store.raw().CURRENT.value).toBe(1000)
    expect(store.SELECTION).toBe(true)
    expect(store.SELECTED).toEqual([1, 2])
    expect(
      wrapper.findAll('.timeline-cell').map((cell) => cell.classes('timeline-cell--selected')),
    ).toEqual([false, true, true])

    const blurThumbnail = vi.spyOn(thumbs[1]!.element as HTMLImageElement, 'blur')
    thumbs[1]!.element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await nextTick()
    expect(blurThumbnail).toHaveBeenCalledOnce()

    wrapper.unmount()
    await flushPromises()
    expect(FakeWorker.instances[0]!.terminate).toHaveBeenCalledOnce()
  })

  it('shows a centered timeline value control and updates its number', async () => {
    const wrapper = mount(AnimTimeline, {
      props: {
        store: 'timeline-value-control',
        dim: { width: 600, height: 400, perc: 50 },
      },
    })
    await flushPromises()

    const control = wrapper.get('[role="group"][aria-label="Timeline Value"]')
    expect(control.get('output').text()).toBe('0')

    await control.get('button[aria-label="Increase Timeline Value"]').trigger('click')
    expect(control.get('output').text()).toBe('1')

    await control.get('button[aria-label="Decrease Timeline Value"]').trigger('click')
    await control.get('button[aria-label="Decrease Timeline Value"]').trigger('click')
    expect(control.get('output').text()).toBe('-1')

    const decrease = control.get('button[aria-label="Decrease Timeline Value"]')
    await decrease.trigger('click')
    await decrease.trigger('click')
    expect(control.get('output').text()).toBe('-3')
    expect(decrease.attributes('disabled')).toBeDefined()

    const increase = control.get('button[aria-label="Increase Timeline Value"]')
    for (let index = 0; index < 8; index++) await increase.trigger('click')
    expect(control.get('output').text()).toBe('5')
    expect(increase.attributes('disabled')).toBeDefined()

    wrapper.unmount()
    await flushPromises()
  })

  it('shows one unfilled cell for empty Motion and an endpoint cell for shorter Motion', async () => {
    const storeId = 'timeline-motion'
    const store = usePlayerStore(storeId)
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [{ anim: [{ beats: 1 }, { beats: 1 }, { beats: 1 }], motion: [] }],
    }
    await nextTick()

    const properties = usePropertiesStore(storeId)
    properties.pFRAMES = 'motion'
    const wrapper = mount(AnimTimeline, {
      props: {
        store: storeId,
        dim: { width: 600, height: 400, perc: 50 },
      },
    })
    await flushPromises()

    expect(wrapper.findAll('.timeline-cell')).toHaveLength(1)
    expect(wrapper.get('.timeline-cell').classes()).toContain('timeline-cell--placeholder')

    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      props: [{ ...runtime.ROOT.value.props[0]!, motion: [{ beats: 1 }] }],
    }
    await flushPromises()

    const cells = wrapper.findAll('.timeline-cell')
    expect(cells).toHaveLength(2)
    expect(cells[0]!.classes()).not.toContain('timeline-cell--placeholder')
    expect(cells[1]!.classes()).toContain('timeline-cell--placeholder')
  })

  it('discards stale thumbnails and keeps new indexes aligned after inserting a Motion frame', async () => {
    const storeId = 'timeline-insert-motion'
    const store = usePlayerStore(storeId)
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [
        {
          anim: [{ beats: 12 }, {}],
          motion: [{ beats: 1 }, { beats: 1 }],
        },
      ],
    }
    await nextTick()

    const properties = usePropertiesStore(storeId)
    properties.pFRAMES = 'motion'
    const wrapper = mount(AnimTimeline, {
      props: {
        store: storeId,
        dim: { width: 600, height: 400, perc: 50 },
      },
    })
    await flushPromises()

    const worker = FakeWorker.instances[0]!
    const observer = FakeIntersectionObserver.instances[0]!
    observer.showObserved()
    expect(worker.imageRequests).toHaveLength(1)
    expect(worker.imageRequests[0]!.data).toEqual([
      { index: 0, time: 0 },
      { index: 1, time: 1000 },
      { index: 2, time: 12000 },
    ])

    runtime.ROOT.value.props[0]!.motion.splice(2, 0, {})
    triggerRef(runtime.ROOT)
    await nextTick()
    await flushPromises()
    observer.showObserved()

    worker.respondToImageRequest(0, {
      0: 'https://example.test/old-0.png',
      1: 'https://example.test/old-1.png',
      2: 'https://example.test/old-2.png',
    })
    await flushPromises()

    expect(worker.imageRequests).toHaveLength(2)
    expect(worker.imageRequests[1]!.data).toEqual([
      { index: 0, time: 0 },
      { index: 1, time: 1000 },
      { index: 2, time: 2000 },
      { index: 3, time: 12000 },
    ])
    expect(wrapper.findAll<HTMLImageElement>('img.thumb')).toHaveLength(4)
    expect(
      wrapper
        .findAll<HTMLImageElement>('img.thumb')
        .some((thumb) => thumb.element.src.includes('old-')),
    ).toBe(false)

    worker.respondToImageRequest(1, {
      0: 'https://example.test/new-0.png',
      1: 'https://example.test/new-1.png',
      2: 'https://example.test/new-2.png',
      3: 'https://example.test/new-3.png',
    })
    await flushPromises()

    expect(
      wrapper.findAll<HTMLImageElement>('img.thumb').map((thumb) => thumb.element.src),
    ).toEqual([
      'https://example.test/new-0.png',
      'https://example.test/new-1.png',
      'https://example.test/new-2.png',
      'https://example.test/new-3.png',
    ])

    observer.showObserved()
    await flushPromises()
    expect(worker.imageRequests).toHaveLength(2)

    wrapper.unmount()
    await flushPromises()
  })

  it('keeps authored timeline thumbnails unchanged for a manual camera pose', async () => {
    const storeId = 'timeline-authored-camera'
    const store = usePlayerStore(storeId)
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      props: [{ anim: [{}], motion: [] }],
    }
    await nextTick()

    const wrapper = mount(AnimTimeline, {
      props: {
        store: storeId,
        dim: { width: 600, height: 400, perc: 50 },
      },
    })
    await flushPromises()

    const worker = FakeWorker.instances[0]!
    FakeIntersectionObserver.instances[0]!.showObserved()
    expect(worker.imageRequests).toHaveLength(1)

    worker.respondToImageRequest(0, { 0: 'https://example.test/authored.png' })
    await flushPromises()

    store.freeCameraPose = {
      position: [4, 5, -20],
      target: [1, 2, 3],
    }
    await flushPromises()

    expect(worker.imageRequests).toHaveLength(1)

    wrapper.unmount()
    await flushPromises()
  })

  it('scrolls only its own container when the active thumbnail is outside the view', async () => {
    const store = usePlayerStore('timeline-scroll')
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [{ anim: [{ beats: 1 }, { beats: 1 }, { beats: 1 }], motion: [] }],
    }
    await nextTick()

    const wrapper = mount(AnimTimeline, {
      props: {
        store: 'timeline-scroll',
        dim: { width: 600, height: 400, perc: 50 },
      },
    })
    await flushPromises()

    const scroll = wrapper.get('.scrollbar').element as HTMLElement
    const thumbs = wrapper.findAll<HTMLImageElement>('img.thumb')
    scroll.scrollTop = 20
    vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 50, 600, 100))
    vi.spyOn(thumbs[1]!.element, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, 270 - scroll.scrollTop, 300, 100),
    )
    scrollIntoView.mockClear()

    runtime.CURRENT.value = 1000
    await nextTick()
    await flushPromises()

    expect(scroll.scrollTop).toBe(220)
    expect(scrollIntoView).not.toHaveBeenCalled()

    wrapper.unmount()
    await flushPromises()
  })

  it('enables and grows selection ranges with shift-click', async () => {
    const store = usePlayerStore('timeline-shift-selection')
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [
        {
          anim: [{ beats: 1 }, { beats: 1 }, { beats: 1 }, { beats: 1 }, { beats: 1 }],
          motion: [],
        },
      ],
    }
    await nextTick()

    const wrapper = mount(AnimTimeline, {
      props: {
        store: 'timeline-shift-selection',
        dim: { width: 600, height: 400, perc: 50 },
      },
    })
    await flushPromises()

    runtime.CURRENT.value = 2000
    await nextTick()

    const thumbs = wrapper.findAll('img.thumb')
    await thumbs[3]!.trigger('click', { shiftKey: true })

    expect(store.SELECTION).toBe(true)
    expect(store.SELECTED).toEqual([2, 4])
    expect(runtime.CURRENT.value).toBe(3000)

    await thumbs[1]!.trigger('click')
    expect(store.SELECTED).toEqual([1, 2])

    await thumbs[3]!.trigger('click', { shiftKey: true })
    expect(store.SELECTED).toEqual([1, 4])

    await thumbs[2]!.trigger('click', { shiftKey: true })
    expect(store.SELECTED).toEqual([1, 3])

    await thumbs[0]!.trigger('click', { shiftKey: true })
    expect(store.SELECTED).toEqual([0, 3])

    store.SELECTION = false
    runtime.CURRENT.value = 3000
    await nextTick()
    await thumbs[1]!.trigger('click', { shiftKey: true })
    expect(store.SELECTED).toEqual([1, 4])

    wrapper.unmount()
    await flushPromises()
  })

  it('shows markers only for selected props while the editor is visible', async () => {
    const storeId = 'timeline-prop-selection'
    const store = usePlayerStore(storeId)
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      props: [
        { color: 0, anim: [{ beats: 1 }], motion: [] },
        { color: 1, anim: [{ beats: 1 }], motion: [] },
      ],
    }
    useMainPaneStore().setViewInPane('editor', 'right')

    const properties = usePropertiesStore(storeId)
    properties.pSELECTED[0] = true
    properties.pSELECTED[1] = false
    await nextTick()

    const wrapper = mount(AnimTimeline, {
      props: {
        store: storeId,
        dim: { width: 600, height: 400, perc: 50 },
      },
    })
    await flushPromises()

    const markerVisibility = () =>
      wrapper.findAll('.circle').map((circle) => circle.classes('circle--prop-visible'))

    expect(markerVisibility()).toEqual([true, false])

    properties.pSELECTED[0] = false
    properties.pSELECTED[1] = true
    await nextTick()

    expect(markerVisibility()).toEqual([false, true])

    wrapper.unmount()
    await flushPromises()
  })

  it('can switch from selected prop times to every prop time', async () => {
    const storeId = 'timeline-show-all-props'
    const store = usePlayerStore(storeId)
    store.raw().ROOT.value = {
      ...store.raw().ROOT.value,
      bpm: 60,
      props: [
        { color: 0, anim: [{ beats: 1 }, {}], motion: [] },
        { color: 1, anim: [{ beats: 0.5 }, { beats: 1.5 }, {}], motion: [] },
      ],
    }
    const properties = usePropertiesStore(storeId)
    properties.pSELECTED = { 0: true, 1: false }
    await nextTick()

    const wrapper = mount(AnimTimeline, {
      props: {
        store: storeId,
        dim: { width: 600, height: 400, perc: 50 },
      },
    })
    await flushPromises()

    expect(wrapper.findAll('.timeline-cell')).toHaveLength(3)
    expect(
      wrapper.findAll('.circle').some((circle) => !circle.classes('circle--prop-visible')),
    ).toBe(true)

    properties.showFullTimeline = true
    await flushPromises()

    expect(wrapper.findAll('.timeline-cell')).toHaveLength(4)
    expect(
      wrapper.findAll('.circle').every((circle) => circle.classes('circle--prop-visible')),
    ).toBe(true)
    expect(properties.showFullTimeline).toBe(true)

    wrapper.unmount()
    await flushPromises()
  })
})
