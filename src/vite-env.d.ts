/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPBOX_TOKEN: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_SQUARE_APPLICATION_ID: string
  readonly VITE_SQUARE_ACCESS_TOKEN: string
  readonly VITE_SQUARE_ENVIRONMENT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@mapbox/mapbox-gl-draw' {
  import { IControl, Map } from 'mapbox-gl'
  
  interface DrawOptions {
    displayControlsDefault?: boolean
    keybindings?: boolean
    touchEnabled?: boolean
    clickBuffer?: number
    touchBuffer?: number
    boxSelect?: boolean
    controls?: {
      point?: boolean
      line_string?: boolean
      polygon?: boolean
      trash?: boolean
      combine_features?: boolean
      uncombine_features?: boolean
    }
    styles?: any[]
    modes?: any
    defaultMode?: string
    userProperties?: boolean
  }

  export default class MapboxDraw implements IControl {
    constructor(options?: DrawOptions)
    onAdd(map: Map): HTMLElement
    onRemove(): void
    add(geojson: any): string[]
    get(id: string): any
    getAll(): any
    delete(ids: string | string[]): this
    deleteAll(): this
    set(featureCollection: any): string[]
    trash(): this
    combineFeatures(): this
    uncombineFeatures(): this
    getSelected(): any
    getSelectedIds(): string[]
    setFeatureProperty(id: string, property: string, value: any): this
    changeMode(mode: string, options?: any): this
    getMode(): string
  }
}