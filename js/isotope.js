window.init_isotope = function() {
    const container = document.getElementById('isotope-canvas-container');
    const overlay   = document.getElementById('isotope-overlay');
    if (!container || container.children.length > 0) return;

    const ISOTOPES = {
        1: [
            { name: "軽水素 (¹H)",   n: 0,  p: 1,  desc: "普通の水素。宇宙で一番多い！",           radioactive: false },
            { name: "重水素 (²H)",   n: 1,  p: 1,  desc: "中性子が1個増えて重くなった水素！",       radioactive: false },
            { name: "三重水素 (³H)", n: 2,  p: 1,  desc: "放射線を出す不安定な水素なのだ！",        radioactive: true  }
        ],
        6: [
            { name: "炭素12 (¹²C)", n: 6,  p: 6,  desc: "普通の炭素。生き物の基本なのだ！",        radioactive: false },
            { name: "炭素13 (¹³C)", n: 7,  p: 6,  desc: "ちょっとだけ重い炭素。約1%存在する。",    radioactive: false },
            { name: "炭素14 (¹⁴C)", n: 8,  p: 6,  desc: "年代測定に使われる放射性同位体なのだ！", radioactive: true  }
        ],
        17: [
            { name: "塩素35 (³⁵Cl)", n: 18, p: 17, desc: "自然界に約75%存在する塩素なのだ！",      radioactive: false },
            { name: "塩素37 (³⁷Cl)", n: 20, p: 17, desc: "自然界に約25%存在する重い塩素なのだ！",  radioactive: false }
        ]
    };

    // ── オーバーレイUI ──────────────────────────────
    overlay.innerHTML = `
        <h3>同位体比較</h3>
        <p>中性子の数だけが違うクローンを比べるのだ！</p>
        <div class="info-item">
            <span class="label">元素:</span>
            <select id="iso-element">
                <option value="1">水素 (H)</option>
                <option value="6">炭素 (C)</option>
                <option value="17">塩素 (Cl)</option>
            </select>
        </div>
        <div style="display:flex;gap:14px;margin-top:8px;flex-wrap:wrap;">
            <div class="info-item">
                <span class="label" style="color:#60a5fa;">左:</span>
                <select id="iso-left"></select>
            </div>
            <div class="info-item">
                <span class="label" style="color:#f87171;">右:</span>
                <select id="iso-right"></select>
            </div>
        </div>
    `;

    // ── レイアウト構築 ──────────────────────────────
    container.style.cssText += ';display:flex;flex-direction:column;position:relative;';

    // 上段: キャンバス2つ並び
    const viewersWrap = document.createElement('div');
    viewersWrap.style.cssText = 'display:flex;flex:1;min-height:0;';
    container.appendChild(viewersWrap);

    const canvasL = document.createElement('canvas');
    canvasL.style.cssText = 'flex:1;display:block;';
    const sep = document.createElement('div');
    sep.style.cssText = 'width:1px;background:rgba(255,255,255,0.15);';
    const canvasR = document.createElement('canvas');
    canvasR.style.cssText = 'flex:1;display:block;';
    viewersWrap.appendChild(canvasL);
    viewersWrap.appendChild(sep);
    viewersWrap.appendChild(canvasR);

    // 下段: 粒子数インフォバー（キャンバスに重ねて絶対配置）
    const infoBar = document.createElement('div');
    infoBar.style.cssText = 'position:absolute;bottom:0;left:0;right:0;display:flex;height:100px;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);z-index:5;border-top:1px solid rgba(255,255,255,0.12);';
    container.appendChild(infoBar);

    const infoL = document.createElement('div');
    infoL.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:white;font-size:0.82em;padding:6px;border-right:1px solid rgba(255,255,255,0.12);';
    const infoR = document.createElement('div');
    infoR.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:white;font-size:0.82em;padding:6px;';
    infoBar.appendChild(infoL);
    infoBar.appendChild(infoR);

    const ctxL = canvasL.getContext('2d');
    const ctxR = canvasR.getContext('2d');

    let currentNum    = 1;
    let currentIndexL = 0;
    let currentIndexR = 1;
    let particlesL = [], particlesR = [];
    let angleOffset = 0;

    // ── 選択肢を更新 ────────────────────────────────
    function updateOptions() {
        const leftSel  = document.getElementById('iso-left');
        const rightSel = document.getElementById('iso-right');
        leftSel.innerHTML = '';
        rightSel.innerHTML = '';
        ISOTOPES[currentNum].forEach((iso, idx) => {
            const oL = document.createElement('option'); oL.value = idx; oL.textContent = iso.name; leftSel.appendChild(oL);
            const oR = document.createElement('option'); oR.value = idx; oR.textContent = iso.name; rightSel.appendChild(oR);
        });
        leftSel.value  = 0;
        currentIndexL  = 0;
        rightSel.value = Math.min(1, ISOTOPES[currentNum].length - 1);
        currentIndexR  = Math.min(1, ISOTOPES[currentNum].length - 1);

        leftSel.addEventListener('change', (e) => {
            currentIndexL = parseInt(e.target.value);
            particlesL = makeParticles(ISOTOPES[currentNum][currentIndexL]);
            updateInfoBar();
        });
        rightSel.addEventListener('change', (e) => {
            currentIndexR = parseInt(e.target.value);
            particlesR = makeParticles(ISOTOPES[currentNum][currentIndexR]);
            updateInfoBar();
        });

        particlesL = makeParticles(ISOTOPES[currentNum][currentIndexL]);
        particlesR = makeParticles(ISOTOPES[currentNum][currentIndexR]);
        updateInfoBar();
    }

    function makeParticles(iso) {
        const arr = [];
        const r = Math.min(28, (iso.p + iso.n) * 2);
        for (let i = 0; i < iso.p; i++) arr.push({ type:'p', x:(Math.random()-.5)*r, y:(Math.random()-.5)*r, tx:(Math.random()-.5)*r, ty:(Math.random()-.5)*r, color:'#ef4444' });
        for (let i = 0; i < iso.n; i++) arr.push({ type:'n', x:(Math.random()-.5)*r, y:(Math.random()-.5)*r, tx:(Math.random()-.5)*r, ty:(Math.random()-.5)*r, color:'#9ca3af' });
        return arr;
    }

    function updateInfoBar() {
        const iL = ISOTOPES[currentNum][currentIndexL];
        const iR = ISOTOPES[currentNum][currentIndexR];
        infoL.innerHTML =
            `<b style="font-size:1.05em;">${iL.name}</b>` +
            `<div style="display:flex;gap:12px;">` +
            `<span>🔴 陽子: <b style="color:#ef4444;">${iL.p}</b></span>` +
            `<span>⚪ 中性子: <b style="color:#9ca3af;">${iL.n}</b></span>` +
            `<span>🔵 電子: <b style="color:#60a5fa;">${iL.p}</b></span>` +
            `</div>` +
            `<span style="color:${iL.radioactive?'#ef4444':'#4ade80'};font-size:0.9em;">${iL.desc}</span>`;
        infoR.innerHTML =
            `<b style="font-size:1.05em;">${iR.name}</b>` +
            `<div style="display:flex;gap:12px;">` +
            `<span>🔴 陽子: <b style="color:#ef4444;">${iR.p}</b></span>` +
            `<span>⚪ 中性子: <b style="color:#9ca3af;">${iR.n}</b></span>` +
            `<span>🔵 電子: <b style="color:#60a5fa;">${iR.p}</b></span>` +
            `</div>` +
            `<span style="color:${iR.radioactive?'#ef4444':'#4ade80'};font-size:0.9em;">${iR.desc}</span>`;
    }

    document.getElementById('iso-element').addEventListener('change', (e) => {
        currentNum = parseInt(e.target.value);
        updateOptions();
    });

    updateOptions();

    // ── 1つの原子を描画 ──────────────────────────────
    function drawAtom(canvas, ctx, particles, iso, elData) {
        canvas.width  = canvas.parentElement.clientWidth / 2 - 1;
        canvas.height = canvas.parentElement.clientHeight;
        const cx = canvas.width  / 2;
        const cy = canvas.height / 2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 電子軌道（ボーアモデル）
        if (elData) {
            for (let s = 0; s < elData.shells.length; s++) {
                const rShell = Math.min(cx, cy) * 0.35 + s * Math.min(cx, cy) * 0.22;
                ctx.beginPath();
                ctx.arc(cx, cy, rShell, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,255,255,0.18)';
                ctx.lineWidth = 1;
                ctx.stroke();

                const eCount = elData.shells[s];
                for (let e = 0; e < eCount; e++) {
                    const ang = angleOffset * (1 - s * 0.2) + (Math.PI * 2 / eCount) * e;
                    const ex = cx + Math.cos(ang) * rShell;
                    const ey = cy + Math.sin(ang) * rShell;
                    ctx.beginPath();
                    ctx.arc(ex, ey, 5, 0, Math.PI * 2);
                    ctx.fillStyle = '#60a5fa';
                    ctx.fill();
                }
            }
        }

        // 核パルス（放射性）
        const coreR = Math.min(28, (iso.p + iso.n) * 2) + 10;
        if (iso.radioactive) {
            const pulse = Math.abs(Math.sin(Date.now() / 200)) * 18;
            ctx.beginPath();
            ctx.arc(cx, cy, coreR + pulse, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(239,68,68,${0.28 - pulse / 65})`;
            ctx.fill();
        }

        // 核本体
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();

        // 粒子
        particles.forEach(p => {
            p.x += (p.tx - p.x) * 0.05;
            p.y += (p.ty - p.y) * 0.05;
            if (Math.hypot(p.tx - p.x, p.ty - p.y) < 1) {
                p.tx = (Math.random() - 0.5) * (coreR - 5);
                p.ty = (Math.random() - 0.5) * (coreR - 5);
            }
            ctx.beginPath();
            ctx.arc(cx + p.x, cy + p.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.stroke();
            ctx.fillStyle = 'white';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.type === 'p' ? '+' : '', cx + p.x, cy + p.y);
        });

        // タイトル
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(iso.name, cx, 18);
    }

    // ── アニメーションループ ─────────────────────────
    function draw() {
        if (!document.getElementById('view-isotope').classList.contains('active')) {
            requestAnimationFrame(draw);
            return;
        }
        angleOffset += 0.012;
        const elData = ELEMENTS.find(e => e.num === currentNum);
        drawAtom(canvasL, ctxL, particlesL, ISOTOPES[currentNum][currentIndexL], elData);
        drawAtom(canvasR, ctxR, particlesR, ISOTOPES[currentNum][currentIndexR], elData);
        requestAnimationFrame(draw);
    }
    draw();
};
