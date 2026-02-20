/*
  Kapte Mídia é Interações simples
  - Menu mobile (abre/fecha)
  - Fechar menu ao clicar em link
  - Accordion (uma etapa aberta por vez)
  - Ano automático no footer
  - Animações on scroll
*/

(function () {
  'use strict';

  // ===================================
  // PAGE LOADER  SOME APÓS LOAD COMPLETO
  // ===================================

  (function () {
    var loader = document.querySelector('.page-loader');
    if (!loader) return;

    var MIN_TOTAL_MS = 2000;
    var FADE_OUT_MS = 320;
    var HARD_MAX_MS = 6000;
    var startedAt = (window.performance && typeof window.performance.now === 'function')
      ? window.performance.now()
      : Date.now();

    function hideLoader() {
      if (loader.classList.contains('is-hiding')) return;
      loader.classList.add('is-hiding');

      // Após o fade-out, remove do fluxo para não interceptar cliques
      window.setTimeout(function () {
        loader.style.display = 'none';
      }, FADE_OUT_MS + 40);
    }

    function requestHideAfterMinTime() {
      var now = (window.performance && typeof window.performance.now === 'function')
        ? window.performance.now()
        : Date.now();

      var elapsed = now - startedAt;

      // Queremos que o loader SUMA totalmente em ~2,3s.
      // Como o fade-out leva FADE_OUT_MS, iniciamos a saída em (2,3s - FADE_OUT_MS).
      var targetStartHideAt = MIN_TOTAL_MS - FADE_OUT_MS;
      var delay = Math.max(0, targetStartHideAt - elapsed);

      window.setTimeout(function () {
        hideLoader();
      }, delay);
    }

    if (document.readyState === 'complete') {
      requestHideAfterMinTime();
    } else {
      window.addEventListener('load', requestHideAfterMinTime, { once: true });
      window.addEventListener('DOMContentLoaded', requestHideAfterMinTime, { once: true });
    }

    // Failsafe: nunca deixa o loader travar indefinidamente.
    window.setTimeout(function () {
      hideLoader();
    }, HARD_MAX_MS);
  })();

  // Ano no footer
  var yearEl = document.getElementById('ano');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ===================================
  // ANIMAÇÕES ON SCROLL
  // ===================================
  
  var observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  }, observerOptions);

  // Observar elementos com classe .animate-on-scroll
  var animatedElements = document.querySelectorAll('.animate-on-scroll');
  animatedElements.forEach(function(el) {
    observer.observe(el);
  });

  // ===================================
  // MARQUEE TRACK DUPLICATION (EVITA FALHAS AO INICIAR)
  // ===================================
  var marqueeTracks = document.querySelectorAll('.marquee-track');
  marqueeTracks.forEach(function(track) {
    var groups = Array.prototype.slice.call(track.querySelectorAll('.marquee-group'));
    if (!groups.length) return;

    var baseWidth = track.scrollWidth;
    if (!baseWidth) return;

    var minWidth = window.innerWidth * 2; // garante preenchimento em telas largas
    var copies = Math.max(2, Math.ceil(minWidth / baseWidth));

    // J? temos 1 cópia (o markup original). Precisamos de (copies - 1) adicionais
    var needed = copies - 1;
    for (var i = 0; i < needed; i++) {
      groups.forEach(function(g) {
        track.appendChild(g.cloneNode(true));
      });
    }
  });

  // ===================================
  // REVEAL ANIMATIONS (IntersectionObserver + Stagger)
  // ===================================
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal, .reveal-left, .reveal-scale'));

  if (revealEls.length) {
    var STAGGER_STEP = 80; // ms

    var revealObserver = new IntersectionObserver(function(entries, obs) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;

        // Calcula um delay leve com base na posição dentro da seção
        var section = el.closest('section');
        var siblings = section ? Array.prototype.slice.call(section.querySelectorAll('.reveal, .reveal-left, .reveal-scale')) : [];
        var index = siblings.indexOf(el);
        var delay = Math.max(0, index) * STAGGER_STEP;

        el.style.transitionDelay = (delay / 1000) + 's';
        el.classList.add('is-revealed');

        obs.unobserve(el); // roda apenas uma vez
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    revealEls.forEach(function(el) {
      revealObserver.observe(el);
    });
  }

  // ===================================
  // MENU MOBILE
  // ===================================
  
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');

  function setMenuOpen(isOpen) {
    if (!nav || !navToggle) return;
    nav.classList.toggle('is-open', isOpen);
    document.body.classList.toggle('menu-open', isOpen); // Adiciona classe no body
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var isOpen = nav.classList.contains('is-open');
      setMenuOpen(!isOpen);
    });

    // Fecha ao clicar em links
    nav.addEventListener('click', function (e) {
      var target = e.target;
      if (target && target.tagName === 'A') setMenuOpen(false);
    });

    // Fecha com ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenuOpen(false);
    });

    // Fecha ao clicar fora (somente se estiver aberto)
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      var clickInsideNav = nav.contains(e.target);
      var clickOnToggle = navToggle.contains(e.target);
      if (!clickInsideNav && !clickOnToggle) setMenuOpen(false);
    });
  }

  // ===================================
  // ACCORDION
  // ===================================
  
  var accordion = document.querySelector('[data-accordion]');
  if (accordion) {
    var items = Array.prototype.slice.call(accordion.querySelectorAll('.accordion-item'));

    function closeItem(item) {
      item.classList.remove('is-open');

      var trigger = item.querySelector('.accordion-trigger');
      var panel = item.querySelector('.accordion-panel');

      if (trigger) trigger.setAttribute('aria-expanded', 'false');

      if (!panel) return;

      // Anima para fechar
      panel.style.maxHeight = panel.scrollHeight + 'px';
      // Força reflow
      panel.offsetHeight;
      panel.style.maxHeight = '0px';
      panel.style.opacity = '0';

      // Oculta no final para acessibilidade
      window.setTimeout(function () {
        if (!item.classList.contains('is-open')) {
          panel.hidden = true;
        }
      }, 310);
    }

    function openItem(item) {
      item.classList.add('is-open');

      var trigger = item.querySelector('.accordion-trigger');
      var panel = item.querySelector('.accordion-panel');

      if (trigger) trigger.setAttribute('aria-expanded', 'true');

      if (!panel) return;

      panel.hidden = false;
      panel.style.opacity = '1';

      // Define maxHeight para animar
      panel.style.maxHeight = '0px';
      // Força reflow
      panel.offsetHeight;
      panel.style.maxHeight = panel.scrollHeight + 'px';

      // Remove maxHeight fixo após a animação (para suportar conteúdo dinâmico)
      window.setTimeout(function () {
        if (item.classList.contains('is-open')) {
          panel.style.maxHeight = 'none';
        }
      }, 310);
    }

    // Estado inicial: garante coerência entre classes, aria e hidden
    items.forEach(function (item) {
      var isOpen = item.classList.contains('is-open');
      var trigger = item.querySelector('.accordion-trigger');
      var panel = item.querySelector('.accordion-panel');

      if (trigger) trigger.setAttribute('aria-expanded', String(isOpen));
      if (panel) {
        panel.hidden = !isOpen;
        panel.style.maxHeight = isOpen ? 'none' : '0px';
        panel.style.opacity = isOpen ? '1' : '0';
      }
    });

    accordion.addEventListener('click', function (e) {
      var trigger = e.target.closest('.accordion-trigger');
      if (!trigger) return;

      var item = trigger.closest('.accordion-item');
      if (!item) return;

      var isOpen = item.classList.contains('is-open');

      // Fecha todos
      items.forEach(function (it) {
        if (it !== item) closeItem(it);
      });

      // Alterna o clicado
      if (isOpen) {
        closeItem(item);
      } else {
        openItem(item);
      }
    });
  }

  // ===================================
  // VÍDEO (SEÇÃO SOBRE)  PLAY CUSTOM
  // ===================================

  (function () {
    var videoWrap = document.querySelector('[data-sobre-video]');
    if (!videoWrap) return;

    var video = videoWrap.querySelector('video');
    var toggleBtn = videoWrap.querySelector('[data-sobre-video-toggle]');
    if (!video || !toggleBtn) return;

    function setPlayingState(isPlaying) {
      videoWrap.classList.toggle('is-playing', isPlaying);
      toggleBtn.setAttribute('aria-label', isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo');
    }

    function togglePlay() {
      if (video.paused) {
        var playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function () {
            // Se o navegador bloquear (raro após clique), mantém overlay.
            setPlayingState(false);
          });
        }
      } else {
        video.pause();
      }
    }

    toggleBtn.addEventListener('click', function () {
      togglePlay();
    });

    // Permite tocar no vídeo para pausar/retomar (mobile-friendly)
    video.addEventListener('click', function () {
      togglePlay();
    });

    video.addEventListener('play', function () {
      setPlayingState(true);
    });

    video.addEventListener('pause', function () {
      setPlayingState(false);
    });

    video.addEventListener('ended', function () {
      setPlayingState(false);
      video.currentTime = 0;
    });

    setPlayingState(false);
  })();

  // ===================================
  // VÍDEO (PROPOSTA DE VALOR)  INICIA AO ENTRAR NA SESSÃO + MUTAR/PAUSAR
  // ===================================

  (function () {
    var wrap = document.querySelector('[data-value-video]');
    if (!wrap) return;

    var video = wrap.querySelector('video');
    var centerPlayBtn = wrap.querySelector('[data-value-video-center-play]');
    if (!video || !centerPlayBtn) return;

    var section = document.getElementById('proposta-valor');

    function setAudioOnState(isOn) {
      wrap.classList.toggle('is-audio-on', isOn);
    }

    function playMutedAutoplay() {
      video.muted = true;
      video.volume = 0;
      setAudioOnState(false);
      var p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {
          // Se o navegador bloquear por qualquer motivo, não faz nada.
        });
      }
    }

    function restartWithAudio() {
      video.pause();
      try { video.currentTime = 0; } catch (e) {}
      video.muted = false;
      video.volume = 1;
      setAudioOnState(true);
      var p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {
          // Caso raro: se bloquear, volta para mutado.
          video.muted = true;
          video.volume = 0;
          setAudioOnState(false);
        });
      }
    }

    centerPlayBtn.addEventListener('click', function () {
      restartWithAudio();
    });

    // Autoplay ao abrir o site (sempre mutado)
    playMutedAutoplay();

    if (section && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            // Se entrar na sessão e estiver pausado, garante que esteja tocando (mutado ou com ?udio)
            if (video.paused) {
              var p = video.play();
              if (p && typeof p.catch === 'function') p.catch(function () {});
            }
            return;
          }

          // Ao sair da sessão, pausa automaticamente
          if (!video.paused) video.pause();
        });
      }, { threshold: 0.35, rootMargin: '0px 0px -15% 0px' });

      io.observe(section);
    }

    // Estado inicial do botão (visível)
    setAudioOnState(false);
  })();

  /* Kapte Mídia é Central Insights Modal
     5 Posts em Loop Infinito
  */
  (function() {
    // Toggle: mantenha o código, mas desative o recurso.
    // Para reativar depois, troque para `true`.
    var ENABLE_INSIGHTS = false;
    if (!ENABLE_INSIGHTS) return;

    const modalOverlay = document.getElementById('insight-modal');
    const modalContent = document.querySelector('.insight-card');
    const titleEl = document.getElementById('modal-title');
    const textEl = document.getElementById('modal-text');
    // const indexEl removido
    const closeBtn = document.querySelector('.modal-close');
    
    if (!modalOverlay) return;

    // --- CONFIGURAÇÕES DE TEMPO ---
    const INITIAL_DELAY = 15000; // 15s para a primeira aparição
    const DISPLAY_TIME = 15000;   // 15s visível na tela (tempo de leitura)
    const INTERVAL_TIME = 20000; // 20s de intervalo entre um e outro

    // --- OS 5 CONTEÚDOS DE VALOR ---
    const insights = [
      {
        title: "Pare de vender 'características'",
        text: "Seu cliente não quer saber a tecnologia do seu site. Ele quer saber quanto vai vender a mais. Venda a transformação, não a ferramenta."
      },
      {
        title: "A regra dos 7 toques",
        text: "Estudos mostram que um cliente precisa interagir com sua marca em média 7 vezes antes de comprar. Se você não faz remarketing, está deixando dinheiro na mesa."
      },
      {
        title: "Tráfego sem oferta = prejuízo",
        text: "Não adianta dobrar o orçamento do Google Ads se sua Landing Page não converte. Arrume a casa (oferta + copy) antes de convidar as visitas."
      },
      {
        title: "Dados vencem 'achismos'",
        text: "No digital, toda ação deixa rastro. Pare de adivinhar o que seu público gosta e comece a analisar as métricas de retenção e clique."
      },
      {
        title: "Velocidade = dinheiro",
        text: "40% dos usuários abandonam um site que demora mais de 3 segundos para carregar. Otimizar suas imagens é a forma mais barata de aumentar vendas."
      }
    ];

    // Embaralha (Shuffle) para ordem aleatória
    for (let i = insights.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [insights[i], insights[j]] = [insights[j], insights[i]];
    }

    let currentIndex = 0;
    let autoHideTimer;

    function showModal() {
      // Atualiza Conteúdo
      const item = insights[currentIndex];
      titleEl.textContent = item.title;
      textEl.textContent = item.text;
      
      // Mostra Modal
      modalOverlay.classList.add('is-visible');
      modalContent.classList.add('is-animating'); // Inicia barra de progresso

      // Agenda o fechamento automático
      autoHideTimer = setTimeout(() => {
        hideModal();
      }, DISPLAY_TIME);
    }

    function hideModal() {
      modalOverlay.classList.remove('is-visible');
      modalContent.classList.remove('is-animating'); // Reseta barra
      clearTimeout(autoHideTimer);

      // Prepara o próximo (Loop Infinito)
      currentIndex = (currentIndex + 1) % insights.length;
      
      // Agenda próxima exibição
      setTimeout(showModal, INTERVAL_TIME);
    }

    // Início do ciclo
    setTimeout(showModal, INITIAL_DELAY);

    // Fechar manualmente (pula para o intervalo imediatamente)
    closeBtn.addEventListener('click', () => {
      hideModal();
    });
    
    // Fechar clicando fora do card (opcional, boa UX)
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        hideModal();
      }
    });

  })();

  // ===================================
  // CARROSSEIS CONTÍNUOS (DRAG + LOOP INFINITO)
  // - Reels: .reels-carousel-wrapper  (track: #reelsTrack)
  // - Avaliações: (autoplay por skip a cada 2.5s; sem loop contínuo)
  // ===================================
  (function () {
    function enableDragScroll(container) {
      if (!container) return;

      var isDown = false;
      var startX = 0;
      var startScrollLeft = 0;
      var dragged = false;
      var suppressClickUntil = 0;
      var hasCapture = false;
      var activePointerId = null;

      // Evita selecionar texto/imagens ao arrastar
      container.addEventListener('dragstart', function (e) {
        e.preventDefault();
      });

      container.addEventListener('click', function (e) {
        if (Date.now() < suppressClickUntil) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);

      if (window.PointerEvent) {
        container.addEventListener('pointerdown', function (e) {
          // Apenas botão primário do mouse; toque/caneta também funcionam
          if (e.pointerType === 'mouse' && e.button !== 0) return;

          isDown = true;
          dragged = false;
          hasCapture = false;
          activePointerId = e.pointerId;
          startX = e.clientX;
          startScrollLeft = container.scrollLeft;
          container.classList.add('is-dragging');
        });

        container.addEventListener('pointermove', function (e) {
          if (!isDown) return;
          var dx = e.clientX - startX;

          // S? capturamos o ponteiro depois que houver intenção real de arrastar.
          // Isso evita roubar o clique dos links (ex.: cards de Reels) no desktop.
          if (Math.abs(dx) > 6) {
            dragged = true;

            if (!hasCapture && activePointerId === e.pointerId) {
              try {
                container.setPointerCapture(e.pointerId);
                hasCapture = true;
              } catch (_) {}
            }
          }
          container.scrollLeft = startScrollLeft - dx;
        });

        function endDrag(e) {
          if (!isDown) return;
          isDown = false;
          container.classList.remove('is-dragging');

          if (dragged) {
            suppressClickUntil = Date.now() + 350;
          }

          if (hasCapture) {
            try {
              container.releasePointerCapture(e.pointerId);
            } catch (_) {}
          }

          hasCapture = false;
          activePointerId = null;
        }

        container.addEventListener('pointerup', endDrag);
        container.addEventListener('pointercancel', endDrag);
        container.addEventListener('lostpointercapture', endDrag);
      } else {
        // Fallback (iOS antigo / browsers sem Pointer Events)
        var activeTouchId = null;

        container.addEventListener('touchstart', function (e) {
          if (!e.touches || !e.touches.length) return;

          var t = e.touches[0];
          activeTouchId = t.identifier;
          isDown = true;
          dragged = false;
          startX = t.clientX;
          startScrollLeft = container.scrollLeft;
          container.classList.add('is-dragging');
        }, { passive: true });

        container.addEventListener('touchmove', function (e) {
          if (!isDown) return;
          if (!e.touches || !e.touches.length) return;

          var t = null;
          for (var i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === activeTouchId) { t = e.touches[i]; break; }
          }
          if (!t) t = e.touches[0];

          var dx = t.clientX - startX;
          if (Math.abs(dx) > 6) {
            dragged = true;
            // Evita scroll vertical enquanto arrasta horizontalmente
            e.preventDefault();
          }
          container.scrollLeft = startScrollLeft - dx;
        }, { passive: false });

        container.addEventListener('touchend', function () {
          if (!isDown) return;
          isDown = false;
          container.classList.remove('is-dragging');

          if (dragged) suppressClickUntil = Date.now() + 350;
          activeTouchId = null;
        }, { passive: true });

        container.addEventListener('touchcancel', function () {
          if (!isDown) return;
          isDown = false;
          container.classList.remove('is-dragging');
          activeTouchId = null;
        }, { passive: true });
      }
    }

    function startInfiniteAutoScroll(container, options) {
      if (!container) return null;

      var speed = (options && typeof options.speedPxPerSec === 'number') ? options.speedPxPerSec : 28;
      var paused = false;
      var rafId = 0;
      var last = 0;

      function getHalf() {
        return container.scrollWidth / 2;
      }

      function tick(now) {
        if (!last) last = now;
        var dt = now - last;
        last = now;

        if (!paused) {
          var half = getHalf();
          if (half > 0) {
            container.scrollLeft += (speed * dt) / 1000;

            if (container.scrollLeft >= half) {
              container.scrollLeft -= half;
            } else if (container.scrollLeft < 0) {
              container.scrollLeft += half;
            }
          }
        }

        rafId = window.requestAnimationFrame(tick);
      }

      rafId = window.requestAnimationFrame(tick);

      return {
        pause: function () { paused = true; },
        resume: function () { paused = false; last = 0; },
        stop: function () { if (rafId) window.cancelAnimationFrame(rafId); rafId = 0; }
      };
    }

    function setupContinuousStrip(wrapperSelector, speedPxPerSec) {
      var wrapper = document.querySelector(wrapperSelector);
      if (!wrapper) return;

      enableDragScroll(wrapper);

      // Observação: este projeto pede movimento contínuo; então não desativamos
      // o auto-scroll mesmo se prefers-reduced-motion estiver ativo.

      var controller = null;

      function attachControls(ctrl) {
        // Pausa durante drag
        wrapper.addEventListener('pointerdown', function () { ctrl.pause(); }, { passive: true });
        wrapper.addEventListener('pointerup', function () { ctrl.resume(); }, { passive: true });
        wrapper.addEventListener('pointercancel', function () { ctrl.resume(); }, { passive: true });

        document.addEventListener('visibilitychange', function () {
          if (document.hidden) ctrl.pause();
          else ctrl.resume();
        });
      }

      // Inicia sempre: se não houver overflow ainda, o scrollLeft não anda;
      // quando houver overflow (ou quando o conteúdo carregar), passa a mover.
      controller = startInfiniteAutoScroll(wrapper, { speedPxPerSec: speedPxPerSec });
      if (controller) {
        wrapper.classList.add('is-autoscrolling');
        attachControls(controller);
      }

      // Reforço leve em load/resize para re-sincronizar o tempo do RAF
      // após mudanças grandes de layout.
      window.addEventListener('load', function () {
        if (controller) controller.resume();
      });

      window.addEventListener('resize', function () {
        if (controller) controller.resume();
      });
    }

    function setupReviewsSkipAutoplay(wrapperSelector, intervalMs) {
      var wrapper = document.querySelector(wrapperSelector);
      if (!wrapper) return;

      var track = wrapper.querySelector('.reviews-carousel');
      if (!track) return;

      // Mantém o comportamento de arrastar para o lado
      enableDragScroll(wrapper);

      var timerId = 0;
      var pausedUntil = 0;
      var hasStarted = false;

      function getGapPx() {
        try {
          var cs = window.getComputedStyle(track);
          var gap = parseFloat(cs.gap || cs.columnGap || '0');
          return isNaN(gap) ? 0 : gap;
        } catch (_) {
          return 0;
        }
      }

      function getStepPx() {
        var firstCard = track.querySelector('.review-card');
        if (!firstCard) return 0;
        var w = firstCard.getBoundingClientRect().width;
        if (!w) return 0;
        return w + getGapPx();
      }

      function getIndex(stepPx) {
        if (!stepPx) return 0;
        return Math.round(wrapper.scrollLeft / stepPx);
      }

      function scrollToIndex(index) {
        var stepPx = getStepPx();
        if (!stepPx) return;
        wrapper.scrollTo({ left: index * stepPx, behavior: 'smooth' });
      }

      function pauseFor(ms) {
        pausedUntil = Date.now() + ms;
      }

      function tick() {
        if (Date.now() < pausedUntil) return;

        var cards = track.querySelectorAll('.review-card');
        var count = cards ? cards.length : 0;
        if (!count) return;

        var stepPx = getStepPx();
        if (!stepPx) return;

        var idx = getIndex(stepPx);
        var next = idx + 1;
        if (next >= count) next = 0;
        scrollToIndex(next);
      }

      function start() {
        if (hasStarted) return;
        hasStarted = true;
        if (timerId) window.clearInterval(timerId);
        timerId = window.setInterval(tick, intervalMs || 2500);
      }

      function stop() {
        if (timerId) window.clearInterval(timerId);
        timerId = 0;
      }

      function startWhenInView() {
        if (hasStarted) return;

        if (typeof IntersectionObserver === 'undefined') {
          start();
          return;
        }

        var obs = new IntersectionObserver(function (entries, observer) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            start();
            observer.disconnect();
          });
        }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });

        obs.observe(wrapper);
      }

      // Pausa quando usuário interage
      wrapper.addEventListener('pointerdown', function () { pauseFor(4000); }, { passive: true });
      wrapper.addEventListener('touchstart', function () { pauseFor(4000); }, { passive: true });
      wrapper.addEventListener('wheel', function () { pauseFor(4000); }, { passive: true });

      window.addEventListener('resize', function () {
        pauseFor(600);
      });

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          pauseFor(60 * 60 * 1000);
          stop();
          hasStarted = false;
        } else {
          pausedUntil = 0;
          startWhenInView();
        }
      });

      startWhenInView();
    }

    // Reels (mantém contínuo)
    setupContinuousStrip('.reels-carousel-wrapper', 38);
    // Avaliações (skip a cada 2.5s)
    setupReviewsSkipAutoplay('.reviews-carousel-wrapper', 2500);
  })();

})();

// =============================
// Chat Widget (Kapte Mídia)
// =============================
(function () {
  'use strict';

  function initChatWidget() {
    const widget = document.querySelector('[data-chat-widget]');
    if (!widget) return;

    const fab = widget.querySelector('[data-chat-fab]');
    const panel = widget.querySelector('[data-chat-panel]');
    const closeBtn = widget.querySelector('[data-chat-close]');
    const form = widget.querySelector('[data-chat-form]');
    const input = widget.querySelector('[data-chat-input]');
    const messages = widget.querySelector('[data-chat-messages]');
    const nudge = widget.querySelector('[data-chat-nudge]');

    if (!fab || !panel || !closeBtn || !form || !input || !messages) return;

    const NUDGE_KEY = 'kapta:chat:nudge';
    const chatHistory = [];
    const chatSessionUsage = {
      estimatedTokens: 0,
      lastRequestEstimatedTokens: 0,
    };
    let pendingAction = null;
    let welcomeInjected = false;

    function pushHistory(role, content) {
      const text = typeof content === 'string' ? content.trim() : '';
      if (!text) return;
      chatHistory.push({ role, content: text });
      // Mantém um histórico curto.
      if (chatHistory.length > maxHistoryMessages) chatHistory.splice(0, chatHistory.length - maxHistoryMessages);
    }

    function scrollToBottom() {
      messages.scrollTop = messages.scrollHeight;
    }

    function hideNudge() {
      if (!nudge) return;
      nudge.hidden = true;
    }

    function showNudge() {
      if (!nudge) return;
      nudge.hidden = false;
      setTimeout(() => {
        hideNudge();
      }, 6500);
    }

    function setOpen(isOpen) {
      panel.hidden = !isOpen;
      widget.classList.toggle('is-open', isOpen);
      fab.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        hideNudge();
        setTimeout(() => input.focus(), 0);
        scrollToBottom();

        // Mensagem inicial humanizada + oferta de diagnóstico
        if (!welcomeInjected && chatHistory.length === 0) {
          welcomeInjected = true;
          loadChatConfig()
            .then((config) => {
              // Se o usuário já enviou mensagem enquanto a config carregava, não injeta o welcome.
              if (panel.hidden || chatHistory.length !== 0) return;

              const whatsappNumber = config?.whatsapp?.number || DEFAULT_WHATSAPP_NUMBER;
              const defaultText = config?.whatsapp?.defaultText || DEFAULT_CHAT_CONFIG.whatsapp.defaultText;
              const whatsappLink = buildWhatsAppLink(whatsappNumber, defaultText);
              pendingAction = { type: 'diagnostic', link: whatsappLink };

              const welcome = buildWelcomeMessage();
              appendMessage('assistant', welcome);
              pushHistory('assistant', welcome);
            })
            .catch(() => {
              if (panel.hidden || chatHistory.length !== 0) return;
              pendingAction = { type: 'diagnostic', link: buildWhatsAppLink(DEFAULT_WHATSAPP_NUMBER, DEFAULT_CHAT_CONFIG.whatsapp.defaultText) };
              const welcome = buildWelcomeMessage();
              appendMessage('assistant', welcome);
              pushHistory('assistant', welcome);
            });
        }
      } else {
        // Nova conversa a cada fechamento (evita contexto antigo e mantém ?pergunta primeiro?).
        try {
          chatHistory.length = 0;
        } catch (_) {}

        try {
          chatSessionUsage.estimatedTokens = 0;
          chatSessionUsage.lastRequestEstimatedTokens = 0;
        } catch (_) {}

        pendingAction = null;
        welcomeInjected = false;
      }
    }

    function getTimeGreeting() {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'Bom dia';
      if (hour >= 12 && hour < 18) return 'Boa tarde';
      return 'Boa noite';
    }

    function buildWelcomeMessage() {
      const greeting = getTimeGreeting();
      return `${greeting}! Tudo bem? Como posso te ajudar? Gostaria de um diagnóstico gratuito?`;
    }

    function escapeHtml(text) {
      return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function linkifyEscapedText(escapedText) {
      const inputText = String(escapedText || '');
      return inputText.replace(/https?:\/\/[^\s<]+/g, function (match) {
        let url = match;
        let suffix = '';
        while (url && /[).,!?:;]$/.test(url)) {
          suffix = url.slice(-1) + suffix;
          url = url.slice(0, -1);
        }
        if (!url) return match;
        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>' + suffix;
      });
    }

    function formatMessageHtml(role, text) {
      const escaped = escapeHtml(text).replaceAll('\n', '<br>');
      // Ação simples: transforma URLs em links clicáveis (principalmente WhatsApp)
      if (role === 'assistant') return linkifyEscapedText(escaped);
      return escaped;
    }

    function appendMessage(role, text) {
      const el = document.createElement('div');
      el.className = `chat-msg ${role}`;
      el.innerHTML = formatMessageHtml(role, text);
      messages.appendChild(el);
      scrollToBottom();
      return el;
    }

    // =============================
    // Robô (sem IA)
    // - 100% determinístico (FAQ + fluxos)
    // - Sem chamadas externas (sem /api/chat, sem Groq, sem chaves)
    // =============================
    const DEFAULT_WHATSAPP_NUMBER = '5513997668787';
    const DEFAULT_WHATSAPP_LINK = `https://wa.me/${DEFAULT_WHATSAPP_NUMBER}`;

    const DEFAULT_CHAT_CONFIG = {
      version: 2,
      settings: {
        maxHistoryMessages: 12,
        maxOutputChars: 520,
      },
      whatsapp: {
        number: DEFAULT_WHATSAPP_NUMBER,
        confirmKeywords: ['sim', 's', 'claro', 'ok', 'pode', 'bora', 'vamos', 'manda', 'quero'],
        routeKeywords: [
          'diagnostico',
          'avalia',
          'analise',
          'consultoria',
          'auditoria',
          'mentoria',
          'proposta',
          'briefing',
          'reuniao',
          'call',
          'agendar',
          'orcamento',
          'preco',
          'quanto custa',
          'valor',
          'contratar',
          'fechar com',
          'campanha',
          'gestao',
          'gestão',
          'anuncio',
          'anúncio',
          'trafego',
          'tráfego',
          'meu instagram',
          'meu perfil',
          'meu negocio',
          'meu negócio',
        ],
        defaultText: 'Olá! Quero um diagnóstico estratégico gratuito. Pode me orientar?'
      },
      faq: [
        {
          id: 'menu',
          whenAny: ['menu', 'opcoes', 'opções', 'ajuda', 'comandos'],
          reply:
            'Posso te ajudar com: diagnóstico gratuito, serviços, prazos/como funciona, conteúdo/Instagram, tráfego/anúncios e contato no WhatsApp. Qual desses você quer agora?',
          action: 'none'
        },
        {
          id: 'contato',
          whenAny: ['whatsapp', 'contato', 'telefone', 'falar com', 'atendente', 'especialista'],
          reply:
            'Você pode falar com a Kapte Mídia direto no WhatsApp: {WHATSAPP_LINK}. Quer que eu te ajude a escrever a mensagem?',
          action: 'ask_compose'
        },
        {
          id: 'diagnostico',
          whenAny: ['diagnostico', 'diagnóstico', 'avaliacao', 'avaliação', 'analise', 'análise'],
          reply:
            'Sim! A gente faz diagnóstico estratégico gratuito para organizar prioridades e direcionar próximos passos. Quer que eu te encaminhe pro WhatsApp agora?',
          action: 'route_whatsapp'
        },
        {
          id: 'servicos',
          whenAny: ['servicos', 'serviços', 'o que voces fazem', 'o que vocês fazem', 'solucoes', 'soluções'],
          reply:
            'A Kapte organiza estratégia e posicionamento, conteúdo estratégico, comunicação visual/audiovisual e suporte a campanhas/anúncios. Qual área você quer melhorar primeiro?',
          action: 'none'
        },
        {
          id: 'estrategia',
          whenAny: ['posicionamento', 'estrategia', 'estratégia', 'marca', 'branding', 'publico', 'público'],
          reply:
            'Estratégia e posicionamento servem pra deixar claro: pra quem você fala, o que promete e por que confiar em você. Qual é seu nicho e o principal diferencial hoje?',
          action: 'none'
        },
        {
          id: 'conteudo',
          whenAny: ['conteudo', 'conteúdo', 'instagram', 'reels', 'post', 'stories', 'calendario', 'calendário'],
          reply:
            'Conteúdo estratégico não é postar mais, é postar com direção: promessa clara + prova + constância. Você quer atrair novos seguidores, gerar leads ou vender direto?',
          action: 'none'
        },
        {
          id: 'trafego',
          whenAny: ['trafego', 'tráfego', 'anuncio', 'anúncio', 'ads', 'meta ads', 'google ads', 'campanha'],
          reply:
            'Tráfego funciona melhor quando a oferta e a mensagem já estão claras; senão vira só custo. Você quer leads (WhatsApp/form) ou venda imediata?',
          action: 'none'
        },
        {
          id: 'audiovisual',
          whenAny: ['video', 'vídeo', 'filmagem', 'criacao', 'criação', 'design', 'identidade visual'],
          reply:
            'A parte visual/audiovisual entra pra reforçar autoridade e deixar sua mensagem mais clara e confiável. Você já tem identidade visual e materiais atuais ou começa do zero?',
          action: 'none'
        },
        {
          id: 'prazo',
          whenAny: ['prazo', 'tempo', 'quando', 'resultado', 'em quanto tempo'],
          reply:
            'O tempo varia conforme o ponto de partida e o canal (orgânico vs anúncios), mas sinais podem aparecer em semanas e consistência em alguns meses. Você já posta/anuncia hoje ou está começando agora?',
          action: 'none'
        },
        {
          id: 'preco',
          whenAny: ['preco', 'preço', 'valor', 'quanto custa', 'investimento', 'orcamento', 'orçamento'],
          reply:
            'O investimento depende do objetivo e do escopo (conteúdo, anúncios, estratégia etc.). Se você me disser seu nicho e meta, eu te direciono; ou posso te encaminhar pro WhatsApp agora. Qual é sua meta principal?',
          action: 'route_whatsapp'
        },
        {
          id: 'local',
          whenAny: ['presencial', 'remoto', 'online', 'cidade', 'atendem onde', 'atendem quais'],
          reply:
            'Dá pra trabalhar de forma remota e também adaptar produção conforme a realidade e localização do cliente. Você está em qual cidade e qual serviço procura?',
          action: 'none'
        },
        {
          id: 'privacidade',
          whenAny: ['lgpd', 'privacidade', 'dados', 'politica', 'política', 'termos'],
          reply:
            'As páginas de Privacidade e Termos estão no site e explicam uso, segurança e retenção de dados. Você quer o link ou sua dúvida é sobre coleta/contato?',
          action: 'none'
        }
      ],
      fallback:
        'Me diz rapidinho o que você quer melhorar: Instagram/conteúdo, tráfego/anúncios, posicionamento, ou falar com um especialista no WhatsApp?'
    };

    function clampInt(n, min, max, fallback) {
      const v = Number(n);
      if (!Number.isFinite(v)) return fallback;
      return Math.min(max, Math.max(min, Math.trunc(v)));
    }

    function mergeChatConfig(base, incoming) {
      const out = JSON.parse(JSON.stringify(base));
      if (!incoming || typeof incoming !== 'object') return out;

      if (incoming.settings && typeof incoming.settings === 'object') out.settings = Object.assign({}, out.settings, incoming.settings);
      if (incoming.whatsapp && typeof incoming.whatsapp === 'object') out.whatsapp = Object.assign({}, out.whatsapp, incoming.whatsapp);
      if (Array.isArray(incoming.faq)) out.faq = incoming.faq.slice();
      if (typeof incoming.fallback === 'string') out.fallback = incoming.fallback;
      return out;
    }

    let chatConfigPromise = null;
    let maxHistoryMessages = 12;

    async function loadChatConfig() {
      if (!chatConfigPromise) {
        chatConfigPromise = (async () => {
          let remote = null;
          try {
            const res = await fetch('chat-config.json', { cache: 'no-store' });
            if (res.ok) remote = await res.json();
          } catch (_) {
            remote = null;
          }

          const merged = mergeChatConfig(DEFAULT_CHAT_CONFIG, remote);

          merged.settings.maxHistoryMessages = clampInt(merged.settings.maxHistoryMessages, 2, 30, 12);
          merged.settings.maxOutputChars = clampInt(merged.settings.maxOutputChars, 220, 900, 520);

          if (!merged.whatsapp) merged.whatsapp = {};
          merged.whatsapp.number = String(merged.whatsapp.number || DEFAULT_WHATSAPP_NUMBER).trim() || DEFAULT_WHATSAPP_NUMBER;
          if (!Array.isArray(merged.whatsapp.routeKeywords)) merged.whatsapp.routeKeywords = DEFAULT_CHAT_CONFIG.whatsapp.routeKeywords.slice();
          if (!Array.isArray(merged.whatsapp.confirmKeywords)) merged.whatsapp.confirmKeywords = DEFAULT_CHAT_CONFIG.whatsapp.confirmKeywords.slice();
          merged.whatsapp.defaultText = String(merged.whatsapp.defaultText || DEFAULT_CHAT_CONFIG.whatsapp.defaultText || '').trim();
          if (!merged.whatsapp.defaultText) merged.whatsapp.defaultText = DEFAULT_CHAT_CONFIG.whatsapp.defaultText;

          if (!Array.isArray(merged.faq)) merged.faq = DEFAULT_CHAT_CONFIG.faq.slice();
          if (typeof merged.fallback !== 'string' || !merged.fallback.trim()) merged.fallback = DEFAULT_CHAT_CONFIG.fallback;

          maxHistoryMessages = merged.settings.maxHistoryMessages;
          return merged;
        })();
      }
      return chatConfigPromise;
    }

    // Carrega config em background (sem bloquear o 1? clique)
    loadChatConfig().catch(() => {});

    function normalizeForIntent(text) {
      return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    }

    function isConfirmMessage(message, confirmKeywords) {
      const text = normalizeForIntent(message).trim();
      if (!text) return false;
      const list = Array.isArray(confirmKeywords) ? confirmKeywords : [];
      if (list.some((k) => text === normalizeForIntent(k))) return true;
      if (text === 'sim' || text === 's' || text === 'ok' || text === 'pode') return true;
      return false;
    }

    function lastAssistantMentionsWhatsApp() {
      for (let i = chatHistory.length - 1; i >= 0; i--) {
        const m = chatHistory[i];
        if (!m || m.role !== 'assistant') continue;
        const c = String(m.content || '');
        return c.includes('wa.me/') || c.toLowerCase().includes('whatsapp');
      }
      return false;
    }

    function renderTemplate(text, vars) {
      let out = String(text || '');
      for (const k in (vars || {})) {
        out = out.replaceAll('{' + k + '}', String(vars[k]));
      }
      return out;
    }

    function openExternalLink(url) {
      const link = String(url || '').trim();
      if (!link) return false;
      try {
        window.open(link, '_blank', 'noopener,noreferrer');
        return true;
      } catch (_) {
        return false;
      }
    }

    function buildWhatsAppLink(number, text) {
      const digits = String(number || '').replace(/\D/g, '');
      if (!digits) return DEFAULT_WHATSAPP_LINK;
      const base = `https://wa.me/${digits}`;
      const rawText = typeof text === 'string' ? text.trim() : '';
      if (!rawText) return base;
      return `${base}?text=${encodeURIComponent(rawText)}`;
    }

    function shouldRouteToWhatsApp(message, routeKeywords) {
      const text = normalizeForIntent(message);
      if (!text) return false;
      const keywords = Array.isArray(routeKeywords) ? routeKeywords : [];
      if (!keywords.length) return false;
      return keywords.some((k) => text.includes(normalizeForIntent(k)));
    }

    function buildWhatsAppRoutingReply(whatsappNumber, whatsappLink) {
      const num = String(whatsappNumber || DEFAULT_WHATSAPP_NUMBER);
      const link = String(whatsappLink || DEFAULT_WHATSAPP_LINK);
      return (
        `Pra um diagnóstico mais completo, o melhor é pelo WhatsApp: ${num} (${link}).\n` +
        'Quer que eu te encaminhe pra lá agora?'
      );
    }

    function sanitizeAssistantReply(text, maxChars) {
      let out = String(text || '').trim();
      out = out.replaceAll('**', '');
      out = out.replaceAll('__', '');
      out = out.replaceAll('`', '');
      out = out.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
      out = out.replace(/\s+\n/g, '\n');
      out = out.replace(/\n{3,}/g, '\n\n');
      out = out.replace(/[ \t]{2,}/g, ' ');
      out = out.trim();

      const limit = clampInt(maxChars, 220, 900, 420);
      if (out.length > limit) {
        let sliced = out.slice(0, limit).trim();
        // tenta cortar em um final mais “natural”
        const lastPunct = Math.max(sliced.lastIndexOf('.'), sliced.lastIndexOf('!'), sliced.lastIndexOf('?'));
        if (lastPunct >= Math.max(40, sliced.length - 80)) sliced = sliced.slice(0, lastPunct + 1).trim();
        else {
          const lastSpace = sliced.lastIndexOf(' ');
          if (lastSpace > 40) sliced = sliced.slice(0, lastSpace).trim();
        }
        sliced = sliced.replace(/[\s,.!?:;]+$/g, '').trim();
        out = sliced + '?';
      }

      return out;
    }

    function enforceTwoSentencesPlusQuestion(text) {
      const cfg = configCache || null;
      const maxChars = cfg?.settings?.maxOutputChars;

      let out = sanitizeAssistantReply(text, maxChars);
      if (!out) return out;

      out = out.replace(/\s*\n\s*/g, ' ').trim();

      const parts = out
        .split(/(?<=[.!?])\s+/)
        .map((p) => p.trim())
        .filter(Boolean);

      // Evita duplicar a mesma pergunta (antes, a frase com '?' virava conteúdo e também pergunta final).
      let questionIndex = -1;
      for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].includes('?')) {
          questionIndex = i;
          break;
        }
      }

      const questionCandidate = questionIndex >= 0 ? parts[questionIndex] : '';
      const contentCandidates = parts
        .filter((p, idx) => idx !== questionIndex)
        .filter((p) => !p.includes('?'))
        .map((p) => p.replace(/\.+$/g, '.').trim())
        .filter(Boolean);

      const kept = [];
      for (const p of contentCandidates) {
        // Limite de conteúdo: até 3 frases curtas
        if (kept.length >= 3) break;
        const trimmed = p.length > 200 ? p.slice(0, 200).replace(/[\s,.!?:;]+$/g, '') + '?' : p;
        kept.push(trimmed);
      }

      const fallbackQuestion = 'O que você quer resolver hoje: contato, dica rápida ou falar no WhatsApp?';
      let question = questionCandidate ? sanitizeAssistantReply(questionCandidate, maxChars) : '';
      question = question.replace(/\s+/g, ' ').trim();
      if (question && !question.endsWith('?')) question = question.replace(/[.!]+$/g, '').trim() + '?';
      if (!question) question = fallbackQuestion;
      if (question.length > 180) question = question.slice(0, 180).replace(/[\s,.!?:;]+$/g, '') + '?';

      if (!kept.length) kept.push('Certo.');

      const joined = kept.join(' ');
      const final = `${joined} ${question}`.replace(/\s+/g, ' ').trim();
      return sanitizeAssistantReply(final, maxChars);
    }

    let configCache = null;

    const composeState = {
      active: false,
      step: 0,
      draft: {
        nome: '',
        empresa: '',
        nicho: '',
        cidade: '',
        objetivo: '',
        canal: '',
      },
    };

    function resetCompose() {
      composeState.active = false;
      composeState.step = 0;
      composeState.draft = { nome: '', empresa: '', nicho: '', cidade: '', objetivo: '', canal: '' };
    }

    function isDeclineMessage(message) {
      const text = normalizeForIntent(message).trim();
      if (!text) return false;
      return text === 'nao' || text === 'não' || text === 'n' || text === 'agora nao' || text === 'agora não' || text === 'depois' || text === 'talvez';
    }

    function matchFaqItem(message, faqList) {
      const text = normalizeForIntent(message);
      if (!text) return null;
      const list = Array.isArray(faqList) ? faqList : [];
      for (const item of list) {
        if (!item || typeof item !== 'object') continue;
        const whenAny = Array.isArray(item.whenAny) ? item.whenAny : [];
        if (!whenAny.length) continue;
        if (whenAny.some((k) => text.includes(normalizeForIntent(k)))) return item;
      }
      return null;
    }

    function buildComposeMessage(draft) {
      const nome = String(draft?.nome || '').trim();
      const empresa = String(draft?.empresa || '').trim();
      const nicho = String(draft?.nicho || '').trim();
      const cidade = String(draft?.cidade || '').trim();
      const objetivo = String(draft?.objetivo || '').trim();
      const canal = String(draft?.canal || '').trim();

      const parts = [];
      parts.push('Olá! Quero um diagnóstico estratégico gratuito.');
      if (nome) parts.push(`Meu nome é ${nome}.`);
      if (empresa || nicho) parts.push(`Negócio: ${[empresa, nicho].filter(Boolean).join(' — ')}.`);
      if (cidade) parts.push(`Cidade: ${cidade}.`);
      if (objetivo) parts.push(`Objetivo: ${objetivo}.`);
      if (canal) parts.push(`Canal prioritário: ${canal}.`);
      parts.push('Pode me orientar nos próximos passos?');
      return parts.join(' ');
    }

    async function sendToRobot() {
      const config = await loadChatConfig();
      configCache = config;

      const whatsappNumber = config?.whatsapp?.number || DEFAULT_WHATSAPP_NUMBER;
      const defaultWaText = config?.whatsapp?.defaultText || DEFAULT_CHAT_CONFIG.whatsapp.defaultText;
      const whatsappLink = buildWhatsAppLink(whatsappNumber);

      const userMessage = (chatHistory.slice().reverse().find((m) => m && m.role === 'user') || {}).content || '';
      const normalized = normalizeForIntent(userMessage);

      // Fluxo: composição de mensagem pro WhatsApp
      if (composeState.active) {
        if (composeState.step === 0) {
          // Espera uma linha com informações livres e segue.
          const raw = String(userMessage || '').trim();
          if (raw) {
            // Preenche o que der com heurísticas simples.
            if (!composeState.draft.objetivo) composeState.draft.objetivo = raw;
          }
          composeState.step = 1;
          return enforceTwoSentencesPlusQuestion('Perfeito. Qual é seu nome, sua empresa/nicho e sua cidade?');
        }

        if (composeState.step === 1) {
          const raw = String(userMessage || '').trim();
          if (raw) {
            // Heurística: tenta separar por vírgula
            const pieces = raw.split(',').map((p) => p.trim()).filter(Boolean);
            if (pieces[0] && !composeState.draft.nome) composeState.draft.nome = pieces[0];
            if (pieces[1] && !composeState.draft.nicho) composeState.draft.nicho = pieces[1];
            if (pieces[2] && !composeState.draft.cidade) composeState.draft.cidade = pieces[2];

            // Se não veio com vírgulas, guarda como nicho/cidade genérico
            if (pieces.length < 2 && !composeState.draft.nicho) composeState.draft.nicho = raw;
          }

          const msg = buildComposeMessage(composeState.draft);
          const linkWithText = buildWhatsAppLink(whatsappNumber, msg);
          resetCompose();

          // Não abre automaticamente: pede confirmação antes de redirecionar.
          pendingAction = { type: 'whatsapp', link: linkWithText };
          return enforceTwoSentencesPlusQuestion(`Montei uma mensagem pronta pra você: ${linkWithText}. Quer que eu te encaminhe pro WhatsApp agora?`);
        }

        resetCompose();
      }

      // Ação pendente: diagnóstico (oferta inicial)
      if (pendingAction && pendingAction.type === 'diagnostic') {
        const confirmKeywords = config?.whatsapp?.confirmKeywords;
        if (isConfirmMessage(userMessage, confirmKeywords)) {
          const link = pendingAction.link || buildWhatsAppLink(whatsappNumber, defaultWaText);
          openExternalLink(link);
          pendingAction = null;
          return enforceTwoSentencesPlusQuestion(`Perfeito. Vou te encaminhar agora: ${link}. Quer que eu te ajude a escrever a mensagem?`);
        }
        if (isDeclineMessage(userMessage)) {
          pendingAction = null;
          return enforceTwoSentencesPlusQuestion('Sem problema. Qual é seu nicho e o que você quer melhorar hoje?');
        }
        pendingAction = null;
      }

      // Ação pendente: WhatsApp
      if (pendingAction && pendingAction.type === 'whatsapp') {
        const confirmKeywords = config?.whatsapp?.confirmKeywords;
        if (isConfirmMessage(userMessage, confirmKeywords) && lastAssistantMentionsWhatsApp()) {
          const link = pendingAction.link || whatsappLink;
          openExternalLink(link);
          pendingAction = null;
          return enforceTwoSentencesPlusQuestion(`Perfeito. Aqui está o link: ${link}. Quer que eu te ajude a escrever a mensagem?`);
        }

        if (isDeclineMessage(userMessage)) {
          pendingAction = null;
          return enforceTwoSentencesPlusQuestion('Sem problemas. Quer tirar uma dúvida rápida ou saber dos serviços?');
        }

        // Se não confirmou na mensagem seguinte, não mantém a ação pendente.
        pendingAction = null;
      }

      // Se o usuário disse “sim” após a pergunta de “ajudo a escrever a mensagem?”
      if (isConfirmMessage(userMessage, config?.whatsapp?.confirmKeywords) && lastAssistantMentionsWhatsApp()) {
        composeState.active = true;
        composeState.step = 0;
        return enforceTwoSentencesPlusQuestion('Perfeito. Me diga em 1 frase o que você quer (ex.: diagnóstico, orçamento, anúncios, conteúdo) e qual seu objetivo principal.');
      }

      // FAQ
      const faqItem = matchFaqItem(userMessage, config?.faq);
      if (faqItem) {
        const replyText = renderTemplate(faqItem.reply, {
          WHATSAPP_LINK: whatsappLink,
          WHATSAPP_NUMBER: String(whatsappNumber),
        });

        const action = String(faqItem.action || 'none').toLowerCase();
        if (action === 'route_whatsapp') {
          const linkWithText = buildWhatsAppLink(whatsappNumber, defaultWaText);
          pendingAction = { type: 'whatsapp', link: linkWithText };
        } else if (action === 'ask_compose') {
          // só faz a pergunta, e se o usuário confirmar a gente entra no fluxo acima.
        }

        return enforceTwoSentencesPlusQuestion(replyText);
      }

      // Roteamento por palavras-chave (assuntos que normalmente viram atendimento)
      if (shouldRouteToWhatsApp(userMessage, config?.whatsapp?.routeKeywords)) {
        const linkWithText = buildWhatsAppLink(whatsappNumber, defaultWaText);
        pendingAction = { type: 'whatsapp', link: linkWithText };
        return enforceTwoSentencesPlusQuestion(buildWhatsAppRoutingReply(whatsappNumber, linkWithText));
      }

      // Respostas rápidas por intenção comum
      if (normalized.includes('oi') || normalized.includes('ola') || normalized.includes('olá') || normalized.includes('bom dia') || normalized.includes('boa tarde') || normalized.includes('boa noite')) {
        return enforceTwoSentencesPlusQuestion(`${getTimeGreeting()}! Posso tirar dúvidas rápidas e também te direcionar pro WhatsApp quando fizer sentido. Você quer diagnóstico gratuito, saber dos serviços ou falar com especialista?`);
      }

      return enforceTwoSentencesPlusQuestion(String(config?.fallback || DEFAULT_CHAT_CONFIG.fallback));
    }

    fab.addEventListener('click', () => setOpen(true));
    closeBtn.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      input.value = '';
      appendMessage('user', text);
      pushHistory('user', text);

      const typing = appendMessage('assistant', 'Digitando...');
      typing.setAttribute('aria-busy', 'true');

      try {
        const reply = await sendToRobot();
        typing.removeAttribute('aria-busy');
        typing.innerHTML = formatMessageHtml('assistant', reply);
        pushHistory('assistant', reply);
        scrollToBottom();
      } catch (err) {
        typing.removeAttribute('aria-busy');
        typing.textContent = 'Não consegui responder agora. Tente novamente em instantes.';
      }
    });

    // Estado inicial: sempre fechado
    setOpen(false);

    // Balão "Posso te ajudar?" após carregar
    if (nudge) {
      hideNudge();
      window.addEventListener('load', () => {
        if (!panel.hidden) return;
        let alreadyShown = false;
        try {
          alreadyShown = localStorage.getItem(NUDGE_KEY) === '1';
        } catch (_) {}
        if (alreadyShown) return;

        setTimeout(() => {
          if (!panel.hidden) return;
          showNudge();
          try {
            localStorage.setItem(NUDGE_KEY, '1');
          } catch (_) {}
        }, 700);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
  } else {
    initChatWidget();
  }
})();

