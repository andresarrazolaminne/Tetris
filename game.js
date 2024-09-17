class WelcomeScreen {
    constructor(scene) {
        this.scene = scene;
        this.idleImage = null;
    }

    preload() {
        // Pre-cargar la imagen de bienvenida
        this.scene.load.image('idle', 'idle.jpg');
    }

    create(onStartCallback) {
        // Mostrar la imagen de bienvenida
        this.idleImage = this.scene.add.image(this.scene.scale.width / 2, this.scene.scale.height / 2, 'idle');
        this.idleImage.setDisplaySize(this.scene.scale.width, this.scene.scale.height);
        
        // Hacer que la imagen sea interactiva y empezar el juego al hacer clic
        this.idleImage.setInteractive();
        this.idleImage.on('pointerdown', () => {
            this.idleImage.destroy();  // Destruir la imagen de bienvenida
            onStartCallback();  // Llamar al callback para iniciar el juego
        });
    }
}

class Board {
    constructor(width, height, scene) {
        this.width = width;
        this.height = height;
        this.scene = scene;
        this.grid = this.createBoard();
        this.pieceImages = [];  // Almacena las imágenes de las piezas en movimiento
        this.fixedPiecesImages = [];  // Almacena las imágenes de las piezas fijas
    }

    createBoard() {
        const board = [];
        for (let y = 0; y < this.height; y++) {
            board[y] = [];
            for (let x = 0; x < this.width; x++) {
                board[y][x] = 0;  // Inicializamos el tablero vacío
            }
        }
        return board;
    }

    clearPreviousPieces() {
        // Destruir solo las imágenes de las piezas en movimiento
        this.pieceImages.forEach(image => {
            if (image && image.texture && image.texture.key) {
                image.destroy();
            }
        });
        this.pieceImages = [];  // Limpiar la referencia de las imágenes de piezas en movimiento
    }

    drawPiece(piece) {
        // Limpiar las piezas en movimiento, pero no las piezas fijas en el tablero
        this.clearPreviousPieces();

        const shape = piece.shape;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const tileSize = this.scene.scale.width / 10;
                    const pieceImage = this.scene.add.image(
                        (piece.x + x) * tileSize,
                        (piece.y + y) * tileSize,
                        'caja'
                    ).setOrigin(0).setDisplaySize(tileSize, tileSize);

                    this.pieceImages.push(pieceImage);  // Almacenar solo las piezas en movimiento
                }
            }
        }
    }

    checkCollision(piece, dx, dy) {
        const shape = piece.shape;
        const posX = piece.x + dx;
        const posY = piece.y + dy;

        // Recorrer todas las celdas de la pieza actual
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    // Verificar si la pieza está fuera del tablero en los bordes laterales
                    if (posX + x < 0 || posX + x >= this.width) {
                        return true;  // Colisión con los bordes laterales
                    }

                    // Colisión con el fondo del tablero
                    if (posY + y >= this.height - 5) {
                        return true;  // Colisión con el fondo del tablero
                    }

                    // Verificar colisión con otras piezas ya colocadas
                    if (this.grid[posY + y] && this.grid[posY + y][posX + x] === 1) {
                        return true;  // Colisión con otra pieza
                    }
                }
            }
        }

        return false;  // No hay colisión
    }

    movePieceDown(piece) {
        if (!this.checkCollision(piece, 0, 1)) {
            piece.y += 1;  // Mover la pieza hacia abajo si no hay colisión
        } else {
            this.placePiece(piece);  // Colocar la pieza si colisiona
            const linesCleared = this.checkForCompleteLines();  // Verificar líneas completas
            if (linesCleared > 0) {
                this.scene.events.emit('linesCleared', linesCleared);  // Emitir evento de líneas completadas
            }
            this.redrawFixedPieces();  // Redibujar las piezas fijas

            // Verificar si se pierde el juego
            if (this.isGameOver()) {
                this.scene.events.emit('gameOver');  // Emitir evento de fin del juego
            } else {
                this.generateNewPiece();  // Generar una nueva pieza si no se ha perdido
            }
        }
    }

    isGameOver() {
        // Verificar si hay piezas en la fila superior
        for (let x = 0; x < this.width; x++) {
            if (this.grid[0][x] === 1) {
                return true;  // El juego se ha perdido
            }
        }
        return false;
    }

    movePiece(piece, dx, dy) {
        if (!this.checkCollision(piece, dx, dy)) {
            piece.x += dx;
            piece.y += dy;
        }
    }

    rotatePiece(piece) {
        const shape = piece.shape;
        const newShape = shape[0].map((_, index) => shape.map(row => row[index]).reverse());

        if (!this.checkCollision({ ...piece, shape: newShape }, 0, 0)) {
            piece.shape = newShape;
        }
    }

    placePiece(piece) {
        const shape = piece.shape;

        // Colocar la pieza en la grilla
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    this.grid[piece.y + y][piece.x + x] = 1;  // Marcar la celda como ocupada

                    // Mantener la pieza colocada gráficamente en el tablero
                    const tileSize = this.scene.scale.width / 10;
                    const pieceImage = this.scene.add.image(
                        (piece.x + x) * tileSize,
                        (piece.y + y) * tileSize,
                        'caja'
                    ).setOrigin(0).setDisplaySize(tileSize, tileSize);

                    this.fixedPiecesImages.push(pieceImage);  // Almacenar las piezas fijas
                }
            }
        }

        console.log("Pieza colocada en el tablero");
    }

    generateNewPiece() {
        this.scene.events.emit('newPiece');
    }

    checkForCompleteLines() {
        let linesCleared = 0;

        // Recorrer todas las filas del tablero
        for (let y = 0; y < this.height; y++) {
            let isComplete = true;

            // Verificar si la fila está completa
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === 0) {
                    isComplete = false;
                    break;
                }
            }

            // Si la fila está completa, la eliminamos
            if (isComplete) {
                this.clearLine(y);  // Eliminar la fila
                linesCleared++;
            }
        }

        return linesCleared;
    }

    clearLine(row) {
        // Eliminar la fila completa y desplazar todas las filas superiores hacia abajo
        for (let y = row; y > 0; y--) {
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = this.grid[y - 1][x];  // Desplazar la fila superior hacia abajo
            }
        }

        // Limpiar la fila superior
        for (let x = 0; x < this.width; x++) {
            this.grid[0][x] = 0;  // Fila vacía

            // Eliminar las imágenes de las piezas fijas en la fila eliminada
            this.fixedPiecesImages.forEach(image => {
                if (image && image.y === row * (this.scene.scale.width / 10)) {
                    image.destroy();
                }
            });

            this.fixedPiecesImages = this.fixedPiecesImages.filter(image => image && image.y !== row * (this.scene.scale.width / 10));
        }
    }

    redrawFixedPieces() {
        // Destruir las imágenes actuales de las piezas fijas
        this.fixedPiecesImages.forEach(image => {
            if (image && image.texture && image.texture.key) {
                image.destroy();
            }
        });
        this.fixedPiecesImages = [];

        // Redibujar las piezas fijas en el tablero
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === 1) {
                    const tileSize = this.scene.scale.width / 10;
                    const pieceImage = this.scene.add.image(
                        x * tileSize,
                        y * tileSize,
                        'caja'
                    ).setOrigin(0).setDisplaySize(tileSize, tileSize);

                    this.fixedPiecesImages.push(pieceImage);  // Almacenar las piezas fijas
                }
            }
        }
    }
}

class Piece {
    constructor(scene) {
        this.scene = scene;
        this.shapes = [
            [[1, 1, 1, 1]],  // Línea
            [[1, 1], [1, 1]],  // Cuadrado
            [[0, 1, 0], [1, 1, 1]],  // T
            [[1, 1, 0], [0, 1, 1]],  // Z inversa
            [[0, 1, 1], [1, 1, 0]],  // Z
            [[1, 1, 1], [0, 0, 1]], // L
            [[1, 1, 1], [1, 0, 0]],  // >L
            [[1, 0, 0], [1, 1, 1]],  // >L
            [[0, 0, 1], [1, 1, 1]]  // >L
        ];
        this.shape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
        this.x = Math.floor(Math.random() * (10 - this.shape[0].length));  // Posición inicial X
        this.y = 0;
    }
}

class Tetris {
    constructor(scene) {
        this.scene = scene;
        this.board = null;
        this.currentPiece = null;
        this.nextDropTime = 0;
        this.cursors = null;
        this.rotateKey = null;
        this.score = 0;  // Inicializar puntuación
        this.linesToComplete = 5;  // Líneas necesarias para ganar
        this.timeLimit = 60;  // Tiempo límite en segundos
        this.timeRemaining = this.timeLimit;  // Tiempo restante
        this.timerEvent = null;  // Evento del temporizador
        this.moveDelay = 150;  // Retardo entre movimientos laterales
        this.lastMoveTime = 0;  // Última vez que se movió la pieza
        this.fastDrop = false;  // Bandera para detectar el movimiento rápido hacia abajo
        this.isFastDropping = false;  // Para detectar si ya se está realizando el fast drop
        this.dropSpeed = 1000;  // Velocidad de caída por defecto
        this.speedIncreaseFactor = 50;  // Aumento de velocidad por línea completada
        this.gameOverFlag = false;  // Bandera para indicar si el juego terminó
        this.touchControls = {};  // Guardará las referencias de los botones táctiles
    }

    preload() {
        this.scene.load.image('fondo', 'fondo.jpg');
        this.scene.load.image('caja', 'caja.png');
        this.scene.load.image('idle', 'idle.jpg');  // Cargar la imagen de bienvenida
        this.scene.load.image('ganaste', 'ganaste.png');  // Cargar la imagen de victoria
        this.scene.load.image('perdiste', 'perdiste.png');  // Cargar la imagen de derrota
        this.scene.load.image('continuar', 'continuar.png');  // Cargar la imagen del botón continuar
        this.scene.load.image('left', 'left.png');  // Cargar el botón izquierda
        this.scene.load.image('right', 'right.png');  // Cargar el botón derecha
        this.scene.load.image('rotate', 'rotate.png');  // Cargar el botón rotar
        this.scene.load.image('down', 'down.png');  // Cargar el botón bajar rápido
    }

    create() {
        const fondo = this.scene.add.image(this.scene.scale.width / 2, this.scene.scale.height / 2, 'fondo');
        fondo.setDisplaySize(this.scene.scale.width, this.scene.scale.height);

        this.board = new Board(10, 20, this.scene);
        this.currentPiece = new Piece(this.scene);  // Inicialización correcta de la primera pieza
        this.nextDropTime = 0;

        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.rotateKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);

        // Mostrar score y temporizador en pantalla
        const screenWidth = this.scene.scale.width;
        this.scoreText = this.scene.add.text(screenWidth / 2 + 250, 80, `Líneas: 0/${this.linesToComplete}`, {
            fontSize: '62px',
            fill: '#fff'
        }).setOrigin(0.5, 0);
        
        this.timerText = this.scene.add.text(screenWidth / 2 + 250, 20, `Tiempo: ${this.timeRemaining}`, {
            fontSize: '62px',
            fill: '#fff'
        }).setOrigin(0.5, 0);

        // Crear temporizador
        this.timerEvent = this.scene.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });

        // Escuchar eventos
        this.scene.events.on('newPiece', () => this.generateNewPiece());
        this.scene.events.on('linesCleared', (linesCleared) => this.updateScore(linesCleared));
        this.scene.events.on('gameOver', () => this.gameOver());

        // Añadir controles en pantalla para dispositivos táctiles
        this.createTouchControls();
    }

    createTouchControls() {
        const buttonSize = 150;
        const screenHeight = this.scene.scale.height;
        const screenWidth = this.scene.scale.width;
    
        // Botón izquierda
        this.touchControls.left = this.scene.add.image(100, screenHeight - 150, 'left')
            .setInteractive()
            .setDisplaySize(buttonSize, buttonSize);
        this.touchControls.left.on('pointerdown', () => this.board.movePiece(this.currentPiece, -1, 0));
    
        // Botón derecha
        this.touchControls.right = this.scene.add.image(300, screenHeight - 150, 'right')
            .setInteractive()
            .setDisplaySize(buttonSize, buttonSize);
        this.touchControls.right.on('pointerdown', () => this.board.movePiece(this.currentPiece, 1, 0));
    
        // Botón rotar
        this.touchControls.rotate = this.scene.add.image(screenWidth - 200, screenHeight - 150, 'rotate')
            .setInteractive()
            .setDisplaySize(buttonSize, buttonSize);
        this.touchControls.rotate.on('pointerdown', () => this.board.rotatePiece(this.currentPiece));
    
        // Botón bajar rápido
        this.touchControls.down = this.scene.add.image(screenWidth - 400, screenHeight - 150, 'down')
            .setInteractive()
            .setDisplaySize(buttonSize, buttonSize);
    
        // Fast drop handling
        this.touchControls.down.on('pointerdown', () => {
            this.isFastDropping = true;  // Activa el fast drop
        });
        this.touchControls.down.on('pointerup', () => {
            this.isFastDropping = false;  // Desactiva el fast drop
        });
        this.touchControls.down.on('pointerout', () => {
            this.isFastDropping = false;  // Desactiva el fast drop si el dedo o cursor sale del botón
        });
        this.touchControls.down.on('pointerupoutside', () => {
            this.isFastDropping = false;  // Desactiva el fast drop si el dedo o cursor suelta fuera del botón
        });
    }
    
    update(time) {
        if (this.gameOverFlag || !this.currentPiece) {
            return;  // Si el juego ha terminado o no hay pieza actual, no hacer nada
        }
    
        // Fast drop handling - Keep the speed low while isFastDropping is true
        let dropSpeed = this.isFastDropping ? 50 : this.dropSpeed;  // Acelerar si se presiona el botón de bajar
        if (time > this.nextDropTime) {
            this.nextDropTime = time + dropSpeed;
            if (this.currentPiece) {
                this.board.movePieceDown(this.currentPiece);
            }
        }
    
        // Movimiento lateral
        if (time > this.lastMoveTime + this.moveDelay) {
            if (this.cursors.left.isDown) {
                this.board.movePiece(this.currentPiece, -1, 0);
                this.lastMoveTime = time;  // Actualizar el tiempo del último movimiento
            } else if (this.cursors.right.isDown) {
                this.board.movePiece(this.currentPiece, 1, 0);
                this.lastMoveTime = time;  // Actualizar el tiempo del último movimiento
            }
        }
    
        this.board.drawPiece(this.currentPiece);
    }
    
    

    updateScore(linesCleared) {
        this.score += linesCleared;
        this.scoreText.setText(`Líneas: ${this.score}/${this.linesToComplete}`);

        // Aumentar velocidad con cada línea completada
        this.dropSpeed = Math.max(100, this.dropSpeed - this.speedIncreaseFactor * linesCleared);

        if (this.score >= this.linesToComplete) {
            this.winGame();  // Ganar si se completan las líneas necesarias
        }
    }

    updateTimer() {
        this.timeRemaining--;
        this.timerText.setText(`Tiempo: ${this.timeRemaining}`);

        if (this.timeRemaining <= 0) {
            this.scene.events.emit('gameOver');  // Emitir evento de fin del juego si se acaba el tiempo
        }
    }

    winGame() {
        console.log("¡Has ganado!");
        this.timerEvent.remove();  // Detener el temporizador
        this.showEndScreen('ganaste');  // Mostrar la imagen de victoria
    }

    gameOver() {
        console.log("Has perdido. Fin del juego.");
        this.showEndScreen('perdiste');  // Mostrar la imagen de derrota
        if (this.timerEvent) {
            this.timerEvent.remove();  // Detener el temporizador
        }
    }

    showEndScreen(imageKey) {
        // Limpiar el tablero y detener la generación de piezas
        this.gameOverFlag = true;
        this.board.clearPreviousPieces();  // Limpiar piezas en movimiento
        this.board.redrawFixedPieces();    // Limpiar piezas fijas

        const endImage = this.scene.add.image(this.scene.scale.width / 2, this.scene.scale.height / 2, imageKey);
        endImage.setDisplaySize(this.scene.scale.width, this.scene.scale.height);

        // Agregar el botón de continuar
        const continueButton = this.scene.add.image(this.scene.scale.width / 2, this.scene.scale.height / 1.5, 'continuar');
        continueButton.setDisplaySize(200, 100);
        continueButton.setInteractive();

        continueButton.on('pointerdown', () => {
            this.resetGame();  // Reiniciar el juego al hacer clic en continuar
        });
    }

    resetGame() {
        // Destruir todos los objetos gráficos actuales
        this.scene.children.removeAll();
        
        // Reiniciar variables de juego
        this.score = 0;
        this.timeRemaining = this.timeLimit;
        this.dropSpeed = 300;
        this.gameOverFlag = false;

        // Reiniciar el juego desde la pantalla de bienvenida
        this.scene.scene.restart();
    }

    generateNewPiece() {
        this.currentPiece = new Piece(this.scene);  // Generar la nueva pieza correctamente
    }
}

window.onload = function() {
    const config = {
        type: Phaser.AUTO,
        width: 1080,
        height: 1920,
        backgroundColor: '#000000',
        parent: 'game-container',
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };

    const game = new Phaser.Game(config);
    let tetris = null;
    let welcomeScreen;

    let gameStarted = false;  // Bandera para controlar cuándo el juego está activo

    function preload() {
        welcomeScreen = new WelcomeScreen(this);
        tetris = new Tetris(this);
        welcomeScreen.preload();
        tetris.preload();
    }

    function create() {
        // Crear la pantalla de bienvenida
        welcomeScreen.create(() => {
            gameStarted = true;  // El juego empieza
            tetris.create();  // Iniciar el juego cuando se toque la pantalla
        });
    }

    function update(time) {
        if (gameStarted && tetris) {
            tetris.update(time);  // Solo actualizar el juego cuando esté activo
        }
    }
}
