// A imagem continua inteira na tela; hitbox limita a área, e a máscara ignora pixels transparentes.
export function areasDoObstaculo(obstaculo) {
  const partes = obstaculo.hitboxes || [obstaculo.hitbox || {
    x: 0, y: obstaculo.imagemY || 0,
    largura: obstaculo.largura, altura: obstaculo.imagemAltura || obstaculo.altura,
  }];
  return partes.map((parte) => ({
    x: obstaculo.x + parte.x,
    y: obstaculo.y + parte.y,
    largura: parte.largura,
    altura: parte.altura,
  }));
}

export function colideComObstaculo(jogador, obstaculo) {
  const personalizada = obstaculo.hitbox || obstaculo.hitboxes;
  const margemPadrao = !personalizada && !obstaculo.mascara;
  const margemX = margemPadrao ? 7 : 0;
  const margemY = margemPadrao ? (obstaculo.acao === "agachar" ? 1 : 5) : 0;
  return areasDoObstaculo(obstaculo).some((area) => {
    const inicioX = Math.max(jogador.x, area.x + margemX);
    const fimX = Math.min(jogador.x + jogador.largura, area.x + area.largura - margemX);
    const inicioY = Math.max(jogador.y, area.y + margemY);
    const fimY = Math.min(jogador.y + jogador.altura, area.y + area.altura - margemY);
    if (inicioX >= fimX || inicioY >= fimY) return false;
    const mascara = obstaculo.mascara;
    if (!mascara) return true;
    const imagemX = obstaculo.x;
    const imagemY = obstaculo.y + (obstaculo.imagemY || 0);
    for (let y = Math.floor(inicioY); y < Math.ceil(fimY); y++) {
      if (y + .5 < inicioY || y + .5 >= fimY) continue;
      const pixelY = Math.floor(y + .5 - imagemY);
      if (pixelY < 0 || pixelY >= mascara.altura) continue;
      for (let x = Math.floor(inicioX); x < Math.ceil(fimX); x++) {
        if (x + .5 < inicioX || x + .5 >= fimX) continue;
        const pixelX = Math.floor(x + .5 - imagemX);
        if (pixelX >= 0 && pixelX < mascara.largura &&
            mascara.pixels[pixelY * mascara.largura + pixelX]) return true;
      }
    }
    return false;
  });
}
