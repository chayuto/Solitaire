import { describe, it, expect } from 'vitest'
import { VERSION } from '../src/index'

describe('@chayuto/solitaire-core', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.1.0')
  })
})
