import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Servidor simples para alunos: lê os arquivos a cada acesso, sem build nem cache.
const pastaPublica = resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const porta = Number(process.env.PORT || 3000);
const tipos = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".data": "application/octet-stream",
  ".tflite": "application/octet-stream",
  ".binarypb": "application/octet-stream",
};

const servidor = createServer(async (requisicao, resposta) => {
  if (requisicao.method !== "GET" && requisicao.method !== "HEAD") {
    resposta.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  let rota;
  try { rota = decodeURIComponent(new URL(requisicao.url, "http://localhost").pathname); }
  catch { resposta.writeHead(400).end("Endereço inválido"); return; }
  if (rota === "/") {
    resposta.writeHead(302, { Location: "/jogo/index.html", "Cache-Control": "no-store" }).end();
    return;
  }
  const arquivo = resolve(pastaPublica, `.${rota}`);
  if (!arquivo.startsWith(pastaPublica + sep)) {
    resposta.writeHead(403).end("Acesso negado");
    return;
  }
  try {
    const dados = await stat(arquivo);
    if (!dados.isFile()) { resposta.writeHead(404).end("Arquivo não encontrado"); return; }
    resposta.writeHead(200, {
      "Content-Type": tipos[extname(arquivo).toLowerCase()] || "application/octet-stream",
      "Content-Length": dados.size,
      "Cache-Control": "no-store",
    });
    if (requisicao.method === "HEAD") resposta.end();
    else createReadStream(arquivo).pipe(resposta);
  } catch {
    resposta.writeHead(404).end("Arquivo não encontrado");
  }
});

servidor.listen(porta, "127.0.0.1", () => {
  process.stdout.write(`Jogo aberto em http://localhost:${porta}\n`);
  process.stdout.write("Salve os arquivos e atualize a página para ver as mudanças.\n");
});
