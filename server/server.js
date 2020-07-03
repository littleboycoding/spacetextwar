const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });
const playerState = [];
const meteors = [];
let meteorsID = 0;
let playerID = 0;

function random(min, max) {
	return Math.random() * (max - min) + min;
}

function meteorSpawner() {
	setTimeout(() => {
		console.log("New meteor spawned");
		const newMeteors = {
			x: Math.floor(random(10, 91)),
			scale: random(0.5, 1),
			id: meteorsID++
		};
		meteors.push(newMeteors);
		wss.clients.forEach(client => {
			client.send(
				JSON.stringify({ event: "meteor_spawn", data: newMeteors })
			);
		});
		meteorSpawner();
	}, Math.random() * 5000 + 1000);
}

wss.on("connection", ws => {
	if (meteors.length === 0) {
		meteorSpawner();
	}
	playerID++;
	let newPlayer = {
		id: playerID,
		x: random(10, 90),
		y: 5
	};
	playerState.push(newPlayer);
	ws.on("message", msg => {
		const parsedMSG = JSON.parse(msg);
		if (parsedMSG.event === "move") {
			const playerData = parsedMSG.data;
			const movingPlayer =
				playerState[
					playerState.findIndex(player => player.id === playerData.id)
				];

			if (movingPlayer) {
				movingPlayer.x = playerData.x;
				movingPlayer.y = playerData.y;

				wss.clients.forEach(client => {
					if (client !== ws && client.readyState === WebSocket.OPEN) {
						client.send(
							JSON.stringify({ event: "move", data: playerData })
						);
					}
				});
			}
		}
		if (parsedMSG.event === "shoot") {
			const playerData = parsedMSG.data;
			//const shootingPlayer = playerState[playerData.id - 1];

			wss.clients.forEach(client => {
				if (client !== ws && client.readyState === WebSocket.OPEN) {
					client.send(
						JSON.stringify({ event: "shoot", data: playerData })
					);
				}
			});
		}

		if (parsedMSG.event === "crashed") {
			playerState.splice(
				playerState.findIndex(
					player => player.id === parsedMSG.data.id
				),
				1
			);

			wss.clients.forEach(client => {
				if (client !== ws && client.readyState === WebSocket.OPEN) {
					client.send(
						JSON.stringify({
							event: "crashed",
							data: {
								id: parsedMSG.data.id
							}
						})
					);
				}
			});

			setTimeout(() => {
				playerState.push({
					id: parsedMSG.data.id,
					x: 50,
					y: 5
				});
				wss.clients.forEach(client => {
					if (client.readyState === WebSocket.OPEN) {
						client.send(
							JSON.stringify({
								event: "respawn",
								data: {
									id: parsedMSG.data.id
								}
							})
						);
					}
				});
			}, 3000);
		}
	});

	//Indicate other already joined player that new player has joined.
	wss.clients.forEach(client => {
		if (client !== ws && client.readyState === WebSocket.OPEN) {
			client.send(
				JSON.stringify({ event: "player_join", data: newPlayer })
			);
		}
	});

	//Send initial data.
	ws.send(
		JSON.stringify({
			event: "initial",
			myid: playerID,
			data: playerState
		})
	);
});

console.log("Listening on 8080");
