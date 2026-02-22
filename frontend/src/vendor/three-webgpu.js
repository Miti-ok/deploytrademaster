// Minimal stub to satisfy three-globe imports in environments without WebGPU.
export class WebGPURenderer {
  constructor() {
    throw new Error("WebGPU renderer is not available in this build.");
  }
}

export class StorageInstancedBufferAttribute {}
export class WebGPURendererParameters {}
export class WebGPUBackend {}
export class WebGPUDevice {}
export class WebGPURenderTarget {}
export class WebGPURenderTargetArray {}
export class WebGPURenderTargetCube {}
export class WebGPURenderTarget3D {}
export class WebGPUMipmappedTexture {}
export class WebGPUStorageBuffer {}
export class WebGPUUniformBuffer {}
export class WebGPUBuffer {}
export class WebGPUTexture {}
export class WebGPUComputePipeline {}
export class WebGPURenderPipeline {}
export class WebGPUNodeBuilder {}
