var bgOffset = new Point(0, 0);
var cameraTarget = null;
var canvas;
var center = new Point(0, 0);
var currentEnemyDelay = 0;
var currentTeleport;
var currentText;
var drawables = new Array();
var enemies = new Array();
var focused = false;
var flatFolder;
var fullscreen; //boolean for if the game is fullscreen, or if it fits in the canvas size
var gameState = "LOADING"; //LOADING, START_MENU, GAME, PAUSE, END, TEXT
var images = {};
var level = 0;
var loaded_images = false;
var loaded_audio = false;
var infinity;
var killedBy = "";
var nextText = false;
var passed = 0;
var pause = false;
var physics = new Array();
var sounds = {};
var scale = 1;
var textTime;
var time;

var loop_id;

var BULLET_SPEED = 125;
var ENEMY_DELAY = 1000;
var METEOR_MAX_SPEED = 5;
var METEOR_POINTS = 5;
var ROCKET_SPEED = 125;
var SHIELD_COOLDOWN = 5000;
var SHIP_SPEED = .05;
var TELEPORT_DELAY = 60000;

var MAIN_FONT_SIZE = 72;
var SUBTITLE_SIZE = 32;
var STORY_SIZE = 17;

var METEOR_COLORS = ["Yellow", "Red", "Purple", "Lime", "Pink", "Orchid", "RoyalBlue"];

var preload_images = {
	Arrow: "/Down_Arrow.png",
	Background: "/Background.png",
	Enemy: "/Enemy.png",
	Player: "/Player.png",
	UI0: "/UI/0.png",
	UI1: "/UI/1.png",
	UI2: "/UI/2.png",
	UI3: "/UI/3.png",
	UI4: "/UI/4.png",
	UI5: "/UI/5.png",
	UI6: "/UI/6.png",
	UI7: "/UI/7.png",
	UI8: "/UI/8.png",
	UI9: "/UI/9.png",
	UI10: "/UI/10.png",
	UI11: "/UI/11.png",
	UI12: "/UI/12.png",
	UI13: "/UI/13.png",
	UI14: "/UI/14.png",
	UI15: "/UI/15.png"
};
var preload_audio = {
	GameOver: "/Audio/GameOver.wav",
	Explosion: "/Audio/Explosion.wav",
	Level1: "/Audio/Level1.wav",
	Level2: "/Audio/Level2.wav",
	Level3: "/Audio/Level3.wav",
	Lose: "/Audio/Lose.wav",
	Shoot: "/Audio/Laser_Shoot.wav",
	MainMenu: "/Audio/Title.wav"
};
var levelNames = ["Star Citizen", "Faster Than Light", "Starbound", "Mass Effect"];

function initFlatscape(can, location, fscreen) {
	canvas = can.getContext("2d");
	fullscreen = fscreen;
	flatFolder = location;

	if(fullscreen) {
		document.documentElement.style.overflow = 'hidden';
		document.body.scroll = "no";
	}

	var date = new Date();
	time = date.getMilliseconds();

	physics = new Array();
	enemies = new Array();
	drawables = new Array();

	document.addEventListener("keydown", function(event) {
		if(event.keyCode == 32) {
			if(gameState != "PAUSE") {
				gameState = "PAUSE";
			} else {
				gameState = "START_MENU";
			}
		}
	});

	canvas.canvas.addEventListener("click", function(event) {
		onFlatClick(event);
	});

	preloadImages(preload_images);
	preloadAudio(preload_audio)
	onFrame();
}

function draw() {
	updateBackground();
	for(var drawable of drawables.slice(0)) {
		drawable.draw();
	}

	if(gameState == "LOADING") {
		canvas.font = MAIN_FONT_SIZE + 'px "Main-Game"';
		canvas.fillText("Loading", getRelativeX(center) - canvas.measureText("Loading").width / 2, getRelativeY(center) + MAIN_FONT_SIZE * .32);
		return;
	}

	var teleportStage = Math.floor(currentTeleport / TELEPORT_DELAY * 15);
	if(isNaN(teleportStage)) teleportStage = 0;

	if(gameState != "START_MENU") canvas.drawImage(images["UI" + teleportStage], getRelativeX(center) - images["UI" + teleportStage].width / 2, 5);
}

function getRelativeX(point) {
	return canvas.canvas.width / 2 + point.x;
}

function getRelativeY(point) {
	return canvas.canvas.height / 2 + point.y;
}

function handleEnemies() {
	if(currentEnemyDelay <= 0) {
		currentEnemyDelay = ENEMY_DELAY + currentEnemyDelay;
		if((Math.random() > .21 || (level == 0 && gameState != "START_MENU"))) {
			new Meteor();
		} else {
			new EnemyShip();
		}
	}
	if(currentEnemyDelay > 0) currentEnemyDelay -= passed;

	for(var enemy of enemies.slice(0)) {
		if(enemy == null) {
			enemies.slice(enemies.indexOf(enemy), 1);
			continue;
		}
	}
}

function handlePhysics() {
	for(var phys of physics.slice(0)) {
		phys.physics(scale);
	}
}

function handleTime() {
	var date = new Date();
	var millis = date.getMilliseconds();
	if(millis < time) time -= 1000;
	passed = millis - time;
	time = date.getMilliseconds();
	scale = passed / 10;

	if(gameState != "GAME") return;

	currentTeleport += passed;
	if(currentTeleport > TELEPORT_DELAY) currentTeleport = TELEPORT_DELAY;
}

function hitDetect() {
	for(var phys of physics.slice(0)) {
		for(var _phys of physics.slice(0)) {
			if(phys == _phys) continue;
			if(phys.detectHit(_phys)) {
				if(phys.onHit === undefined) {
					console.log(phys.toString());
				}
				phys.onHit(_phys);
				if(_phys.onHit === undefined) {
					console.log(_phys.toString());
				}
				_phys.onHit(phys);
			}
		}
	}
}

function onFlatClick() {
	switch(gameState) {
		case "START_MENU":
			if(focused) startGame();
			else onFlatFocus();
			break;
	}
}

function onFlatFocus() {
	focused = true;
}

function onFrame() {
	if(fullscreen) refreshCanvasSize();
	infinity = Math.max(canvas.canvas.width, canvas.canvas.height) + 50;

	switch(gameState) {
		case "START_MENU":
		startMenu();
		break;

		case "GAME":
		playGame();
		break;

		case "PAUSE":
		doPause();
		break;

		case "END":
		gameOver();
		break;

		case "TEXT":
		writeText();
		break;
	}

	window.requestAnimationFrame(onFrame);
}

function doPause() {
	draw();
}

function preloadAudio(audio) {
	var loadedAudio = 0;
	var numAudio = Object.keys(audio).length;
	for(var aud in audio) {
		sounds[aud] = new Audio();
		sounds[aud].addEventListener('canplaythrough', function() {
			if(++loadedAudio >= numAudio) loaded_audio = true;
			if(loaded_images)  gameState = "START_MENU";
		});
		sounds[aud].type = 'audio/wav';
		sounds[aud].src = flatFolder + audio[aud];

	}
}

function preloadImages(images) {
	var loadedImages = 0;
	var numImages = Object.keys(images).length;
	for(var img in images) {
		this.images[img] = new Image();
		this.images[img].onload = function() {
			if(++loadedImages >= numImages) loaded_images = true;
			if(loaded_audio) gameState = "START_MENU";
		};
		this.images[img].src = flatFolder + images[img];
	}
}

function refreshCanvasSize() {
	canvas.canvas.width = window.innerWidth;
	canvas.canvas.height = window.innerHeight;
}

function startGame() {
	enemies.splice(0, enemies.length);
	physics.splice(0, physics.length);
	drawables.splice(0, drawables.length);

	player = new Player(new Point(0, 0));
	drawables.push(player);
	physics.push(player);
	cameraTarget = player;

	currentEnemyDelay = ENEMY_DELAY;

	var date = new Date();
	time = date.getMilliseconds();
	passed = 0;
	scale = 1;

	startText(0);
}

function startMenu() {
	playMusic("MainMenu");
	sounds["MainMenu"].volume = 0.3;
	
	handleTime();
	handleEnemies();
	handlePhysics();
	hitDetect();
	draw();

	var baseline = getRelativeY(center) + MAIN_FONT_SIZE * .32;
	canvas.fillStyle = "White";
	canvas.font = MAIN_FONT_SIZE + 'px "Main-Game"';
	canvas.fillText("Space Triangles", getRelativeX(center) - canvas.measureText("Space Triangles").width / 2, baseline);

	baseline += SUBTITLE_SIZE * .32 + 20;
	canvas.font = SUBTITLE_SIZE + 'px "Main-Game"';
	canvas.fillText("of Utter Deep Nine", getRelativeX(center) - canvas.measureText("of Utter Deep Nine").width / 2, baseline);

	if(focused) {
		baseline = canvas.canvas.height - STORY_SIZE - 30;
		canvas.font = STORY_SIZE + 'px "Main-Game"';
		canvas.fillText("click to continue", getRelativeX(center) - canvas.measureText("click to continue").width / 2, baseline);
	} else {
		baseline = canvas.canvas.height - SUBTITLE_SIZE - 30;
		canvas.font = SUBTITLE_SIZE + 'px "Main-Game"';
		canvas.fillText("Controls", getRelativeX(center) - canvas.measureText("Controls").width / 2, baseline);
		canvas.drawImage(images["Arrow"], getRelativeX(center) - canvas.measureText("Controls").width / 2 - 98 - 20, baseline - 55, 98, 110);
		canvas.drawImage(images["Arrow"], getRelativeX(center) + canvas.measureText("Controls").width / 2 + 20, baseline - 55, 98, 110);
	}
	
	if(cameraTarget == null || enemies.indexOf(cameraTarget) == -1 || cameraTarget instanceof Meteor || cameraTarget instanceof Projectile) {
		loop: for(var i = 0; i < 3; i++) {
			for(var phys of physics.slice(0)) {
				if(i < 1 && phys instanceof Meteor) continue;
				if(i < 2 && phys instanceof Projectile) continue;
				cameraTarget = phys;
				break loop;
			}
		}
	}
}

function startText(textLevel) {
	//TODO: text (maybe)
	//gameState = "TEXT";
	gameState = ;
	if(level > 0) playMusic("Level" + textLevel);
}

function updateBackground() {
	var x = cameraTarget == null ? canvas.canvas.width / 2 : cameraTarget.position.x;
	var y = cameraTarget == null ? canvas.canvas.height / 2 : cameraTarget.position.y;

	//console.log(cameraTarget.rotation + " " + cameraTarget.acceleration + " " + cameraTarget.velocity + " " + physics.indexOf(cameraTarget) + " " + cameraTarget.health);

	var limit = 250 < Math.min(canvas.canvas.width, canvas.canvas.height) / 2 ? 250 : Math.min(canvas.canvas.width, canvas.canvas.height) / 2 > 5 ? Math.min(canvas.canvas.width, canvas.canvas.height) / 2 - 5 : Math.min(canvas.canvas.width, canvas.canvas.height) / 2;

	if(x > canvas.canvas.width / 2 - limit) {			
		for(var _physics of physics.slice(0)) {
			_physics.position.x -= x - (canvas.canvas.width / 2 - limit);
		}
		bgOffset.x -= x - (canvas.canvas.width / 2 - limit);
	} else if(x < limit - canvas.canvas.width / 2) {			
		for(var _physics of physics.slice(0)) {
			_physics.position.x += limit - canvas.canvas.width / 2 - x;
		}
		bgOffset.x += limit - canvas.canvas.width / 2 - x;
	}

	if(y > canvas.canvas.height / 2 - limit) {
		for(var _physics of physics.slice(0)) {
			_physics.position.y -= y - (canvas.canvas.height / 2 - limit);
		}
		bgOffset.y -= y - (canvas.canvas.height / 2 - limit);
	} else if(y < limit - canvas.canvas.height / 2) {			
		for(var _physics of physics.slice(0)) {
			_physics.position.y += limit - canvas.canvas.height / 2 - y;
		}
		bgOffset.y += limit - canvas.canvas.height / 2 - y;
	}

	var dimension = 1000;
	if(bgOffset.x >= dimension) bgOffset.x -= dimension;
	if(bgOffset.x <= -dimension) bgOffset.x += dimension;
	if(bgOffset.y >= dimension) bgOffset.y -= dimension;
	if(bgOffset.y <= -dimension) bgOffset.y += dimension;

	for(var i = bgOffset.x > 0 ? -1 : 0; i * dimension + bgOffset.x < canvas.canvas.width; i++) {
		for(var j = bgOffset.y > 0 ? -1 : 0; j * dimension + bgOffset.y < canvas.canvas.height; j++) {
			canvas.drawImage(images["Background"], i * dimension + bgOffset.x, j * dimension + bgOffset.y, dimension, dimension);
		}
	}
}














//MATH

function angle(p1, p2, p3) {
	var AB = length(p2, p1);
	var BC = length(p2, p3);
	var AC = length(p3, p1);
	return Math.acos((sqr(BC) + sqr(AB) - sqr(AC)) / (2 * BC * AB));
}

function boundsX() {
	return canvas.canvas.width / 2;
}

function boundY() {
	return canvas.canvas.height / 2;
}

function circlePoint(length, angle) {
	return new Point(length * Math.sin(toRadians(angle)), length * Math.cos(toRadians(angle)));
}

function doIntersect(p1, p2, p3, p4) {
	if(Math.abs(p3.y - p1.y) < Math.abs(p3.y - p2.y)) {
		var temp = p1;
		p1 = p2;
		p2 = temp;
	}
	var a = angle(p4, p1, p2);
	var b = angle(p1, p4, p3);
	var c = toRadians(180 - toDegrees(b) - toDegrees(a));

	if(toDegrees(c) <= 0 || toDegrees(c) >= 180) return false;
	if(Math.abs((length(p4, p1) * Math.sin(a)) / Math.sin(c)) > length(p4, p3)) return false;
	if(Math.abs((length(p4, p1) * Math.sin(b)) / Math.sin(c)) > length(p1, p2)) return false;

	return true;
}

function hitboxCheck(boxPoint1, boxPoint2, point) {
	return (point.x > Math.min(boxPoint1.x, boxPoint2.x) && point.x < Math.max(boxPoint1.x, boxPoint2.x) && point.y > Math.min(boxPoint1.y, boxPoint2.y) && point.y < Math.max(boxPoint1.y, boxPoint2.y));
}

function insidePolygon(p, polygon) {
	if(polygon.length < 3) return false;

	var extreme = new Point(infinity, p.y);
	var count = 0
	var i = 0;

	do {
		var next = (i + 1) % polygon.length;
		if(doIntersect(polygon[i], polygon[next], p, extreme)) count++;
		i = next;
	} while(i != 0);

	return (count % 2 == 1);
}

function length(point1, point2) {
	return Math.sqrt(sqr(point1.x - point2.x) + sqr(point1.y - point2.y));
}

function orientation(p, q, r) {
	var val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y); 
	return val == 0 ? 0 : val > 0 ? 1 : 2;
}

function randomNegative(num) {
	if(Math.random() > .5) {
		num *= -1;
	}
	return num;
}

function randomPos() {
	var point = new Point(0, 0);
	if(Math.random() > .5) {
		point.x = randomNegative(canvas.canvas.width / 2 + 25);
		point.y = Math.random() * (canvas.canvas.height / 2 * 2) - canvas.canvas.height / 2;
	} else {
		point.x = Math.random() * (canvas.canvas.width / 2 * 2) - canvas.canvas.width / 2;
		point.y = randomNegative(canvas.canvas.height / 2 + 25);
	}
	return point;
}

function smallerHypot(adj, opp, targetHypot) {
	if(adj instanceof Point && opp instanceof Point) {
		var _temp1 = adj;
		var _temp2 = opp;
		adj = _temp1.x - _temp2.x;
		opp = _temp1.y - _temp2.y;
	} 
	var angle = Math.atan(opp / adj);
	var negative = 1;
	if(adj == 0) {
		if(opp == 0) {
			return new Point(0, 0);
		} else {
			negative = opp / Math.abs(opp);
		}
	} else {
		negative = adj / Math.abs(adj);
	}
	var returnee = new Point(Math.cos(angle) * targetHypot * negative, Math.sin(angle) * targetHypot * negative);
	return returnee;
}

function sqr(num) {
	return Math.pow(num, 2);
}

function toDegrees(rad) {
	return rad * (180 / Math.PI);
}

function toRadians(deg) {
	return deg * (Math.PI / 180);
}













//CLASS DEFINITIONS
Enemy.prototype = new Physicsable();
function Enemy() {
	Physicsable.call(this);
	drawables.push(this);
	enemies.push(this);
	physics.push(this);
}
Enemy.prototype.remove = function() {
	drawables.splice(drawables.indexOf(this), 1);
	enemies.splice(enemies.indexOf(this), 1);
	Physicsable.prototype.remove.call(this);
}

EnemyShip.prototype = new Enemy();
EnemyShip.prototype.constructor = EnemyShip;
function EnemyShip(weapons, position) {
	if(weapons === undefined) weapons = this.randomWeapon();
	if(position === undefined) position = randomPos();

	Enemy.call(this);

	this.health = 50;
	this.weapons = weapons;
	this.position = position;
	this.velocity = new Point(0, 0);
	this.acceleration = new Point(0, 0);
	this.rotation = 0;
	this.damage = 100;
	this.hasShield = (level > 2 || level == 0) && Math.random() > .5;
	if(EnemyShip.prototype.hasShield) this.shield = 35;
	this.target = this.findTarget();
}
EnemyShip.prototype.detectHit = function(source) {
	if(source instanceof Projectile && source.owner == this) return false;
	return source.position.distance(this.position) < this.shield ? true : source.position.distance(this.position) < 30;
}

EnemyShip.prototype.draw = function() {
	Physicsable.prototype.draw.call(this);

	canvas.save();
	canvas.translate(getRelativeX(this.position), getRelativeY(this.position));
	canvas.rotate(toRadians(this.rotation));
	canvas.drawImage(images["Enemy"], -15, -15, 30, 30);
	canvas.restore();
}
EnemyShip.prototype.findTarget = function() {
	if(gameState != "START_MENU") return player;
	if(enemies.length == 0) return null;

	var target = enemies[0];
	if(target == this) {
		if(enemies.length > 1) {
			return enemies[1];
		} else return null;
	}
	return  target;
}
EnemyShip.prototype.onHit = function(source) {
	if(this.hitBy.indexOf(source) != -1) return;
	this.hitBy.push(source);

	if(this.shield > 0) {
		this.shield = 0;
		this.shieldCooldown = SHIELD_COOLDOWN;
		return;
	}

	this.health -= source.damage;
	if(this.health <= 0) {
		sounds["Explosion"].play();
		this.remove();
	}
}
EnemyShip.prototype.physics = function(scale) {
	if(enemies.indexOf(this.target) == -1 || this.target == null) this.target = this.findTarget();

	if(this.target == null || enemies.indexOf(this.target) == -1) {
		this.acceleration = new Point(0, 0);
		Physicsable.prototype.physics.call(this, scale);
		console.log("I can't find a target!");
		return;
	}

	this.rotation = toDegrees(Math.atan((this.target.position.y - this.position.y) / (this.target.position.x - this.position.x))) - 90;
	if (this.target.position.x < this.position.x) this.rotation -= 180;
	this.rotation *= -1;

	if(isNaN(this.rotation)) this.rotation = 0;

	this.acceleration = new Point(0, 0);
	var point = smallerHypot(this.target.position.x - this.position.x, this.target.position.y - this.position.y, SHIP_SPEED / 2);
	if(this.position.distance(this.target.position) >= 75) {
		this.acceleration.add(point);
	} else if(this.position.distance(this.target.position) <= 50) {
		this.acceleration.subtract(point);
		this.acceleration.subtract(point);
	} else {
		this.acceleration.divide(2);

		var angle = this.rotation - 90;
		if(angle < 0) angle += 360;
		var _point = circlePoint(SHIP_SPEED, angle);

		if(this.velocity.clone().distance(_point) <= point.clone().distance(_point)) {
			this.acceleration.add(circlePoint(SHIP_SPEED / 2.5, angle));
		} else {
			this.acceleration.add(circlePoint(SHIP_SPEED / 2.5, angle + 180));
		}
	}
	if(this.velocity.distance(new Point(0, 0)) > SHIP_SPEED * 1000) {
		this.acceleration.subtract(this.velocity.clone().divide(1.3));
	}
	if(this.acceleration.distance(new Point(0, 0)) > SHIP_SPEED * 3) {
		this.acceleration.divide(2);
	}

	Physicsable.prototype.physics.call(this, scale);

	//console.log(this.acceleration.toString() + " " + this.velocity.toString() + " " + this.position.toString(true));

	for(var weapon of this.weapons) {
		weapon.physics(scale);
		console.log("Am doing a thing: " + weapon.toString());
		if(weapon.cooldown <= 0) {
			weapon.shoot(this);
		}
	}

	if(this.shieldCooldown > 0) this.shieldCooldown -= scale * 10;
	if(this.shieldCooldown <= 0) {
		this.shield = 35;
	}
}
EnemyShip.prototype.randomWeapon = function() {
	var weapons = new Array();
	weapons.push(Math.random() > .5  && level != 1 ? new WeaponRocket(800) : new WeaponBullet(600));
	return weapons;
}
EnemyShip.prototype.toString = function() {
	return "Ship";
}

Meteor.prototype = new Enemy();
Meteor.prototype.constructor = Meteor;
function Meteor(color, pos, velocity, size, rotation) {
	if(color === undefined) color = METEOR_COLORS[Math.floor(Math.random() * METEOR_COLORS.length)];
	if(pos === undefined) pos = randomPos();
	if(velocity === undefined) velocity = smallerHypot(pos.x * -1, pos.y * -1, METEOR_MAX_SPEED).deviate(2, METEOR_MAX_SPEED);
	if(size === undefined) size = Math.random() < .001 ? Math.random() * 50 + 300 : Math.random() * 90 + 20; //TODO make size more appropriate
	if(rotation === undefined) rotation = Math.random() * 5 - 2.5;

	Enemy.call(this);

	this.acceleration = new Point(0, 0);
	this.color = color;
	this.velocity = velocity;
	this.position = pos;
	this.size = size;
	this.rotation = rotation;
	this.health = size / 1.5;
	this.damage = size;

	this.initialise();
}
Meteor.prototype.detectHit = function(source) {
	if(hitboxCheck(new Point(this.position.x + this.size, this.position.y + this.size), new Point(this.position.x - this.size, this.position.y - this.size), source.position)) return insidePolygon(source.position, this.getRealPoints());
	return false;
}
Meteor.prototype.getRealPoints = function() {
	var points = new Array();
	for(var i = 0; i < METEOR_POINTS; i++) {
		points[i] = this.points[i].clone().add(this.position);
	}
	return points;
}
Meteor.prototype.draw = function() {
	Physicsable.prototype.draw.call(this);

	var points = this.getRealPoints();

	for(var point of points) {
		point.x = getRelativeX(point);
		point.y = getRelativeY(point);
	}
	
	var i = 0;
	var next = 0;

	canvas.beginPath();
	canvas.moveTo(points[0].x, points[0].y);
	do {
		next = (i + 1) % this.points.length;
		canvas.lineTo(points[next].x, points[next].y);
		i = next;
	} while(i != 0)

	canvas.fillStyle = this.color;
	//canvas.strokeStyle = this.color;
	canvas.fill();
	//canvas.stroke();
	canvas.closePath();

}
Meteor.prototype.initialise = function() {
	this.points = new Array();
	var degrees = 180 * (METEOR_POINTS - 2);
	degrees -= degrees / 3;
	var tempDegrees = 0;
	var length = this.size + (this.size / 2);
	this.points[0] = new Point(Math.random() * (this.size - 0.1) + 0.1, Math.random() * (this.size - 0.1) + 0.1);
	this.points[1] = new Point(Math.random() * (this.size * 2) - this.size, Math.random() * (this.size - 0.1) - this.size - 0.1);

	for(var i = 2; i < METEOR_POINTS; i++) {
		tempDegrees = Math.random() * Math.min(180, degrees - 30);
		length = Math.random() * (this.size) + (this.size / 2);
		this.points[i] = new Point(Math.cos(tempDegrees) * length + this.points[i - 1].x, Math.sin(tempDegrees) * length + this.points[i - 1].y);
		this.points[i].x = this.points[i].x > this.size ? this.size : this.points[i].x < -this.size ? -this.size : this.points[i].x;
		this.points[i].y = this.points[i].y > this.size ? this.size : this.points[i].y < -this.size ? -this.size : this.points[i].y;
		for(var j = i - 1; j >= 0 && i != METEOR_POINTS - 1; j--) {
			if(this.points[j].equals(this.points[i])) {					
				this.initialise();
				return;
			}
		}

		degrees -= tempDegrees;
	}

	//Check for any intersecting lines
	//If any lines intersect, remake meteor
	for(var i = 2; i < METEOR_POINTS; i++) {
		for(var j = i - 1; j > 0 ; j--) {
			if(doIntersect(this.points[i], this.points[(i + 1) % METEOR_POINTS], this.points[j], this.points[j - 1])) {
				this.initialise();
				return;
			}
		}
	}

	//Center the meteor
	var x = 0;
	var y = 0;

	for(var point of this.points) {
		x += point.x;
		y += point.y;
	}

	x /= this.points.length;
	y /= this.points.length;

	for(var point of this.points) {
		point.x -= x;
		point.y -= y;
	}
}
Meteor.prototype.physics = function(scale) {
	Physicsable.prototype.physics.call(this, scale);
	if(Math.abs(this.position.x) >= canvas.canvas.width / 2 + 100 || Math.abs(this.position.y) >= canvas.canvas.height / 2 + 100) this.remove.call(this);
	this.rotate(this.rotation * scale);
}
Meteor.prototype.onHit = function(source) {
	if(this.hitBy.indexOf(source) != -1) return;
	this.hitBy.push(source);
	this.health -= source.damage;

	if(source instanceof Meteor) this.health -= source.damage * 3;
	if(this.health >= 1) return;

	sounds["Explosion"].play();
	this.remove();
	if(this.size < 40) return;

	var meteors = new Array();
	for (var i = 0; i < 2; i++) {
		var newPos = this.randomRelativePos();
		var newVelocity = smallerHypot(this.position.x - newPos.x, this.position.y - newPos.y, METEOR_MAX_SPEED / 1.5);
		var _meteor = new Meteor(this.color, newPos, newVelocity, this.size / 2);
		meteors.push(_meteor);
	}
	for(var _meteor of meteors) {
		for(var __meteor of meteors) {
			if(_meteor == __meteor) continue;
			_meteor.hitBy.push(__meteor);
		}
	}
}
Meteor.prototype.randomRelativePos = function() {
	return new Point(this.position.x + randomNegative(Math.random() * 30 + 10), this.position.y + randomNegative(Math.random() * 30 + 10))
}
Meteor.prototype.rotate = function() {
	for(var point of this.points) {
		var x = point.x * Math.cos(toRadians(this.rotation)) + point.y * Math.sin(toRadians(this.rotation));
		var y = -point.x * Math.sin(toRadians(this.rotation)) + point.y * Math.cos(toRadians(this.rotation));
		point.x = x;
		point.y = y;
	}
}
Meteor.prototype.toString = function() {
	return "Meteor";
}

function Physicsable() {
	this.hasShield = false;
	this.shield = 0;
	this.shieldCooldown = 0;
	this.hitBy = new Array();
}
Physicsable.prototype.draw = function() {
	if(!this.hasShield) return;
	canvas.beginPath();
	canvas.arc(getRelativeX(this.position), getRelativeY(this.position), this.shield, 0, 2 * Math.PI, false);
	canvas.strokeStyle = "blue";
	canvas.fillStyle = null;
	canvas.stroke();
	canvas.closePath();
}
Physicsable.prototype.physics = function(scale) {
	if(this.velocity === undefined || this.velocity.isNaN()) this.velocity = new Point(0, 0);
	if(this.acceleration === undefined || this.acceleration.isNaN()) this.acceleration = new Point(0, 0);
	if(this.position === undefined || this.position.isNaN()) this.position = new Point(0, 0);

	this.velocity.x += this.acceleration.x * scale;
	this.velocity.y += this.acceleration.y * scale;
	this.position.x += this.velocity.x * scale;
	this.position.y += this.velocity.y * scale;
}
Physicsable.prototype.remove = function() {
	physics.splice(physics.indexOf(this), 1);
}

function Player(position) {
	this.weapons = new Array();

	this.acceleration = new Point(0, 0);
	this.position = position;
	this.velocity = new Point(0, 0);
	this.rotation = 0;
	this.health = 100;
	this.damage = 100;

	weapons.push(new WeaponBullet(300));
}
Player.prototype.detectHit = function(source) {
	if(source instanceof Projectile && source.source.owner == this) {
		return false;
	}
	return source.position.distance(this.position) < this.shield ? true : source.position.distance(this.position) < 6; //TODO hit detect
}
Player.prototype.draw = function() {
	canvas.drawImage(images["Player"], 0, 0);
}
Player.prototype.nextLevel = function() {
	this.position.x = 0;
	this.position.y = 0;
	this.velocity.x = 0;
	this.velocity.y = 0;
	this.acceleration.x = 0;
	this.acceleration.y = 0;

	this.health = 100;

	drawables.push(this);
	physics.push(this);
	cameraTarget = this;
	switch(level) {
		case 2:
		this.weapons[0] = new WeaponBullet(150);
		break;
		case 3:
		this.weapons[1] = new WeaponRocket(750);
		break;
		case 4:
		this.hasShield = true;
		this.shield = 35;
		break;
	}
}
Player.prototype.onHit = function(source) {
	if(this.hitBy.indexOf(source) != -1) return;
	this.hitBy.push(source);
	if(this.shield > 0) {
		this.shield = 0;
		this.shieldCooldown = SHIELD_COOLDOWN;
		return;
	}
	this.health -= source.damage;

	if(this.health <= 0) startGameOver(source); //TODO make this function
}
Player.prototype.physics = function(scale) {
	Physicsable.prototype.physics.call(this, scale);

	//Figure out which direction the player is pointing, in degrees
	/*this.rotation = toDegrees(Math.atan((StdDraw.mouseY() - position.y)/(StdDraw.mouseX() - position.x))) - 90; //TODO Get mouse
	if (StdDraw.mouseX() < position.x) this.rotation -= 180;
	this.rotation *= -1;
	
	if(isNaN(this.rotation)) this.rotation = 0;
	
	if(gameState != "GAME") return;
	for(var weapon of this.weapons) {
		if(weapon == null) continue;
		weapon.physics(scale);
		if(weapon.cooldown <= 0 && StdDraw.mousePressed()) { //TODO mouse pressed
			weapon.shoot(this);
		}
	}
	
	if(this.shieldCooldown > 0) this.shieldCooldown -= scale * 10;
	if(this.shieldCooldown <= 0) {
		this.shield = 10;
	}*/
}
Player.prototype.remove = function() {}

function Point(x, y) {
	this.x = x;
	this.y = y;
}
Point.prototype.add = function(add) {
	this.x += add.x;
	this.y += add.y;
	return this;
}
Point.prototype.clone = function() {
	return new Point(this.x, this.y);
}
Point.prototype.deviate = function(deviation, max) {
	this.x += Math.random() * (deviation * 2) - deviation;
	this.y += Math.random() * (deviation * 2) - deviation;

	return smallerHypot(this.x, this.y, max);
}
Point.prototype.distance = function(point) {
	return Math.sqrt(sqr(point.x - this.x) + sqr(point.y - this.y));
}
Point.prototype.divide = function(divid) {
	this.x /= divid;
	this.y /= divid;
	return this;
}
Point.prototype.equals = function(obj) {
	if(obj instanceof Point) {
		return obj.x == this.x && obj.y == this.y;
	}
	return false;
}
Point.prototype.isNaN = function() {
	return isNaN(this.x) || isNaN(this.y);
}
Point.prototype.multiply = function(multiple) {
	this.x *= multiple;
	this.y *= multiple;
	return this;
}
Point.prototype.subtract = function(subtract) {
	this.x -= subtract;
	this.y -= subtract;
	return this;
}
Point.prototype.toString = function(floor) {
	if(floor === undefined) floor = false;
	if(floor) return "[Point at " + Math.floor(this.x) + ", " + Math.floor(this.y) + "]";
	else return "[Point at " + this.x + ", " + this.y + "]";
}

Projectile.prototype = new Physicsable();
Projectile.prototype.constructor = Projectile;
function Projectile() {
	this.distance = 0;
}
Projectile.prototype.onHit = function(source) {
	if(this.hitBy.indexOf(source) != -1) return;
	this.hitBy.push(source);
	this.remove();
}
Projectile.prototype.physics = function(scale) {
	Physicsable.prototype.physics.call(this, scale);
	this.distance += this.velocity.distance(new Point(0, 0));
}
Projectile.prototype.remove = function() {
	Physicsable.prototype.remove.call(this);
	drawables.splice(drawables.indexOf(this), 1)
}
Projectile.prototype.toString = function() {
	return "Projectile";
}

ProjectileBullet.prototype = new Projectile();
ProjectileBullet.prototype.constructor = ProjectileBullet;
function ProjectileBullet(position, velocity, damage, source) {
	this.acceleration = new Point(0, 0);
	this.position = position;
	this.velocity = velocity;
	this.damage = damage;
	this.source = source;

	drawables.push(this);
	physics.push(this);
}
ProjectileBullet.prototype.detectHit = function(source) {
	if(source == this.source.owner) return false;
	if(source instanceof Projectile && source.source.owner == this.source.owner) return false;
	if(source == null) return false;

	return source.position.distance(this.position) <= .9; //TODO better detecthit
}
ProjectileBullet.prototype.draw = function() {
	canvas.beginPath();
	canvas.arc(getRelativeX(this.position), getRelativeY(this.position), 3, 0, 2 * Math.PI, false);
	canvas.fillStyle = "yellow";
	canvas.fill();
	canvas.closePath;
}
ProjectileBullet.prototype.physics = function(scale) {
	Physicsable.prototype.physics.call(this, scale);
	if (this.distance >= 300) { 
		drawables.splice(drawables.indexOf(this), 1);
		physicsAddition.put(this, false);
	}
}
ProjectileBullet.prototype.toString = function() {
	return "Projectile Bullet";
}

ProjectileRocket.prototype = new Projectile();
ProjectileRocket.prototype.constructor = ProjectileRocket;
function ProjectileRocket(position, velocity, damage, source) {
	this.detectHit = function(source) {
		if(source == this.source.owner) return false;
		if(source instanceof Projectile && source.source.owner == this.source.owner) return false;
		if(source == null) return false;

		return source.position.distance(this.position) <= 1.5; //TODO better detecthit
	}

	this.draw = function() {
		canvas.beginPath();
		canvas.arc(getRelativeX(this.position), getRelativeY(this.position), 5, 0, 2 * Math.PI, false);
		canvas.fillStyle = "green";
		canvas.fill();
		canvas.closePath;
	}

	this.findTarget = function() {
		if(physics.length == 0) return;
		var targets = new Array();
		for(var i = 45; i <= 360; i += 45) {
			for(var _target of physics) {
				if(_target instanceof Projectile) continue;
				if(_target == this.source.owner) continue;
				
				var _rotation = toDegrees(Math.atan((_target.position.y - this.position.y)/(_target.position.x - this.position.x))) - 90;
				if (_target.position.x < this.position.x) _rotation -= 180;
				_rotation *= -1;				
				if(isNaN(_rotation)) _rotation = 0;
				
				if(Math.abs(this.rotation - _rotation) <= i) {
					targets.push(_target);
				}
			}			
			if(targets.length > 0) break;			
		}
		this.target = null;
		if(targets.length > 0) {
			for(var _target of targets) {
				if(this.target == null) {
					this.target = _target;
				} else {
					if(this.position.distance(_target.position) < this.position.distance(this.target.position)) {
						this.target = _target;
					}
				}
			}
		}
	}

	this.physics = function(scale) {
		Physicsable.prototype.physics.call(this, scale);
		if (this.position.distance(this.source.owner.position) >= 2000 || this.distance >= 2500) { 
			drawables.splice(drawables.indexOf(this), 1);
			physics.splice(physics.indexOf(this), 1);
			return;
		}
		if(drawables.indexOf(this) == -1) return;			
		if(physics.indexOf(this.target) == -1) this.findTarget();
		if(this.target == null) return;
		this.acceleration = smallerHypot(this.target.position.x - this.position.x, this.target.position.y - this.position.y, ROCKET_SPEED / 600);
		
		if(this.velocity.distance(new Point(0, 0)) >= ROCKET_SPEED / 15) {
			this.acceleration.add(this.velocity.clone().divide(-4));
		}
	}

	this.toString = function() {
		return "Projectile Rocket";
	}

	this.acceleration = new Point(0, 0);
	this.position = position;
	this.velocity = velocity;
	this.damage = damage;
	this.source = source;
	this.rotation = source.owner.rotation;

	drawables.push(this);
	physics.push(this);

	this.findTarget();

	if(this.target == null) return;
	this.velocity = smallerHypot(this.position, this.target.position, this.velocity.distance(new Point(0, 0)));
}

function Weapon(baseCooldown) {
	this.baseCooldown = baseCooldown;
	this.cooldown = baseCooldown;
}
Weapon.prototype.physics = function(scale) {
	if(this.cooldown <= 0) {
		this.cooldown = 0;
		return;
	}
	this.cooldown -= scale * 10;
}
Weapon.prototype.shoot = function(shooter) {
	this.cooldown = this.baseCooldown + this.cooldown;
	this.owner = shooter;
}
Weapon.prototype.toString = function() {
	return "Generic Weapon";
}

WeaponBullet.prototype = new Weapon();
WeaponBullet.prototype.constructor = WeaponBullet;
function WeaponBullet(baseCooldown) {
	Weapon.call(this, baseCooldown);

	this.bulletSpeed = BULLET_SPEED;
	this.damage = 40;
}
WeaponBullet.prototype.shoot = function(shooter) {
	Weapon.prototype.shoot.call(this, shooter);
	//FMath.playSound("Laser_Shoot0"); TODO play sound
	console.log("Am shooting a thing");
	new ProjectileBullet(shooter.position.clone(), circlePoint(this.bulletSpeed / 10, shooter.rotation), this.damage, this);
}
WeaponBullet.prototype.toString = function() {
	return "Weapon Bullet";
}

WeaponRocket.prototype = new Weapon();
WeaponRocket.prototype.constructor = WeaponRocket;
function WeaponRocket(baseCooldown) {
	Weapon.call(this, baseCooldown);

	this.bulletSpeed = ROCKET_SPEED;
	this.damage = 20;
}
WeaponRocket.prototype.shoot = function(shooter) {
	Weapon.prototype.shoot.call(this, shooter);
	//FMath.playSound("Laser_Shoot0"); TODO play sound
	var rocket = new ProjectileRocket(shooter.position.clone(), circlePoint(this.bulletSpeed / 10, shooter.rotation), this.damage, this);
	if(rocket.target == null) rocket.remove();
}
WeaponRocket.prototype.toString = function() {
	return "Weapon Rocket";
}
