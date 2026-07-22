import { api } from './api'

export interface Landmark {
  name: string
  x: number
  y: number
  kind: string
}

export function getArea() {
  return api.get<{ area_name: string; landmarks: Landmark[] }>('/api/area')
}
