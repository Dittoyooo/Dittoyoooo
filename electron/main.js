const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: "Ditto AI",
    autoHideMenuBar: true, // Hide default menu for app-like feel
    backgroundColor: '#0f172a' // Match the dark theme
  });

  // In production, load the built file. In dev, you might load localhost.
  // Assuming 'dist' is the build output folder.
  win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});