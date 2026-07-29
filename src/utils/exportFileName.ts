export const DEFAULT_EXPORT_FILE_NAME = 'SpiroAnim'
export const MAX_EXPORT_FILE_NAME_LENGTH = 100

const invalidFileNameCharacters = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])
const reservedWindowsFileName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i

export const sanitizeExportFileName = (value: string) =>
  Array.from(value)
    .filter((character) => {
      const codePoint = character.codePointAt(0)
      return codePoint !== undefined && codePoint >= 32 && !invalidFileNameCharacters.has(character)
    })
    .join('')
    .slice(0, MAX_EXPORT_FILE_NAME_LENGTH)

export const resolveExportFileName = (value: string) => {
  const sanitized = sanitizeExportFileName(value)
    .trim()
    .replace(/[. ]+$/u, '')
  return sanitized && !reservedWindowsFileName.test(sanitized)
    ? sanitized
    : DEFAULT_EXPORT_FILE_NAME
}
