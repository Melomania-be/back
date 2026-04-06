#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const BUILD_DIR = 'build'
const UPLOADS_DIR = path.join(BUILD_DIR, 'uploads')
const TMP_UPLOADS_DIR = '../tmp/back'

function dirExists(p) {
  try {
    return fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}

try {
  // Restore uploads if we preserved them
  if (dirExists(TMP_UPLOADS_DIR)) {
    if (!dirExists(BUILD_DIR)) {
      fs.mkdirSync(BUILD_DIR, { recursive: true })
    }
    fs.renameSync(TMP_UPLOADS_DIR, UPLOADS_DIR)
  }
} catch (err) {
  console.error('Build failed:', err)
  process.exitCode = 1
}