/* ================= início ================= */
(function boot(){
  migrarSaveAntigo(); // save de slot único (versões antigas) vira o primeiro da lista
  S=null;view='menu'; // tela inicial: continuar, carregar ou começar um jogo
  render();
})();
