// The only script on the site: collapses the header nav on narrow screens.
// Without it the nav stays visible, so every page remains navigable.
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  toggle.hidden = false;
  nav.dataset.collapsed = 'true';

  toggle.addEventListener('click', function () {
    var open = nav.dataset.collapsed === 'false';
    nav.dataset.collapsed = open ? 'true' : 'false';
    toggle.setAttribute('aria-expanded', String(!open));
  });
})();
