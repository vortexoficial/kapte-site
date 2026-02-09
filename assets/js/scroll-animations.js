// Kapte Mídia é Scroll Animations (GSAP + ScrollTrigger)
// Regras:
// - Não altera layout existente; só anima com transform/opacity/filter.
// - Executa uma vez por elemento (ScrollTrigger once:true).
// - Respeita prefers-reduced-motion (animações desativadas).
// - Inclui reveals, grupos, variantes de direção, scale+blur, parallax e foco de seção.
// - Cabeçalho: adiciona .is-scrolled ao descer.

(function() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Early exit: se usuário prefere menos movimento, tornamos tudo visível.
  if (prefersReduced) {
    const toReset = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-up, .reveal-down, .reveal-scale, .parallax, .section-focus');
    toReset.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.filter = 'none';
    });
    return;
  }

  // GSAP + ScrollTrigger (assume carregados via CDN antes deste script)
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('GSAP/ScrollTrigger não encontrados. Confirme a inclusão via CDN.');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Defaults globais leves
  ScrollTrigger.defaults({
    markers: false,
    fastScrollEnd: true,
    once: true
  });

  // Helper de reveal base
  function makeReveal(el, vars) {
    const base = {
      opacity: 0,
      y: 24,
      ease: 'power2.out',
      duration: 0.8,
      willChange: 'opacity, transform'
    };
    const fromVars = Object.assign({}, base, vars.from || {});
    const toVars = Object.assign({
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      filter: 'blur(0px)'
    }, vars.to || {});

    gsap.fromTo(el, fromVars, Object.assign({}, toVars, {
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true
      }
    }));
  }

  // Revela grupos com stagger
  const groups = document.querySelectorAll('.reveal-group');
  groups.forEach(group => {
    const children = group.querySelectorAll('.reveal');
    if (!children.length) return;
    gsap.fromTo(children,
      { opacity: 0, y: 24, willChange: 'opacity, transform' },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
        stagger: { each: 0.1, from: 'start' },
        scrollTrigger: { trigger: group, start: 'top 85%', once: true }
      }
    );
  });

  // Variantes isoladas
  const baseReveals = document.querySelectorAll('.reveal');
  baseReveals.forEach(el => makeReveal(el, {}));

  const leftReveals = document.querySelectorAll('.reveal-left');
  leftReveals.forEach(el => makeReveal(el, { from: { x: -28, y: 0 } }));

  const rightReveals = document.querySelectorAll('.reveal-right');
  rightReveals.forEach(el => makeReveal(el, { from: { x: 28, y: 0 } }));

  const upReveals = document.querySelectorAll('.reveal-up');
  upReveals.forEach(el => makeReveal(el, { from: { y: 28 } }));

  const downReveals = document.querySelectorAll('.reveal-down');
  downReveals.forEach(el => makeReveal(el, { from: { y: -18 } }));

  const scaleReveals = document.querySelectorAll('.reveal-scale');
  scaleReveals.forEach(el => makeReveal(el, { from: { scale: 0.97, filter: 'blur(6px)' }, to: { filter: 'blur(0px)' } }));

  // Hero CTAs (intro suave no topo)
  var heroCtas = document.querySelectorAll('.hero-actions .btn');
  if (heroCtas.length) {
    gsap.from(heroCtas, {
      opacity: 0,
      y: 18,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.12,
      delay: 0.15,
      scrollTrigger: {
        trigger: '.hero',
        start: 'top 90%',
        once: true
      }
    });
  }

  // Parallax suave
  const parallaxEls = document.querySelectorAll('.parallax');
  parallaxEls.forEach(el => {
    gsap.fromTo(el,
      { y: 12, willChange: 'transform' },
      {
        y: -12,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      }
    );
  });

  // Section focus (realce sutil no centro da viewport)
  const focusSections = document.querySelectorAll('.section-focus');
  focusSections.forEach(section => {
    const highlight = section.querySelector('.section-focus__halo') || section;
    gsap.fromTo(highlight,
      { boxShadow: '0 0 0 rgba(0,0,0,0)' },
      {
        boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
        ease: 'power1.out',
        scrollTrigger: {
          trigger: section,
          start: 'top center',
          end: 'bottom center',
          scrub: true
        }
      }
    );
  });

  // Header behavior
  var header = document.querySelector('.site-header');
  if (header) {
    var lastScroll = window.scrollY || 0;
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: function() {
        var current = window.scrollY || 0;
        if (current > 24 && current >= lastScroll) {
          header.classList.add('is-scrolled');
        } else if (current < lastScroll) {
          header.classList.remove('is-scrolled');
        }
        lastScroll = current;
      }
    });
  }

  // Cards Metodo (Scroll Trigger Mobile)
  // Ativa a classe .mobile-active quando o CENTRO do card passa pelo CENTRO da tela
  if (window.matchMedia('(max-width: 900px)').matches) {
    const cardsMetodo = document.querySelectorAll('.card-metodo');
    cardsMetodo.forEach(card => {
      ScrollTrigger.create({
        trigger: card,
        start: 'center 65%', // Ativa quando o centro do card entra na zona central (vindo de baixo)
        end: 'center 35%',   // Desativa quando o centro do card sai da zona central (indo para cima)
        toggleClass: 'mobile-active',
        // markers: true // Descomente para debugar
      });
    });

    // Cards Diferencial (Scroll Mobile)
    const cardsSobre = document.querySelectorAll('.card-sobre');
    cardsSobre.forEach(card => {
      ScrollTrigger.create({
        trigger: card,
        start: 'center 65%',
        end: 'center 35%',
        toggleClass: 'mobile-active'
      });
    });
  }
})();
