import * as THREE from 'three'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'

import type { EventManagerInterface } from './interfaces'

export class HDRIManager {
  private scene: THREE.Scene
  private pmremGenerator: THREE.PMREMGenerator
  private eventManager: EventManagerInterface

  private hdriTexture: THREE.Texture | null = null
  private envMap: THREE.Texture | null = null

  isEnabled: boolean = false
  showAsBackground: boolean = false
  intensity: number = 1
  hdriPath: string = ''

  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    eventManager: EventManagerInterface
  ) {
    this.scene = scene
    this.pmremGenerator = new THREE.PMREMGenerator(renderer)
    this.pmremGenerator.compileEquirectangularShader()
    this.eventManager = eventManager
  }

  async loadHDRI(url: string): Promise<void> {
    this.clearTextures()

    const ext = url.split('?')[0].split('.').pop()?.toLowerCase()

    let texture: THREE.Texture
    if (ext === 'exr') {
      texture = await new Promise<THREE.Texture>((resolve, reject) => {
        new EXRLoader().load(url, resolve, undefined, reject)
      })
    } else {
      texture = await new Promise<THREE.Texture>((resolve, reject) => {
        new RGBELoader().load(url, resolve, undefined, reject)
      })
    }

    texture.mapping = THREE.EquirectangularReflectionMapping
    this.hdriTexture = texture
    this.envMap = this.pmremGenerator.fromEquirectangular(texture).texture

    if (this.isEnabled) {
      this.applyToScene()
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (enabled && this.envMap) {
      this.applyToScene()
    } else {
      this.removeFromScene()
    }
  }

  setShowAsBackground(show: boolean): void {
    this.showAsBackground = show
    if (this.isEnabled && this.envMap) {
      this.applyToScene()
    }
  }

  setIntensity(intensity: number): void {
    this.intensity = intensity
    if (this.isEnabled) {
      this.scene.environmentIntensity = intensity
    }
  }

  hasHDRI(): boolean {
    return this.envMap !== null
  }

  private applyToScene(): void {
    if (!this.envMap) return
    this.scene.environment = this.envMap
    this.scene.environmentIntensity = this.intensity
    this.scene.background = this.showAsBackground ? this.hdriTexture : null
    this.eventManager.emitEvent('hdriChange', {
      enabled: this.isEnabled,
      showAsBackground: this.showAsBackground
    })
  }

  private removeFromScene(): void {
    this.scene.environment = null
    if (this.scene.background === this.hdriTexture) {
      this.scene.background = null
    }
    this.eventManager.emitEvent('hdriChange', {
      enabled: false,
      showAsBackground: this.showAsBackground
    })
  }

  private clearTextures(): void {
    this.removeFromScene()
    this.hdriTexture?.dispose()
    this.envMap?.dispose()
    this.hdriTexture = null
    this.envMap = null
  }

  clear(): void {
    this.clearTextures()
    this.isEnabled = false
    this.hdriPath = ''
  }

  init(): void {}

  reset(): void {}

  dispose(): void {
    this.clearTextures()
    this.pmremGenerator.dispose()
  }
}
