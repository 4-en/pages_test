const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // adjust resolution for mobile
    if (window.innerWidth < 720) {
        canvas.width = 720;
        let aspectRatio = window.innerWidth / window.innerHeight;
        canvas.height = 720 / aspectRatio;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
    } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.width = '';
        canvas.style.height = '';
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function RandomGenerator(seed) {
    this.seed = seed;
    this.state = seed;
    this.a = 1664525;
    this.c = 1013904223;
    this.m = Math.pow(2, 32);

    this.next = function () {
        this.state = (this.a * this.state + this.c) % this.m;
        return this.state;
    }
}
let player, stars, lastStarDrop, score, lives, gameOver, keys, hatStack, dynamite_img, dynamites, generator, hit_sound, death_sound, music, catch_sound, tilt, high_alch_sound;

function initializeGame() {
    player = {
        x: canvas.width / 2,
        y: canvas.height - 100,
        width: 90,
        height: 110,
        dx: 1.0 * canvas.width,
        image: new Image(),
        normal_image: new Image(),
        flipped_image: new Image(),
        isFlipped: false

    };
    player.image.src = 'gnome-child.png'; // Replace with the actual path to your fox-girl image
    player.flipped_image.src = 'gnome-child-flipped.png';
    player.normal_image.src = 'gnome-child.png';

    dynamite_img = new Image();
    dynamite_img.src = 'Dynamite.webp';
    dynamites = [];

    hit_sound = new Audio('hit-sound.mp3');
    high_alch_sound = new Audio('high_alch.mp3');
    death_sound = new Audio('runescape-death-sound.mp3');
    music = new Audio('Sea_Shanty_2.ogg');
    music.loop = true;
    music.play();


    stars = [];
    lastStarDrop = Date.now();
    score = 0;
    lives = 3;
    gameOver = false;
    keys = {};
    tilt = 0;

    hatStack = [];

    // set random seed
    generator = new RandomGenerator(123);

    player.image.onload = () => {
        draw();
        update();
    };
}

const starVariants = [];
const starSources = [
    "Blue_partyhat.webp",
    "Green_partyhat.webp",
    "Purple_partyhat.webp",
    "Red_partyhat.webp",
    "Yellow_partyhat.webp",
    "Rainbow_partyhat.webp"
];

starSources.forEach(source => {
    const image = new Image();
    image.src = source;
    starVariants.push(image);
});

const starImage = new Image();
starImage.src = 'phat.webp'; // Replace with the actual path to your star image

const starFrequency = 1000; // Time in ms between star drops

function drawPlayer() {
    ctx.drawImage(player.image, player.x, player.y, player.width, player.height);

    // draw the hat stack on top of the player
    let x = player.x + 20;
    let y = player.y - 10;
    for (let i = 0; i < hatStack.length; i++) {
        const image = hatStack[i].image;
        ctx.drawImage(image, x, y, 50, 50);
        y -= 20;
    }
}

function drawStar(star) {
    ctx.drawImage(star.image, star.x, star.y, star.width, star.height);
}

function drawDynamite(dynamite) {
    ctx.drawImage(dynamite.image, dynamite.x, dynamite.y, dynamite.width, dynamite.height);
}



function createStar() {
    let weights = [1, 1, 1, 1, 1, 1];
    for (let i = 0; i < hatStack.length; i++) {
        weights[hatStack[i].idx] = 0.3;
    }
    let idx = 0;
    let total = weights.reduce((a, b) => a + b, 0);
    let random = generator.next() / generator.m * total;
    for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            idx = i;
            break;
        }
    }

    const star = {
        x: generator.next() / generator.m * (canvas.width - 20),
        y: 0,
        width: 50,
        height: 50,
        dy: 250,
        idx: idx,
        image: starVariants[idx],
        points: 1
    };

    if (idx === 5) {
        star.points = 5;
    }

    stars.push(star);
}

function createDynamite() {
    const dynamite = {
        x: generator.next() / generator.m * (canvas.width - 20),
        y: 0,
        width: 50,
        height: 50,
        dy: 200,
        image: dynamite_img,
        points: 1
    };
    dynamites.push(dynamite);
}

function updateDynamites(dt) {
    dynamites.forEach((dynamite, index) => {
        dynamite.y += dynamite.dy * dt;
        if (dynamite.y + dynamite.height > canvas.height) {
            dynamite.y = canvas.height - dynamite.height;

        }
        if (dynamite.x < player.x + player.width &&
            dynamite.x + dynamite.width > player.x &&
            dynamite.y < player.y + player.height &&
            dynamite.y + dynamite.height > player.y - hatStack.length * 20) {
            dynamites.splice(index, 1);

            // damage the player
            lives--;
            hit_sound.play();
            if (lives <= 0) {
                gameOver = true;
                death_sound.play();
                music.pause();
            }
            // clear the hat stack
            hatStack = [];

            // clear dynamites
            dynamites = [];

            // clear stars
            stars = [];
        }
    });
}

function checkPhatSet() {
    // check if hats contain a full set of stars
    // use star.idx
    let idxs = hatStack.map(hat => hat.idx);
    let set = new Set(idxs);
    if (set.size === starSources.length) {
        // clear the hat stack
        hatStack = [];

        // clear dynamites
        let bonus = dynamites.length * 2;
        dynamites = [];
        bonus += stars.length;
        stars = [];
        score += bonus;
        high_alch_sound.play();
        lives++;
    }

}

function updateStars(dt) {
    stars.forEach((star, index) => {
        star.y += star.dy * dt;
        if (star.y + star.height > canvas.height) {
            stars.splice(index, 1);
            lives--;
            hit_sound.play();
            if (lives <= 0) {
                gameOver = true;
                death_sound.play();
                music.pause();
            }
        }
        if (star.x < player.x + player.width &&
            star.x + star.width > player.x &&
            star.y < player.y + player.height &&
            star.y + star.height > player.y - hatStack.length * 20) {
            stars.splice(index, 1);
            score+=star.points;

            // add the hat to the stack
            hatStack.push(star);
            // check if the player has collected a full set of stars
            checkPhatSet();
        }
    });
}

function movePlayer(dt) {
    if ((keys['ArrowLeft'] || keys['a']) && player.x > 0) {
        player.x -= player.dx * dt;
        // flip the player image
        if (!player.isFlipped) {
            player.image = player.flipped_image;
            player.isFlipped = true;
        }

    }
    if ((keys['ArrowRight'] || keys['d']) && player.x + player.width < canvas.width) {
        player.x += player.dx * dt;
        // flip the player image
        if (player.isFlipped) {
            player.image = player.normal_image;
            player.isFlipped = false;
        }
    }

    if (tilt !== 0) {
        player.x += player.dx * tilt * dt;
        if (player.x < 0) {
            player.x = 0;
        }
        if (player.x + player.width > canvas.width) {
            player.x = canvas.width - player.width;
        }

        if (tilt > 0) {
            if (player.isFlipped) {
                player.image = player.normal_image;
                player.isFlipped = false;
            }
        } else {
            if (!player.isFlipped) {
                player.image = player.flipped_image;
                player.isFlipped = true;
            }
        }
    }

}

function saveScore() {
    const highScore = localStorage.getItem('highScore');
    if (highScore === null || score > highScore) {
        localStorage.setItem('highScore', score);
    }
}

function getHighScore() {
    return localStorage.getItem('highScore') || 0;
}

function drawHatProgress() {
    let x = 20;
    let y = 100;
    let dy = 60;
    
    // draw ui overview of collected hats
    // draw hat regularly if collected, draw with less opacity if not
    for (let i = 0; i < starSources.length; i++) {
        let image = starVariants[i];
        let opacity = 1;
        if (!hatStack.some(hat => hat.idx === i)) {
            opacity = 0.1;
        }
        ctx.globalAlpha = opacity;
        ctx.drawImage(image, x, y, 50, 50);
        ctx.globalAlpha = 1;
        y += dy;
    }
}


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    stars.forEach(drawStar);
    dynamites.forEach(drawDynamite);
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText(`Score: ${score}`, 20, 50);
    let hearts = '';
    for (let i = 0; i < lives; i++) {
        hearts += '❤️';
    }
    ctx.fillText(hearts, canvas.width - lives * 41 - 30, 50);

    drawHatProgress();

    if (gameOver) {
        ctx.fillStyle = 'red';
        ctx.font = '60px Arial';
        ctx.fillText('Game Over', canvas.width / 2 - 160, canvas.height / 2 - 20);
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.fillText('Press "R" to Restart', canvas.width / 2 - 185, canvas.height / 2 + 50);

        // score and high score
        ctx.font = '30px Arial';
        ctx.fillText(`Score: ${score}`, canvas.width / 2 - 60, canvas.height / 2 + 100);
        ctx.fillText(`High Score: ${getHighScore()}`, canvas.width / 2 - 100, canvas.height / 2 + 150);

        saveScore();
        return;
    }

    requestAnimationFrame(draw);
}

let lastUpdate = Date.now();
function update(timestamp) {
    let dt = timestamp - lastUpdate;
    dt /= 1000;
    lastUpdate = timestamp;
    if (Date.now() - lastStarDrop > starFrequency - Math.min(score * 2, 500)) {
        let chance = generator.next() / generator.m;
        if (chance < 0.2) {
            createDynamite();
        } else {
            createStar();
        }
        lastStarDrop = Date.now();
    }
    updateStars(dt);
    updateDynamites(dt);
    movePlayer(dt);
    if (!gameOver) {
        requestAnimationFrame(update);
    }
}

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (gameOver && e.key === 'r') {
        initializeGame();
    }
});
document.addEventListener('keyup', (e) => keys[e.key] = false);

// if on mobile, use tilt controls
window.addEventListener('deviceorientation', (e) => {
    // set tilt between -1 and 1
    const maxAngle = 18;
    tilt = e.gamma / maxAngle;
    if (tilt < -1) {
        tilt = -1;
    }
    if (tilt > 1) {
        tilt = 1;
    }
});

// use touch to restart
canvas.addEventListener('touchstart', (e) => {
    if (gameOver) {
        initializeGame();
    }
});

initializeGame();