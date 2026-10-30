// Mede o movimento em relação ao próprio tronco, sem exigir pernas ou pés na imagem.
export function criarDetectorMovimento() {
  let amostras = [];
  let base = null;
  let agachado = false;
  let puloEmAndamento = false;
  let proximoPulo = 0;

  function recalibrar() {
    amostras = [];
    base = null;
    agachado = false;
    puloEmAndamento = false;
    proximoPulo = 0;
  }

  function mediaVisivel(marcas, indices) {
    const pontos = indices.map((i) => marcas?.[i]).filter((p) =>
      p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
      p.x >= -.05 && p.x <= 1.05 && p.y >= -.05 && p.y <= 1.05 &&
      (p.visibility ?? 1) >= .45);
    if (!pontos.length) return null;
    return {
      x: pontos.reduce((s, p) => s + p.x, 0) / pontos.length,
      y: pontos.reduce((s, p) => s + p.y, 0) / pontos.length,
    };
  }

  function analisar(marcas, agora) {
    const ombros = mediaVisivel(marcas, [11, 12]);
    const quadril = mediaVisivel(marcas, [23, 24]);
    const tronco = ombros && quadril ? quadril.y - ombros.y : 0;
    if (!ombros || !quadril || tronco < .09 || ombros.x < .12 || ombros.x > .88) {
      agachado = false;
      amostras = [];
      return { estado: "MOSTRE O TRONCO À CÂMERA", pular: false, agachar: false };
    }

    if (!base) {
      // Uma referência curta e estável evita calibrar no meio de um gesto.
      if (amostras.length && (Math.abs(ombros.y - amostras[0].ombros) > .06 ||
          Math.abs(quadril.y - amostras[0].quadril) > .06)) amostras = [];
      amostras.push({ ombros: ombros.y, quadril: quadril.y });
      if (amostras.length < 8) {
        return { estado: `FIQUE EM PÉ · CALIBRANDO ${Math.round(amostras.length / 8 * 100)}%`, pular: false, agachar: false };
      }
      base = {
        ombros: amostras.reduce((s, p) => s + p.ombros, 0) / amostras.length,
        quadril: amostras.reduce((s, p) => s + p.quadril, 0) / amostras.length,
        tronco: amostras.reduce((s, p) => s + p.quadril - p.ombros, 0) / amostras.length,
      };
      amostras = [];
      return { estado: "CÂMERA PRONTA", pular: false, agachar: false };
    }

    const subidaOmbros = (base.ombros - ombros.y) / base.tronco;
    const subidaQuadril = (base.quadril - quadril.y) / base.tronco;
    const descidaOmbros = -subidaOmbros;
    const descidaQuadril = -subidaQuadril;
    const pulando = subidaOmbros > .10 && subidaQuadril > .12;
    const novoPulo = pulando && !puloEmAndamento && agora >= proximoPulo;
    if (novoPulo) proximoPulo = agora + 450;
    if (pulando) puloEmAndamento = true;
    else if (subidaOmbros < .05 && subidaQuadril < .06) puloEmAndamento = false;

    // Limites diferentes para entrar e sair do agachamento evitam oscilações.
    if (!agachado && descidaOmbros > .17 && descidaQuadril > -.04) agachado = true;
    else if (agachado && descidaOmbros < .08) agachado = false;
    if (pulando) agachado = false;

    // A referência acompanha mudanças lentas de postura, mas não segue os gestos.
    if (!agachado && !pulando && Math.abs(subidaOmbros) < .07 && Math.abs(subidaQuadril) < .07) {
      base.ombros = base.ombros * .98 + ombros.y * .02;
      base.quadril = base.quadril * .98 + quadril.y * .02;
    }
    return { estado: novoPulo ? "PULO!" : agachado ? "AGACHOU!" : "CORRENDO", pular: novoPulo, agachar: agachado };
  }

  return { analisar, recalibrar };
}
