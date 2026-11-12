/* ================= início ================= */
(function boot(){
  S=store.get(SAVE_KEY);
  if(S&&S.clubs){reindex();view='clube'}else{S=null;view='inicio'}
  render();
})();
