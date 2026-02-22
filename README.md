<!--
  © 2026 Exotic. All Rights Reserved.
  Engineered and Maintained by Exotic.
-->
# ExoInstaller - Silkroad PServer 
Welcome! This is the official installer and game manager built for Silkroad Private Servers by **Exotic**. I designed this to be simple for you to manage and professional for your players to use.

© 2026 Exotic. All Rights Reserved.

---

## 🛠️ The Technology
I built this app using **Electron** and **Node.js**. For the styling, I used **Vanilla CSS** to keep it fast and light. This combination allows us to have a cinematic UI that works like a desktop app but is as flexible as a website.

---

## � Part 1: Initial Setup (A to Z)
Before you can build your installer, you need to set up your work environment:

1.  **Windows Developer Mode**: This is the most important step. Windows needs special permissions to package the files correctly.
    - Go to **Settings > Update & Security > For developers**.
    - Turn on **Developer Mode**.
2.  **Node.js**: You need Node.js installed on your computer to run the build commands. Download it from [nodejs.org](https://nodejs.org/).
3.  **Download your Project**: Make sure you have all the files from this repository on your computer.

---

## 🌐 Part 2: Setting up your Remote Config
The "brain" of the installer is a file called `config.json`. Instead of keeping this inside the app, we keep it on your web server (VPS). This way, you can update your game anytime without making your players download a new installer.

1.  **The Server Link**: Open `main.js` and find this line near the top:
    ```javascript
    const CONFIG_URL = 'http://26.26.167.193/exotic/config.json';
    ```
    Change this to exactly where you will host your `config.json` file.
2.  **The Config File**: Take the `config.example.json` file, rename it to `config.json`, and upload it to your server.

---

## 📁 Part 3: Configuration Guide (Everything you can change)
Open the `config.json` on your server. Here is what every field does:

| Field | What it does |
| :--- | :--- |
| `installer_name` | The name shown in the top-left title bar. |
| `installer_icon` | Path to your icon (default is `renderer/exoicon.ico`). |
| `splash_logo_url` | The logo shown while the app is loading up. |
| `game_name` | Your server's main name. |
| `game_version` | Current version (e.g., "1.0.0"). |
| `client_url` | **Direct** download link to your game `.zip`. |
| `exe_name` | The name of your launcher (usually `Silkroad.exe`). |
| `logo_url` | Your server logo shown inside the app. |
| `backgrounds` | A list of links to your cool wallpapers for the background. |
| `news` | The scrolling text or news list in the sidebar. |
| `changelog` | What's new in this version. |

---

## 📦 Part 4: Building the EXE
When you are happy with your settings and branding, it's time to create the installer file for your players.

1.  **Install tools**: Open a terminal in the project folder and type:
    ```powershell
    npm install
    ```
2.  **Icon Check**: Make sure your custom icon is at `renderer/exoicon.ico`. 
3.  **Run the Build**: Type this command:
    ```powershell
    npm run build:win
    ```
4.  **Distribution**: Go to the `dist` folder. You will find a file like `ExoInstaller Setup.exe`. Give this to your players!

---

## 🧪 Part 5: Testing from Scratch
To see exactly what a new player sees when they open your app for the first time:
1.  **Clear App Data**: Delete the folder `%APPDATA%\exoinstaller`.
2.  **Clear Game folder**: Delete your previously installed game folder.
3.  **Launch**: Run `npm start` or open your built EXE.

---

## ⚖️ Official Note
This project is engineered for the Silkroad community by **Exotic**. All code architecture and UI designs are protected.

**Property of Exotic**  
*Confidential - 2026*
