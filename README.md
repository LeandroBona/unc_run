# Corrida para a Aula — UNC em Movimento

O jogo abre pelo endereço principal (`/`). A página, as cores e as fases são feitas com HTML, CSS e JavaScript comum para que alunos possam modificá-las no VS Code.

## Para os alunos: instalar e jogar no próprio computador

**Precisa instalar:** [Node.js](https://nodejs.org/en/download) versão **22.13 ou mais recente** (a versão LTS da página oficial serve). O instalador já inclui o `npm`. Use um navegador atualizado, como Chrome, Edge ou Firefox. O [VS Code](https://code.visualstudio.com/Download) é recomendado para editar os arquivos, mas não é obrigatório. Não é preciso instalar Python, React, extensões do VS Code nem as dependências do projeto para jogar.

1. Receba a **pasta inteira** do projeto e, se ela vier como ZIP, extraia antes de começar.
2. Instale o Node.js. Feche e abra novamente o terminal. Digite `node --version` e `npm --version` para confirmar que os dois comandos funcionam.
3. Abra a pasta do projeto no VS Code em **Arquivo → Abrir Pasta**. Ela deve conter `package.json` e a pasta `public`.
4. No VS Code, abra **Terminal → Novo Terminal** e execute:

   ```bash
   npm run dev
   ```

5. Abra [http://localhost:3000](http://localhost:3000) no navegador. O jogo também funciona com o teclado, sem webcam.
6. Para encerrar o servidor, volte ao terminal e pressione **Ctrl+C**.

O comando `npm run dev` serve os arquivos diretamente. **Para ver uma mudança, salve o arquivo e atualize a página no navegador.** Não use `npm run start` para editar: ele abre uma cópia compilada e só reflete alterações depois de uma nova compilação. Não abra `index.html` com `file://`, pois as imagens e os módulos JavaScript precisam do servidor local.

Se `npm run dev` disser que a porta 3000 já está em uso, encerre o outro servidor com **Ctrl+C** e execute o comando novamente.

**Ao compartilhar com a turma:** basta enviar `package.json`, `README.md`, a pasta `public` inteira e `scripts/servidor-local.mjs`. Envie esses itens dentro de uma única pasta ou ZIP. Não é preciso enviar `node_modules`, `dist` nem `.git`.

## Arquivos para editar

| Arquivo | Finalidade |
| --- | --- |
| `public/jogo/fases.js` | Configuração dos cenários, tempo e obstáculos. Comece por aqui. |
| `public/jogo/index.html` | Textos, botões e organização da página. |
| `public/jogo/estilo.css` | Cores, fontes e aparência da página. |
| `public/scenarios/` | Imagens dos cenários. |
| `public/obstaculos/` | PNGs transparentes dos obstáculos. |
| `public/jogo/jogo.js` | Motor do jogo; não precisa mudar para criar fases. |
| `public/jogo/camera.js` | Controle opcional por movimento. |

## Imagens disponíveis para novas fases

Estas imagens já estão no projeto para os alunos usarem quando criarem fases. Os três cenários são fundos completos de **2172 × 724 pixels**. Os sete objetos são PNGs de **1254 × 1254 pixels** com transparência; ajuste `largura` e `altura` no `fases.js` para exibi-los no tamanho adequado ao jogo.

| Cenário | Caminho para usar em `fases.js` |
| --- | --- |
| Sala de aula | `/scenarios/ensino-tecnico/sala-de-aula.png` |
| Laboratório de elétrica | `/scenarios/ensino-tecnico/laboratorio-eletrica.png` |
| Oficina mecânica | `/scenarios/ensino-tecnico/oficina-mecanica.png` |

| Objeto | Caminho para usar em `fases.js` |
| --- | --- |
| Engrenagem | `/obstaculos/ensino-tecnico/engrenagem.png` |
| Morsa | `/obstaculos/ensino-tecnico/morsa.png` |
| Chave de fenda | `/obstaculos/ensino-tecnico/chave-de-fenda.png` |
| Raio elétrico | `/obstaculos/ensino-tecnico/raio-eletrico.png` |
| Painel elétrico | `/obstaculos/ensino-tecnico/painel-eletrico.png` |
| Braço robótico | `/obstaculos/ensino-tecnico/braco-robotico.png` |
| Carteira escolar | `/obstaculos/ensino-tecnico/carteira-escolar.png` |

Exemplo: `imagem: "/scenarios/ensino-tecnico/sala-de-aula.png"` em uma camada, ou `{ imagem: "/obstaculos/ensino-tecnico/engrenagem.png", acao: "pular", largura: 55, altura: 55 }` em `obstaculos`.

## Criar uma fase

1. Coloque as imagens do cenário em `public/scenarios/`. Pode usar um fundo completo e outros PNGs transparentes para árvores, prédios, chão e decoração. O palco mede **1100 × 560 pixels** e o personagem pisa em **y = 446**.
2. Coloque os obstáculos em `public/obstaculos/` como **PNG com fundo transparente**. Uma imagem por obstáculo.
3. Em `public/jogo/fases.js`, copie um bloco de fase, cole antes do `];` e altere os valores. Há também um modelo comentado no fim do arquivo: retire `/*` e `*/` para ativá-lo.
4. Salve e atualize a página no navegador.

### Testar cores

- No Campus, as três cores de `ceu: ["...", "...", "..."]` pintam o céu. `corFundo` só aparece quando `ceu` não está definido.
- As camadas são desenhadas uma sobre a outra. Um PNG de grama ou estrada pode cobrir uma camada `{ cor: "..." }` que está atrás dele.
- Para mudar a cor de um PNG sem trocar o arquivo, acrescente `filtro: "hue-rotate(120deg)"` à camada da imagem e experimente outros ângulos. Para uma cor exata, edite ou substitua o próprio PNG.
- Se a cor não mudar, confira se o terminal está executando `npm run dev`, se o arquivo foi salvo e se você atualizou a página aberta em `localhost:3000`.

Exemplo:

```js
{
  nome: "Biblioteca",
  titulo: "Corrida até a biblioteca!",
  mensagem: "Desvie dos livros.",
  duracao: 25,
  cenario: {
    corFundo: "#dce9f2",
    camadas: [
      { imagem: "/scenarios/biblioteca-fundo.png",
        x: 0, y: 0, largura: 1100, altura: 446 },
      { cor: "#675c52", x: 0, y: 446, largura: 1100, altura: 114 },
      { imagem: "/scenarios/plantas.png",
        x: 0, y: 260, largura: 550, altura: 186,
        velocidade: 0.2, repetir: 550 },
    ],
  },
  obstaculos: [
    { imagem: "/obstaculos/livros.png", acao: "pular", largura: 50, altura: 48 },
    { imagem: "/obstaculos/passaro.png", acao: "agachar", largura: 52, altura: 34, alturaDoChao: 57 },
  ],
},
```

`camadas` é a lista das partes do cenário. A primeira fica atrás; as seguintes aparecem na frente. Cada camada pode ter `imagem` ou `cor`. `x` e `y` são a posição a partir do canto superior esquerdo; `largura` e `altura` são o tamanho em pixels. `velocidade: 0` deixa a camada parada; valores maiores fazem a imagem andar mais rápido. `repetir` é a distância, em pixels, entre cópias da imagem para preencher o cenário enquanto ele anda.

As fases prontas mostram opções avançadas: `recorte` usa só uma parte do PNG, `panorama` move esse recorte, `ceu` cria um degradê, `nuvens` desenha nuvens e `vinheta` escurece as bordas. Uma fase nova não precisa de nenhuma delas.

Cada obstáculo usa `acao: "pular"` ou `acao: "agachar"`. `largura` e `altura` controlam o tamanho. `alturaDoChao` posiciona um obstáculo acima do chão. O tempo total no placar é a soma de `duracao` de todas as fases. Não é necessário editar `jogo.js`.

## Controles

- **↑ ou Espaço:** pular. **↓:** agachar.
- **Câmera opcional:** ative, permita o acesso e fique no centro com o corpo visível até a calibração terminar. Pule e agache com o corpo. O botão **Parar câmera** encerra a captura.
- **R:** recalibrar. **F:** tela cheia.

A análise da câmera acontece no navegador. O jogo não grava as imagens. O recorde fica no armazenamento local do navegador.

## Para o professor: verificar o projeto

Os comandos abaixo exigem executar `npm install` uma vez na pasta do projeto. Os alunos não precisam deles para jogar e editar.

```bash
npm install
node --check public/jogo/fases.js
node --check public/jogo/jogo.js
node --check public/jogo/camera.js
npm test
```
