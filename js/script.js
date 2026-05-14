/**
 * EcoWeave — product modal, cart, checkout, confirmation
 */

(function () {
  "use strict";

  var SHIPPING_FEE = 3.49;
  var CART_STORAGE_KEY = "ecowave_cart";

  /** @type {Record<string, { id: string; name: string; price: number; qty: number; image?: string }>} */
  var cart = {};

  var cartList = document.getElementById("cartList");
  var cartEmpty = document.getElementById("cartEmpty");
  var cartBadge = document.getElementById("cartBadge");
  var subtotalDisplay = document.getElementById("subtotalDisplay");
  var shippingDisplay = document.getElementById("shippingDisplay");
  var totalDisplay = document.getElementById("totalDisplay");
  var checkoutTotalDisplay = document.getElementById("checkoutTotalDisplay");
  var checkoutItemsList = document.getElementById("checkoutItemsList");
  var checkoutItemsEmpty = document.getElementById("checkoutItemsEmpty");
  var checkoutSubtotalDisplay = document.getElementById("checkoutSubtotalDisplay");
  var checkoutShippingDisplay = document.getElementById("checkoutShippingDisplay");
  var checkoutSummaryTotalDisplay = document.getElementById("checkoutSummaryTotalDisplay");
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

  var productModal = document.getElementById("productModal");
  var modalBackdrop = document.getElementById("modalBackdrop");
  var modalClose = document.getElementById("modalClose");
  var modalProductTitle = document.getElementById("modalProductTitle");
  var modalProductDesc = document.getElementById("modalProductDesc");
  var modalProductPrice = document.getElementById("modalProductPrice");
  var modalImage = document.getElementById("modalImage");
  var modalQtyVal = document.getElementById("modalQtyVal");
  var modalQtyDec = document.getElementById("modalQtyDec");
  var modalQtyInc = document.getElementById("modalQtyInc");
  var modalAddToCart = document.getElementById("modalAddToCart");
  var modalBuyNow = document.getElementById("modalBuyNow");

  var confirmCustomerName = document.getElementById("confirmCustomerName");
  var confirmCustomerEmail = document.getElementById("confirmCustomerEmail");
  var confirmCustomerAddress = document.getElementById("confirmCustomerAddress");
  var confirmCustomerPhone = document.getElementById("confirmCustomerPhone");
  var confirmOrderItems = document.getElementById("confirmOrderItems");
  var orderEmailStatus = document.getElementById("orderEmailStatus");
  var placeOrderBtn = document.getElementById("placeOrderBtn");
  var checkoutStatus = document.getElementById("checkoutStatus");

  var modalQty = 1;
  var modalProductId = "";

  function loadCart() {
    try {
      var raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        cart = parsed;
      }
    } catch (err) {
      cart = {};
    }
  }

  function persistCart() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      /* ignore storage failures */
    }
  }

  function getCartKeys() {
    return Object.keys(cart).filter(function (k) {
      return cart[k].qty > 0;
    });
  }

  function formatMoney(n) {
    return "₱" + Number(n).toFixed(2);
  }

  function parsePriceValue(value) {
    var normalized = String(value || "").replace(/[^\d.]/g, "");
    var amount = parseFloat(normalized);
    return isNaN(amount) ? 0 : amount;
  }

  function getCardPrice(card) {
    if (!card) return 0;
    var priceEl = card.querySelector(".product-price");
    if (priceEl && priceEl.textContent.trim()) {
      return parsePriceValue(priceEl.textContent);
    }
    return parsePriceValue(card.getAttribute("data-price"));
  }

  var catalogPrices = {
    p1: 150,
    p2: 250
  };

  function getCatalogPrice(productId) {
    var card = document.querySelector('.product-card[data-id="' + productId + '"]');
    if (card) {
      return getCardPrice(card);
    }
    return catalogPrices[productId] || 0;
  }

  function syncCartPrices() {
    getCartKeys().forEach(function (key) {
      var item = cart[key];
      var price = getCatalogPrice(item.id);
      if (price > 0) {
        item.price = price;
      }
      var card = document.querySelector('.product-card[data-id="' + item.id + '"]');
      if (!card) return;
      var name = card.getAttribute("data-name");
      if (name) {
        item.name = name;
      }
      var image = card.getAttribute("data-image");
      if (image) {
        item.image = image;
      }
    });
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

  function getOrderConfig() {
    return window.EcoWeaveOrderConfig || {};
  }

  function isOrderEmailConfigured() {
    var cfg = getOrderConfig();
    return !!(cfg.emailJsPublicKey && cfg.emailJsServiceId && cfg.emailJsTemplateId);
  }

  function initEmailJs() {
    if (!isOrderEmailConfigured() || typeof emailjs === "undefined") return;
    emailjs.init(getOrderConfig().emailJsPublicKey);
  }

  function buildOrderItemsText(keys) {
    return keys
      .map(function (key) {
        var item = cart[key];
        return item.name + " x" + item.qty + " — " + formatMoney(item.price * item.qty);
      })
      .join("\n");
  }

  function setCheckoutStatus(message, tone) {
    if (!checkoutStatus) return;
    checkoutStatus.textContent = message || "";
    checkoutStatus.classList.toggle("hidden", !message);
    checkoutStatus.classList.toggle("checkout-status--error", tone === "error");
    checkoutStatus.classList.toggle("checkout-status--success", tone === "success");
  }

  function setPlaceOrderBusy(isBusy) {
    if (!placeOrderBtn) return;
    placeOrderBtn.disabled = isBusy;
    placeOrderBtn.textContent = isBusy ? "Sending order..." : "Place order";
  }

  function sendOrderEmail(customer, customerAddress, keys, total) {
    if (!isOrderEmailConfigured() || typeof emailjs === "undefined") {
      return Promise.reject(new Error("EmailJS is not configured."));
    }

    var cfg = getOrderConfig();
    var templateParams = {
      customer_name: customer.name,
      customer_email: customer.email || "Not provided",
      customer_phone: customer.phone,
      customer_address: customerAddress,
      order_items: buildOrderItemsText(keys),
      order_total: formatMoney(total)
    };

    return emailjs.send(cfg.emailJsServiceId, cfg.emailJsTemplateId, templateParams);
  }

  function showConfirmation(orderNo, customer, locationText, keys, total, firstName) {
    var checkoutSection = document.getElementById("checkout");
    if (checkoutSection) {
      checkoutSection.classList.add("hidden");
    }
    if (orderNumberDisplay) {
      orderNumberDisplay.textContent = orderNo;
    }
    if (confirmTotal) {
      confirmTotal.textContent = formatMoney(total);
    }

    if (confirmCustomerName) {
      confirmCustomerName.textContent = customer.name;
    }
    if (confirmCustomerEmail) {
      if (customer.email) {
        confirmCustomerEmail.textContent = customer.email;
        confirmCustomerEmail.classList.remove("hidden");
      } else {
        confirmCustomerEmail.textContent = "";
        confirmCustomerEmail.classList.add("hidden");
      }
    }
    if (confirmCustomerAddress) {
      confirmCustomerAddress.textContent = locationText;
    }
    if (confirmCustomerPhone) {
      confirmCustomerPhone.textContent = customer.phone;
    }
    if (confirmOrderItems) {
      confirmOrderItems.innerHTML = "";
      keys.forEach(function (key) {
        var item = cart[key];
        var li = document.createElement("li");
        li.textContent = item.name + " x" + item.qty + " — " + formatMoney(item.price * item.qty);
        confirmOrderItems.appendChild(li);
      });
    }
    if (orderEmailStatus) {
      orderEmailStatus.textContent = "Your order was emailed to EcoWeave.";
      orderEmailStatus.classList.remove("hidden");
    }

    if (confirmationThankYou) {
      confirmationThankYou.textContent = firstName
        ? "Thanks, " + firstName + "! Your EcoWeave order is on its way. Pay in cash when it arrives."
        : "Thank you for your order. Pay in cash when your EcoWeave pieces arrive.";
    }

    confirmationSection.classList.remove("hidden");
    if (checkoutForm) {
      checkoutForm.reset();
    }
    if (window.EcoWeaveLocation && window.EcoWeaveLocation.resetLocationForm) {
      window.EcoWeaveLocation.resetLocationForm();
    }

    cart = {};
    persistCart();
    renderCart();

    if (confirmationSection) {
      confirmationSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    closeMobileNav();
    setActiveNav("confirmation");
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
    document.body.classList.remove("nav-open");
  }

  function setMobileNavOpen(isOpen) {
    if (!navToggle || !navLinks) return;
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    navLinks.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("nav-open", isOpen);
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

  function openProductModal(card) {
    if (!productModal || !card) return;
    modalProductId = card.getAttribute("data-id") || "";
    var name = card.getAttribute("data-name") || "";
    var price = getCardPrice(card);
    var desc = card.getAttribute("data-desc") || "";
    var imageSrc = card.getAttribute("data-image") || "";

    modalProductTitle.textContent = name;
    modalProductDesc.textContent = desc;
    modalProductPrice.textContent = formatMoney(price);
    if (modalImage) {
      modalImage.src = imageSrc;
      modalImage.alt = name;
    }
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

  function addModalProductToCart() {
    if (!modalProductId) return false;
    var card = document.querySelector('.product-card[data-id="' + modalProductId + '"]');
    var name = card ? card.getAttribute("data-name") : "";
    var price = card ? getCardPrice(card) : 0;
    var image = card ? card.getAttribute("data-image") : "";
    if (!cart[modalProductId]) {
      cart[modalProductId] = { id: modalProductId, name: name, price: price, qty: 0, image: image };
    } else {
      cart[modalProductId].price = price;
      if (name) {
        cart[modalProductId].name = name;
      }
      if (image) {
        cart[modalProductId].image = image;
      }
    }
    cart[modalProductId].qty += modalQty;
    renderCart();
    return true;
  }

  if (modalAddToCart) {
    modalAddToCart.addEventListener("click", function () {
      if (!addModalProductToCart()) return;
      closeProductModal();
    });
  }

  if (modalBuyNow) {
    modalBuyNow.addEventListener("click", function () {
      if (!addModalProductToCart()) return;
      persistCart();
      closeProductModal();
      window.location.href = "checkout.html";
    });
  }

  function addToCartFromButton(btn) {
    var id = btn.getAttribute("data-id");
    var name = btn.getAttribute("data-name");
    var card = btn.closest(".product-card");
    var price = card ? getCardPrice(card) : parsePriceValue(btn.getAttribute("data-price"));
    var image = card ? card.getAttribute("data-image") : "";
    if (!cart[id]) {
      cart[id] = { id: id, name: name, price: price, qty: 0, image: image };
    } else {
      cart[id].price = price;
      if (name) {
        cart[id].name = name;
      }
      if (image) {
        cart[id].image = image;
      }
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

  function renderCheckoutOrder() {
    if (!checkoutItemsList) return;

    syncCartPrices();
    var keys = getCartKeys();
    var subtotal = getSubtotal();
    var shipping = keys.length > 0 ? SHIPPING_FEE : 0;
    var total = subtotal + shipping;

    checkoutItemsList.querySelectorAll(".checkout-item").forEach(function (node) {
      node.remove();
    });

    if (checkoutItemsEmpty) {
      checkoutItemsEmpty.classList.toggle("hidden", keys.length > 0);
    }

    keys.forEach(function (key) {
      var item = cart[key];
      var card = document.querySelector('.product-card[data-id="' + item.id + '"]');
      var imageSrc = card ? card.getAttribute("data-image") : item.image || "";
      var imageAlt = card ? card.getAttribute("data-name") : item.name;
      var li = document.createElement("li");
      li.className = "checkout-item";
      li.innerHTML =
        '<img class="checkout-item-thumb product-image" src="" alt="" width="72" height="72" />' +
        '<div class="checkout-item-info">' +
        '<p class="checkout-item-name"></p>' +
        '<p class="checkout-item-meta text-muted"></p>' +
        "</div>" +
        '<p class="checkout-item-total"></p>';

      var thumb = li.querySelector(".checkout-item-thumb");
      if (thumb) {
        thumb.src = imageSrc;
        thumb.alt = imageAlt;
      }

      li.querySelector(".checkout-item-name").textContent = item.name;
      li.querySelector(".checkout-item-meta").textContent =
        "Qty " + item.qty + " · " + formatMoney(item.price) + " each";
      li.querySelector(".checkout-item-total").textContent = formatMoney(item.price * item.qty);
      checkoutItemsList.appendChild(li);
    });

    if (checkoutSubtotalDisplay) {
      checkoutSubtotalDisplay.textContent = formatMoney(subtotal);
    }
    if (checkoutShippingDisplay) {
      checkoutShippingDisplay.textContent = formatMoney(shipping);
    }
    if (checkoutSummaryTotalDisplay) {
      checkoutSummaryTotalDisplay.textContent = formatMoney(total);
    }
    if (checkoutTotalDisplay) {
      checkoutTotalDisplay.textContent = formatMoney(total);
    }
  }

  function renderCart() {
    syncCartPrices();
    var keys = getCartKeys();
    var count = getCartCount();

    if (cartBadge) {
      cartBadge.textContent = String(count);
      cartBadge.classList.toggle("hidden", count === 0);
    }

    if (!cartList || !cartEmpty || !subtotalDisplay || !shippingDisplay || !totalDisplay) {
      renderCheckoutOrder();
      return;
    }

    cartList.querySelectorAll(".cart-item").forEach(function (node) {
      node.remove();
    });

    cartEmpty.classList.toggle("hidden", keys.length > 0);

    keys.forEach(function (key) {
      var item = cart[key];
      var card = document.querySelector('.product-card[data-id="' + item.id + '"]');
      var imageSrc = card ? card.getAttribute("data-image") : item.image || "";
      var imageAlt = card ? card.getAttribute("data-name") : item.name;
      var li = document.createElement("li");
      li.className = "cart-item";
      li.dataset.id = item.id;
      li.innerHTML =
        '<img class="cart-thumb product-image" src="" alt="" width="56" height="56" />' +
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

      var thumb = li.querySelector(".cart-thumb");
      if (thumb) {
        thumb.src = imageSrc;
        thumb.alt = imageAlt;
      }

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

    if (proceedCheckout) {
      proceedCheckout.disabled = keys.length === 0;
    }

    persistCart();
  }

  if (proceedCheckout) {
    proceedCheckout.addEventListener("click", function () {
      if (getCartKeys().length === 0) return;
      persistCart();
      window.location.href = "checkout.html";
    });
  }

  if (checkoutForm) {
    checkoutForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var keys = getCartKeys();
      if (keys.length === 0) {
        setCheckoutStatus("Your cart is empty.", "error");
        return;
      }

      if (!checkoutForm.checkValidity()) {
        checkoutForm.reportValidity();
        return;
      }

      var nameVal = document.getElementById("customerName").value.trim();
      var emailVal = document.getElementById("customerEmail").value.trim();
      var phoneVal = document.getElementById("customerPhone").value.trim();
      var locationText =
        window.EcoWeaveLocation && window.EcoWeaveLocation.getFormattedAddress
          ? window.EcoWeaveLocation.getFormattedAddress()
          : "";
      var firstName = nameVal ? nameVal.split(/\s+/)[0] : "";

      if (!locationText) {
        setCheckoutStatus("Complete the delivery location before placing your order.", "error");
        return;
      }

      var total = getSubtotal() + SHIPPING_FEE;
      var orderNo = "#EW-" + Date.now().toString().slice(-6);
      var customer = {
        name: nameVal,
        email: emailVal,
        phone: phoneVal
      };

      setCheckoutStatus("");
      setPlaceOrderBusy(true);

      sendOrderEmail(customer, locationText, keys, total)
        .then(function () {
          setCheckoutStatus("Order sent successfully.", "success");
          showConfirmation(orderNo, customer, locationText, keys, total, firstName);
        })
        .catch(function () {
          setCheckoutStatus(
            "We could not send your order email. Please try again or contact EcoWeave.",
            "error"
          );
        })
        .finally(function () {
          setPlaceOrderBusy(false);
        });
    });
  }

  if (backHome) {
    backHome.addEventListener("click", function (e) {
      if (backHome.getAttribute("href")) return;
      e.preventDefault();
      if (confirmationSection) {
        confirmationSection.classList.add("hidden");
      }
      if (orderEmailStatus) {
        orderEmailStatus.textContent = "";
        orderEmailStatus.classList.add("hidden");
      }
      scrollToSection("hero");
      setActiveNav("hero");
    });
  }

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

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") === "true";
      setMobileNavOpen(!open);
    });
  }

  window.addEventListener("resize", function () {
    if (window.innerWidth > 900) {
      closeMobileNav();
    }
  });

  loadCart();
  syncCartPrices();
  initEmailJs();

  if (checkoutForm && getCartKeys().length === 0) {
    window.location.replace("index.html#cart");
    return;
  }

  renderCart();
})();
