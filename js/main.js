import { SECTIONS_COUNT } from "./config.js";
import * as api from "./api.js";
import * as store from "./storage.js";

const PHONE_RE = /^01[0-9]{9}$/;
const $ = (id) => document.getElementById(id);
const state = { current: null, wanted: [] };

const waLink = (phone) => `https://wa.me/${phone.replace(/^0/, "20")}`;

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

/* ---------- form ---------- */
function chip(n, { on, disabled, onClick }) {
  return el("button", {
    type: "button", textContent: n, disabled,
    className: "chip" + (on ? " on" : ""), onclick: onClick,
  });
}

function renderChips() {
  const cur = $("curChips"), want = $("wantChips");
  cur.replaceChildren();
  want.replaceChildren();
  for (let n = 1; n <= SECTIONS_COUNT; n++) {
    cur.append(chip(n, {
      on: state.current === n,
      onClick: () => {
        state.current = n;
        state.wanted = state.wanted.filter((x) => x !== n);
        renderChips();
      },
    }));
    want.append(chip(n, {
      on: state.wanted.includes(n),
      disabled: state.current === n,
      onClick: () => {
        state.wanted = state.wanted.includes(n)
          ? state.wanted.filter((x) => x !== n)
          : [...state.wanted, n];
        renderChips();
      },
    }));
  }
}

function validate(name, phone) {
  if (name.length < 2) return "اكتب اسمك";
  if (!PHONE_RE.test(phone)) return "رقم الواتساب لازم يكون 11 رقم ويبدأ بـ 01";
  if (!state.current) return "اختار سكشنك الحالي";
  if (!state.wanted.length) return "اختار سكشن واحد على الأقل تروحله";
  return "";
}

async function onSubmit() {
  const name = $("name").value.trim();
  const phone = $("phone").value.trim();
  const message = validate(name, phone);
  $("err").textContent = message;
  if (message) return;

  const btn = $("save");
  btn.disabled = true;
  btn.textContent = "جاري الحفظ...";
  try {
    const { id, owner_token } = await api.createRequest({
      name, phone, current: state.current, wanted: state.wanted,
    });
    store.saveMine({ id, token: owner_token, name, current: state.current, wanted: state.wanted });
    await showResult();
  } catch (e) {
    $("err").textContent = "حصلت مشكلة في الحفظ، جرب تاني.";
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.textContent = "ابحث عن مبادلة";
  }
}

/* ---------- result ---------- */
function matchCard(m, mine) {
  return el("div", { className: "match" },
    el("div", {}, el("b", { textContent: m.name }),
      ` في سكشن ${m.current_section} وعايز سكشن ${mine.current}`),
    el("a", { href: waLink(m.phone), target: "_blank", rel: "noopener", textContent: "كلمه واتساب" }),
  );
}

async function showResult() {
  const mine = store.loadMine();
  const card = $("resultCard");
  $("formCard").hidden = Boolean(mine);
  card.hidden = !mine;
  if (!mine) return;

  card.replaceChildren(el("p", { className: "muted", textContent: "جاري البحث..." }));
  let matches = [];
  try {
    matches = await api.getMatches(mine.id, mine.token);
  } catch (e) {
    console.error(e);
  }

  const del = el("button", { className: "ghost", textContent: "تم التبديل / احذف طلبي", onclick: onDelete });
  card.replaceChildren(
    el("div", { className: "row" },
      el("div", {},
        el("div", { className: "big", textContent: `سكشن ${mine.current} ← ${mine.wanted.join(" أو ")}` }),
        el("div", { className: "muted", textContent: mine.name })),
      del),
    matches.length
      ? el("div", {}, el("p", {}, el("b", { textContent: `لقينا ${matches.length} شخص يناسبك:` })),
          ...matches.map((m) => matchCard(m, mine)))
      : el("p", { className: "muted", textContent: "لسه مفيش حد يناسبك. طلبك محفوظ، ارجع بعدين." }),
  );
}

async function onDelete() {
  const mine = store.loadMine();
  try {
    await api.deleteRequest(mine.id, mine.token);
  } catch (e) {
    console.error(e);
  }
  store.clearMine();
  Object.assign(state, { current: null, wanted: [] });
  renderChips();
  showResult();
}

/* ---------- boot ---------- */
$("save").addEventListener("click", onSubmit);
renderChips();
showResult();
