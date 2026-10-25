(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const CURRENCY = document.documentElement.dataset.currency || "€";
  const money = (n) => CURRENCY + Math.round(n).toLocaleString("en-US");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  /* ---------------------------------------------------------
     Catalog — read straight from the product cards in the page
     --------------------------------------------------------- */
  const catalog = new Map(
    $$(".product").map((el) => [
      el.dataset.id,
      {
        id: el.dataset.id,
        name: el.dataset.name,
        type: el.dataset.type || "",
        price: Number(el.dataset.price) || 0,
        family: el.dataset.family || "",
        notes: el.dataset.notes || "",
        size: el.dataset.size || "",
        el,
        get img() {
          return $("img", el).src;
        },
      },
    ])
  );

  /* ---------------------------------------------------------
     Toast
     --------------------------------------------------------- */
  const toast = $(".toast");
  let toastTimer;

  function showToast({ title, text = "", img = "", action = false }) {
    $("[data-toast-title]", toast).textContent = title;
    $("[data-toast-text]", toast).textContent = text;
    const pic = $("[data-toast-img]", toast);
    pic.hidden = !img;
    if (img) pic.src = img;
    $("[data-toast-action]", toast).hidden = !action;
    toast.hidden = false;
    toast.classList.remove("is-in");
    void toast.offsetWidth;
    toast.classList.add("is-in");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 3800);
  }

  /* ---------------------------------------------------------
     Dialog helpers
     --------------------------------------------------------- */
  function openDialog(dialog) {
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add("is-locked");
  }

  $$("dialog").forEach((dialog) => {
    dialog.addEventListener("close", () => {
      if (!$$("dialog").some((d) => d.open)) document.documentElement.classList.remove("is-locked");
    });
    // A click on the backdrop lands on the <dialog> element itself.
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  });

  /* ---------------------------------------------------------
     Bag
     --------------------------------------------------------- */
  const STORE_KEY = "bolix-bag-v1";
  const bagDialog = $("#bag");
  const bagList = $("[data-bag-list]");
  const fab = $(".bag-fab");
  const state = loadBag();

  function loadBag() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (saved && Array.isArray(saved.items)) {
        return {
          gift: Boolean(saved.gift),
          items: saved.items.filter((i) => catalog.has(i.id) && i.qty > 0 && i.price > 0),
        };
      }
    } catch (_) {
      /* storage unavailable or corrupted — start fresh */
    }
    return { items: [], gift: false };
  }

  function saveBag() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (_) {
      /* private mode — the bag simply won't persist */
    }
  }

  function addToBag(id, size, price) {
    const product = catalog.get(id);
    if (!product) return;
    size = size || product.size;
    price = Number(price) || product.price;
    const key = `${id}|${size}`;
    const line = state.items.find((i) => i.key === key);
    if (line) line.qty += 1;
    else state.items.push({ key, id, size, price, qty: 1 });
    saveBag();
    renderBag();
    fab.classList.remove("is-bump");
    void fab.offsetWidth;
    fab.classList.add("is-bump");
    showToast({
      title: product.name,
      text: `${size ? size + " · " : ""}${money(price)} — added to your bag`,
      img: product.img,
      action: true,
    });
  }

  function renderBag() {
    const count = state.items.reduce((n, i) => n + i.qty, 0);
    const subtotal = state.items.reduce((n, i) => n + i.qty * i.price, 0);

    $$("[data-bag-count]").forEach((el) => {
      el.textContent = count;
      el.hidden = count === 0;
    });

    fab.hidden = count === 0;
    if (count) {
      const last = catalog.get(state.items[state.items.length - 1].id);
      $("[data-fab-img]", fab).src = last.img;
      $("[data-fab-summary]", fab).textContent = `${count} item${count === 1 ? "" : "s"} · ${money(subtotal)}`;
    }

    $("[data-bag-meta]").innerHTML = `<b>${count}</b> item${count === 1 ? "" : "s"}`;
    $("[data-bag-subtotal]").textContent = money(subtotal);
    $("[data-bag-gift]").textContent = state.gift ? "Complimentary" : "—";
    $("[data-bag-empty]").hidden = count > 0;
    $("[data-checkout]").disabled = count === 0;

    bagList.replaceChildren(
      ...state.items.map((item) => {
        const p = catalog.get(item.id);
        const li = document.createElement("li");
        li.className = "bag-item";
        li.innerHTML = `
          <img alt="" />
          <span><strong></strong><small></small></span>
          <div class="bag-item__side">
            <b></b>
            <div class="qty">
              <button type="button" data-qty="-1" aria-label="Remove one"><svg class="ic"><use href="#i-minus"/></svg></button>
              <span></span>
              <button type="button" data-qty="1" aria-label="Add one"><svg class="ic"><use href="#i-plus"/></svg></button>
            </div>
          </div>`;
        li.dataset.key = item.key;
        $("img", li).src = p.img;
        $("strong", li).textContent = p.name;
        $("small", li).textContent = [item.size, p.type].filter(Boolean).join(" · ");
        $("b", li).textContent = money(item.price * item.qty);
        $(".qty span", li).textContent = item.qty;
        return li;
      })
    );

    const gift = $("[data-gift]");
    if (gift) gift.setAttribute("aria-pressed", String(state.gift));
  }

  bagList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-qty]");
    if (!btn) return;
    const key = btn.closest(".bag-item").dataset.key;
    const line = state.items.find((i) => i.key === key);
    if (!line) return;
    line.qty += Number(btn.dataset.qty);
    if (line.qty <= 0) state.items.splice(state.items.indexOf(line), 1);
    saveBag();
    renderBag();
  });

  $("[data-checkout]").addEventListener("click", () => {
    bagDialog.close();
    window.location.href = "checkout.html";
  });

  /* ---------------------------------------------------------
     Global click delegation
     --------------------------------------------------------- */
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      e.preventDefault();
      addToBag(add.dataset.add, add.dataset.size, add.dataset.price);
      return;
    }
    if (e.target.closest("[data-open-bag]")) {
      e.preventDefault();
      toast.hidden = true;
      openDialog(bagDialog);
      return;
    }
    if (e.target.closest("[data-open-search]")) {
      e.preventDefault();
      openSearch();
      return;
    }
    if (e.target.closest("[data-to-top]")) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    }
  });

  /* ---------------------------------------------------------
     Search
     --------------------------------------------------------- */
  const searchDialog = $("#search");
  const searchInput = $("#search-input");
  const results = $("[data-search-results]");

  function openSearch() {
    searchInput.value = "";
    renderResults("");
    openDialog(searchDialog);
    searchInput.focus();
  }

  function renderResults(query) {
    const q = fold(query.trim());
    const hits = [...catalog.values()].filter(
      (p) => !q || fold([p.name, p.type, p.family, p.notes].join(" ")).includes(q)
    );

    if (!hits.length) {
      const li = document.createElement("li");
      li.className = "search__empty";
      li.textContent = `Nothing matches “${query.trim()}”. Try another name, brand or note.`;
      results.replaceChildren(li);
      return;
    }

    results.replaceChildren(
      ...hits.map((p) => {
        const li = document.createElement("li");
        li.innerHTML = `<button class="result" type="button"><img alt="" /><span><strong></strong><small></small></span><b></b></button>`;
        $("img", li).src = p.img;
        $("strong", li).textContent = p.name;
        $("small", li).textContent = p.notes || p.type;
        $("b", li).textContent = money(p.price);
        $("button", li).addEventListener("click", () => {
          searchDialog.close();
          revealProduct(p);
        });
        return li;
      })
    );
  }

  searchInput.addEventListener("input", () => renderResults(searchInput.value));
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $(".result", results)?.click();
    }
  });

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (e.key === "/" && !typing && !$$("dialog").some((d) => d.open)) {
      e.preventDefault();
      openSearch();
    }
  });

  function revealProduct(p) {
    setFilter("all");
    p.el.classList.add("is-in");
    p.el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    p.el.classList.remove("is-flash");
    void p.el.offsetWidth;
    p.el.classList.add("is-flash");
  }

  /* ---------------------------------------------------------
     Collection filters
     --------------------------------------------------------- */
  const grid = $(".products");
  const chips = $$(".chip");

  function setFilter(filter) {
    let shown = 0;
    chips.forEach((chip) => {
      const on = chip.dataset.filter === filter;
      chip.classList.toggle("is-active", on);
      chip.setAttribute("aria-pressed", String(on));
    });
    catalog.forEach((p) => {
      const match = filter === "all" || p.family.split(/\s+/).includes(filter);
      p.el.hidden = !match;
      if (match) shown += 1;
    });
    grid.classList.toggle("is-filtered", filter !== "all");
    $("[data-result-count]").textContent = `${shown} fragrance${shown === 1 ? "" : "s"}`;
    $(".products__empty").hidden = shown > 0;
  }

  chips.forEach((chip) => chip.addEventListener("click", () => setFilter(chip.dataset.filter)));

  /* ---------------------------------------------------------
     Featured card — size picker, wishlist, share, gift
     --------------------------------------------------------- */
  const sizeBtn = $(".size__btn");
  const sizeMenu = $(".size__menu");
  const featureAdd = $(".feature [data-add]");

  if (sizeBtn && sizeMenu) {
    const options = $$("[role=option]", sizeMenu);
    options.forEach((o) => (o.tabIndex = -1));

    const toggleMenu = (open) => {
      sizeMenu.hidden = !open;
      sizeBtn.setAttribute("aria-expanded", String(open));
      if (open) (options.find((o) => o.getAttribute("aria-selected") === "true") || options[0]).focus();
    };

    const choose = (opt) => {
      options.forEach((o) => o.setAttribute("aria-selected", String(o === opt)));
      $("[data-size-label]").textContent = opt.dataset.size;
      $("[data-feature-price]").textContent = money(Number(opt.dataset.price));
      featureAdd.dataset.size = opt.dataset.size;
      featureAdd.dataset.price = opt.dataset.price;
      toggleMenu(false);
      sizeBtn.focus();
    };

    sizeBtn.addEventListener("click", () => toggleMenu(sizeMenu.hidden));
    options.forEach((o) => o.addEventListener("click", () => choose(o)));
    sizeMenu.addEventListener("keydown", (e) => {
      const i = options.indexOf(document.activeElement);
      if (e.key === "ArrowDown") options[Math.min(i + 1, options.length - 1)].focus();
      else if (e.key === "ArrowUp") options[Math.max(i - 1, 0)].focus();
      else if (e.key === "Enter" || e.key === " ") choose(options[i]);
      else if (e.key === "Escape" || e.key === "Tab") {
        toggleMenu(false);
        sizeBtn.focus();
      } else return;
      e.preventDefault();
    });
    document.addEventListener("click", (e) => {
      if (!sizeMenu.hidden && !e.target.closest(".size")) toggleMenu(false);
    });
  }

  $$("[data-wish]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const on = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(on));
      const name = featureAdd ? catalog.get(featureAdd.dataset.add)?.name : "";
      showToast({ title: on ? "Saved to your wishlist" : "Removed from wishlist", text: name || "" });
    })
  );

  $("[data-share]")?.addEventListener("click", async () => {
    const product = featureAdd && catalog.get(featureAdd.dataset.add);
    const data = {
      title: `${product ? product.name + " — " : ""}Bolix Perfumery`,
      text: product ? product.notes || product.type : "Bolix Perfumery",
      url: location.href.split("#")[0] + "#featured",
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch (_) {
        /* share sheet dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(data.url);
      showToast({ title: "Link copied", text: "Share it with someone you love." });
    } catch (_) {
      showToast({ title: "Share this scent", text: data.url });
    }
  });

  $("[data-gift]")?.addEventListener("click", () => {
    state.gift = !state.gift;
    saveBag();
    renderBag();
    showToast({
      title: state.gift ? "Gift wrapping added" : "Gift wrapping removed",
      text: state.gift ? "Wrapped in burgundy and sealed with a ribbon." : "Your order will ship in our signature box.",
    });
  });

  $("[data-book]")?.addEventListener("click", () =>
    showToast({ title: "Atelier request received", text: "We'll write to you within 24 hours to arrange a session." })
  );

  /* ---------------------------------------------------------
     Scent finder
     --------------------------------------------------------- */
  const quiz = $("[data-quiz]");
  if (quiz) {
    // Each answer awards points to product families; the best-matching product wins.
    const QUESTIONS = [
      {
        q: "When will you wear it?",
        options: [
          ["Golden hour", { amber: 2, floral: 1 }],
          ["Candlelit evenings", { woody: 2, amber: 2 }],
          ["Crisp mornings", { fresh: 3 }],
          ["Every single day", { floral: 2, fresh: 1 }],
        ],
      },
      {
        q: "Which place feels like you?",
        options: [
          ["An opera box", { amber: 3, floral: 1 }],
          ["A winter garden", { fresh: 2, floral: 2 }],
          ["An old library", { woody: 3 }],
          ["A rose market", { floral: 3 }],
        ],
      },
      {
        q: "Pick a texture.",
        options: [
          ["Velvet", { woody: 2, amber: 2 }],
          ["Silk", { floral: 3 }],
          ["Cashmere", { amber: 2, woody: 1 }],
          ["Linen", { fresh: 3 }],
        ],
      },
    ];

    const stage = $(".quiz__stage", quiz);
    const result = $("[data-quiz-result]", quiz);
    const optionsEl = $("[data-quiz-options]", quiz);
    const dots = $$(".quiz__dots li", quiz);
    const back = $("[data-quiz-back]");
    const next = $("[data-quiz-next]");
    const answers = [];
    let step = 0;
    let winner = null;

    const render = () => {
      const done = step >= QUESTIONS.length;
      stage.hidden = done;
      result.hidden = !done;
      dots.forEach((d, i) => d.classList.toggle("is-on", done || i <= step));
      back.disabled = step === 0;

      if (done) {
        const score = {};
        answers.forEach((a, qi) => Object.entries(QUESTIONS[qi].options[a][1]).forEach(([fam, pts]) => (score[fam] = (score[fam] || 0) + pts)));
        let best = -1;
        catalog.forEach((p) => {
          const s = p.family.split(/\s+/).reduce((n, fam) => n + (score[fam] || 0), 0);
          if (s > best) {
            best = s;
            winner = p;
          }
        });
        $("[data-quiz-img]", quiz).src = winner.img;
        $("[data-quiz-name]", quiz).textContent = winner.name;
        $("[data-quiz-notes]", quiz).textContent = winner.notes || winner.type;
        next.textContent = "Add to bag";
        next.disabled = false;
        return;
      }

      const { q, options } = QUESTIONS[step];
      $("[data-quiz-step]", quiz).textContent = `Question ${step + 1} of ${QUESTIONS.length}`;
      $("[data-quiz-question]", quiz).textContent = q;
      optionsEl.replaceChildren(
        ...options.map(([label], i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "quiz__opt";
          b.textContent = label;
          b.setAttribute("aria-pressed", String(answers[step] === i));
          b.addEventListener("click", () => {
            answers[step] = i;
            step += 1;
            render();
          });
          return b;
        })
      );
      next.textContent = step === QUESTIONS.length - 1 ? "See my match" : "Next";
      next.disabled = answers[step] === undefined;
    };

    next.addEventListener("click", () => {
      if (step >= QUESTIONS.length) {
        if (winner) addToBag(winner.id);
        return;
      }
      if (answers[step] !== undefined) {
        step += 1;
        render();
      }
    });
    back.addEventListener("click", () => {
      step = Math.max(0, step - 1);
      render();
    });
    $("[data-quiz-reset]").addEventListener("click", () => {
      answers.length = 0;
      step = 0;
      winner = null;
      render();
    });

    render();
  }

  /* ---------------------------------------------------------
     Journal stories
     --------------------------------------------------------- */
  const articleDialog = $("#article");
  $$("[data-article]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const key = btn.dataset.article;
      const tpl = $(`#article-${key}`);
      if (!tpl) return;
      $("[data-article-title]", articleDialog).textContent = $(".pin__name", btn).textContent;
      const img = $("[data-article-img]", articleDialog);
      img.src = $(".pin__bg", btn).src;
      $("[data-article-text]", articleDialog).replaceChildren(tpl.content.cloneNode(true));
      openDialog(articleDialog);
    })
  );

  /* ---------------------------------------------------------
     Newsletter
     --------------------------------------------------------- */
  const form = $(".newsletter");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("input", form);
    form.classList.remove("is-invalid");
    if (!input.value.trim() || !input.checkValidity()) {
      void form.offsetWidth;
      form.classList.add("is-invalid");
      showToast({ title: "Almost there", text: "Please enter a valid email address." });
      input.focus();
      return;
    }
    form.reset();
    showToast({ title: "Welcome to the Maison", text: "Your first letter arrives with the next full moon." });
  });

  /* ---------------------------------------------------------
     Scroll: reveal, sticky nav shadow, active nav link
     --------------------------------------------------------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    $$(".products .product").forEach((el, i) => (el.style.transitionDelay = `${(i % 3) * 90}ms`));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  const nav = $(".nav");
  const navLinks = $$(".nav:not(.nav--footer) .nav__link[href^='#']");
  const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  let ticking = false;

  /* Mobile menu */
  const menuBtn = $(".nav__menu");
  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    $("use", menuBtn).setAttribute("href", open ? "#i-close" : "#i-menu");
  };
  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  navLinks.forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("click", (e) => {
    if (nav.classList.contains("is-open") && !e.target.closest(".nav")) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      setMenu(false);
      menuBtn.focus();
    }
  });
  matchMedia("(min-width: 1001px)").addEventListener("change", (e) => e.matches && setMenu(false));

  const onScroll = () => {
    ticking = false;
    nav.classList.toggle("is-stuck", window.scrollY > 40);
    const line = window.innerHeight * 0.35;
    let current = sections[0];
    sections.forEach((s) => {
      if (s.getBoundingClientRect().top <= line) current = s;
    });
    navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${current.id}`));
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );

  onScroll();
  renderBag();
})();
