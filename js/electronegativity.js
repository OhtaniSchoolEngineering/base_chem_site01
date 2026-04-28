window.init_electronegativity = function() {
    const container = document.getElementById('electronegativity-canvas-container');
    const overlay = document.getElementById('electronegativity-overlay');
    const controls = document.getElementById('electronegativity-controls');
    if (!container || container.children.length > 0) return;
    
    overlay.innerHTML = `
        <h3>電気陰性度バトル</h3>
        <p>2つの原子で電子の綱引きバトルをするのだ！</p>
        <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 10px;">
            <div class="info-item">
                <span class="label">左の原子:</span>
                <select id="en-left"></select>
            </div>
            <div style="font-weight: bold;">VS</div>
            <div class="info-item">
                <span class="label">右の原子:</span>
                <select id="en-right"></select>
            </div>
        </div>
        <div class="info-item"><span class="label">結果:</span><span class="value" id="en-result">-</span></div>
    `;
    
    controls.innerHTML = `
        <button class="btn" id="en-battle">バトル開始！</button>
        <button class="btn secondary" id="en-reset">リセット</button>
    `;

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const leftSel = document.getElementById('en-left');
    const rightSel = document.getElementById('en-right');
    
    const validElements = ELEMENTS.filter(e => e.group !== 18 && e.electronegativity !== null);
    
    validElements.forEach(el => {
        const opt1 = document.createElement('option');
        opt1.value = el.num;
        opt1.textContent = `${el.symbol} (EN: ${el.electronegativity.toFixed(1)})`;
        leftSel.appendChild(opt1);
        
        const opt2 = document.createElement('option');
        opt2.value = el.num;
        opt2.textContent = `${el.symbol} (EN: ${el.electronegativity.toFixed(1)})`;
        rightSel.appendChild(opt2);
    });

    leftSel.value = 11;  // Na
    rightSel.value = 17; // Cl

    let atomL = ELEMENTS.find(e => e.num === 11);
    let atomR = ELEMENTS.find(e => e.num === 17);
    
    let isBattling = false;
    let battleProgress = 0;

    // ── 元素種別判定 ───────────────────────────────────
    const METAL_TYPES    = ['alkali', 'alkali-earth', 'transition', 'post-transition'];
    const NONMETAL_TYPES = ['nonmetal', 'halogen'];

    function isMetal(el)    { return METAL_TYPES.includes(el.type); }
    function isNonmetal(el) { return NONMETAL_TYPES.includes(el.type); }
    function isIonicCombo(elL, elR) {
        return (isMetal(elL) && isNonmetal(elR)) || (isMetal(elR) && isNonmetal(elL));
    }

    // ── ion記号変換（+1→⁺, -2→²⁻ 等）──────────────────
    function ionSuperscript(ion) {
        if (!ion) return '';
        return ion
            .replace('+1','⁺').replace('-1','⁻')
            .replace('+2','²⁺').replace('-2','²⁻')
            .replace('+3','³⁺').replace('-3','³⁻');
    }

    function reset() {
        isBattling = false;
        battleProgress = 0;
        document.getElementById('en-result').textContent = '-';
        document.getElementById('en-battle').disabled = false;
        document.getElementById('mascot-text').textContent = MASCOT_MESSAGES.electronegativity;
    }

    leftSel.addEventListener('change', (e) => {
        atomL = ELEMENTS.find(el => el.num == e.target.value);
        reset();
    });
    rightSel.addEventListener('change', (e) => {
        atomR = ELEMENTS.find(el => el.num == e.target.value);
        reset();
    });

    document.getElementById('en-reset').addEventListener('click', reset);

    document.getElementById('en-battle').addEventListener('click', () => {
        if (isBattling) return;
        isBattling = true;
        document.getElementById('en-battle').disabled = true;
        const ionic = isIonicCombo(atomL, atomR);
        document.getElementById('mascot-text').textContent = ionic
            ? '金属が電子を手放してイオンになろうとしているのだ！'
            : '綱引き中なのだ！がんばれー！';
    });

    // ── 描画ヘルパー ──────────────────────────────────
    function drawAtomCircle(x, y, r, color, symbol, en, ionLabel) {
        // 円
        const grd = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
        grd.addColorStop(0, color + 'ff');
        grd.addColorStop(1, color + '99');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // シンボル
        ctx.fillStyle = 'white';
        ctx.font = `bold 22px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ionLabel || symbol, x, y - 6);

        // EN値
        if (en !== null) {
            ctx.font = '12px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.fillText(`EN: ${en}`, x, y + 13);
        }
    }

    // ── イオン結合描画 ─────────────────────────────────
    function drawIonic(cx, cy, leftX, rightX) {
        // 金属が左か右かを特定
        const metalIsLeft = isMetal(atomL);
        const metalEl     = metalIsLeft ? atomL : atomR;
        const nonmetalEl  = metalIsLeft ? atomR : atomL;
        const metalX      = metalIsLeft ? leftX : rightX;
        const nonmetalX   = metalIsLeft ? rightX : leftX;

        const done = isBattling && battleProgress >= 1;

        // 金属原子（陽イオン色: 赤系）
        const metalLabel = done && metalEl.ion ? metalEl.symbol + ionSuperscript(metalEl.ion) : null;
        drawAtomCircle(metalX, cy, 50, '#f87171', metalEl.symbol, metalEl.electronegativity, metalLabel);

        // 非金属原子（陰イオン色: 緑系）
        const nonmetalIon = done && nonmetalEl.ion ? nonmetalEl.symbol + ionSuperscript(nonmetalEl.ion) : null;
        drawAtomCircle(nonmetalX, cy, 50, '#34d399', nonmetalEl.symbol, nonmetalEl.electronegativity, nonmetalIon);

        // 電子（中央スタート → 非金属側へ移動）
        const startX = cx; // 中央（初期位置）
        const endX   = nonmetalX + (metalIsLeft ? -62 : 62); // 非金属の端
        const eX = startX + (endX - startX) * (isBattling ? battleProgress : 0);

        if (!done) {
            ctx.beginPath();
            ctx.arc(eX, cy, 9, 0, Math.PI * 2);
            ctx.fillStyle = '#60a5fa';
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('e⁻', eX, cy);
        } else {
            // 完了: 非金属の周囲に電子を描く（吸収済み表現）
            const ex = nonmetalX + (metalIsLeft ? -62 : 62);
            ctx.beginPath();
            ctx.arc(ex, cy, 9, 0, Math.PI * 2);
            ctx.fillStyle = '#60a5fa';
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('e⁻', ex, cy);

            // 静電引力の矢印
            const arrowY = cy - 70;
            const ax1 = metalX + (metalIsLeft ? 15 : -15);
            const ax2 = nonmetalX + (metalIsLeft ? -15 : 15);
            ctx.beginPath();
            ctx.moveTo(ax1, arrowY);
            ctx.lineTo(ax2, arrowY);
            ctx.strokeStyle = '#fde68a';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
            // 矢印先端（両向き）
            [ax1, ax2].forEach((ax, i) => {
                const dir = i === 0 ? -1 : 1;
                ctx.beginPath();
                ctx.moveTo(ax, arrowY);
                ctx.lineTo(ax + dir * 10, arrowY - 6);
                ctx.lineTo(ax + dir * 10, arrowY + 6);
                ctx.closePath();
                ctx.fillStyle = '#fde68a';
                ctx.fill();
            });
            ctx.fillStyle = '#fde68a';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('静電引力', cx, arrowY - 12);
        }
    }

    // ── 共有結合描画 ──────────────────────────────────
    function drawCovalent(cx, cy, leftX, rightX) {
        const enL = atomL.electronegativity;
        const enR = atomR.electronegativity;
        const diff = enR - enL;
        const targetOffset = (diff / 2.0) * 100;
        const clampedOffset = Math.max(-100, Math.min(100, targetOffset));

        if (isBattling && battleProgress < 1) {
            ctx.save();
            ctx.translate((Math.random()-0.5)*8, (Math.random()-0.5)*8);
        }

        const currentOffset = isBattling ? clampedOffset * battleProgress : 0;
        const eX = cx + currentOffset;

        // 原子
        drawAtomCircle(leftX,  cy, 50, '#f87171', atomL.symbol, atomL.electronegativity, null);
        drawAtomCircle(rightX, cy, 50, '#34d399', atomR.symbol, atomR.electronegativity, null);

        // 電子対（縦並び）
        ctx.beginPath();
        ctx.arc(eX, cy - 12, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#60a5fa'; ctx.fill();
        ctx.beginPath();
        ctx.arc(eX, cy + 12, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#60a5fa'; ctx.fill();
        // e⁻ ラベル
        ctx.fillStyle = 'white';
        ctx.font = '7px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('e⁻', eX, cy - 12);
        ctx.fillText('e⁻', eX, cy + 12);

        if (isBattling) ctx.restore();
    }

    // ── メイン描画ループ ───────────────────────────────
    function draw() {
        if (!document.getElementById('view-electronegativity').classList.contains('active')) {
            requestAnimationFrame(draw);
            return;
        }

        canvas.width  = container.clientWidth;
        canvas.height = container.clientHeight;
        const cx = canvas.width  / 2;
        const cy = canvas.height / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const leftX  = cx - 160;
        const rightX = cx + 160;
        const ionic  = isIonicCombo(atomL, atomR);

        if (isBattling && battleProgress < 1) {
            battleProgress += 0.018;
        }

        if (ionic) {
            drawIonic(cx, cy, leftX, rightX);
        } else {
            drawCovalent(cx, cy, leftX, rightX);
        }

        // 結果表示
        if (isBattling && battleProgress >= 1) {
            let resultText = '';
            let mascotMsg  = '';

            if (ionic) {
                const metalEl    = isMetal(atomL) ? atomL : atomR;
                const nonmetalEl = isNonmetal(atomR) ? atomR : atomL;
                resultText = `イオン結合 (${metalEl.symbol}⁺ と ${nonmetalEl.symbol}⁻ が引き合う！)`;
                mascotMsg  = `金属は電子を渡して陽イオン、非金属は受け取って陰イオンになったのだ！静電引力でくっつくのがイオン結合なのだ！`;
            } else {
                const diff = atomR.electronegativity - atomL.electronegativity;
                if (Math.abs(diff) > 0.4) {
                    const winner = diff > 0 ? atomR.symbol : atomL.symbol;
                    resultText = `極性共有結合 (電子が ${winner} に偏っている！)`;
                    mascotMsg  = `電気陰性度に差があるから、電子が ${winner} の方に偏って極性が生まれたのだ！`;
                } else {
                    resultText = '無極性共有結合 (互角！)';
                    mascotMsg  = '引き合う力がほぼ同じだから、仲良く中央で共有しているのだ！';
                }
            }

            document.getElementById('en-result').textContent = resultText;
            document.getElementById('mascot-text').textContent = mascotMsg;
        }

        requestAnimationFrame(draw);
    }
    draw();
};
