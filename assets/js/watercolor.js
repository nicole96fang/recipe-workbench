/* ===================== 水彩画生成器 =====================
   用 canvas 程序化生成「水彩手绘风」食材图（非 SVG 矢量描边）。
   多层半透明晕染 + 纸张颗粒 + 边缘渗透 + 大 emoji 主体。 */
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashCode(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function hex2rgb(h) {
    h = h.replace("#", "");
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }

  /* 生成一张水彩食材图，返回 dataURL（cache 在内存 + localStorage） */
  function paint(emoji, seedKey, baseColor) {
    const cacheKey = "wc_" + hashCode(seedKey + emoji);
    try {
      const c = localStorage.getItem(cacheKey);
      if (c) return c;
    } catch (e) {}
    const W = 600, H = 600;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    const rnd = mulberry32(hashCode(seedKey + emoji));
    const rgb = hex2rgb(baseColor || "#f3ded6");

    // 纸张底（暖白带极淡晕）
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#fffdfb");
    g.addColorStop(1, "rgba(" + rgb.join(",") + ",0.10)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // 多层水彩晕染斑块
    const palette = [
      rgb,
      [Math.min(255,rgb[0]+30), Math.min(255,rgb[1]+20), Math.min(255,rgb[2]+25)],
      [Math.max(0,rgb[0]-25), Math.max(0,rgb[1]-10), Math.max(0,rgb[2]-8)],
    ];
    for (let layer = 0; layer < 26; layer++) {
      const cx = rnd() * W, cy = rnd() * H;
      const r = 40 + rnd() * 150;
      const pc = palette[Math.floor(rnd() * palette.length)];
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const a = 0.05 + rnd() * 0.10;
      rg.addColorStop(0, "rgba(" + pc.join(",") + "," + a + ")");
      rg.addColorStop(0.7, "rgba(" + pc.join(",") + "," + (a*0.5) + ")");
      rg.addColorStop(1, "rgba(" + pc.join(",") + ",0)");
      ctx.fillStyle = rg;
      // 不规则斑块
      ctx.beginPath();
      const pts = 9;
      for (let i = 0; i <= pts; i++) {
        const ang = (i / pts) * Math.PI * 2;
        const rr = r * (0.7 + rnd() * 0.5);
        const x = cx + Math.cos(ang) * rr;
        const y = cy + Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
    }

    // 中央主晕（聚焦主体）
    const rg2 = ctx.createRadialGradient(W/2, H/2, 30, W/2, H/2, 230);
    rg2.addColorStop(0, "rgba(" + rgb.join(",") + ",0.22)");
    rg2.addColorStop(1, "rgba(" + rgb.join(",") + ",0)");
    ctx.fillStyle = rg2;
    ctx.beginPath(); ctx.arc(W/2, H/2, 230, 0, Math.PI*2); ctx.fill();

    // 主体 emoji（大、带柔影，像贴上去的手绘贴纸）
    ctx.font = "300px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(120,80,100,0.18)";
    ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
    ctx.fillText(emoji, W/2, H/2 + 10);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // 纸张颗粒噪点
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rnd() - 0.5) * 16;
      d[i] += n; d[i+1] += n; d[i+2] += n;
    }
    ctx.putImageData(img, 0, 0);

    // 四周暗角，强化水彩纸感
    const vg = ctx.createRadialGradient(W/2, H/2, 200, W/2, H/2, 420);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(125,76,105,0.10)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    const url = cv.toDataURL("image/png");
    try { localStorage.setItem(cacheKey, url); } catch (e) {}
    return url;
  }

  window.WaterColor = { paint };
})();
