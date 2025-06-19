const { app, BrowserWindow } = require("electron");
const path = require("path");
const express = require("./server");
const PORT = 3000;

app.setPath('userData', path.join(__dirname, 'user_data'));

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    icon: path.join(__dirname, "public/logo/DSADSADA-removebg-preview.png"),
    devDependencies: {
      electron: "^29.0.0",
      "electron-builder": "^24.9.0",
    },
  });

  win.setMenuBarVisibility(false);

  const server = express.listen(PORT, () => {
    console.log(`running on port ${PORT}`);

    win.loadURL(`http://localhost:${PORT}`);
  });

  win.on("closed", () => {
    win = null;
    server.close();
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => app.quit);

/*
app.on("ready", createWindow);

app.on("window-all-closed",()=>{
    if(process.platform !== "darwin"){
        app.quit
    }
})

app.on("activate", ()=>{
    if(win === null){
        createWindow();
    }
})*/
