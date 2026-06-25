/**
 * CartShare — app.js
 * Collaborative shopping cart using localStorage + StorageEvent
 * for real-time sync across browser tabs.
 */

"use strict";

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */
const FREE_SHIPPING_THRESHOLD = 750; // ₹750

/* ═══════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════ */
const state = {
  username: "",
  roomCode: "",
  // Room data stored in localStorage under key `cartshare:<roomCode>`
};

/* ═══════════════════════════════════════════════════
   STORAGE HELPERS
═══════════════════════════════════════════════════ */
function storageKey(room) {
  return `cartshare:${room}`;
}

/** Read room data from localStorage */
function getRoomData(room) {
  try {
    const raw = localStorage.getItem(storageKey(room));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Write room data to localStorage (triggers StorageEvent in other tabs) */
function setRoomData(room, data) {
  localStorage.setItem(storageKey(room), JSON.stringify(data));
}

/** Create a blank room object */
function createRoom(code) {
  return {
    code,
    createdAt: Date.now(),
    items: [],
    members: [],
    log: [],
  };
}

/* ═══════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════ */
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatCurrency(val) {
  return "₹" + Number(val).toFixed(2);
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ═══════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════ */
function showToast(msg, type = "info") {
  const el = document.getElementById("app-toast");
  const body = document.getElementById("toast-body");
  el.className = `toast align-items-center border-0 ${type}`;
  body.textContent = msg;
  const toast = bootstrap.Toast.getOrCreateInstance(el, { delay: 2500 });
  toast.show();
}

/* ═══════════════════════════════════════════════════
   SCREEN MANAGEMENT
═══════════════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

/* ═══════════════════════════════════════════════════
   LOGIN / ROOM JOIN
═══════════════════════════════════════════════════ */
function showLoginError(msg) {
  const el = document.getElementById("login-error");
  el.textContent = msg;
  el.classList.remove("d-none");
}
function clearLoginError() {
  document.getElementById("login-error").classList.add("d-none");
}

function getUsername() {
  return document.getElementById("input-name").value.trim();
}

function handleCreateRoom() {
  clearLoginError();
  const name = getUsername();
  if (!name) { showLoginError("Please enter your name."); return; }

  const code = generateCode();
  const room = createRoom(code);
  addMember(room, name, true);
  addLogEntry(room, "join", name, `${name} created the room.`);
  setRoomData(code, room);

  enterRoom(name, code);
}

function handleJoinRoom() {
  clearLoginError();
  const name = getUsername();
  if (!name) { showLoginError("Please enter your name."); return; }

  const code = document.getElementById("input-room-code").value.trim().toUpperCase();
  if (!code) { showLoginError("Please enter a room code."); return; }

  let room = getRoomData(code);
  if (!room) { showLoginError(`Room "${code}" does not exist.`); return; }

  // Add member if not already present
  if (!room.members.find(m => m.name === name)) {
    addMember(room, name, false);
    addLogEntry(room, "join", name, `${name} joined the room.`);
    setRoomData(code, room);
  }

  enterRoom(name, code);
}

function enterRoom(name, code) {
  state.username = name;
  state.roomCode = code;

  document.getElementById("display-room-code").textContent = code;
  document.getElementById("display-username").textContent = name;

  showScreen("screen-app");
  renderAll();
}

/* ═══════════════════════════════════════════════════
   MEMBER HELPERS
═══════════════════════════════════════════════════ */
function addMember(room, name, isCreator) {
  if (!room.members.find(m => m.name === name)) {
    room.members.push({ name, isCreator, joinedAt: Date.now() });
  }
}

/* ═══════════════════════════════════════════════════
   ACTIVITY LOG
═══════════════════════════════════════════════════ */
function addLogEntry(room, type, actor, msg) {
  room.log.unshift({ id: generateId(), type, actor, msg, time: timeNow() });
  // Keep log bounded
  if (room.log.length > 100) room.log = room.log.slice(0, 100);
}

/* ═══════════════════════════════════════════════════
   CART OPERATIONS
═══════════════════════════════════════════════════ */
function handleAddItem() {
  const nameEl  = document.getElementById("input-item-name");
  const priceEl = document.getElementById("input-item-price");
  const qtyEl   = document.getElementById("input-item-qty");
  const errEl   = document.getElementById("item-error");

  errEl.classList.add("d-none");

  const name  = nameEl.value.trim();
  const price = parseFloat(priceEl.value);
  const qty   = parseInt(qtyEl.value);

  if (!name)              { showItemError("Item name is required."); return; }
  if (isNaN(price) || price < 0) { showItemError("Enter a valid price."); return; }
  if (!qty || qty < 1)   { showItemError("Quantity must be at least 1."); return; }

  const room = getRoomData(state.roomCode);
  if (!room) return;

  const item = {
    id:        generateId(),
    name,
    price,
    qty,
    addedBy:   state.username,
    addedAt:   Date.now(),
  };

  room.items.push(item);
  addLogEntry(room, "add", state.username,
    `${state.username} added <strong>${qty}× ${name}</strong> (${formatCurrency(price)} each).`);
  setRoomData(state.roomCode, room);

  nameEl.value  = "";
  priceEl.value = "";
  qtyEl.value   = "1";
  nameEl.focus();

  renderAll();
  showToast(`${name} added to cart!`, "success");
}

function handleRemoveItem(itemId) {
  const room = getRoomData(state.roomCode);
  if (!room) return;

  const item = room.items.find(i => i.id === itemId);
  if (!item) return;

  room.items = room.items.filter(i => i.id !== itemId);
  addLogEntry(room, "remove", state.username,
    `${state.username} removed <strong>${item.name}</strong>.`);
  setRoomData(state.roomCode, room);
  renderAll();
  showToast(`${item.name} removed.`, "danger");
}

function handleClearCart() {
  if (!confirm("Clear all items from the cart?")) return;
  const room = getRoomData(state.roomCode);
  if (!room) return;
  room.items = [];
  addLogEntry(room, "system", state.username, `${state.username} cleared the cart.`);
  setRoomData(state.roomCode, room);
  renderAll();
  showToast("Cart cleared.", "info");
}

function handleLeaveRoom() {
  if (!confirm("Leave this room?")) return;
  // Remove self from members list
  const room = getRoomData(state.roomCode);
  if (room) {
    room.members = room.members.filter(m => m.name !== state.username);
    addLogEntry(room, "join", state.username, `${state.username} left the room.`);
    setRoomData(state.roomCode, room);
  }
  state.username = "";
  state.roomCode = "";
  document.getElementById("input-name").value = "";
  showScreen("screen-login");
}

/* ═══════════════════════════════════════════════════
   PRINT RECEIPT
═══════════════════════════════════════════════════ */
function handlePrintReceipt() {
  const room = getRoomData(state.roomCode);
  if (!room || !room.items.length) {
    showToast("Cart is empty — nothing to print.", "danger");
    return;
  }

  // Fill receipt room code & date
  document.getElementById("receipt-room").textContent = room.code;
  document.getElementById("receipt-date").textContent = new Date().toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric"
  });

  // Build receipt table rows
  const tbody = document.getElementById("receipt-tbody");
  tbody.innerHTML = "";
  let grand = 0;
  room.items.forEach(item => {
    const sub = item.price * item.qty;
    grand += sub;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.addedBy}</td>
      <td>${item.qty}</td>
      <td>${formatCurrency(item.price)}</td>
      <td>${formatCurrency(sub)}</td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById("receipt-total").textContent = formatCurrency(grand);

  // Per-person split
  const splitMap = {};
  room.items.forEach(item => {
    const sub = item.price * item.qty;
    splitMap[item.addedBy] = (splitMap[item.addedBy] || 0) + sub;
  });
  const splitEl = document.getElementById("receipt-split");
  splitEl.innerHTML = Object.entries(splitMap).map(([name, amt]) => `
    <div class="split-row">
      <span>${name}</span>
      <span>${formatCurrency(amt)}</span>
    </div>
  `).join("");

  window.print();
}

/* ═══════════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════════ */
function renderAll() {
  const room = getRoomData(state.roomCode);
  if (!room) return;

  renderCart(room);
  renderMembers(room);
  renderLog(room);
  renderThreshold(room);
}

function renderCart(room) {
  const tbody    = document.getElementById("cart-tbody");
  const table    = document.getElementById("cart-table");
  const empty    = document.getElementById("cart-empty");
  const totalEl  = document.getElementById("cart-total");
  const countEl  = document.getElementById("cart-count");

  tbody.innerHTML = "";

  if (!room.items.length) {
    table.classList.add("d-none");
    empty.style.display = "";
    totalEl.textContent = "₹0.00";
    countEl.textContent = "0 items";
    return;
  }

  table.classList.remove("d-none");
  empty.style.display = "none";

  let total = 0;
  room.items.forEach(item => {
    const sub = item.price * item.qty;
    total += sub;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="item-name">${escapeHtml(item.name)}</td>
      <td><span class="added-by">${escapeHtml(item.addedBy)}</span></td>
      <td class="text-center">${item.qty}</td>
      <td class="text-end">${formatCurrency(item.price)}</td>
      <td class="text-end fw-500">${formatCurrency(sub)}</td>
      <td class="text-end">
        <button class="btn-remove-item" data-id="${item.id}" title="Remove item">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Wire remove buttons
  tbody.querySelectorAll(".btn-remove-item").forEach(btn => {
    btn.addEventListener("click", () => handleRemoveItem(btn.dataset.id));
  });

  totalEl.textContent = formatCurrency(total);
  const count = room.items.reduce((a, i) => a + i.qty, 0);
  countEl.textContent = `${count} item${count !== 1 ? "s" : ""}`;
}

function renderMembers(room) {
  const el = document.getElementById("members-list");
  el.innerHTML = "";
  room.members.forEach(m => {
    const chip = document.createElement("div");
    chip.className = `member-chip${m.name === state.username ? " me" : ""}`;
    chip.innerHTML = `
      <span class="member-dot"></span>
      ${escapeHtml(m.name)}${m.isCreator ? " 👑" : ""}${m.name === state.username ? " (you)" : ""}
    `;
    el.appendChild(chip);
  });
}

function renderLog(room) {
  const el = document.getElementById("activity-log");
  if (!room.log.length) {
    el.innerHTML = `<div class="log-empty">No activity yet.</div>`;
    return;
  }
  el.innerHTML = room.log.map(entry => {
    const iconMap = {
      add:    { icon: "fa-plus",  cls: "add" },
      remove: { icon: "fa-minus", cls: "remove" },
      join:   { icon: "fa-user",  cls: "join" },
      system: { icon: "fa-info",  cls: "system" },
    };
    const { icon, cls } = iconMap[entry.type] || iconMap.system;
    return `
      <div class="log-entry">
        <span class="log-icon ${cls}"><i class="fa-solid ${icon}"></i></span>
        <span class="log-msg">${entry.msg}</span>
        <span class="log-time">${entry.time}</span>
      </div>
    `;
  }).join("");
}

function renderThreshold(room) {
  const total = room.items.reduce((a, i) => a + i.price * i.qty, 0);
  const pct   = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const bar   = document.getElementById("threshold-progress");
  const status = document.getElementById("threshold-status");

  bar.style.width = pct + "%";

  if (total >= FREE_SHIPPING_THRESHOLD) {
    bar.classList.remove("bg-warning");
    bar.classList.add("bg-success");
    status.textContent = "🎉 Free shipping unlocked!";
    status.className = "threshold-status done";
  } else {
    const rem = FREE_SHIPPING_THRESHOLD - total;
    bar.classList.remove("bg-success");
    if (pct >= 60) {
      bar.classList.add("bg-warning");
      status.className = "threshold-status near";
    } else {
      bar.classList.remove("bg-warning");
      status.className = "threshold-status";
    }
    status.textContent = `₹${rem.toFixed(2)} away from free shipping`;
  }
}

/* ═══════════════════════════════════════════════════
   XSS PROTECTION
═══════════════════════════════════════════════════ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showItemError(msg) {
  const el = document.getElementById("item-error");
  el.textContent = msg;
  el.classList.remove("d-none");
}

/* ═══════════════════════════════════════════════════
   COPY ROOM CODE
═══════════════════════════════════════════════════ */
function handleCopyCode() {
  navigator.clipboard.writeText(state.roomCode).then(() => {
    showToast(`Room code ${state.roomCode} copied!`, "info");
  }).catch(() => {
    showToast(`Room code: ${state.roomCode}`, "info");
  });
}

/* ═══════════════════════════════════════════════════
   REAL-TIME SYNC via StorageEvent
   StorageEvent fires in ALL OTHER tabs (not the one that wrote).
   This gives us cross-tab collaboration.
═══════════════════════════════════════════════════ */
window.addEventListener("storage", (e) => {
  if (!state.roomCode) return;
  if (e.key !== storageKey(state.roomCode)) return;
  // Another tab updated our room data — re-render
  renderAll();
});

/* ═══════════════════════════════════════════════════
   INIT & EVENT WIRING
═══════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {

  // Login screen
  document.getElementById("btn-create-room").addEventListener("click", handleCreateRoom);
  document.getElementById("btn-join-room").addEventListener("click", handleJoinRoom);

  document.getElementById("input-room-code").addEventListener("keydown", e => {
    if (e.key === "Enter") handleJoinRoom();
  });
  document.getElementById("input-name").addEventListener("keydown", e => {
    if (e.key === "Enter") handleCreateRoom();
  });

  // App screen
  document.getElementById("btn-add-item").addEventListener("click", handleAddItem);
  document.getElementById("btn-clear-cart").addEventListener("click", handleClearCart);
  document.getElementById("btn-print-receipt").addEventListener("click", handlePrintReceipt);
  document.getElementById("btn-leave-room").addEventListener("click", handleLeaveRoom);
  document.getElementById("btn-copy-code").addEventListener("click", handleCopyCode);
  document.getElementById("btn-clear-log").addEventListener("click", () => {
    const room = getRoomData(state.roomCode);
    if (!room) return;
    room.log = [];
    setRoomData(state.roomCode, room);
    renderLog(room);
  });

  // Allow Enter to add item
  ["input-item-name", "input-item-price", "input-item-qty"].forEach(id => {
    document.getElementById(id).addEventListener("keydown", e => {
      if (e.key === "Enter") handleAddItem();
    });
  });

  // Clear item error on typing
  document.getElementById("input-item-name").addEventListener("input", () => {
    document.getElementById("item-error").classList.add("d-none");
  });

  showScreen("screen-login");
});