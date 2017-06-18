const {app, BrowserWindow, Menu, MenuItem, Tray, ipcMain, shell} = require('electron');
const fs = require("fs");
const settings = require('electron-settings');
const path = require('path');
const url = require('url');

const SETTINGS_ACCEPTED_VERSIONS = 'acceptedVersions';

let icon = path.join(__dirname, 'icon.png');
let disclaimerWindow, whatsappWindow, tray;

let menu = Menu.buildFromTemplate([
    {
        label: 'File',
        submenu: [
            { label: 'Quit', click: quit }
        ]
    },
    {
    role: 'window',
        submenu: [
            {role: 'minimize'},
            {role: 'close'}
        ]
    },
]);

ipcMain.on('get-license', (event) => {
    var data = fs.readFileSync(path.join(__dirname, 'LICENSE'));
    event.returnValue = data.toString();
});

ipcMain.on('determine-version', (event) => {
    event.returnValue = app.getVersion();
});

function createWindow() {
    if (whatsappWindow) {
        return whatsappWindow;
    }
    
    if (disclaimerWindow) {
        return disclaimerWindow;
    }
    
    let acceptedVersions = settings.get(SETTINGS_ACCEPTED_VERSIONS);
    
    if (!(acceptedVersions instanceof Array)) {
        acceptedVersions = [];
    }
    
    let version = app.getVersion();
    
    if (-1 !== acceptedVersions.indexOf(version)) {
        createWhatsAppWindow();
        return whatsappWindow;
    }
    
    createDisclaimerWindow();
    return disclaimerWindow;
}

function createDisclaimerWindow() {
    disclaimerWindow = new BrowserWindow({ 
        width: 800, 
        height: 680, 
        resizable: false, 
        autoHideMenuBar: true,
        icon: icon
    });
    disclaimerWindow.setMenu(menu);
    disclaimerWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));
    
    // Open the DevTools.
    //disclaimerWindow.webContents.openDevTools()
    
    disclaimerWindow.webContents.on('new-window', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
    });
    
    ipcMain.on('accept', () => {
        let acceptedVersions = settings.get(SETTINGS_ACCEPTED_VERSIONS);

        if (!(acceptedVersions instanceof Array)) {
            acceptedVersions = [];
        }
        
        acceptedVersions.push(app.getVersion());
        settings.set(SETTINGS_ACCEPTED_VERSIONS, acceptedVersions);

        createWhatsAppWindow();
        disclaimerWindow.close();
    });

    disclaimerWindow.on('closed', () => {
        disclaimerWindow = null;
    });
}

function createWhatsAppWindow() {
    whatsappWindow = new BrowserWindow({ 
        width: 930, 
        height: 630, 
        autoHideMenuBar: true,
        icon: icon 
    });
    whatsappWindow.setMenu(menu);
    whatsappWindow.loadURL('https://web.whatsapp.com/');

    // Open the DevTools.
    //whatsappWindow.webContents.openDevTools()
    
    whatsappWindow.webContents.on('new-window', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
    });

    whatsappWindow.on('minimize',function(event){
        event.preventDefault()
        mainWindow.hide();
    });

    whatsappWindow.on('close', function (event) {
        if (!app.isQuiting) {
            event.preventDefault()
            whatsappWindow.hide();
        }
        return false;
    });
  
    whatsappWindow.on('closed', () => {
        whatsappWindow = null;
    });
}

function createTray() {
    
    let contextMenu = new Menu();
    contextMenu.append(new MenuItem({ label: 'Show window', click: show }));
    contextMenu.append(new MenuItem({ type: 'separator' }));
    contextMenu.append(new MenuItem({ label: 'Quit', click: quit }));
    
    tray = new Tray(icon);
    tray.setTitle("WhatsApp");
    tray.setToolTip("WhatsApp");
    
    tray.setContextMenu(contextMenu);
    
    tray.on('click', show);
}

function show() {
    let window = createWindow();
    window.show();
    window.focus();
}

function quit() {
    app.isQuiting = true;
    app.quit();
}

app.on('ready', () => {
    createTray();
    createWindow();
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (whatsappWindow === null) {
        createWindow();
    }
})
