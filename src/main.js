'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { restoreOriginals, listAudioFiles, listAudioFilesRaw } = require('./shuffle');
const { fatShuffle } = require('./fatsort');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  } catch {
    // não é crítico se falhar
  }
}

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 540,
    height: 660,
    minWidth: 460,
    minHeight: 520,
    title: 'Shuffle Music SD',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- Comunicação com a interface (IPC) ---

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Escolhe a pasta do cartão SD',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const folder = result.filePaths[0];
  const cfg = loadConfig();
  cfg.lastFolder = folder;
  saveConfig(cfg);
  return folder;
});

ipcMain.handle('get-last-folder', () => {
  const folder = loadConfig().lastFolder;
  if (folder && fs.existsSync(folder)) return folder;
  return null;
});

ipcMain.handle('count-audio', (_event, dir) => {
  try {
    return listAudioFiles(dir).length;
  } catch {
    return 0;
  }
});

// Ordem física atual do cartão (para comparar com o que a coluna toca).
ipcMain.handle('current-order', (_event, dir) => {
  try {
    return listAudioFilesRaw(dir);
  } catch {
    return [];
  }
});

ipcMain.handle('shuffle', async (_event, dir) => {
  try {
    const result = await fatShuffle(dir);
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('restore', (_event, dir) => {
  try {
    const result = restoreOriginals(dir);
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
