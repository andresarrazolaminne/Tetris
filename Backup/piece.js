export class Piece {
    constructor(scene) {
        this.scene = scene;
        this.shapes = [
            [ [1, 1, 1, 1] ],  // Línea
            [ [1, 1], [1, 1] ],  // Cuadrado
            [ [0, 1, 0], [1, 1, 1] ],  // T
            [ [1, 1, 0], [0, 1, 1] ],  // Z inversa
            [ [0, 1, 1], [1, 1, 0] ]  // Z
        ];
        // Seleccionar una forma aleatoria
        this.shape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
        this.x = Math.floor(Math.random() * (10 - this.shape[0].length));  // Posición inicial X
        this.y = 0;  // Posición inicial Y
    }
}
