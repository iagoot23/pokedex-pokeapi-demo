/* =========================================================
   POKÉDEX - INTERFACE
   Controla apenas o comportamento da tela:
   abrir/fechar a Pokédex, zoom com o scroll do mouse, janela de ajuda
   e o guia do universo Pokémon (aberto pela Pokébola).
   O código da PokeAPI fica no arquivo pokedex.js.
   ========================================================= */


/* ---------------------------------------------------------
   1. ABRIR E FECHAR A POKÉDEX
   --------------------------------------------------------- */
const pokedex = document.getElementById('pokedex');
const coverFront = document.getElementById('cover-front');
const lens = document.getElementById('lens');

function setPokedexOpen(isOpen) {
  pokedex.classList.toggle('is-open', isOpen);
  coverFront.setAttribute('aria-expanded', isOpen);

  // Só o elemento visível pode receber foco pelo teclado
  coverFront.tabIndex = isOpen ? -1 : 0;
  lens.tabIndex = isOpen ? 0 : -1;
}

coverFront.addEventListener('click', () => setPokedexOpen(true));

lens.addEventListener('click', () => {
  if (pokedex.classList.contains('is-open')) {
    setPokedexOpen(false);
  }
});

// Permite abrir/fechar com Enter ou Espaço
[coverFront, lens].forEach((element) => {
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      element.click();
    }
  });
});


/* ---------------------------------------------------------
   2. ZOOM COM A RODINHA DO MOUSE
   Altera a variável CSS --zoom; todas as medidas acompanham.
   --------------------------------------------------------- */
const stage = document.querySelector('.stage');
let zoom = 1;

// Maior zoom possível sem a Pokédex aberta sair da tela
function getMaxZoom() {
  const baseUnit = Math.min(innerWidth * .45, (innerHeight - 220) / 1.6, 420);   // mesmo cálculo do CSS
  const fitUnit = Math.min(innerWidth * .95 / 2, (innerHeight - 100) / 1.6);
  return Math.max(1, fitUnit / baseUnit);
}

function setZoom(value) {
  zoom = Math.min(Math.max(value, .5), getMaxZoom());
  document.documentElement.style.setProperty('--zoom', zoom);
}

stage.addEventListener('wheel', (event) => {
  if (event.ctrlKey) return;   // Ctrl + rodinha continua sendo o zoom do navegador
  event.preventDefault();      // evita rolar a página enquanto dá zoom
  setZoom(zoom * Math.exp(-event.deltaY * .0015));
}, { passive: false });

addEventListener('resize', () => setZoom(zoom));


/* ---------------------------------------------------------
   3. JANELA DE AJUDA
   --------------------------------------------------------- */
const helpDialog = document.getElementById('help-dialog');

document.getElementById('help-btn').addEventListener('click', () => helpDialog.showModal());
document.getElementById('help-close').addEventListener('click', () => helpDialog.close());


/* ---------------------------------------------------------
   4. GUIA DO UNIVERSO POKÉMON
   A Pokébola balança, acende e então o guia abre.
   --------------------------------------------------------- */
const pokeball = document.getElementById('pokeball-btn');
const universeDialog = document.getElementById('universe-dialog');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

pokeball.addEventListener('click', () => {
  if (pokeball.classList.contains('is-opening')) return;

  if (reducedMotion.matches) {
    universeDialog.showModal();
    return;
  }
  pokeball.classList.add('is-opening');
});

// A última animação da Pokébola é a que a faz sumir: aí o guia abre
pokeball.addEventListener('animationend', (event) => {
  if (event.animationName === 'pokeball-open') {
    universeDialog.showModal();
  }
});

// Ao fechar o guia, a Pokébola volta ao normal
universeDialog.addEventListener('close', () => pokeball.classList.remove('is-opening'));
document.getElementById('universe-close').addEventListener('click', () => universeDialog.close());

// Clicar fora do guia (no fundo escuro) também fecha
universeDialog.addEventListener('click', (event) => {
  if (event.target === universeDialog) universeDialog.close();
});
