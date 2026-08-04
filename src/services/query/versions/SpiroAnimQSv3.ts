// Version 3 keeps the version 2 field layout but makes underscore the maximum-value padding
// character. This avoids repeated hyphens being converted to typographic dashes by some sharing
// platforms while preserving the compact one-character representation.

export { VDEF, createRootConfig, createPropConfig } from '@/services/query/versions/SpiroAnimQSv2'

export const CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_'
