import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { lerRanking, limparRanking, salvarResultado } from "./ranking-local.mjs";

// Servidor simples para alunos: lê os arquivos a cada acesso, sem build nem cache.
const pastaPublica = resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const portaInicial = Number(process.env.PORT || 3000);
if (!Number.isInteger(portaInicial) || portaInicial < 1 || portaInicial > 65535) {
  process.stderr.write("PORT precisa ser um número entre 1 e 65535.\n");
  process.exit(1);
}
const portaMaxima = process.env.PORT ? portaInicial : Math.min(portaInicial + 10, 65535);
let porta = portaInicial;
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
  const enviarJson = (codigo, dados) => resposta.writeHead(codigo, {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
  }).end(JSON.stringify(dados));
  let rota;
  try { rota = decodeURIComponent(new URL(requisicao.url, "http://localhost").pathname); }
  catch { resposta.writeHead(400).end("Endereço inválido"); return; }
  if (rota === "/api/ranking") {
    if (requisicao.method === "GET") {
      try { enviarJson(200, await lerRanking()); }
      catch { enviarJson(500, { erro: "Não foi possível ler o ranking." }); }
      return;
    }
    if (requisicao.method !== "POST" && requisicao.method !== "DELETE") {
      resposta.writeHead(405, { Allow: "GET, POST, DELETE" }).end(); return;
    }
    const origem = requisicao.headers.origin;
    if (origem && origem !== `http://localhost:${porta}` && origem !== `http://127.0.0.1:${porta}`) {
      enviarJson(403, { erro: "Origem não permitida." }); return;
    }
    if (requisicao.method === "DELETE") {
      try { enviarJson(200, { ranking: await limparRanking() }); }
      catch { enviarJson(500, { erro: "Não foi possível limpar o ranking." }); }
      return;
    }
    if (!String(requisicao.headers["content-type"] || "").startsWith("application/json")) {
      enviarJson(415, { erro: "Envie dados em JSON." }); return;
    }
    try {
      let corpo = "";
      for await (const parte of requisicao) {
        corpo += parte;
        if (corpo.length > 70000) throw new Error("Resultado muito grande.");
      }
      enviarJson(201, await salvarResultado(JSON.parse(corpo)));
    } catch (erro) {
      enviarJson(400, { erro: erro instanceof SyntaxError ? "JSON inválido." : erro.message });
    }
    return;
  }
  if (requisicao.method !== "GET" && requisicao.method !== "HEAD") {
    resposta.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
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

servidor.on("error", (erro) => {
  if (erro.code === "EADDRINUSE" && porta < portaMaxima) {
    porta += 1;
    servidor.listen(porta, "127.0.0.1");
    return;
  }
  if (erro.code === "EADDRINUSE") {
    process.stderr.write(`A porta ${porta} está ocupada. Encerre o outro servidor ou escolha outra porta com PORT=3001 npm run dev.\n`);
  } else {
    process.stderr.write(`Não foi possível iniciar o servidor: ${erro.message}\n`);
  }
  process.exitCode = 1;
});

servidor.on("listening", () => {
  process.stdout.write(`Jogo aberto em http://localhost:${porta}\n`);
  process.stdout.write("Salve os arquivos e atualize a página para ver as mudanças.\n");
});

servidor.listen(porta, "127.0.0.1");
