<template>
  <RouterView />
  <PwaUpdatePrompt v-if="hasMounted && PwaUpdatePrompt" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { RouterView } from 'vue-router'

import {
  patternMatchingWorkerKey,
  usePatternMatchingWorker,
} from '@/features/concepts/composables/usePatternMatchingWorker'
import { loadMobileDevTools } from '@/services/mobileDevTools'

const patternMatchingWorker = usePatternMatchingWorker()
provide(patternMatchingWorkerKey, patternMatchingWorker)

const PwaUpdatePrompt = import.meta.env.SSR
  ? null
  : defineAsyncComponent(() => import('@/components/layout/PwaUpdatePrompt.vue'))
const hasMounted = ref(false)

onMounted(() => {
  hasMounted.value = true
  loadMobileDevTools()
})
</script>
