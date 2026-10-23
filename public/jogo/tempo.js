// O tempo do placar é sempre a soma de "duracao" de todas as fases.
export function calcularTempoTotal(fases) {
  return fases.reduce((soma, fase) => soma + fase.duracao, 0);
}

export function calcularTempoRestante(tempoTotal, milissegundosDecorridos) {
  return Math.max(0, Math.ceil(tempoTotal - milissegundosDecorridos / 1000));
}
