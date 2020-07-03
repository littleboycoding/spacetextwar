//WebSocket server configuration
const protocol = "ws";
const host = "localhost";
const port = "8080";

let myID;
const playerList = [];
const meteors = [];

document.body.onkeyup = function (event) {
	const myPlayer =
		playerList[playerList.findIndex(player => player.id === myID)];

	if (myPlayer) {
		if (event.key === " ") {
			myPlayer.shoot();
			ws.send(
				JSON.stringify({
					event: "shoot",
					data: { id: myID, x: myPlayer.x, y: myPlayer.y }
				})
			);

			return;
		}

		if (event.key === "ArrowLeft" && myPlayer.x > 0) {
			myPlayer.setX(myPlayer.x - 2);
		}
		if (event.key === "ArrowRight" && myPlayer.x < 100) {
			myPlayer.setX(myPlayer.x + 2);
		}
		if (event.key === "ArrowUp" && myPlayer.y < 90) {
			myPlayer.setY(myPlayer.y + 2);
		}
		if (event.key === "ArrowDown" && myPlayer.y > 5) {
			myPlayer.setY(myPlayer.y - 2);
		}

		ws.send(
			JSON.stringify({
				event: "move",
				data: { id: myID, x: myPlayer.x, y: myPlayer.y }
			})
		);
	}
};

class Spacecraft {
	constructor(id, x, y) {
		this.id = id;
		this.x = x;
		this.y = y;
		this.frame = 0;
		this.sprite = [
			` /\\
/_${id}\\
 |`,
			` /\\
/_${id}\\
  |`
		];

		const player = document.createElement("div");
		player.innerHTML = this.sprite[this.frame];
		player.className = "player";
		player.id = "p" + id;
		document.getElementById("canvas").appendChild(player);
		this.instance = document.getElementById("p" + id);

		//Set initial position
		this.setPos(x, y);

		//Animation
		this.animation = setInterval(() => {
			if (this.frame >= this.sprite.length) this.frame = 0;
			this.instance.innerHTML = this.sprite[this.frame++];
		}, 120);
	}

	setPos(x, y) {
		this.x = x;
		this.y = y;
		this.instance.style.left = this.x + "%";
		this.instance.style.bottom = this.y + "%";
	}

	setX(x) {
		this.x = x;
		this.instance.style.left = this.x + "%";
	}

	setY(y) {
		this.y = y;
		this.instance.style.bottom = this.y + "%";
	}

	shoot() {
		new Bullet(this.id, this.x, this.y, this.shootCount++);
	}

	destroy() {
		clearInterval(this.animation);
		this.instance.remove();
		playerList.splice(
			playerList.findIndex(player => player.id === this.id),
			1
		);
	}
}

class Bullet {
	constructor(id, x, y) {
		this.id = id;
		this.x = x;
		this.y = y + 10;

		this.instance = document.createElement("div");
		this.instance.innerHTML = "|";
		this.instance.className = "bullet";
		this.instance.style.left = this.x + "%";
		this.instance.style.bottom = this.y + "%";

		document.getElementById("canvas").appendChild(this.instance);

		this.bulletForward = setInterval(() => {
			if (this.y < 100) {
				this.forward();
			} else {
				this.destroy();
			}
		}, 30);
	}

	forward() {
		this.instance.style.bottom = this.y++ + "%";
		meteors.forEach(meteor => {
			const boxWidth = 178.81 * meteor.scale;
			const boxHeight = 195 * meteor.scale;
			const hitboxY = meteor.y + ((195 - boxHeight) / 2 / 500) * 100;
			const hitboxX = meteor.x + ((178.81 - boxWidth) / 2 / 500) * 100;
			const hitboxHeight = (boxHeight / 500) * 100;
			const hitboxWidth = (boxWidth / 500) * 100;

			if (
				100 - this.y <= hitboxY + hitboxHeight &&
				this.x <= hitboxX + hitboxWidth &&
				this.x >= hitboxX
			) {
				meteor.destroy();
				this.destroy();
			}
		});
	}
	destroy() {
		clearInterval(this.bulletForward);
		this.instance.remove();
	}
}

class Meteor {
	constructor(x, scale, id) {
		this.sprite = `          ___---___
      .--\\        --.
    ./.;_.\\     __/~ \\.
   /;  / \\\`-'  __\\    .\\
  / ,--'     / .   .;   \\
 | .|       /       __   |
|__/    __ |  . ;   \\ | . |
|      /  \\\\_    . ;| \\___|
|      \\  .~\\\\___,--'     |
 |     | . ; ~~~~\\_    __|
  \\    \\   .  .  ; \\  /_/
   \\   /         . |  ~/
    ~\\ \\   .      /  /~
      ~--___ ; ___--~
             ---`;
		this.id = id;
		this.x = x;
		this.y = -100;
		this.scale = scale;
		this.instance = document.createElement("div");
		this.instance.innerHTML = this.sprite;
		this.instance.className = "meteor";
		this.instance.style.left = this.x + "%";
		this.instance.style.top = this.y + "%";
		this.instance.style.transform = `scale(${this.scale})`;
		document.getElementById("canvas").appendChild(this.instance);

		this.fallForward = setInterval(() => {
			if (this.y < 100) {
				this.fall();
			} else {
				this.destroy();
			}
		}, 60);
	}
	fall() {
		this.y++;
		this.instance.style.top = this.y + "%";
		const boxWidth = 178.81 * this.scale;
		const boxHeight = 195 * this.scale;
		const hitboxY = this.y + ((195 - boxHeight) / 2 / 500) * 100;
		const hitboxX = this.x + ((178.81 - boxWidth) / 2 / 500) * 100;
		const hitboxHeight = (boxHeight / 500) * 100;
		const hitboxWidth = (boxWidth / 500) * 100;

		playerList.forEach(player => {
			if (
				100 - player.y - (39 / 500) * 100 <= hitboxY + hitboxHeight &&
				100 - player.y - (39 / 500) * 100 >= hitboxY &&
				player.x <= hitboxX + hitboxWidth &&
				player.x >= hitboxX
			) {
				player.destroy();
				this.destroy();
				ws.send(
					JSON.stringify({
						event: "crashed",
						data: { id: player.id }
					})
				);
			}
		});
	}

	destroy() {
		clearInterval(this.fallForward);
		meteors.splice(
			meteors.findIndex(meteor => meteor.id === this.id),
			1
		);
		this.instance.remove();
	}
}

const ws = new WebSocket(`${protocol}://${host}:${port}`);
ws.onopen = () => console.log("Connected");
ws.onmessage = msg => {
	const parsedMSG = JSON.parse(msg.data);

	if (parsedMSG.event === "initial") {
		myID = parsedMSG.myid;
		parsedMSG.data.forEach(({ id, x, y }) => {
			playerList.push(new Spacecraft(id, x, y));
		});
		playerList[playerList.length - 1].instance.style.color = "#F00";
	}

	if (parsedMSG.event === "player_join") {
		console.log("New player joined");
		const { id, x, y } = parsedMSG.data;
		playerList.push(new Spacecraft(id, x, y));
		meteors.forEach((meteor, index) => {
			setTimeout(() => meteor.destroy(), index * 50);
		});
	}

	if (parsedMSG.event === "move") {
		const playerData = parsedMSG.data;
		const movingPlayer =
			playerList[
				playerList.findIndex(player => player.id === playerData.id)
			];

		movingPlayer.setPos(playerData.x, playerData.y);
	}

	if (parsedMSG.event === "shoot") {
		const playerData = parsedMSG.data;
		const shootingPlayer =
			playerList[
				playerList.findIndex(player => player.id === playerData.id)
			];

		shootingPlayer.shoot(playerData.id, playerData.x, playerData.y);
	}

	if (parsedMSG.event === "meteor_spawn") {
		meteors.push(
			new Meteor(
				parsedMSG.data.x,
				parsedMSG.data.scale,
				parsedMSG.data.id
			)
		);
	}

	if (parsedMSG.event === "respawn") {
		if (
			!playerList[
				playerList.findIndex(player => player.id === parsedMSG.data.id)
			]
		)
			playerList.push(new Spacecraft(parsedMSG.data.id, 50, 5));
		if (parsedMSG.data.id === myID)
			playerList[playerList.length - 1].instance.style.color = "#F00";
	}

	if (parsedMSG.event === "crashed") {
		let player =
			playerList[
				playerList.findIndex(player => player.id === parsedMSG.data.id)
			];
		if (player) {
			player.destroy();
		}
	}
};

console.log("game.js loaded");
