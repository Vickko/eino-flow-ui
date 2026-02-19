export interface SseMessage {
  event?: string
  data: string
  id?: string
  retry?: number
}
