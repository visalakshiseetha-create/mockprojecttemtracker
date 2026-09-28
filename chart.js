/* ============================================================
   FILE: js/chart.js
   ROLE: Lightweight canvas chart rendering — a donut chart for
   spend-by-category and a bar chart for spend-by-month. Pure
   Canvas 2D API, no external charting library, so it stays
   self-contained inside the glass chart card.
   ============================================================ */

const BCChart = (() => {
  function drawDonut(canvas, slices, { thickness = 26, gapDeg = 3 } = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = canvas.clientWidth || 220;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const total = slices.reduce((s, d) => s + d.value, 0);
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - thickness / 2 - 4;

    if (total <= 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = thickness;
      ctx.stroke();
      return;
    }

    let start = -Math.PI / 2;
    const gap = (gapDeg * Math.PI) / 180;

    slices.forEach((slice) => {
      const angle = (slice.value / total) * (Math.PI * 2);
      if (angle <= 0) return;
      const end = start + Math.max(angle - gap, 0.001);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, end);
      ctx.strokeStyle = slice.color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.stroke();
      start += angle;
    });

    // Center label
    ctx.fillStyle = 'rgba(245,246,251,0.55)';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Total', cx, cy - 10);
    ctx.fillStyle = '#f5f6fb';
    ctx.font = '700 16px Poppins, sans-serif';
    ctx.fillText(
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(total),
      cx, cy + 12
    );
  }

  function drawBars(canvas, points, { color = '#a78bfa' } = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 400;
    const height = canvas.clientHeight || 200;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const max = Math.max(1, ...points.map((p) => p.value));
    const paddingBottom = 24;
    const paddingTop = 12;
    const chartHeight = height - paddingBottom - paddingTop;
    const barSlot = width / points.length;
    const barWidth = Math.min(36, barSlot * 0.5);

    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(245,246,251,0.6)';
    ctx.textAlign = 'center';

    points.forEach((p, i) => {
      const barHeight = (p.value / max) * chartHeight;
      const x = i * barSlot + barSlot / 2 - barWidth / 2;
      const y = paddingTop + (chartHeight - barHeight);

      const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(94,234,212,0.35)');

      ctx.beginPath();
      const r = 6;
      ctx.moveTo(x, y + barHeight);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.lineTo(x + barWidth - r, y);
      ctx.arcTo(x + barWidth, y, x + barWidth, y + r, r);
      ctx.lineTo(x + barWidth, y + barHeight);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.fillStyle = 'rgba(245,246,251,0.6)';
      ctx.fillText(p.label, x + barWidth / 2, height - 6);
    });
  }

  return { drawDonut, drawBars };
})();
