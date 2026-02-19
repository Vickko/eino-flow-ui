import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readAppStorage, removeAppStorage, writeAppStorage } from '@/shared/lib/storage/appStorage'

describe('appStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('会把 legacy key 迁移到带版本的 key', () => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('devops_api_base_url', 'https://devops.vickko.com')

    expect(readAppStorage('theme')).toBe('dark')
    expect(readAppStorage('apiBaseUrl')).toBe('https://devops.vickko.com')
    expect(localStorage.getItem('eino_flow_ui:storage_version')).toBe('1')
  })

  it('写入后可按统一 key 读取', () => {
    writeAppStorage('theme', 'light')
    writeAppStorage('apiBaseUrl', 'https://example.com')

    expect(readAppStorage('theme')).toBe('light')
    expect(readAppStorage('apiBaseUrl')).toBe('https://example.com')
  })

  it('localStorage 读取抛错时不会中断流程', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    let value: string | null = null
    expect(() => {
      value = readAppStorage('theme')
    }).not.toThrow()
    expect(value).toBeNull()
  })

  it('localStorage 写入和删除抛错时不会中断流程', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(() => writeAppStorage('theme', 'dark')).not.toThrow()
    expect(() => removeAppStorage('theme')).not.toThrow()
  })
})
