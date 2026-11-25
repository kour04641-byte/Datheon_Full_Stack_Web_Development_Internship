// ---------- State ----------
const API = "https://fakestoreapi.com/products";
const KEY = "kart.cart", WKEY = "kart.wishlist", PKEY = "kart.products";
const TAX = 0.08, SHIPPING = 5.99, FREE_SHIP = 100, COUPONS = { SAVE10: 0.1 };
const $ = (id) => document.getElementById(id);
const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const money = (n) => "$" + n.toFixed(2);

let products = [];
let cart = read(KEY, {});              // { productId: quantity }
let wishlist = new Set(read(WKEY, []));
let maxPrice = 1000, cat = "all", query = "", sort = "featured", coupon = "";
const catOf = (p) => p.category.includes("clothing") ? "Clothing" : p.category === "jewelery" ? "Jewelry" : "Electronics";
const byId = (id) => products.find((p) => p.id === +id);
const persist = () => { localStorage.setItem(KEY, JSON.stringify(cart)); localStorage.setItem(WKEY, JSON.stringify([...wishlist])); };

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

// ---------- Fetch products (loading, error, offline cache) ----------
async function loadProducts() {
  $("grid").innerHTML = "";
  for (let i = 0; i < 8; i++) $("grid").appendChild(el("div", "card skel"));
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error(res.status);
    products = await res.json();
    localStorage.setItem(PKEY, JSON.stringify(products));
  } catch {
    products = read(PKEY, []);
    if (!products.length) {
      $("grid").innerHTML = "";
      const m = el("div", "msg", "Could not load products. Check your connection. ");
      const b = el("button", "", "Try again"); b.onclick = loadProducts; m.appendChild(b);
      $("grid").appendChild(m); return;
    }
    toast("Offline: showing saved products");
  }
  renderAll();
}

// ---------- Cart actions ----------
function addToCart(id) { cart[id] = (cart[id] || 0) + 1; persist(); renderCart(true); toast("Added to cart"); }
function removeFromCart(id) { delete cart[id]; persist(); renderCart(); }
function updateQuantity(id, d) { cart[id] += d; if (cart[id] < 1) delete cart[id]; persist(); renderCart(); }
function calculateTotal() {
  const subtotal = Object.entries(cart).reduce((s, [id, q]) => s + (byId(id)?.price || 0) * q, 0);
  const discount = subtotal * (COUPONS[coupon] || 0);
  const net = subtotal - discount;
  const shipping = !net || net >= FREE_SHIP ? 0 : SHIPPING;
  const tax = net * TAX;
  return { subtotal, discount, shipping, tax, net, total: net + tax + shipping };
}

// ---------- Render products ----------
function visible() {
  const l = products.filter((p) => (cat === "all" || (cat === "Saved" ? wishlist.has(p.id) : catOf(p) === cat)) && p.title.toLowerCase().includes(query) && p.price <= maxPrice);
  if (sort === "low") l.sort((a, b) => a.price - b.price);
  if (sort === "high") l.sort((a, b) => b.price - a.price);
  if (sort === "rating") l.sort((a, b) => b.rating.rate - a.rating.rate);
  return l;
}
function renderAll() { renderChips(); renderGrid(); renderCart(); }
function renderChips() {
  $("cats").innerHTML = "";
  ["all", "Electronics", "Jewelry", "Clothing", "Saved"].forEach((c) => {
    const b = el("button", c === cat ? "active" : "", c === "all" ? "All" : c === "Saved" ? `♥ Saved (${wishlist.size})` : c);
    b.onclick = () => { cat = c; renderChips(); renderGrid(); };
    $("cats").appendChild(b);
  });
}
function renderGrid() {
  const list = visible(), grid = $("grid");
  grid.innerHTML = "";
  $("count").textContent = `${list.length} product${list.length === 1 ? "" : "s"}`;
  if (!list.length) grid.appendChild(el("div", "msg", "No products match. Try another search or category."));
  list.forEach((p) => {
    const c = el("article", "card");
    const tags = el("div", "tags");
    if (p.rating.rate >= 4.5) tags.appendChild(el("span", "tag", "Top rated"));
    if (p.rating.count >= 400) tags.appendChild(el("span", "tag", "Popular"));
    if (p.price < 20) tags.appendChild(el("span", "tag deal", "Deal"));
    const img = el("img"); img.src = p.image; img.alt = p.title; img.loading = "lazy"; img.onclick = () => quickView(p);
    const heart = el("button", "heart" + (wishlist.has(p.id) ? " on" : ""), wishlist.has(p.id) ? "♥" : "♡");
    heart.setAttribute("aria-label", "Save to wishlist");
    heart.onclick = () => { wishlist.has(p.id) ? wishlist.delete(p.id) : wishlist.add(p.id); persist(); renderChips(); renderGrid(); };
    const stars = el("div", "stars", "★".repeat(Math.round(p.rating.rate)) + "☆".repeat(5 - Math.round(p.rating.rate)) + " ");
    stars.appendChild(el("small", "", `${p.rating.rate} (${p.rating.count})`));
    const add = el("button", "add", "Add to cart"); add.onclick = () => addToCart(p.id);
    c.append(tags, heart, img, el("span", "cat", catOf(p)), Object.assign(el("h3", "", p.title), { onclick: () => quickView(p) }), stars, el("div", "price", money(p.price)), add);
    grid.appendChild(c);
  });
}

// ---------- Render cart drawer ----------
function renderCart(bump) {
  const ids = Object.keys(cart).filter((id) => byId(id));
  const count = ids.reduce((s, id) => s + cart[id], 0);
  $("badge").textContent = count;
  if (bump) { $("badge").classList.remove("bump"); void $("badge").offsetWidth; $("badge").classList.add("bump"); }

  const items = $("items"); items.innerHTML = "";
  if (!ids.length) items.appendChild(el("li", "msg", "Your cart is empty."));
  ids.forEach((id) => {
    const p = byId(id), li = el("li", "item");
    const img = el("img"); img.src = p.image; img.alt = "";
    const mid = el("div"), t = el("p", "", p.title), q = el("div", "qty");
    const minus = el("button", "", "−"), plus = el("button", "", "+");
    minus.setAttribute("aria-label", "Decrease quantity"); plus.setAttribute("aria-label", "Increase quantity");
    minus.onclick = () => updateQuantity(id, -1); plus.onclick = () => updateQuantity(id, 1);
    q.append(minus, el("span", "", cart[id]), plus);
    const rm = el("button", "rm", "Remove"); rm.onclick = () => removeFromCart(id);
    mid.append(t, q, rm);
    li.append(img, mid, el("strong", "", money(p.price * cart[id])));
    items.appendChild(li);
  });

  const T = calculateTotal();
  const left = Math.max(0, FREE_SHIP - T.net);
  $("ship").innerHTML = "";
  $("ship").append(T.net ? (left ? `Add ${money(left)} more for free shipping` : "You've unlocked free shipping") : "Free shipping on orders over $100");
  const bar = el("i"), fill = el("b"); fill.style.width = Math.min(100, (T.net / FREE_SHIP) * 100) + "%"; bar.appendChild(fill); $("ship").appendChild(bar);

  const rows = [["Subtotal", money(T.subtotal)]];
  if (T.discount) rows.push([`Coupon ${coupon}`, "−" + money(T.discount)]);
  rows.push(["Tax (8%)", money(T.tax)], ["Shipping", T.shipping ? money(T.shipping) : "Free"], ["Total", money(T.total)]);
  $("totals").innerHTML = "";
  rows.forEach(([k, v], i) => {
    const d = el("div", i === rows.length - 1 ? "grand" : ""); d.append(el("dt", "", k), el("dd", "", v)); $("totals").appendChild(d);
  });
  $("checkout").disabled = !ids.length;
}

// ---------- Drawer, coupon, checkout ----------
function openCart(open) {
  $("drawer").classList.toggle("open", open); $("scrim").hidden = !open; $("drawer").setAttribute("aria-hidden", !open);
}
$("cart-btn").onclick = () => openCart(true);
$("close").onclick = $("scrim").onclick = () => openCart(false);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") openCart(false); });

$("coupon").addEventListener("submit", (e) => {
  e.preventDefault();
  const c = $("code").value.trim().toUpperCase();
  if (COUPONS[c]) { coupon = c; toast(`Coupon ${c} applied`); } else { coupon = ""; toast("Invalid coupon code"); }
  renderCart();
});
$("checkout").onclick = () => {
  $("o-total").textContent = "Order total: " + money(calculateTotal().total);
  $("order").hidden = false; $("done").hidden = true; $("modal").showModal();
};
$("o-cancel").onclick = () => $("modal").close();
$("order").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = "KT-" + Date.now().toString(36).toUpperCase(), total = money(calculateTotal().total);
  $("done-msg").textContent = `Order ${id} for ${total} is confirmed. A receipt was sent to ${e.target.email.value}.`;
  cart = {}; coupon = ""; persist(); renderCart(); e.target.reset();
  $("order").hidden = true; $("done").hidden = false;
});
$("done-ok").onclick = () => { $("modal").close(); openCart(false); };

// ---------- Search and sort ----------
$("search").addEventListener("input", (e) => { query = e.target.value.toLowerCase(); renderGrid(); });
$("sort").addEventListener("change", (e) => { sort = e.target.value; renderGrid(); });

let tt;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => (t.hidden = true), 2200); }

// ---------- Quick view ----------
function quickView(p) {
  const b = $("qv-body"); b.innerHTML = "";
  const img = el("img"); img.src = p.image; img.alt = p.title;
  const stars = el("div", "stars", "★".repeat(Math.round(p.rating.rate)) + "☆".repeat(5 - Math.round(p.rating.rate)) + " ");
  stars.appendChild(el("small", "", `${p.rating.rate} from ${p.rating.count} reviews`));
  const close = el("button", "ghost", "Close"), add = el("button", "primary", `Add to cart · ${money(p.price)}`);
  close.onclick = () => $("qv").close(); add.onclick = () => { addToCart(p.id); $("qv").close(); };
  const row = el("div", "row"); row.append(close, add);
  b.append(img, el("span", "cat", catOf(p)), el("h2", "", p.title), stars, el("p", "muted", p.description), row);
  $("qv").showModal();
}
$("qv").addEventListener("click", (e) => { if (e.target === $("qv")) $("qv").close(); });

// ---------- Price filter, hero, theme, shortcut ----------
$("max").addEventListener("input", (e) => {
  maxPrice = +e.target.value; $("max-v").textContent = maxPrice >= 1000 ? "Any" : "$" + maxPrice; renderGrid();
});
$("hero-btn").onclick = () => {
  sort = "rating"; $("sort").value = "rating"; cat = "all"; renderAll(); $("grid").scrollIntoView({ behavior: "smooth" });
};
const setTheme = (t) => { document.documentElement.dataset.theme = t; localStorage.setItem("kart.theme", t); };
setTheme(localStorage.getItem("kart.theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
$("theme").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $("search").focus(); }
});

loadProducts();
