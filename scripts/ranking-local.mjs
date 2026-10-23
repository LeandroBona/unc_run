import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const arquivo = process.env.RANKING_FILE
  ? resolve(process.env.RANKING_FILE)
  : resolve(fileURLToPath(new URL("../dados/ranking.json", import.meta.url)));
let fila = Promise.resolve();

export async function lerRanking() {
  try {
    const dados = JSON.parse(await readFile(arquivo, "utf8"));
    return Array.isArray(dados) ? dados : [];
  } catch (erro) {
    if (erro.code === "ENOENT") return [];
    throw erro;
  }
}

export function validarResultado(dados) {
  if (!dados || typeof dados !== "object") throw new Error("Resultado inválido.");
  const nome = String(dados.nome || "").trim();
  if (!nome || nome.length > 32) throw new Error("Digite um nome de até 32 caracteres.");
  if (!Number.isSafeInteger(dados.pontos) || dados.pontos < 0 || dados.pontos > 1000000) throw new Error("Pontuação inválida.");
  if (!Number.isSafeInteger(dados.fasesConcluidas) || dados.fasesConcluidas < 0 || dados.fasesConcluidas > 1000) throw new Error("Número de fases inválido.");
  if (typeof dados.venceu !== "boolean") throw new Error("Resultado inválido.");
  const foto = dados.foto || "";
  if (typeof foto !== "string" || (foto && !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(foto)) || foto.length > 60000) {
    throw new Error("Foto inválida ou muito grande.");
  }
  return { id: randomUUID(), nome, pontos: dados.pontos, fasesConcluidas: dados.fasesConcluidas,
    venceu: dados.venceu, foto, data: new Date().toISOString() };
}

export function salvarResultado(dados) {
  const resultado = validarResultado(dados);
  const operacao = fila.then(async () => {
    const ranking = await lerRanking();
    ranking.push(resultado);
    ranking.sort((a, b) => b.pontos - a.pontos || b.fasesConcluidas - a.fasesConcluidas || a.data.localeCompare(b.data));
    const ordenado = ranking.slice(0, 100);
    await mkdir(dirname(arquivo), { recursive: true });
    const temporario = `${arquivo}.${process.pid}.tmp`;
    await writeFile(temporario, JSON.stringify(ordenado, null, 2));
    await rename(temporario, arquivo);
    return { resultado, ranking: ordenado };
  });
  fila = operacao.catch(() => {});
  return operacao;
}
