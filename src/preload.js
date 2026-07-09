'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Ponte segura entre a interface e o processo principal.
// A interface só pode chamar exatamente estas funções.
contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getLastFolder: () => ipcRenderer.invoke('get-last-folder'),
  countAudio: (dir) => ipcRenderer.invoke('count-audio', dir),
  shuffle: (dir) => ipcRenderer.invoke('shuffle', dir),
});
