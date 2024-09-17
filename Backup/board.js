export class Board {
    constructor(width, height, scene) {
        this.width = width;  // Ancho del tablero
        this.height = height;  // Altura del tablero
        this.scene = scene;
        this.grid = this.createBoard();  // Crear la grilla del tablero
        this.pieceImages = [];  // Almacenar las imágenes de las piezas para eliminar después
    }

    createBoard() {
        // Inicializar la grilla vacía (0 significa celda vacía)
        const board = [];
        for (let y = 0; y < this.height; y++) {
            board[y] = [];
            for (let x = 0; x < this.width; x++) {
                board[y][x] = 0;  // Celda vacía
            }
        }
        return board;
    }

    clearPreviousPieces() {
        // Eliminar las imágenes de las piezas anteriores
        this.pieceImages.forEach(image => image.destroy());
        this.pieceImages = [];
    }

    drawPiece(piece) {
        // Limpiar las piezas anteriores
        this.clearPreviousPieces();

        const shape = piece.shape;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    // Ajustar la posición y el tamaño de la pieza
                    const tileSize = this.scene.scale.width / 10;
                    const pieceImage = this.scene.add.image(
                        (piece.x + x) * tileSize, 
                        (piece.y + y) * tileSize, 
                        'caja'
                    ).setOrigin(0).setDisplaySize(tileSize, tileSize);

                    // Almacenar las imágenes de las piezas para eliminarlas después
                    this.pieceImages.push(pieceImage);
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
                    // Verificar colisión con los bordes laterales
                    if (posX + x < 0 || posX + x >= this.width) {
                        return true;  // Colisión con los bordes laterales
                    }

                    // Verificar colisión con el fondo
                    if (posY + y >= this.height) {
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
            this.generateNewPiece();  // Generar una nueva pieza
        }
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

        // Solo rotamos si la nueva rotación no colisiona
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
                }
            }
        }

        // Emitir un evento para generar una nueva pieza
        this.scene.events.emit('piecePlaced');
    }

    generateNewPiece() {
        // Emitir un evento para que el juego genere una nueva pieza
        this.scene.events.emit('newPiece');
    }
}
