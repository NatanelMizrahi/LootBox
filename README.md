# LootBox - Video Game Powered Vending Machine
![logo_400x225](https://user-images.githubusercontent.com/20489303/171957528-f7a0ebe9-167a-4eea-a11d-df167d6c040a.png)

# Preview
https://user-images.githubusercontent.com/20489303/171957173-5a7c6741-e84b-4c2d-b55b-c48a242bb2ef.mp4

https://user-images.githubusercontent.com/20489303/171957115-3b63e3b8-3910-479c-9fd9-ed29bbdea54e.mp4

https://user-images.githubusercontent.com/20489303/171957104-989f0139-fdeb-4ddb-9ffe-724b10d26e8c.mp4

https://user-images.githubusercontent.com/20489303/171957167-4c763e7f-a707-41ed-83f5-9d001d7e9d77.mp4




# 👩‍🔬👨‍🔬 Installation

```bash
git clone https://github.com/NatanelMizrahi/lootbox.git
cd lootbox
python3 -m pip install requirements.txt
```

# 👟 Run The Server

```bash
python3 server.py 
```

# 🕹 How to Play

### 🎮 Connect A Gamepad

Any USB gamepad should do the trick

### 💻 Open your browser

Open any of these links in your browser after running the server:

* [Flaming Tower](https://localhost:5000/game/tower)
* [Flappy Burner](https://localhost:5000/game/flappy)
* [Guacamole](https://localhost:5000/game/guacamole)
* [Pickle Rick Pong](https://localhost:5000/game/pong)

##### Notes

* If you insist, you may play without a gamepad ⌨. Just set `GAMEPAD_ACTIVE = false;`
  within [common.js](static/common/common.js) and rerun the server.
  
