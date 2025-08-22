import '@testing-library/jest-dom'

// Mock HTML5 QR Code Scanner
global.Html5QrcodeScanner = class {
  constructor() {}
  render() {}
  clear() {}
} as any

// Mock audio
global.Audio = class {
  play() {
    return Promise.resolve()
  }
} as any

// Mock environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: any) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})