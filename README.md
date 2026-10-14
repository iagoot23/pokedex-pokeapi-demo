# Pokédex PokeAPI — Demonstração

Versão de demonstração, com o app funcionando e um rótulo em cada botão. O projeto original, em que o `js/pokedex.js` ainda está para ser feito, é o [pokedex-pokeapi](https://github.com/iagoot23/pokedex-pokeapi).

13 out. 2026 · @Iago Teixeira Pereira

## Resumo

O app é uma Pokédex que se abre na tela: você digita o nome ou o número de um Pokémon, e ela busca os dados dele na internet e os mostra.

- **Encontrar um Pokémon:** digite nas teclas azuis como num celular antigo e aperte Buscar, ou use as setas para cima/baixo para percorrê-los pelo número.
- **Ver o Pokémon:** a imagem dele aparece na tela principal e o número, no visor verde.
- **Saber mais sobre ele:** a tela de informações mostra descrição, tipos, atributos, habilidades, altura e peso; as setas esquerda/direita trocam de página.
- **Ver versões:** os botões de fêmea, macho e shiny trocam a imagem; o botão redondo toca o grito dele.
- **Acompanhar a evolução:** as três lâmpadas do topo mostram o estágio, e as duas telinhas mostram o nome do Pokémon anterior e do seguinte.
- **Saber o que está acontecendo:** os pontos da moldura piscam durante a busca, e o LED de energia pisca quando algo dá errado.

Na parte técnica, o projeto serve para praticar chamadas a uma API com JavaScript (`fetch`), leitura do JSON que ela devolve e atualização da página com o resultado.

## Visão geral

Esta especificação define o que cada botão, tela e lâmpada da Pokédex faz depois de conectada à [PokeAPI](https://pokeapi.co/docs/v2), uma API gratuita e sem chave. Os nomes em `código` são os IDs (`#`) e classes (`.`) exatos usados no `index.html`.

| Arquivo | O que contém | Situação |
| --- | --- | --- |
| `index.html` | Todas as telas, botões e lâmpadas | Pronto |
| `css/style.css` | A aparência | Pronto |
| `js/interface.js` | Abrir/fechar, zoom com a rodinha do mouse, janela de ajuda | Pronto |
| `js/pokedex.js` | Tudo o que esta especificação descreve | Pronto |

Para rodar, abra o `index.html` no navegador; não há etapa de build. Os dois scripts já são carregados com `defer`. Conforme as funcionalidades forem criadas, adicione um passo para cada uma na janela de ajuda (`#help-dialog` no `index.html`).

## Telas e indicadores

Cinco telas mostram conteúdo e sete lâmpadas mostram estado. Só uma delas, a lâmpada shiny, também pode ser clicada.

| Elemento | Nome no código | O que mostra |
| --- | --- | --- |
| Tela principal | `#main-screen` (dentro de `.screen-frame`) | A imagem (sprite) do Pokémon. Em caso de erro: uma descrição curta do erro. Começa com "Nenhum Pokémon carregado". |
| Tela de informações | `#info-screen` | O que o usuário digita, ou a página de dados do Pokémon atual (veja Páginas de informação). Começa com "Aguardando dados…". |
| Visor numérico | `#number-display` | O número do Pokémon, só depois de uma busca ou da navegação para cima/baixo. Formato `#025`; começa como `#000`. |
| Telinha esquerda | `#small-display-left` | Nome da evolução anterior, ou `---` se não houver. |
| Telinha direita | `#small-display-right` | Nome da próxima evolução, "MAIS QUE UM" se houver ramificação, ou `---` se não houver. |
| Lâmpada vermelha do topo | `.led--red` | O Pokémon atual é estágio 1. |
| Lâmpada amarela do topo | `.led--yellow` | O Pokémon atual é estágio 2. |
| Lâmpada verde do topo | `.led--green` | O Pokémon atual é estágio 3. |
| Pontos da moldura | `.frame-dot--left`, `.frame-dot--right` | Piscam alternados durante a busca; piscam juntos uma vez quando o resultado fica pronto. |
| LED de energia | `.power-led` | Pisca a cada erro e quando a versão pedida não existe, junto com um bipe de erro. |
| Lâmpada shiny | `#led-yellow` (um `<button>` na tampa, ao lado do teclado) | Acesa enquanto a versão shiny é exibida (também é um botão, veja Controles). Não confundir com `.led--yellow`, a lâmpada de estágio do topo. |

## Controles

Cada botão tem uma única função; as teclas do teclado são detalhadas na próxima seção.

| Controle | Nome no código | O que faz |
| --- | --- | --- |
| Teclas azuis | `#key-1` … `#key-10` | Digitam letras no modo letras (inicial), ou os números 1–9 e 0 (`#key-10` = 0) no modo números |
| Tecla branca esquerda | `#btn-white-left` | Buscar |
| Tecla branca direita | `#btn-white-right` | Apagar |
| Botão escuro esquerdo | `#btn-dark-left` | Alterna entre modo letras e modo números |
| Botão escuro direito | `#btn-dark-right` | Digita um hífen `-` |
| Botão vermelho | `#btn-red` | Mostra a versão fêmea; o `.power-led` pisca se ela não existir |
| Botão azul | `#btn-blue` | Mostra a versão macho; o `.power-led` pisca se ela não existir |
| Botão redondo escuro | `#btn-round` | Toca o grito do Pokémon |
| Seta para cima | `#btn-up` | Próximo Pokémon pelo número (conta como busca) |
| Seta para baixo | `#btn-down` | Pokémon anterior pelo número (conta como busca) |
| Seta para a esquerda | `#btn-left` | Página de informações anterior |
| Seta para a direita | `#btn-right` | Próxima página de informações |
| Lâmpada amarela | `#led-yellow` | Alterna entre normal e shiny; fica acesa enquanto o shiny é exibido (atualize `aria-pressed`) |
| Lente azul | `#lens` | Fecha a Pokédex (já feito no `interface.js`); continua funcionando durante a busca |

A ordem esquerda/direita das teclas brancas e dos botões escuros é uma escolha inicial; trocá-la só muda esta tabela.

**Regras de gênero.** Fêmea: mostra a imagem própria da fêmea (`front_female`); a maioria dos Pokémon não tem uma (`null`), então o `.power-led` pisca. Macho: mostra a imagem normal; o `.power-led` pisca quando a espécie não pode ser macho. Os dados da espécie dizem qual é o caso (`gender_rate`: -1 = sem gênero, 0 = só macho, 8 = só fêmea).

**Regra do shiny.** O shiny funciona junto com o gênero: alternar o shiny mantém o gênero exibido, e os botões de gênero mantêm o shiny ligado ou desligado.

## Teclado

A digitação funciona como num celular antigo: aperte uma tecla várias vezes para percorrer as letras dela. O texto aparece em `#info-screen`. O teclado começa no **modo letras**.

| Tecla | Modo números | Modo letras |
| --- | --- | --- |
| `#key-1` | 1 | nada |
| `#key-2` | 2 | a b c |
| `#key-3` | 3 | d e f |
| `#key-4` | 4 | g h i |
| `#key-5` | 5 | j k l |
| `#key-6` | 6 | m n o |
| `#key-7` | 7 | p q r s |
| `#key-8` | 8 | t u v |
| `#key-9` | 9 | w x y z |
| `#key-10` | 0 | nada |

Regras da digitação multitoque:

1. Apertar a mesma tecla de novo troca a letra sob o cursor pela próxima da lista e, depois da última, volta à primeira.
2. A letra é confirmada, e o cursor avança para o próximo espaço, quando outra tecla é apertada ou depois de **1 segundo** sem toques (constante `MULTITAP_DELAY = 1000` ms).
3. Enquanto a letra ainda pode mudar, ela aparece destacada (sublinhada ou piscando).
4. `#btn-dark-right` digita `-` e antes confirma qualquer letra pendente. Os nomes de Pokémon na API usam hífen no lugar de espaço (`mr-mime`, `tapu-koko`).
5. `#btn-dark-left` alterna entre modo letras e modo números. No modo letras, `#key-1` e `#key-10` não fazem nada.
6. `#btn-white-right` (Apagar) apaga um caractere durante a digitação; sem nada digitado, traz de volta os dados do Pokémon atual.
7. `#btn-white-left` (Buscar) busca pelo número no modo números e pelo nome no modo letras. Os nomes são enviados em minúsculas.

## Regras

Uma busca sempre acontece do mesmo jeito, venha ela do Buscar ou das setas para cima/baixo.

**Durante a busca**

1. `#info-screen` é limpa.
2. Todas as teclas e botões, inclusive `#led-yellow`, ficam desativados até a busca terminar. A lente `#lens` é a exceção: continua fechando a Pokédex.
3. `.frame-dot--left` e `.frame-dot--right` piscam alternados.
4. Quando o resultado fica pronto, os dois pontos da moldura piscam juntos uma vez e então o resultado é exibido.

**O que `#info-screen` mostra**

| Situação | O que acontece |
| --- | --- |
| A página abre | Mostra "Aguardando dados…" |
| A busca termina | Mostra os dados do Pokémon, começando pela página de descrição |
| Um Pokémon está na tela e qualquer tecla do teclado é apertada | Os dados são limpos e o cursor aparece, pronto para digitar |
| Digitando e Apagar é apertado | Um caractere é apagado |
| Nada digitado e Apagar é apertado | Os dados do Pokémon atual voltam |

**Números e navegação**

- Um número digitado perde os zeros à esquerda antes da requisição: `025` vira `25`.
- `#btn-up` depois do último Pokémon vai para o #1; `#btn-down` no #1 vai para o último. Leia o último número da API em vez de escrevê-lo no código, porque novos Pokémon são adicionados com o tempo.

**Erros**

Todo erro faz o `.power-led` piscar, toca um bipe e mostra uma descrição curta em `#main-screen`. Casos: nome ou número não encontrado, sem conexão com a internet e API sem resposta.

**Atenção:** algumas espécies não têm entrada com o nome simples em `/pokemon/` porque têm várias formas (`giratina`, `deoxys`, `shaymin`). `/pokemon-species/{nome}` sempre aceita o nome simples e lista as formas.

## Páginas de informação

`#info-screen` mostra uma página de dados por vez, sempre começando pela descrição. `#btn-right` avança e `#btn-left` volta, em ciclo: depois da última página vem a primeira.

1. Descrição (de `/pokemon-species/`, campo `flavor_text_entries`; a PokeAPI não tem descrições em português, então aparece a mais recente em inglês)
2. Tipos
3. Atributos: HP, Ataque, Defesa, Ataque Especial, Defesa Especial, Velocidade
4. Habilidades
5. Altura e peso (a API dá decímetros e hectogramas: divida por 10 para metros e quilogramas)

## Evoluções

As três lâmpadas do topo mostram o estágio do Pokémon atual na cadeia de evolução; as três acendem quando ele foi alcançado por uma evolução especial.

| Caso | `.led--red` | `.led--yellow` | `.led--green` | Exemplo |
| --- | --- | --- | --- | --- |
| Estágio 1 (base, ou sem evoluções) | Acesa | Apagada | Apagada | Bulbasaur, Tauros |
| Estágio 2 | Apagada | Acesa | Apagada | Ivysaur |
| Estágio 3 | Apagada | Apagada | Acesa | Venusaur |
| Evolução especial | Acesa | Acesa | Acesa | Raichu, Gengar, Espeon |

**Evolução especial.** Na cadeia, cada etapa tem `evolution_details` com um `trigger`. A etapa é especial quando uma das condições vale:

- o trigger não é `level-up` (por exemplo `trade` ou `use-item`), ou
- o trigger é `level-up`, mas exige algo além de um nível mínimo: amizade, horário do dia, item segurado, golpe conhecido, local etc.

**Telinhas**

- `#small-display-left`: nome do estágio anterior, ou `---` para um estágio 1.
- `#small-display-right`: nome do próximo estágio; "MAIS QUE UM" quando a cadeia se ramifica (Eevee tem 8 opções); `---` para o último estágio.

A cadeia vem de uma terceira requisição: `/pokemon-species/` traz o link para `/evolution-chain/{id}`. A cadeia é uma árvore, então as ramificações exigem cuidado.

## Glossário

Para quem é novo em Pokémon, em APIs ou nos dois.

**O mundo Pokémon**

| Termo | Significado |
| --- | --- |
| Pokémon | Criaturas fictícias de uma série de jogos japonesa iniciada em 1996. Cada uma tem nome, número e habilidades. A palavra serve para singular e plural. |
| Pokédex | O aparelho-enciclopédia que os treinadores carregam nos jogos. Aponte para um Pokémon e ele mostra os dados. Este projeto é uma Pokédex. |
| Número da Pokédex | O número de cada espécie na lista nacional (#1 Bulbasaur, #25 Pikachu). |
| Espécie | Um tipo de Pokémon, por exemplo Pikachu. Uma espécie pode ter várias formas. |
| Forma | Uma variação de uma espécie com aparência ou dados diferentes, como as formas regionais ou as duas formas de Giratina. |
| Tipo | Um elemento como Fogo, Água ou Planta. Cada Pokémon tem 1 ou 2. Os tipos definem forças e fraquezas em batalha. |
| Atributos (stats) | Seis números base que medem um Pokémon: HP (vida), Ataque, Defesa, Ataque Especial, Defesa Especial e Velocidade. |
| Habilidade | Um poder passivo de cada Pokémon, por exemplo Overgrow. Alguns têm uma rara "habilidade oculta". |
| Evolução | Quando um Pokémon se transforma numa espécie mais forte, por exemplo Charmander → Charmeleon → Charizard. |
| Cadeia de evolução | A linha completa da família, do primeiro ao último estágio. |
| Estágio | A posição de um Pokémon na cadeia: 1 (base), 2 ou 3. |
| Evolução ramificada | Quando uma espécie pode evoluir para mais de uma, por exemplo Eevee para 8 Pokémon diferentes. |
| Gatilho de evolução (trigger) | O que causa uma evolução: atingir um nível, usar um item (uma pedra), ser trocado, amizade e outros. |
| Shiny | Uma versão rara de um Pokémon com cores diferentes. |
| Diferença de gênero | Algumas espécies têm aparência um pouco diferente como fêmea ou macho. Algumas não têm gênero, ou são só fêmea ou só macho. |
| Grito (cry) | O som que um Pokémon faz. |
| Sprite | Uma imagem pequena de um personagem, usada em jogos. |

**O projeto e a programação**

| Termo | Significado |
| --- | --- |
| API | Um serviço ao qual um programa pode pedir dados. Aqui, a PokeAPI responde com dados de Pokémon. |
| Endpoint | Um endereço de uma API para um tipo de dado, por exemplo `/pokemon/25`. |
| Requisição | Pedir dados a uma API. Em JavaScript: `fetch()`. |
| JSON | O formato de texto em que a API responde: nomes e valores entre `{ }` e `[ ]`. |
| `null` | "Sem valor": o dado existe no formato, mas está vazio, por exemplo quando não há imagem de fêmea. |
| ID (`#`) e classe (`.`) | Nomes dados aos elementos HTML para que o CSS e o JavaScript os encontrem. |
| Multitoque (multi-tap) | Digitar letras apertando a mesma tecla várias vezes, como nos celulares antes das telas sensíveis ao toque. |
| Cursor | A marca que mostra onde o próximo caractere vai aparecer. |
| Timeout | Um tempo de espera depois do qual algo acontece sozinho. Aqui, 1 segundo confirma uma letra. |
| D-pad | O botão em forma de cruz com quatro direções. |
| LED | Uma pequena luz. Aqui, as lâmpadas que sinalizam o que está acontecendo. |
| Ciclo (wrap-around) | Passar do fim de uma lista leva de volta ao começo, e vice-versa. |
