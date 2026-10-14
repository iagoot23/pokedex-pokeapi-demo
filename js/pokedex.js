/* =========================================================
   POKÉDEX - POKEAPI
   Busca os dados na PokeAPI e controla telas, luzes e botões,
   seguindo a especificação do README.md.
   ========================================================= */


/* ---------------------------------------------------------
   1. ELEMENTOS DA PÁGINA E CONSTANTES
   --------------------------------------------------------- */
const API = 'https://pokeapi.co/api/v2';
const MULTITAP_DELAY = 1000;   // ms até confirmar a letra digitada
const REQUEST_TIMEOUT = 10000; // ms até considerar que a API não respondeu

const $ = (id) => document.getElementById(id);

const screens = {
  main: $('main-screen'),
  info: $('info-screen'),
  number: $('number-display'),
  prev: $('small-display-left'),
  next: $('small-display-right'),
};

const lamps = {
  stage: [...document.querySelectorAll('.led')],   // vermelha, amarela, verde
  frame: document.querySelector('.screen-frame'),
  power: document.querySelector('.power-led'),
  shiny: $('led-yellow'),
};

const keypad = $('keypad');

// Todos os botões da Pokédex (a lente não entra: ela continua funcionando na busca)
const allButtons = [...document.querySelectorAll('.pokedex button')];

// Letras de cada tecla azul no modo letras (#key-1 e #key-10 não fazem nada)
const KEY_LETTERS = {
  1: '', 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl',
  6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz', 10: '',
};

const TYPE_NAMES = {
  normal: 'Normal', fire: 'Fogo', water: 'Água', grass: 'Planta',
  electric: 'Elétrico', ice: 'Gelo', fighting: 'Lutador', poison: 'Venenoso',
  ground: 'Terrestre', flying: 'Voador', psychic: 'Psíquico', bug: 'Inseto',
  rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragão', dark: 'Sombrio',
  steel: 'Aço', fairy: 'Fada', stellar: 'Astral', unknown: '???',
};

const STAT_NAMES = {
  'hp': 'HP', 'attack': 'ATQ', 'defense': 'DEF',
  'special-attack': 'ATQ.E', 'special-defense': 'DEF.E', 'speed': 'VEL',
};

const PAGES = ['DESCRIÇÃO', 'TIPOS', 'ATRIBUTOS', 'HABILIDADES', 'ALTURA E PESO'];


/* ---------------------------------------------------------
   2. ESTADO
   --------------------------------------------------------- */
const state = {
  mode: 'letters',     // 'letters' ou 'numbers'
  typing: false,       // true enquanto a tela de informações mostra a digitação
  text: '',            // caracteres já confirmados
  pending: null,       // letra que ainda pode mudar: { key, index }
  pendingTimer: null,
  busy: false,         // true durante uma busca
  current: null,       // Pokémon exibido: { pokemon, species, evolution }
  page: 0,
  gender: null,        // null (normal), 'female' ou 'male'
  shiny: false,
  lastNumber: null,    // último número da Pokédex nacional, lido da API
};


/* ---------------------------------------------------------
   3. REQUISIÇÕES
   --------------------------------------------------------- */
class PokedexError extends Error {}

const NOT_FOUND = 'NÃO ENCONTRADO';
const OFFLINE = 'SEM CONEXÃO COM A INTERNET';
const NO_ANSWER = 'A API NÃO RESPONDEU';

async function getJSON(path) {
  if (!navigator.onLine) throw new PokedexError(OFFLINE);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const url = path.startsWith('http') ? path : `${API}/${path}`;
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404) throw new PokedexError(NOT_FOUND);
    if (!response.ok) throw new PokedexError(NO_ANSWER);
    return await response.json();
  } catch (error) {
    if (error instanceof PokedexError) throw error;
    throw new PokedexError(navigator.onLine ? NO_ANSWER : OFFLINE);
  } finally {
    clearTimeout(timer);
  }
}

// Busca o Pokémon, a espécie e a cadeia de evolução.
// Algumas espécies (giratina, deoxys...) só existem em /pokemon-species/ pelo nome simples.
async function fetchPokemon(query) {
  let pokemon;
  let species;

  try {
    pokemon = await getJSON(`pokemon/${query}`);
  } catch (error) {
    if (error.message !== NOT_FOUND) throw error;
    species = await getJSON(`pokemon-species/${query}`);
    const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
    pokemon = await getJSON(variety.pokemon.url);
  }

  species ??= await getJSON(pokemon.species.url);
  const chain = species.evolution_chain ? await getJSON(species.evolution_chain.url) : null;

  return { pokemon, species, evolution: readEvolution(chain, species.name) };
}

async function getLastNumber() {
  state.lastNumber ??= (await getJSON('pokemon-species/?limit=1')).count;
  return state.lastNumber;
}

// Os sprites têm muita borda transparente e o Pokémon nem sempre fica no meio.
// Recorta a imagem até o desenho, para ela ficar centralizada na tela.
// Guarda o resultado de cada endereço, para trocar de versão sem esperar de novo.
const spriteCache = new Map();

function loadSprite(url) {
  if (!url) return Promise.resolve(null);
  if (!spriteCache.has(url)) spriteCache.set(url, trimSprite(url));
  return spriteCache.get(url);
}

// Se não der para recortar (imagem quebrada ou sem permissão), usa a original
function trimSprite(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        resolve(cropToContent(image) ?? url);
      } catch {
        resolve(url);
      }
    };
    image.onerror = () => resolve(url);
    image.src = url;
  });
}

function cropToContent(image) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height).data;

  // Procura os limites dos pixels que não são transparentes
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return null;

  const cropped = document.createElement('canvas');
  cropped.width = right - left + 1;
  cropped.height = bottom - top + 1;
  cropped.getContext('2d').drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  return cropped.toDataURL();
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


/* ---------------------------------------------------------
   4. BUSCA
   Mesmo fluxo para BUSCAR e para as setas cima/baixo.
   --------------------------------------------------------- */
async function search(query) {
  if (state.busy) return;
  setBusy(true);
  confirmPending();
  state.typing = false;
  screens.info.textContent = '';
  lamps.frame.classList.add('is-searching');

  try {
    // Espera pelo menos um pouco, para a animação dos pontos aparecer
    const [result] = await Promise.all([fetchPokemon(query), wait(600)]);
    await loadSprite(result.pokemon.sprites.front_default);

    // Pontos da moldura piscam juntos uma vez antes do resultado
    lamps.frame.classList.remove('is-searching');
    lamps.frame.classList.add('is-ready');
    await wait(350);

    state.current = result;
    state.page = 0;
    state.gender = null;
    state.shiny = false;
    state.text = '';
    renderPokemon();
  } catch (error) {
    lamps.frame.classList.remove('is-searching');
    showError(error instanceof PokedexError ? error.message : 'ERRO INESPERADO');
    restoreInfo();
  } finally {
    lamps.frame.classList.remove('is-ready');
    setBusy(false);
  }
}

function setBusy(isBusy) {
  state.busy = isBusy;
  allButtons.forEach((button) => { button.disabled = isBusy; });
}

async function goToNumber(step) {
  if (state.busy) return;
  try {
    const last = await getLastNumber();
    const number = state.current?.species.id ?? (step > 0 ? 0 : 1);
    // Ciclo: depois do último vem o #1, e antes do #1 vem o último
    search(((number - 1 + step + last) % last) + 1);
  } catch (error) {
    showError(error.message);
  }
}


/* ---------------------------------------------------------
   5. EXIBIÇÃO
   --------------------------------------------------------- */
function renderPokemon() {
  const { species, evolution } = state.current;

  screens.number.textContent = `#${String(species.id).padStart(3, '0')}`;
  renderSprite();
  renderInfoPage();

  screens.prev.textContent = evolution.prev ?? '---';
  screens.next.textContent = evolution.next ?? '---';

  // Luzes do topo: estágio 1, 2 ou 3; todas acesas para evolução especial
  lamps.stage.forEach((lamp, index) => {
    lamp.classList.toggle('is-on', evolution.special || index === evolution.stage - 1);
  });
}

function spriteFor(gender, shiny) {
  const sprites = state.current.pokemon.sprites;
  if (gender === 'female') return shiny ? sprites.front_shiny_female : sprites.front_female;
  return shiny ? sprites.front_shiny : sprites.front_default;
}

async function renderSprite() {
  const url = spriteFor(state.gender, state.shiny);
  lamps.shiny.classList.toggle('is-on', state.shiny);
  lamps.shiny.setAttribute('aria-pressed', state.shiny);

  const src = await loadSprite(url);
  // Outra versão foi pedida enquanto esta carregava
  if (!state.current || url !== spriteFor(state.gender, state.shiny)) return;

  screens.main.classList.remove('is-error');
  screens.main.replaceChildren();

  if (src) {
    const image = document.createElement('img');
    image.src = src;
    image.alt = state.current.species.name;
    screens.main.append(image);
  } else {
    screens.main.textContent = 'SEM IMAGEM';
  }
}

// Cabeçalho da tela de informações: texto à esquerda e à direita
function infoHead(left, right) {
  const head = document.createElement('div');
  head.className = 'info-head';
  for (const text of [left, right]) {
    const span = document.createElement('span');
    span.textContent = text;
    head.append(span);
  }
  return head;
}

function renderInfoPage() {
  const { pokemon, species } = state.current;
  const head = infoHead(species.name.toUpperCase(), `${PAGES[state.page]} ${state.page + 1}/${PAGES.length}`);
  const body = document.createElement('div');
  body.className = 'info-body';

  switch (state.page) {
    case 0:
      body.textContent = describe(species);
      break;
    case 1:
      body.textContent = pokemon.types.map((t) => TYPE_NAMES[t.type.name] ?? t.type.name).join(' / ');
      break;
    case 2:
      body.classList.add('info-stats');
      for (const { stat, base_stat: value } of pokemon.stats) {
        const line = document.createElement('span');
        const label = document.createElement('b');
        label.textContent = STAT_NAMES[stat.name] ?? stat.name;
        line.append(label, String(value));
        body.append(line);
      }
      break;
    case 3:
      body.textContent = pokemon.abilities
        .map((a) => titleCase(a.ability.name) + (a.is_hidden ? ' (oculta)' : ''))
        .join(', ');
      break;
    case 4: {
      // A API dá decímetros e hectogramas: divide por 10 para metros e quilos
      const format = (value, unit) => `${(value / 10).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} ${unit}`;
      body.append(`Altura: ${format(pokemon.height, 'm')}`, document.createElement('br'), `Peso: ${format(pokemon.weight, 'kg')}`);
      break;
    }
  }

  screens.info.replaceChildren(head, body);
}

// Volta a mostrar os dados do Pokémon atual (ou a mensagem inicial)
function restoreInfo() {
  state.typing = false;
  if (state.current) renderInfoPage();
  else screens.info.textContent = 'Aguardando dados…';
}

// A PokeAPI não tem descrições em português; usa a mais recente em inglês
function describe(species) {
  const entry = species.flavor_text_entries.filter((e) => e.language.name === 'en').at(-1);
  return entry ? entry.flavor_text.replace(/[\f\n\r­]+/g, ' ') : 'Sem descrição.';
}

const titleCase = (name) => name.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');

function showError(message) {
  screens.main.classList.add('is-error');
  screens.main.textContent = message;
  blinkPower();
}

function blinkPower() {
  lamps.power.classList.remove('is-blinking');
  void lamps.power.offsetWidth;   // reinicia a animação se já estiver piscando
  lamps.power.classList.add('is-blinking');
  playErrorBeep();
}

// Bipe de erro: dois toques graves de onda quadrada, gerados pelo navegador
let audioContext = null;

function playErrorBeep() {
  audioContext ??= new AudioContext();
  const start = audioContext.currentTime;

  [0, .16].forEach((delay) => {
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = 220;
    volume.gain.setValueAtTime(.08, start + delay);
    volume.gain.exponentialRampToValueAtTime(.001, start + delay + .12);
    oscillator.connect(volume).connect(audioContext.destination);
    oscillator.start(start + delay);
    oscillator.stop(start + delay + .12);
  });
}

lamps.power.addEventListener('animationend', () => lamps.power.classList.remove('is-blinking'));


/* ---------------------------------------------------------
   6. EVOLUÇÕES
   A cadeia é uma árvore: procura o caminho até a espécie atual.
   --------------------------------------------------------- */
function readEvolution(chain, name) {
  const path = chain && findPath(chain.chain, name);
  if (!path) return { stage: 1, prev: null, next: null, special: false };

  const node = path.at(-1);
  const parent = path.at(-2);
  const children = node.evolves_to;

  return {
    stage: Math.min(path.length, 3),
    prev: parent?.species.name ?? null,
    next: children.length > 1 ? 'MAIS QUE UM' : children[0]?.species.name ?? null,
    special: parent ? isSpecialEvolution(node.evolution_details) : false,
  };
}

function findPath(node, name) {
  if (node.species.name === name) return [node];
  for (const child of node.evolves_to) {
    const path = findPath(child, name);
    if (path) return [node, ...path];
  }
  return null;
}

// Especial: o gatilho não é subir de nível, ou exige algo além do nível mínimo.
// A API traz uma entrada por versão do jogo; só é especial se todas forem.
function isSpecialEvolution(details) {
  const ignored = ['trigger', 'min_level', 'version_group', 'is_default'];
  const isSpecial = (detail) => detail.trigger.name !== 'level-up'
    || Object.entries(detail).some(([key, value]) => !ignored.includes(key)
      && value !== null && value !== false && value !== '');

  return details.length > 0 && details.every(isSpecial);
}


/* ---------------------------------------------------------
   7. TECLADO (digitação de celular antigo)
   --------------------------------------------------------- */
function startTyping() {
  if (state.typing) return;
  state.typing = true;
  state.text = '';
  state.pending = null;
}

function confirmPending() {
  clearTimeout(state.pendingTimer);
  if (state.pending) {
    state.text += KEY_LETTERS[state.pending.key][state.pending.index];
    state.pending = null;
  }
}

function pressKey(key) {
  if (state.mode === 'letters') {
    const letters = KEY_LETTERS[key];
    if (!letters) return;   // #key-1 e #key-10 não fazem nada no modo letras
    startTyping();

    if (state.pending?.key === key) {
      state.pending.index = (state.pending.index + 1) % letters.length;
    } else {
      confirmPending();
      state.pending = { key, index: 0 };
    }
    clearTimeout(state.pendingTimer);
    state.pendingTimer = setTimeout(() => { confirmPending(); renderTyping(); }, MULTITAP_DELAY);
  } else {
    startTyping();
    confirmPending();
    state.text += key === 10 ? '0' : String(key);
  }
  renderTyping();
}

function typeHyphen() {
  startTyping();
  confirmPending();
  state.text += '-';
  renderTyping();
}

function toggleMode() {
  startTyping();
  confirmPending();
  state.mode = state.mode === 'letters' ? 'numbers' : 'letters';
  updateKeypadMode();
  renderTyping();
}

function clearOne() {
  if (!state.typing) return;

  if (state.pending) {
    clearTimeout(state.pendingTimer);
    state.pending = null;
  } else if (state.text) {
    state.text = state.text.slice(0, -1);
  } else {
    restoreInfo();   // nada digitado: volta aos dados do Pokémon atual
    return;
  }
  renderTyping();
}

function submit() {
  confirmPending();
  const text = state.text.trim();
  if (!state.typing || !text) return blinkPower();

  // Números perdem os zeros à esquerda (025 → 25); nomes vão em minúsculas
  search(/^\d+$/.test(text) ? String(Number(text)) : text.toLowerCase());
}

function renderTyping() {
  const head = infoHead('DIGITE E APERTE BUSCAR', state.mode === 'letters' ? 'ABC' : '123');
  const line = document.createElement('div');
  line.className = 'info-body typing-text';
  line.append(state.text);

  if (state.pending) {
    const pending = document.createElement('span');
    pending.className = 'typing-pending';
    pending.textContent = KEY_LETTERS[state.pending.key][state.pending.index];
    line.append(pending);
  }

  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  cursor.textContent = '_';
  line.append(cursor);

  screens.info.replaceChildren(head, line);
}

function updateKeypadMode() {
  keypad.classList.toggle('is-letters', state.mode === 'letters');
  keypad.classList.toggle('is-numbers', state.mode === 'numbers');
}


/* ---------------------------------------------------------
   8. VERSÕES, GRITO E PÁGINAS
   --------------------------------------------------------- */
function showGender(gender) {
  if (!state.current) return blinkPower();
  const rate = state.current.species.gender_rate;   // -1 sem gênero, 0 só macho, 8 só fêmea

  const exists = gender === 'female'
    ? Boolean(spriteFor('female', state.shiny))
    : rate !== -1 && rate !== 8;
  if (!exists) return blinkPower();

  state.gender = gender;
  renderSprite();
}

function toggleShiny() {
  if (!state.current || !spriteFor(state.gender, !state.shiny)) return blinkPower();
  state.shiny = !state.shiny;
  renderSprite();
}

function playCry() {
  const cries = state.current?.pokemon.cries;
  const url = cries?.latest ?? cries?.legacy;
  if (!url) return blinkPower();

  const audio = new Audio(url);
  audio.volume = .5;
  audio.play().catch(blinkPower);
}

function changePage(step) {
  if (!state.current || state.typing) return;
  state.page = (state.page + step + PAGES.length) % PAGES.length;
  renderInfoPage();
}


/* ---------------------------------------------------------
   9. LIGANDO OS BOTÕES
   --------------------------------------------------------- */
for (let key = 1; key <= 10; key++) {
  $(`key-${key}`).addEventListener('click', () => pressKey(key));
}

$('btn-white-left').addEventListener('click', submit);
$('btn-white-right').addEventListener('click', clearOne);
$('btn-dark-left').addEventListener('click', toggleMode);
$('btn-dark-right').addEventListener('click', typeHyphen);
$('btn-red').addEventListener('click', () => showGender('female'));
$('btn-blue').addEventListener('click', () => showGender('male'));
$('btn-round').addEventListener('click', playCry);
$('btn-up').addEventListener('click', () => goToNumber(1));
$('btn-down').addEventListener('click', () => goToNumber(-1));
$('btn-left').addEventListener('click', () => changePage(-1));
$('btn-right').addEventListener('click', () => changePage(1));
lamps.shiny.addEventListener('click', toggleShiny);

updateKeypadMode();
