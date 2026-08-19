/* ===================== 主应用 ===================== */
(function () {
  "use strict";
  const { CATEGORIES, KNOWLEDGE, PET_STAGES } = window.APP_DATA;

  /* ---------- 存储 ---------- */
  const STORE_KEY = "fangbao_recipe_app_v1";
  let state = load();
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.recipes) return s;
    } catch (e) {}
    return { recipes: {}, coins: 0, petXp: 0, lastTip: "", knowPhotos: {} };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) {
      if (e && e.name === "QuotaExceededError") {
        toast("⚠️ 本机空间已满，旧数据仍在，但刚改的可能没存。建议点☁云同步腾出空间～");
      }
    }
    scheduleCloudAuto();
  }

  /* ---------- GitHub 云端永久存储（防本地丢失） ---------- */
  const CLOUD = {
    owner: "nicole96fang",
    repo: "recipe-workbench",
    branch: "main",
    dataPath: "data/backup.json",
    photoDir: "data/photos"
  };
  const TOKEN_KEY = "fangbao_cloud_token";
  const AUTO_KEY = "fangbao_cloud_auto";
  function getToken() { return (localStorage.getItem(TOKEN_KEY) || "").trim(); }
  function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }
  function getAuto() { return localStorage.getItem(AUTO_KEY) === "1"; }
  function setAuto(v) { localStorage.setItem(AUTO_KEY, v ? "1" : "0"); }

  function b64EncodeUtf8(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64DecodeUtf8(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }
  // 把整个 state（含照片）逐食谱照片存入独立文件，文本存 backup.json
  async function putContent(path, content, sha, depth) {
    depth = depth || 0;
    const url = `https://api.github.com/repos/${CLOUD.owner}/${CLOUD.repo}/contents/${path}`;
    const body = { message: "🍯 芳宝食谱云备份", content: b64EncodeUtf8(content), branch: CLOUD.branch };
    if (sha) body.sha = sha;
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: "Bearer " + getToken(), "Content-Type": "application/json", "Accept": "application/vnd.github+json" },
      body: JSON.stringify(body)
    });
    if (res.status === 409 && depth < 2) {
      const fresh = await getSha(path);
      return putContent(path, content, fresh, depth + 1);
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.message || ("HTTP " + res.status));
    }
    return (await res.json()).content.sha;
  }
  async function getSha(path) {
    const url = `https://api.github.com/repos/${CLOUD.owner}/${CLOUD.repo}/contents/${path}?ref=${CLOUD.branch}`;
    const res = await fetch(url, { headers: { Authorization: "Bearer " + getToken(), "Accept": "application/vnd.github+json" } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("HTTP " + res.status);
    return (await res.json()).sha;
  }
  // 经 API 实时读取（避免 raw CDN 缓存延迟）
  async function getContent(path) {
    const url = `https://api.github.com/repos/${CLOUD.owner}/${CLOUD.repo}/contents/${path}?ref=${CLOUD.branch}`;
    const res = await fetch(url, { headers: { Authorization: "Bearer " + getToken(), "Accept": "application/vnd.github+json" } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("HTTP " + res.status);
    const j = await res.json();
    return b64DecodeUtf8(j.content);
  }

  let _cloudBusy = Promise.resolve();
  async function saveToCloud() {
    const token = getToken();
    if (!token) { toast("请先在 ☁ 云同步 里填入 GitHub Token"); openCloud(); return; }
    // 串行化，避免并发写导致冲突
    _cloudBusy = _cloudBusy.then(() => _doSaveCloud(), () => {});
    return _cloudBusy;
  }
  async function _doSaveCloud() {
    toast("☁ 正在保存到云端…");
    // 1) 照片单独存
    const photoTasks = [];
    for (const cid in state.recipes) {
      for (const r of state.recipes[cid]) {
        if (r.photo) photoTasks.push((async () => {
          const p = `${CLOUD.photoDir}/${r.id}.txt`;
          let sha = null; try { sha = await getSha(p); } catch (e) {}
          await putContent(p, r.photo, sha);
        })());
      }
    }
    await Promise.all(photoTasks);
    // 2) 文本数据（去掉大照片，仅存引用标记）
    const textState = JSON.parse(JSON.stringify(state));
    for (const cid in textState.recipes) for (const r of textState.recipes[cid]) {
      r.photo = r.photo ? ("__cloud__:" + r.id) : "";
    }
    let sha = null; try { sha = await getSha(CLOUD.dataPath); } catch (e) {}
    await putContent(CLOUD.dataPath, JSON.stringify(textState, null, 2), sha);
    // 更新自动同步计时器基准
    toast("✅ 已永久保存到 GitHub 云端");
  }

  // 经 raw 读取（公开只读，无需 token，跨设备/清缓存均可恢复）
  async function fetchRaw(path, tries) {
    tries = tries || 4;
    for (let i = 0; i < tries; i++) {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/${CLOUD.owner}/${CLOUD.repo}/${CLOUD.branch}/${path}`, { cache: "no-store" });
        if (res.ok) return await res.text();
      } catch (e) {}
      if (i < tries - 1) await new Promise(r => setTimeout(r, 1200 * (i + 1)));
    }
    return null;
  }
  async function loadFromCloud(force) {
    try {
      const txt = await fetchRaw(CLOUD.dataPath);
      if (!txt) return false;
      const data = JSON.parse(txt);
      if (!data || !data.recipes) return false;
      // 还原照片引用
      for (const cid in data.recipes) for (const r of data.recipes[cid]) {
        if (typeof r.photo === "string" && r.photo.startsWith("__cloud__:")) {
          const id = r.photo.split(":")[1];
          try {
            const pt = await fetchRaw(`${CLOUD.photoDir}/${id}.txt`);
            if (pt) r.photo = pt;
          } catch (e) { r.photo = ""; }
        }
      }
      if (force || !state.recipes || Object.keys(state.recipes).length === 0) {
        state = Object.assign({ recipes: {}, coins: 0, petXp: 0, lastTip: "", knowPhotos: {} }, data);
        save();
      }
      return true;
    } catch (e) { return false; }
  }

  let _autoTimer = null;
  function scheduleCloudAuto() {
    if (!getAuto() || !getToken()) return;
    clearTimeout(_autoTimer);
    _autoTimer = setTimeout(() => { saveToCloud().catch(() => {}); }, 2500);
  }

  /* ---------- 工具 ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), 1600);
  }
  function esc(s) { return (s || "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }

  /* 读取图片：先压缩（防爆配额），如浏览器无法解码（HEIC 等）则原样保存，绝不丢失 */
  function compressImage(file, maxW, quality) {
    maxW = maxW || 1100; quality = quality || 0.76;
    return new Promise((resolve) => {
      const rd = new FileReader();
      rd.onerror = () => resolve(null);
      rd.onload = () => {
        const img = new Image();
        img.onerror = () => resolve(rd.result); // fallback 原图 dataURL
        img.onload = () => {
          try {
            let { width: w, height: h } = img;
            if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
            const cv = document.createElement("canvas");
            cv.width = w; cv.height = h;
            cv.getContext("2d").drawImage(img, 0, 0, w, h);
            const isPng = (file.type === "image/png") || (file.type === "image/webp");
            resolve(cv.toDataURL(isPng ? "image/png" : "image/jpeg", quality));
          } catch (e) { resolve(rd.result); }
        };
        img.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  }

  /* ---------- 积分 / 宠物 ---------- */
  function addCoins(n) { state.coins += n; state.petXp += n; updatePet(); save(); }
  function petInfo() {
    let cur = PET_STAGES[0];
    for (const s of PET_STAGES) if (state.petXp >= s.min) cur = s;
    const next = PET_STAGES.find(s => s.min > cur.min);
    let pct = 100;
    if (next) pct = Math.round(((state.petXp - cur.min) / (next.min - cur.min)) * 100);
    return { ...cur, pct, next };
  }
  function updatePet() {
    const p = petInfo();
    $("#coin-count").textContent = state.coins;
    $("#pet-emoji").textContent = p.emoji;
    $("#pet-avatar").textContent = p.emoji;
    $("#pet-level").textContent = "Lv." + (PET_STAGES.indexOf(p) + 1);
    $("#pet-stage").textContent = p.stage;
    $("#pet-bar-fill").style.width = p.pct + "%";
    $("#pet-tip").textContent = p.next
      ? `再攒 ${p.next.min - state.petXp} 积分，小厨神进化成「${p.next.stage}」`
      : "已封神！你是真正的厨神芳宝 👑";
  }

  /* ---------- 视图切换 ---------- */
  const views = { home: "#view-home", cat: "#view-cat", recipe: "#view-recipe", knowledge: "#view-knowledge" };
  let curCat = null, curRecipe = null;
  function showView(name) {
    Object.values(views).forEach(v => $(v).classList.remove("active"));
    $(views[name]).classList.add("active");
    window.scrollTo(0, 0);
  }

  /* ---------- 侧边栏 ---------- */
  $("#menu-btn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $$(".nav-item").forEach(it =>
    it.addEventListener("click", () => {
      $$(".nav-item").forEach(n => n.classList.remove("active"));
      it.classList.add("active");
      $("#sidebar").classList.remove("open");
      const v = it.dataset.view;
      if (v === "knowledge") renderKnowledge(), showView("knowledge");
      else showView("home");
    })
  );

  /* ---------- 首页：13 分类卡片 ---------- */
  function renderHome() {
    const grid = $("#cat-grid");
    grid.innerHTML = "";
    CATEGORIES.forEach(c => {
      const n = state.recipes[c.id] ? state.recipes[c.id].length : 0;
      const card = document.createElement("div");
      card.className = "cat-card";
      card.style.background = `linear-gradient(160deg,#fff,${c.tint})`;
      card.innerHTML = `
        ${n ? `<span class="cat-badge">${n}</span>` : ""}
        <span class="cat-emoji">${c.emoji}</span>
        <div class="cat-name">${c.name}</div>`;
      card.addEventListener("click", () => openCat(c.id));
      grid.appendChild(card);
    });
  }

  /* ---------- 分类页 ---------- */
  function openCat(id) {
    curCat = id;
    const c = CATEGORIES.find(x => x.id === id);
    $("#cat-emoji").textContent = c.emoji;
    $("#cat-title").textContent = c.name;
    renderRecipeList();
    showView("cat");
  }
  function renderRecipeList() {
    const c = CATEGORIES.find(x => x.id === curCat);
    const list = state.recipes[curCat] || [];
    $("#cat-count").textContent = list.length + " 个食谱";
    const box = $("#recipe-list");
    box.innerHTML = "";
    $("#recipe-empty").style.display = list.length ? "none" : "block";
    list.forEach(r => {
      const item = document.createElement("div");
      item.className = "recipe-item";
      const thumb = r.photo
        ? `<img class="recipe-thumb" src="${r.photo}" alt="">`
        : `<div class="recipe-thumb empty">${c.emoji}</div>`;
      item.innerHTML = `${thumb}
        <div class="recipe-meta">
          <h4>${esc(r.name)}</h4>
          <p>${esc(r.desc || "点开看看做法吧～")}</p>
        </div>
        <div class="recipe-go">›</div>`;
      item.addEventListener("click", () => openRecipe(r.id));
      box.appendChild(item);
    });
    renderHome();
  }

  /* ---------- 新增食谱弹层 ---------- */
  let editingId = null;
  $("#add-recipe-btn").addEventListener("click", () => openModal(null));
  $("#modal-cancel").addEventListener("click", closeModal);
  $("#recipe-modal").addEventListener("click", e => { if (e.target.id === "recipe-modal") closeModal(); });
  function openModal(id) {
    editingId = id;
    $("#modal-title").textContent = id ? "编辑食谱名字" : "加入新食谱";
    $("#f-name").value = id ? (state.recipes[curCat].find(r=>r.id===id)||{}).name || "" : "";
    $("#f-desc").value = id ? (state.recipes[curCat].find(r=>r.id===id)||{}).desc || "" : "";
    $("#recipe-modal").hidden = false;
    setTimeout(() => $("#f-name").focus(), 50);
  }
  function closeModal() { $("#recipe-modal").hidden = true; editingId = null; }
  $("#modal-save").addEventListener("click", () => {
    const name = $("#f-name").value.trim();
    if (!name) { toast("给食谱起个名字吧 🍯"); return; }
    const desc = $("#f-desc").value.trim();
    if (!state.recipes[curCat]) state.recipes[curCat] = [];
    if (editingId) {
      const r = state.recipes[curCat].find(x => x.id === editingId);
      r.name = name; r.desc = desc;
    } else {
      state.recipes[curCat].unshift({
        id: uid(), name, desc,
        photo: "", ingredients: [""], steps: [""], created: Date.now()
      });
      addCoins(5); toast("+5 积分 🎉 新食谱已加入");
    }
    save(); closeModal(); renderRecipeList();
  });

  /* ---------- 食谱详情 ---------- */
  function openRecipe(id) {
    curRecipe = id;
    renderRecipe();
    showView("recipe");
  }
  function getRecipe() {
    return (state.recipes[curCat] || []).find(r => r.id === curRecipe);
  }
  let editMode = false;
  function renderRecipe() {
    const r = getRecipe();
    if (!r) return;
    const c = CATEGORIES.find(x => x.id === curCat);
    const sheet = $("#recipe-sheet");
    const photo = r.photo
      ? `<img class="rs-photo" src="${r.photo}" alt="成品图">`
      : `<div class="rs-photo empty">${c.emoji}</div>`;

    let ings = (r.ingredients || []).map((g, i) =>
      `<li>${esc(g || "—")}</li>`).join("") || `<li>还没有写材料哦</li>`;
    let steps = (r.steps || []).map((s, i) =>
      `<div class="rs-step"><div class="rs-step-num">${i + 1}</div><div class="rs-step-text">${esc(s || "")}</div></div>`
    ).join("") || `<div class="rs-step-text">还没有写步骤，点下面的按钮加上吧～</div>`;

    const editBtn = '<button class="big-btn ghost rs-edit-toggle" id="edit-recipe-btn" style="margin-bottom:14px">✏️ 编辑材料 / 步骤 / 照片</button>';
    sheet.innerHTML = `
      <h2 class="rs-title">${esc(r.name)}</h2>
      ${r.desc ? `<p class="rs-desc">${esc(r.desc)}</p>` : ""}
      <div class="rs-photo-wrap">${photo}</div>
      ${editBtn}
      ${editMode ? editControls(r) : ""}
      <div class="rs-section-title">材料</div>
      <ul class="rs-ingredients">${ings}</ul>
      <div class="rs-section-title">步骤</div>
      <div class="rs-steps">${steps}</div>
    `;
    $("#edit-recipe-btn").addEventListener("click", () => { editMode = !editMode; renderRecipe(); });
    bindRecipeEdit(r);
  }

  function editControls(r) {
    const ings = (r.ingredients || []).map((g, i) =>
      `<div class="row-inline"><input data-ing="${i}" value="${esc(g)}" placeholder="材料 ${i+1}"><button class="rs-edit-btn" data-del-ing="${i}">✕</button></div>`
    ).join("");
    const steps = (r.steps || []).map((s, i) =>
      `<div class="row-inline"><input data-step="${i}" value="${esc(s)}" placeholder="步骤 ${i+1}"><button class="rs-edit-btn" data-del-step="${i}">✕</button></div>`
    ).join("");
    return `
      <div class="rs-edit-row">
        <button class="rs-edit-btn" id="pick-photo">📷 选择 / 拍张成品照</button>
        <input type="file" id="photo-file" accept="image/*" hidden>
        <button class="rs-edit-btn" id="add-ing">＋ 加一行材料</button>
        <button class="rs-edit-btn" id="add-step">＋ 加一步骤</button>
      </div>
      <div class="rs-edit-row" id="ing-box">${ings}</div>
      <div class="rs-edit-row" id="step-box">${steps}</div>
      <div class="rs-edit-row"><button class="big-btn" id="save-recipe-edit">💾 保存修改</button></div>`;
  }

  function bindRecipeEdit(r) {
    if (!editMode) return;
    $("#pick-photo").addEventListener("click", () => $("#photo-file").click());
    $("#photo-file").addEventListener("change", e => {
      const f = e.target.files[0]; if (!f) return;
      compressImage(f).then(dataUrl => {
        if (!dataUrl) { toast("照片读取失败，请换张试试"); return; }
        r.photo = dataUrl; save();
        $(".rs-photo-wrap").innerHTML = `<img class="rs-photo" src="${r.photo}" alt="">`;
        toast("📸 照片已存入本机" + (getToken() ? "，并已同步云端" : "（想永久不丢请点☁云同步）"));
      });
    });
    $("#add-ing").addEventListener("click", () => { r.ingredients.push(""); save(); renderRecipe(); });
    $("#add-step").addEventListener("click", () => { r.steps.push(""); save(); renderRecipe(); });
    $$("[data-ing]").forEach(inp => inp.addEventListener("input", e => {
      r.ingredients[+e.target.dataset.ing] = e.target.value; save();
    }));
    $$("[data-step]").forEach(inp => inp.addEventListener("input", e => {
      r.steps[+e.target.dataset.step] = e.target.value; save();
    }));
    $$("[data-del-ing]").forEach(b => b.addEventListener("click", () => {
      r.ingredients.splice(+b.dataset.delIng, 1); save(); renderRecipe();
    }));
    $$("[data-del-step]").forEach(b => b.addEventListener("click", () => {
      r.steps.splice(+b.dataset.delStep, 1); save(); renderRecipe();
    }));
    $("#save-recipe-edit").addEventListener("click", () => {
      editMode = false; save(); renderRecipe(); toast("已保存 ✅");
    });
  }

  // 详情页操作：编辑 / 打印 / 删除
  $("#print-btn").addEventListener("click", () => window.print());
  $("#del-recipe-btn").addEventListener("click", () => {
    if (!confirm("确定删除这个食谱吗？删除后无法恢复。")) return;
    state.recipes[curCat] = state.recipes[curCat].filter(x => x.id !== curRecipe);
    save(); renderRecipeList(); showView("cat"); toast("已删除");
  });

  // 返回按钮
  $("#cat-back").addEventListener("click", () => showView("home"));
  $("#recipe-back").addEventListener("click", () => { editMode = false; openCat(curCat); });
  $("#know-back").addEventListener("click", () => showView("home"));

  /* ---------- 知识页 ---------- */
  function renderKnowledge() {
    const tabs = $$(".know-tab");
    if (!tabs.length) {
      const groups = [...new Set(KNOWLEDGE.map(k => k.group))];
      const tabBox = $("#know-tabs");
      tabBox.innerHTML = "";
      groups.forEach((g, i) => {
        const t = document.createElement("button");
        t.className = "know-tab" + (i === 0 ? " active" : "");
        t.textContent = g; t.dataset.group = g;
        t.addEventListener("click", () => {
          $$(".know-tab").forEach(x => x.classList.remove("active"));
          t.classList.add("active"); renderKnowCards(g);
        });
        tabBox.appendChild(t);
      });
    }
    renderKnowCards($(".know-tab.active")?.dataset.group || KNOWLEDGE[0].group);
  }
  function renderKnowCards(group) {
    const body = $("#know-body");
    body.innerHTML = "";
    KNOWLEDGE.filter(k => k.group === group).forEach(k => {
      const photo = state.knowPhotos[k.name];
      const imgHtml = photo
        ? `<img class="know-card-img" src="${photo}" alt="${k.name}照片">`
        : `<div class="know-card-img empty" data-name="${k.name}">
             <div class="know-upload">
               <div class="know-emoji">${k.emoji}</div>
               <button class="rs-edit-btn know-up-btn" data-name="${k.name}">📷 上传照片</button>
             </div>
           </div>`;
      const card = document.createElement("div");
      card.className = "know-card";
      card.innerHTML = `
        ${imgHtml}
        <div class="know-card-body">
          <span class="know-card-tag">${k.group}</span>
          <h3>${k.emoji} ${k.name}</h3>
          <p><b>用法：</b>${k.use}</p>
          <div class="health"><b>💚 健康小知识：</b>${k.health}</div>
          ${photo ? `<button class="rs-edit-btn know-change" data-name="${k.name}">🔄 更换 / 删除照片</button>` : ""}
        </div>`;
      body.appendChild(card);
    });
    bindKnowUpload(group);
  }
  function bindKnowUpload(group) {
    const hidden = $("#know-file-hidden");
    if (!hidden) {
      const inp = document.createElement("input");
      inp.type = "file"; inp.id = "know-file-hidden";
      inp.accept = "image/*"; inp.hidden = true;
      document.body.appendChild(inp);
      inp.addEventListener("change", e => {
        const f = e.target.files[0]; if (!f) return;
        const name = inp.dataset.name;
        compressImage(f).then(dataUrl => {
          if (!dataUrl) { toast("照片读取失败，请换张试试"); return; }
          state.knowPhotos[name] = dataUrl; save();
          toast("📸 照片已存入本机" + (getToken() ? "，并已同步云端" : "（想永久不丢请点☁云同步）"));
          renderKnowCards(group);
        });
      });
    }
    $$(".know-up-btn, .know-change").forEach(b =>
      b.addEventListener("click", () => {
        const name = b.dataset.name;
        if (b.classList.contains("know-change")) {
          const act = confirm("点「确定」更换照片，点「取消」删除当前照片。");
          if (!act) {
            delete state.knowPhotos[name]; save(); renderKnowCards(group);
            toast("已删除照片"); return;
          }
        }
        const hf = $("#know-file-hidden");
        hf.dataset.name = name; hf.value = ""; hf.click();
      })
    );
  }

  /* ---------- 雪花飘落 ---------- */
  function snow() {
    const cv = $("#snow-canvas");
    const ctx = cv.getContext("2d");
    let w, h, flakes;
    function resize() {
      w = cv.width = innerWidth; h = cv.height = innerHeight;
      const n = Math.min(80, Math.round(w / 10));
      flakes = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 2 + Math.random() * 4.5,
        s: 0.3 + Math.random() * 1.0,
        d: Math.random() * Math.PI * 2,
        drift: 0.5 + Math.random() * 0.9,
        a: 0.5 + Math.random() * 0.4
      }));
    }
    resize(); addEventListener("resize", resize);
    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.s; f.d += 0.012;
        f.x += Math.sin(f.d) * f.drift;
        if (f.y > h + 8) { f.y = -10; f.x = Math.random() * w; }
        if (f.x > w + 8) f.x = -8;
        if (f.x < -8) f.x = w + 8;
        // 柔光晕
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 3);
        g.addColorStop(0, "rgba(255,255,255," + f.a + ")");
        g.addColorStop(0.4, "rgba(255,255,255," + (f.a * 0.5) + ")");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 3, 0, Math.PI * 2);
        ctx.fill();
        // 实心核
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255," + Math.min(1, f.a + 0.2) + ")";
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ---------- 云同步设置弹层 ---------- */
  function openCloud() { $("#cloud-modal").hidden = false; refreshCloudUI(); }
  function closeCloud() { $("#cloud-modal").hidden = true; }
  function updateCloudState() {
    const el = $("#cloud-state"); if (!el) return;
    const ok = !!getToken();
    el.classList.toggle("ok", ok);
    el.title = ok ? (getAuto() ? "已开启云端自动同步 ✅" : "已连接云端 ✅（建议开自动同步）") : "未连云端 ❌（刷新/换设备可能丢失，点此设置）";
  }
  function refreshCloudUI() {
    $("#cloud-token").value = getToken();
    $("#cloud-auto").checked = getAuto();
    $("#cloud-status").textContent = getToken()
      ? "已连接 · 账号 " + CLOUD.owner
      : "未连接：填入你的 GitHub Token 后即可永久保存到云端";
    $("#cloud-hint").textContent = getAuto()
      ? "自动同步：开（每次改动后自动备份）"
      : "自动同步：关（请手动点「保存到云端」）";
    updateCloudState();
  }
  $("#cloud-btn").addEventListener("click", () => { $("#sidebar").classList.remove("open"); openCloud(); });
  $("#cloud-state").addEventListener("click", openCloud);
  $("#cloud-cancel").addEventListener("click", closeCloud);
  $("#cloud-modal").addEventListener("click", e => { if (e.target.id === "cloud-modal") closeCloud(); });
  $("#cloud-auto").addEventListener("change", e => setAuto(e.target.checked));
  $("#cloud-save-cloud").addEventListener("click", () => {
    setToken($("#cloud-token").value.trim());
    refreshCloudUI();
    saveToCloud().catch(e => toast("保存失败：" + e.message));
  });
  $("#cloud-restore").addEventListener("click", () => {
    if (!getToken()) { toast("请先填入 Token"); return; }
    loadFromCloud(true).then(ok => {
      toast(ok ? "✅ 已从云端恢复" : "云端没有可恢复的数据");
      if (ok) { renderHome(); updatePet(); }
    });
  });

  /* ---------- 启动 ---------- */
  renderHome();
  updatePet();
  updateCloudState();
  showView("home");
  snow();
  // 本地为空时自动从云端恢复（跨设备/清缓存不丢）
  if (!state.recipes || Object.keys(state.recipes).length === 0) {
    loadFromCloud(false).then(ok => { if (ok) { renderHome(); updatePet(); updateCloudState(); } });
  }
})();
