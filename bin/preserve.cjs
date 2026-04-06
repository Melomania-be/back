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
  // Preserve uploads if they exist
  if (dirExists(UPLOADS_DIR)) {
    if (dirExists(TMP_UPLOADS_DIR)) fs.rmSync(TMP_UPLOADS_DIR, { recursive: true })
    fs.renameSync(UPLOADS_DIR, TMP_UPLOADS_DIR)
  }
} catch (err) {
  console.error('Preserve failed :', err)
  process.exitCode = 1
}