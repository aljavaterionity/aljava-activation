/* ALJAVA TERIONITY — Dashboard Revenue Chart UI layer */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);

  const STYLE_ID = 'aljava-revenue-chart-premium-style';
  const TOOLTIP_ID = 'aljava-revenue-chart-tooltip';

  const injectStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #chart.chart{position:relative;height:310px;align-items:flex-end;gap:10px;padding:18px 14px 12px;background:#fbfdff;border:1px solid #edf2f7;border-radius:16px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9);overflow:visible}
      #chart.chart:before{content:"";position:absolute;inset:18px 14px 42px;pointer-events:none;background:repeating-linear-gradient(to bottom,rgba(148,163,184,.13) 0,rgba(148,163,184,.13) 1px,transparent 1px,transparent 25%);border-radius:10px}
      #chart .bar{position:relative;z-index:1;gap:8px;min-width:0}
      #chart .bar i{width:58%;max-width:46px;min-height:5px;border-radius:9px 9px 3px 3px;background:#3b82f6;box-shadow:0 6px 14px rgba(37,99,235,.14);transition:transform .18s ease,filter .18s ease,box-shadow .18s ease;cursor:pointer}
      #chart .bar:hover i{transform:translateY(-3px);filter:brightness(.92);box-shadow:0 10px 20px rgba(37,99,235,.24)}
      #chart .bar span{font-size:10px;font-weight:600;color:#64748b;line-height:1}
      #chart .bar:hover span{color:#1e40af}
      #${TOOLTIP_ID}{position:fixed;z-index:9999;pointer-events:none;display:none;min-width:150px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#0f172a;box-shadow:0 12px 28px rgba(15,23,42,.14);font:12px Inter,Poppins,Arial,sans-serif}
      #${TOOLTIP_ID} strong{display:block;font-size:11px;color:#475569;margin-bottom:4px}
      #${TOOLTIP_ID} span{font-size:13px;font-weight:800;color:#2563eb}
      #chart[data-empty="true"]:after{content:"Belum ada data revenue\\A Belum ada transaksi pada periode yang dipilih.";white-space:pre;position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);text-align:center;line-height:1.6;color:#64748b;font-size:12px;font-weight:600;pointer-events:none;background:rgba(255,255,255,.9);padding:10px 16px;border-radius:10px}
      #dashboardView .panel:has(#chart) .head{background:#fff;border-bottom:1px solid #eef2f7}
      #dashboardView .panel:has(#chart) .head h2{font-size:18px;font-weight:800;color:#0f2740;letter-spacing:-.2px}
      #dashboardView .panel:has(#chart) .head .muted{color:#64748b}
      #dashboardView .panel:has(#chart) .filter .field{border-color:#e2e8f0;background:#fff;border-radius:10px;box-shadow:0 2px 7px rgba(15,23,42,.03);transition:border-color .15s ease,box-shadow .15s ease}
      #dashboardView .panel:has(#chart) .filter .field:hover{border-color:#bfdbfe}
      #dashboardView .panel:has(#chart) .filter .field:focus{outline:none;border-color:#60a5fa;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
      #dashboardView .panel:has(#chart) #chartTotal{color:#64748b;font-size:11px;font-weight:700}
      @media(max-width:650px){#chart.chart{height:230px;gap:5px;padding:12px 7px 10px}#chart.chart:before{inset:12px 7px 36px}#chart .bar i{width:70%;max-width:34px}#chart .bar span{font-size:9px}}
    `;
    document.head.appendChild(style);
  };

  const getTooltip = () => {
    let tip = document.getElementById(TOOLTIP_ID);
    if (!tip) {
      tip = document.createElement('div');
      tip.id = TOOLTIP_ID;
      document.body.appendChild(tip);
    }
    return tip;
  };

  const refreshChartUi = () => {
    const chart = document.getElementById('chart');
    if (!chart) return;
    injectStyle();
    const bars = [...chart.querySelectorAll('.bar')];
    const allZero = bars.length > 0 && bars.every((bar) => parseFloat(bar.querySelector('i')?.style.height || '0') <= 5);
    chart.dataset.empty = allZero ? 'true' : 'false';
    bars.forEach((bar) => {
      if (bar.dataset.revenueTooltipBound === '1') return;
      const barEl = bar.querySelector('i');
      if (!barEl) return;
      bar.dataset.revenueTooltipBound = '1';
      const raw = bar.getAttribute('title') || '';
      const split = raw.indexOf(':');
      const month = split >= 0 ? raw.slice(0, split).trim() : bar.querySelector('span')?.textContent?.trim() || '';
      const revenue = split >= 0 ? raw.slice(split + 1).trim() : '';
      bar.removeAttribute('title');
      bar.addEventListener('mouseenter', () => {
        const tip = getTooltip();
        tip.innerHTML = `<strong>${month}</strong><span>Revenue: ${revenue || 'Rp 0'}</span>`;
        tip.style.display = 'block';
      });
      bar.addEventListener('mousemove', (event) => {
        const tip = getTooltip();
        tip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - tip.offsetWidth - 10)}px`;
        tip.style.top = `${Math.max(event.clientY - tip.offsetHeight - 12, 10)}px`;
      });
      bar.addEventListener('mouseleave', () => { getTooltip().style.display = 'none'; });
    });
  };

  const start = () => {
    injectStyle();
    refreshChartUi();
    document.addEventListener('aljava:data-loaded', refreshChartUi);
    $('year')?.addEventListener('change', refreshChartUi);
    $('month')?.addEventListener('change', refreshChartUi);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
