// ZUNE Market now uses its official, fixed marketplace design.
// Template switching has been retired; this module intentionally applies no user-selected themes.
const DEFAULT_TEMPLATE = "classic";
document.documentElement.setAttribute("data-zune-template", DEFAULT_TEMPLATE);
document.body?.setAttribute("data-zune-template", DEFAULT_TEMPLATE);
document.documentElement.dataset.zuneTemplate = DEFAULT_TEMPLATE;
