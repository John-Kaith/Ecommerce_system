/**
 * Bazaaro — marketplace: filters, product modal, cart, checkout, confirmation
 */

(function () {
  "use strict";

  var SHIPPING_FEE = 3.49;

  /** @type {Record<string, { id: string; name: string; price: number; qty: number }>} */
  var cart = {};

  var cartList = document.getElementById("cartList");
  var cartEmpty = document.getElementById("cartEmpty");
  var cartBadge = document.getElementById("cartBadge");
  var subtotalDisplay = document.getElementById("subtotalDisplay");
  var shippingDisplay = document.getElementById("shippingDisplay");
  var totalDisplay = document.getElementById("totalDisplay");
  var checkoutTotalDisplay = document.getElementById("checkoutTotalDisplay");
  var proceedCheckout = document.getElementById("proceedCheckout");
  var checkoutForm = document.getElementById("checkoutForm");
  var confirmationSection = document.getElementById("confirmation");
  var confirmTotal = document.getElementById("confirmTotal");
  var orderNumberDisplay = document.getElementById("orderNumberDisplay");
  var confirmationThankYou = document.getElementById("confirmationThankYou");
  var backHome = document.getElementById("backHome");
  var navToggle = document.querySelector(".nav-toggle");
  var navLinks = document.querySelector(".nav-links");
  var productGrid = document.getElementById("productGrid");
  var productSearch = document.getElementById("productSearch");
  var navSearchBtn = document.getElementById("navSearchBtn");

  var productModal = document.getElementById("productModal");
  var modalBackdrop = document.getElementById("modalBackdrop");
  var modalClose = document.getElementById("modalClose");
  var modalProductTitle = document.getElementById("modalProductTitle");
  var modalProductDesc = document.getElementById("modalProductDesc");
  var modalProductPrice = document.getElementById("modalProductPrice");
  var modalQtyVal = document.getElementById("modalQtyVal");
  var modalQtyDec = document.getElementById("modalQtyDec");
  var modalQtyInc = document.getElementById("modalQtyInc");
  var modalAddToCart = document.getElementById("modalAddToCart");

  var confirmCustomerName = document.getElementById("confirmCustomerName");
  var confirmCustomerAddress = document.getElementById("confirmCustomerAddress");
  var confirmCustomerPhone = document.getElementById("confirmCustomerPhone");

  var modalQty = 1;
  var modalProductId = "";

  function formatMoney(n) {
    return "$" + Number(n).toFixed(2);
  }

  function getSubtotal() {
    return Object.values(cart).reduce(function (sum, item) {
      return sum + item.price * item.qty;
    }, 0);
  }

  function getCartCount() {
    return Object.values(cart).reduce(function (sum, item) {
      return sum + item.qty;
    }, 0);
  }

  function scrollToSection(id) {
    var el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function closeMobileNav() {
    if (navToggle && navLinks) {
      navToggle.setAttribute("aria-expanded", "false");
      navLinks.classList.remove("is-open");
    }
  }

  function setActiveNav(sectionId) {
    var resolved = sectionId;
    if (sectionId === "checkout") resolved = "cart";
    if (sectionId === "confirmation") resolved = "";
    document.querySelectorAll(".nav-link").forEach(function (a) {
      var sec = a.getAttribute("data-section");
      a.classList.toggle("nav-link--active", !!resolved && sec === resolved);
    });
  }

  function applyCategoryFilter(filter) {
    document.querySelectorAll(".category-btn").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-filter") === filter);
    });
    document.querySelectorAll(".product-card").forEach(function (card) {
      var cat = card.getAttribute("data-category");
      var matchCat = filter === "all" || cat === filter;
      var q = (productSearch && productSearch.value.trim().toLowerCase()) || "";
      var name = (card.getAttribute("data-name") || "").toLowerCase();
      var descEl = card.querySelector(".product-desc");
      var desc = descEl ? descEl.textContent.toLowerCase() : "";
      var matchSearch = !q || name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      card.classList.toggle("is-hidden", !matchCat || !matchSearch);
    });
  }

  document.querySelectorAll(".category-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyCategoryFilter(btn.getAttribute("data-filter"));
    });
  });

  if (productSearch) {
    productSearch.addEventListener("input", function () {
      var active = document.querySelector(".category-btn.is-active");
      applyCategoryFilter(active ? active.getAttribute("data-filter") : "all");
    });
  }

  function openProductModal(card) {
    if (!productModal || !card) return;
    modalProductId = card.getAttribute("data-id") || "";
    var name = card.getAttribute("data-name") || "";
    var price = parseFloat(card.getAttribute("data-price"));
    var desc = card.getAttribute("data-desc") || "";

    modalProductTitle.textContent = name;
    modalProductDesc.textContent = desc;
    modalProductPrice.textContent = formatMoney(price);
    modalQty = 1;
    modalQtyVal.textContent = "1";

    productModal.classList.remove("hidden");
    productModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (modalClose) {
      modalClose.focus();
    }
  }

  function closeProductModal() {
    if (!productModal) return;
    productModal.classList.add("hidden");
    productModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    modalProductId = "";
  }

  if (productGrid) {
    productGrid.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest(".add-to-cart")) return;
      var card = t.closest(".product-card");
      if (!card) return;
      if (t.closest(".view-details")) {
        openProductModal(card);
        return;
      }
      if (t.closest("button")) return;
      openProductModal(card);
    });
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", closeProductModal);
  }
  if (modalClose) {
    modalClose.addEventListener("click", closeProductModal);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && productModal && !productModal.classList.contains("hidden")) {
      closeProductModal();
    }
  });

  function bumpModalQty(delta) {
    modalQty = Math.max(1, modalQty + delta);
    modalQtyVal.textContent = String(modalQty);
  }

  if (modalQtyDec) {
    modalQtyDec.addEventListener("click", function () {
      bumpModalQty(-1);
    });
  }
  if (modalQtyInc) {
    modalQtyInc.addEventListener("click", function () {
      bumpModalQty(1);
    });
  }

  if (modalAddToCart) {
    modalAddToCart.addEventListener("click", function () {
      if (!modalProductId) return;
      var card = document.querySelector('.product-card[data-id="' + modalProductId + '"]');
      var name = card ? card.getAttribute("data-name") : "";
      var price = card ? parseFloat(card.getAttribute("data-price")) : 0;
      if (!cart[modalProductId]) {
        cart[modalProductId] = { id: modalProductId, name: name, price: price, qty: 0 };
      }
      cart[modalProductId].qty += modalQty;
      renderCart();
      closeProductModal();
    });
  }

  function addToCartFromButton(btn) {
    var id = btn.getAttribute("data-id");
    var name = btn.getAttribute("data-name");
    var price = parseFloat(btn.getAttribute("data-price"));
    if (!cart[id]) {
      cart[id] = { id: id, name: name, price: price, qty: 0 };
    }
    cart[id].qty += 1;
    renderCart();
  }

  document.querySelectorAll(".add-to-cart").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      addToCartFromButton(btn);
    });
  });

  var trashSvg =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

  function renderCart() {
    cartList.querySelectorAll(".cart-item").forEach(function (node) {
      node.remove();
    });

    var keys = Object.keys(cart).filter(function (k) {
      return cart[k].qty > 0;
    });

    cartEmpty.classList.toggle("hidden", keys.length > 0);

    var count = getCartCount();
    if (cartBadge) {
      cartBadge.textContent = String(count);
      cartBadge.classList.toggle("hidden", count === 0);
    }

    keys.forEach(function (key) {
      var item = cart[key];
      var li = document.createElement("li");
      li.className = "cart-item";
      li.dataset.id = item.id;
      li.innerHTML =
        '<div class="cart-thumb placeholder-img" aria-hidden="true"></div>' +
        '<div class="cart-item-info">' +
        '<p class="cart-item-name"></p>' +
        '<p class="cart-item-unit text-muted"></p>' +
        "</div>" +
        '<div class="qty-row">' +
        '<button type="button" class="qty-btn" data-action="dec" aria-label="Decrease quantity">−</button>' +
        '<span class="qty-val"></span>' +
        '<button type="button" class="qty-btn" data-action="inc" aria-label="Increase quantity">+</button>' +
        "</div>" +
        '<div class="cart-line-total"></div>' +
        '<button type="button" class="cart-remove" aria-label="Remove item">' +
        trashSvg +
        "</button>";

      li.querySelector(".cart-item-name").textContent = item.name;
      li.querySelector(".cart-item-unit").textContent = formatMoney(item.price) + " each";
      li.querySelector(".qty-val").textContent = String(item.qty);
      li.querySelector(".cart-line-total").textContent = formatMoney(item.price * item.qty);

      li.querySelectorAll(".qty-btn").forEach(function (q) {
        q.addEventListener("click", function () {
          var action = q.getAttribute("data-action");
          if (action === "inc") cart[item.id].qty += 1;
          else cart[item.id].qty -= 1;
          if (cart[item.id].qty <= 0) delete cart[item.id];
          renderCart();
        });
      });

      li.querySelector(".cart-remove").addEventListener("click", function () {
        delete cart[item.id];
        renderCart();
      });

      cartList.appendChild(li);
    });

    var subtotal = getSubtotal();
    var shipping = keys.length > 0 ? SHIPPING_FEE : 0;
    var total = subtotal + shipping;

    subtotalDisplay.textContent = formatMoney(subtotal);
    shippingDisplay.textContent = formatMoney(shipping);
    totalDisplay.textContent = formatMoney(total);
    if (checkoutTotalDisplay) {
      checkoutTotalDisplay.textContent = formatMoney(total);
    }

    proceedCheckout.disabled = keys.length === 0;
  }

  proceedCheckout.addEventListener("click", function () {
    var keys = Object.keys(cart).filter(function (k) {
      return cart[k].qty > 0;
    });
    if (keys.length === 0) return;
    scrollToSection("checkout");
    closeMobileNav();
    setActiveNav("cart");
  });

  checkoutForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var keys = Object.keys(cart).filter(function (k) {
      return cart[k].qty > 0;
    });
    if (keys.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!checkoutForm.checkValidity()) {
      checkoutForm.reportValidity();
      return;
    }

    var nameVal = document.getElementById("customerName").value.trim();
    var addressVal = document.getElementById("customerAddress").value.trim();
    var phoneVal = document.getElementById("customerPhone").value.trim();
    var firstName = nameVal ? nameVal.split(/\s+/)[0] : "";

    var subtotal = getSubtotal();
    var total = subtotal + SHIPPING_FEE;

    var orderNo = "#BZ-" + Date.now().toString().slice(-6);
    orderNumberDisplay.textContent = orderNo;
    confirmTotal.textContent = formatMoney(total);

    if (confirmCustomerName) {
      confirmCustomerName.textContent = nameVal;
    }
    if (confirmCustomerAddress) {
      confirmCustomerAddress.textContent = addressVal;
    }
    if (confirmCustomerPhone) {
      confirmCustomerPhone.textContent = phoneVal;
    }

    if (confirmationThankYou) {
      confirmationThankYou.textContent = firstName
        ? "Thanks, " + firstName + "! We are packing your bazaar haul."
        : "Thank you for your order. We are packing your bazaar haul.";
    }

    confirmationSection.classList.remove("hidden");
    checkoutForm.reset();

    cart = {};
    renderCart();

    scrollToSection("confirmation");
    closeMobileNav();
    setActiveNav("confirmation");
  });

  backHome.addEventListener("click", function () {
    confirmationSection.classList.add("hidden");
    scrollToSection("hero");
    setActiveNav("hero");
  });

  document.querySelectorAll("[data-section]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("data-section");
      var href = link.getAttribute("href");
      if (id && href && href.indexOf("#") === 0) {
        e.preventDefault();
        scrollToSection(id);
        setActiveNav(id);
        closeMobileNav();
      }
    });
  });

  if (navSearchBtn && productSearch) {
    navSearchBtn.addEventListener("click", function () {
      scrollToSection("browse");
      setTimeout(function () {
        productSearch.focus();
      }, 400);
      closeMobileNav();
      setActiveNav("browse");
    });
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", open ? "false" : "true");
      navLinks.classList.toggle("is-open", !open);
    });
  }

  renderCart();
})();
