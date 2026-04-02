<template>
  <div class="flex flex-col">
    <div class="show-hdri relative">
      <Button
        v-tooltip.right="{
          value: $t('load3d.hdri.label'),
          showDelay: 300
        }"
        size="icon"
        variant="textonly"
        :class="
          cn(
            'rounded-full',
            hdriConfig?.enabled && 'bg-button-active-surface text-highlight'
          )
        "
        :aria-label="$t('load3d.hdri.label')"
        :disabled="!hdriSupported"
        @click="toggleHDRIPanel"
      >
        <i class="pi pi-globe text-lg text-base-foreground" />
      </Button>

      <div
        v-show="showPanel"
        class="absolute top-0 left-12 z-30 w-[200px] rounded-lg bg-black/50 p-3 shadow-lg"
      >
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm text-base-foreground">{{
              $t('load3d.hdri.label')
            }}</span>
            <ToggleSwitch
              :model-value="hdriConfig?.enabled ?? false"
              :disabled="!hdriConfig?.hdriPath"
              @update:model-value="onEnabledChange"
            />
          </div>

          <div class="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              class="w-full truncate text-xs"
              @click="triggerFileInput"
            >
              {{
                hdriConfig?.hdriPath
                  ? $t('load3d.hdri.changeFile')
                  : $t('load3d.hdri.uploadFile')
              }}
            </Button>
            <Button
              v-if="hdriConfig?.hdriPath"
              size="icon"
              variant="textonly"
              :aria-label="$t('load3d.hdri.removeFile')"
              @click="onRemoveHDRI"
            >
              <i class="pi pi-times text-sm text-base-foreground" />
            </Button>
          </div>

          <div
            v-if="hdriConfig?.hdriPath"
            class="flex items-center justify-between gap-2"
          >
            <span class="text-sm text-base-foreground">{{
              $t('load3d.hdri.showAsBackground')
            }}</span>
            <ToggleSwitch
              :model-value="hdriConfig?.showAsBackground ?? false"
              :disabled="!hdriConfig?.enabled"
              @update:model-value="onShowAsBackgroundChange"
            />
          </div>

          <div v-if="hdriConfig?.enabled" class="flex flex-col gap-1">
            <span class="text-sm text-base-foreground">{{
              $t('load3d.hdri.intensity')
            }}</span>
            <Slider
              :model-value="hdriConfig?.intensity ?? 1"
              class="w-full"
              :min="0"
              :max="5"
              :step="0.1"
              @update:model-value="onIntensityChange"
            />
          </div>
        </div>
      </div>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      :accept="SUPPORTED_HDRI_EXTENSIONS_ACCEPT"
      @change="onFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import Slider from 'primevue/slider'
import ToggleSwitch from 'primevue/toggleswitch'
import { onMounted, onUnmounted, ref } from 'vue'

import Button from '@/components/ui/button/Button.vue'
import { SUPPORTED_HDRI_EXTENSIONS_ACCEPT } from '@/extensions/core/load3d/constants'
import type { HDRIConfig } from '@/extensions/core/load3d/interfaces'
import { cn } from '@/utils/tailwindUtil'

const { hdriSupported = false } = defineProps<{
  hdriSupported?: boolean
}>()

const hdriConfig = defineModel<HDRIConfig>('hdriConfig')

const emit = defineEmits<{
  (e: 'updateHdriFile', file: File | null): void
}>()

const showPanel = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function toggleHDRIPanel() {
  if (!hdriSupported) return
  showPanel.value = !showPanel.value
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  emit('updateHdriFile', file)
  input.value = ''
}

function onEnabledChange(value: boolean) {
  if (!hdriConfig.value) return
  hdriConfig.value = { ...hdriConfig.value, enabled: value }
}

function onShowAsBackgroundChange(value: boolean) {
  if (!hdriConfig.value) return
  hdriConfig.value = { ...hdriConfig.value, showAsBackground: value }
}

function onIntensityChange(value: number | number[]) {
  if (!hdriConfig.value) return
  hdriConfig.value = {
    ...hdriConfig.value,
    intensity: Array.isArray(value) ? value[0] : value
  }
}

function onRemoveHDRI() {
  emit('updateHdriFile', null)
  showPanel.value = false
}

function closePanel(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.show-hdri')) {
    showPanel.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closePanel)
})

onUnmounted(() => {
  document.removeEventListener('click', closePanel)
})
</script>
