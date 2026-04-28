window.init_radiation = function() {
    const container = document.getElementById('radiation-canvas-container');
    const overlay   = document.getElementById('radiation-overlay');
    const controls  = document.getElementById('radiation-controls');
    if (!container || container.children.length > 0) return;

    overlay.innerHTML = `
        <h3>放射線シミュレーション</h3>
        <p>不安定な原子核からビーム（放射線）が出るのだ！</p>
        <div class="info-item">
            <span class="label">崩壊モード:</span>
            <select id="rad-type">
                <option value="alpha">α（アルファ）崩壊 - ウラン238</option>
                <option value="beta">β（ベータ）崩壊 - 炭素14</option>
                <option value="gamma">γ（ガンマ）崩壊 - テクネチウム99m</option>
            </select>
        </div>
    `;

    controls.innerHTML = `
        <button class="btn" id="rad-emit">崩壊スタート！</button>
        <button class="btn secondary" id="rad-reset">リセット</button>
    `;

    // 崩壊モード定義（質量数・原子番号・元素記号を分離）
    const MODES = {
        alpha: {
            startMass: '238', startZ: '92',  startSym: 'U',
            endMass:   '234', endZ:   '90',  endSym:   'Th',
            type: 'alpha',
            desc: 'ヘリウム原子核（陽子2, 中性子2）が飛び出すのだ！'
        },
        beta: {
            startMass: '14',  startZ: '6',   startSym: 'C',
            endMass:   '14',  endZ:   '7',   endSym:   'N',
            type: 'beta',
            desc: '中性子が陽子に変わり、電子が飛び出すのだ！'
        },
        gamma: {
            startMass: '99m', startZ: '43',  startSym: 'Tc',
            endMass:   '99',  endZ:   '43',  endSym:   'Tc',
            type: 'gamma',
            desc: '余分なエネルギーが電磁波として飛び出すのだ！'
        }
    };

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let currentMode = 'alpha';
    let isDecayed   = false;
    let particles   = [];
    let beams       = [];

    // 現在描画すべき核の情報
    let drawMass, drawZ, drawSym;

    function reset() {
        isDecayed = false;
        particles = [];
        beams     = [];
        const m = MODES[currentMode];
        drawMass = m.startMass;
        drawZ    = m.startZ;
        drawSym  = m.startSym;
        document.getElementById('mascot-text').textContent = MASCOT_MESSAGES.radiation;
        document.getElementById('rad-emit').disabled = false;
    }

    document.getElementById('rad-type').addEventListener('change', (e) => {
        currentMode = e.target.value;
        reset();
    });
    document.getElementById('rad-reset').addEventListener('click', reset);

    document.getElementById('rad-emit').addEventListener('click', () => {
        if (isDecayed) return;
        isDecayed = true;
        document.getElementById('rad-emit').disabled = true;
        document.getElementById('mascot-text').textContent = MODES[currentMode].desc;

        const cx = canvas.width  / 2;
        const cy = canvas.height / 2;
        const m  = MODES[currentMode];

        if (currentMode === 'alpha') {
            particles.push({ type: 'alpha', x: cx, y: cy, vx: 5, vy: -2, life: 120 });
        } else if (currentMode === 'beta') {
            particles.push({ type: 'beta',  x: cx, y: cy, vx: 8, vy: -5, life: 120 });
        } else if (currentMode === 'gamma') {
            beams.push({ radius: 40, maxRadius: 320 });
        }

        setTimeout(() => {
            drawMass = m.endMass;
            drawZ    = m.endZ;
            drawSym  = m.endSym;
        }, 500);
    });

    reset();

    // ── 核を描画するヘルパー ────────────────────────
    function drawNucleus(cx, cy) {
        const R = 44;

        // グラデーション
        const grad = ctx.createRadialGradient(cx - 12, cy - 12, 5, cx, cy, R);
        if (isDecayed && currentMode !== 'gamma') {
            grad.addColorStop(0, '#10b981');
            grad.addColorStop(1, '#059669');
        } else {
            grad.addColorStop(0, '#f87171');
            grad.addColorStop(1, '#dc2626');
        }
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // 振動（不安定時）
        if (!isDecayed) {
            const sx = (Math.random() - 0.5) * 4;
            const sy = (Math.random() - 0.5) * 4;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.beginPath();
            ctx.arc(cx, cy, R + 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(239,68,68,0.18)';
            ctx.fill();
            ctx.restore();
        }

        // ── 元素記号（中央）──
        ctx.fillStyle = 'white';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(drawSym, cx, cy + 2);

        // ── 質量数（左上）──
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#fde68a'; // 黄色系
        ctx.fillText(drawMass, cx - 4, cy - R + 6);

        // ── 原子番号（左下）──
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#93c5fd'; // 青系
        ctx.fillText(drawZ, cx - 4, cy + R - 6);
    }

    // ── アニメーションループ ─────────────────────────
    function draw() {
        if (!document.getElementById('view-radiation').classList.contains('active')) {
            requestAnimationFrame(draw);
            return;
        }

        canvas.width  = container.clientWidth;
        canvas.height = container.clientHeight;
        const cx = canvas.width  / 2;
        const cy = canvas.height / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawNucleus(cx, cy);

        // 放出粒子
        particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.type === 'alpha') {
                ctx.beginPath(); ctx.arc(p.x - 5, p.y - 5, 8, 0, Math.PI*2); ctx.fillStyle = '#ef4444'; ctx.fill();
                ctx.beginPath(); ctx.arc(p.x + 5, p.y + 5, 8, 0, Math.PI*2); ctx.fillStyle = '#ef4444'; ctx.fill();
                ctx.beginPath(); ctx.arc(p.x - 5, p.y + 5, 8, 0, Math.PI*2); ctx.fillStyle = '#9ca3af'; ctx.fill();
                ctx.beginPath(); ctx.arc(p.x + 5, p.y - 5, 8, 0, Math.PI*2); ctx.fillStyle = '#9ca3af'; ctx.fill();
                ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('α線', p.x, p.y - 22);
            } else if (p.type === 'beta') {
                ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fillStyle = '#3b82f6'; ctx.fill();
                ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('β線', p.x, p.y - 16);
            }

            if (p.life <= 0) particles.splice(i, 1);
        });

        // γ線波紋
        beams.forEach((b, i) => {
            b.radius += 5;
            ctx.beginPath();
            ctx.arc(cx, cy, b.radius, 0, Math.PI*2);
            ctx.strokeStyle = `rgba(250,204,21,${1 - b.radius / b.maxRadius})`;
            ctx.lineWidth = 10; ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, b.radius - 20, 0, Math.PI*2);
            ctx.strokeStyle = `rgba(250,204,21,${0.5 - b.radius / b.maxRadius})`;
            ctx.lineWidth = 5; ctx.stroke();
            ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('γ線', cx + b.radius - 10, cy - 10);
            if (b.radius > b.maxRadius) beams.splice(i, 1);
        });

        requestAnimationFrame(draw);
    }
    draw();
};
