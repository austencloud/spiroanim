// src/stores/useQSMainStore.ts

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { useBaseQS } from '@/services/query/createBaseQS'
import { CURRENT_SPIRO_ANIM_QS_VERSION, loadSpiroAnimQSVersion } from '@/services/query/versions'

// This selects the current format used for newly encoded query strings. Historical versions remain
// available through the version loader so existing shared URLs can use their matching decoder.
export const { CHARSET, VDEF } = await loadSpiroAnimQSVersion(CURRENT_SPIRO_ANIM_QS_VERSION)

const BASE = useBaseQS(VDEF, { charset: CHARSET })
const spiroAnimQS = await useSpiroAnimQS(VDEF, BASE, CURRENT_SPIRO_ANIM_QS_VERSION)

// Query history and pause/skip controls are transient session state and are intentionally not
// persisted. The encoded URL itself is the durable contract.
export const useQSMainStore = defineStore('sa-qs-main', () => spiroAnimQS)
