import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";

// Desenhos simples em pixels. Os PNGs gerados podem ser trocados por qualquer imagem transparente.
const pasta = new URL("../public/obstaculos/", import.meta.url);
await mkdir(pasta, { recursive: true });
const cores = {
  verde: "#183d39", vermelho: "#03e7dc", creme: "#fff3cf", amarelo: "#f5c542",
  azul: "#2f7870", escuro: "#243f3d", osso: "#ead2a0", pedra: "#8b7660",
  pedestal: "#4b4642", cinza: "#91877c", ouro: "#d4bc85", preto: "#6bbbe4",
};
function sprite(largura, altura) {
  const pixels = Buffer.alloc(largura * altura * 4);
  function ponto(x, y, cor) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= largura || y >= altura) return;
    const offset = (y * largura + x) * 4;
    const hex = cores[cor] || cor;
    pixels[offset] = parseInt(hex.slice(1, 3), 16);
    pixels[offset + 1] = parseInt(hex.slice(3, 5), 16);
    pixels[offset + 2] = parseInt(hex.slice(5, 7), 16);
    pixels[offset + 3] = 255;
  }
  function retangulo(x, y, w, h, cor) {
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) ponto(px, py, cor);
  }
  function circulo(cx, cy, raio, cor) {
    for (let y = Math.floor(cy - raio); y <= cy + raio; y++)
      for (let x = Math.floor(cx - raio); x <= cx + raio; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= raio ** 2) ponto(x, y, cor);
  }
  function linha(x1, y1, x2, y2, espessura, cor) {
    const passos = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2);
    for (let i = 0; i <= passos; i++) {
      const t = i / passos;
      circulo(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, espessura / 2, cor);
    }
  }
  function poligono(pontos, cor) {
    const ys = pontos.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const cortes = [];
      for (let i = 0; i < pontos.length; i++) {
        const [x1, y1] = pontos[i], [x2, y2] = pontos[(i + 1) % pontos.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) cortes.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
      }
      cortes.sort((a, b) => a - b);
      for (let i = 0; i < cortes.length; i += 2)
        for (let x = Math.ceil(cortes[i]); x <= Math.floor(cortes[i + 1]); x++) ponto(x, y, cor);
    }
  }
  return { largura, altura, pixels, retangulo, circulo, linha, poligono };
}
function crc32(dados) {
  let crc = 0xffffffff;
  for (const byte of dados) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function bloco(tipo, dados) {
  const nome = Buffer.from(tipo);
  const tamanho = Buffer.alloc(4), soma = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  soma.writeUInt32BE(crc32(Buffer.concat([nome, dados])));
  return Buffer.concat([tamanho, nome, dados, soma]);
}
async function salvar(nome, desenho) {
  const { largura, altura, pixels } = desenho;
  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(largura, 0);
  cabecalho.writeUInt32BE(altura, 4);
  cabecalho[8] = 8; cabecalho[9] = 6;
  const linhas = Buffer.alloc(altura * (1 + largura * 4));
  for (let y = 0; y < altura; y++) pixels.copy(linhas, y * (1 + largura * 4) + 1, y * largura * 4, (y + 1) * largura * 4);
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloco("IHDR", cabecalho), bloco("IDAT", deflateSync(linhas)), bloco("IEND", Buffer.alloc(0)),
  ]);
  await writeFile(new URL(nome, pasta), png);
}

let s = sprite(64, 64);
s.retangulo(2, 57, 60, 7, "verde");
s.poligono([[32, 2], [57, 57], [7, 57]], "vermelho");
s.poligono([[21, 36], [43, 36], [49, 48], [15, 48]], "creme");
await salvar("cone.png", s);

s = sprite(60, 52);
s.retangulo(3, 2, 52, 15, "verde"); s.retangulo(5, 4, 48, 11, "vermelho");
s.retangulo(10, 19, 47, 15, "verde"); s.retangulo(12, 21, 43, 11, "amarelo");
s.retangulo(4, 36, 53, 15, "verde"); s.retangulo(6, 38, 49, 11, "azul");
s.retangulo(14, 6, 3, 7, "creme"); s.retangulo(46, 23, 3, 7, "creme");
await salvar("livros.png", s);

s = sprite(60, 40);
s.linha(22, 20, 5, 4, 7, "escuro"); s.linha(35, 20, 54, 4, 7, "escuro");
s.circulo(28, 23, 14, "escuro"); s.poligono([[41, 19], [59, 25], [41, 30]], "amarelo");
s.circulo(35, 18, 2, "creme");
await salvar("passaro.png", s);

s = sprite(70, 54);
s.retangulo(2, 45, 66, 9, "pedra");
s.linha(15, 11, 56, 42, 9, "osso"); s.linha(56, 10, 14, 42, 9, "osso");
for (const [x, y] of [[15, 11], [56, 42], [56, 10], [14, 42]]) s.circulo(x, y, 7, "osso");
await salvar("fossil.png", s);

s = sprite(60, 64);
s.retangulo(8, 17, 44, 45, "pedestal"); s.retangulo(3, 10, 54, 12, "cinza");
s.retangulo(3, 55, 54, 9, "cinza"); s.circulo(30, 11, 10, "ouro");
s.retangulo(15, 29, 30, 3, "cinza"); s.retangulo(15, 48, 30, 3, "cinza");
await salvar("pedestal.png", s);

s = sprite(64, 70);
s.retangulo(29, 0, 6, 34, "preto");
s.poligono([[9, 32], [55, 32], [62, 63], [2, 63]], "preto");
s.poligono([[13, 36], [51, 36], [57, 57], [7, 57]], "escuro");
s.retangulo(11, 57, 42, 7, "amarelo"); s.retangulo(18, 42, 28, 3, "cinza");
await salvar("luminaria.png", s);
