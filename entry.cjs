// entry.cjs
async function loadApp() {
  const { app } = await import('./build/bin/server.js')
}
loadApp()
