window.init_size = function() {
    const container = document.getElementById('size-canvas-container');
    const overlay   = document.getElementById('size-overlay');
    const controls  = document.getElementById('size-controls');
    if (!container || container.children.length > 0) return;

    overlay.innerHTML = `
        <h3>原子の大きさ比較</h3>
        <p>周期表の左下ほど大きく、右上ほど小さいのだ！ただし希ガス（18族）は同じ周期で最大なのだ！イオンになると劇的に変わるのだ！</p>
        <div style="display:flex;gap:20px;align-items:center;margin-bottom:10px;">
            <div class="info-item">
                <span class="label">左の原子:</span>
                <select id="size-left"></select>
            </div>
            <div class="info-item">
                <span class="label">右の原子:</span>
                <select id="size-right"></select>
            </div>
        </div>
        <div class="info-item"><span class="label">状態:</span>
            <select id="size-state">
                <option value="atom">中性原子（そのまま）</option>
                <option value="ion">イオン状態</option>
            </select>
        </div>
    `;

    controls.innerHTML = `
        <button class="btn tertiary" id="size-bohr-btn">🔍 輪切り（ボーアモデル）</button>
    `;

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const leftSel  = document.getElementById('size-left');
    const rightSel = document.getElementById('size-right');
    const stateSel = document.getElementById('size-state');

    ELEMENTS.forEach(el => {
        const o1 = document.createElement('option'); o1.value = el.num; o1.textContent = `${el.symbol} (${el.name})`; leftSel.appendChild(o1);
        const o2 = document.createElement('option'); o2.value = el.num; o2.textContent = `${el.symbol} (${el.name})`; rightSel.appendChild(o2);
    });

    leftSel.value  = 11; // Na
    rightSel.value = 17; // Cl

    let atomL = ELEMENTS.find(e => e.num === 11);
    let atomR = ELEMENTS.find(e => e.num === 17);
    let isIon = false;
    let showBohr = false;

    let targetIonScaleL = 1.0, currentIonScaleL = 1.0;
    let targetIonScaleR = 1.0, currentIonScaleR = 1.0;

    function update() {
        atomL = ELEMENTS.find(el => el.num == leftSel.value);
        atomR = ELEMENTS.find(el => el.num == rightSel.value);
        isIon = stateSel.value === 'ion';
        targetIonScaleL = isIon ? getIonScale(atomL) : 1.0;
        targetIonScaleR = isIon ? getIonScale(atomR) : 1.0;
        const msg = isIon
            ? '陽イオンは電子殻が減ってすごく小さく、陰イオンは電子の反発で膨らんで大きくなるのだ！'
            : '同じ周期なら右側ほど小さくなるのだ！ただし希ガス（18族）はファンデルワールス半径なので同じ周期で最大になるのだ！';
        document.getElementById('mascot-text').textContent = msg;
    }

    function getBaseRadius(el) {
        // 希ガス（18族）はファンデルワールス半径のため同一周期内で最大
        if (el.group === 18) return 20 + el.period * 25;
        return 20 + el.period * 25 - el.group * 1.5;
    }

    function getIonScale(el) {
        if (!el.ion) return 1.0;
        if (el.ion.includes('+')) return 0.55;
        if (el.ion.includes('-')) return 1.4;
        return 1.0;
    }

    // イオン状態の殻配置を計算する
    function getIonShells(el) {
        if (!isIon || !el.ion) return el.shells;
        const charge = parseInt(el.ion); // 例: +1, -2, +3
        let shells = el.shells.map(n => n); // deep copy
        if (charge > 0) {
            // 陽イオン: 外側の殻から電子を取り除く
            let toRemove = charge;
            while (toRemove > 0 && shells.length > 0) {
                const last = shells.length - 1;
                if (shells[last] <= toRemove) {
                    toRemove -= shells[last];
                    shells.pop(); // 殻ごと消す
                } else {
                    shells[last] -= toRemove;
                    toRemove = 0;
                }
            }
        } else if (charge < 0) {
            // 陰イオン: 最外殻に電子を加える
            shells[shells.length - 1] += Math.abs(charge);
        }
        return shells;
    }

    function ionLabel(el) {
        if (!isIon || !el.ion) return el.symbol;
        return el.symbol + el.ion
            .replace('+1','⁺').replace('-1','⁻')
            .replace('+2','²⁺').replace('-2','²⁻')
            .replace('+3','³⁺').replace('-3','³⁻');
    }

    leftSel.addEventListener('change', update);
    rightSel.addEventListener('change', update);
    stateSel.addEventListener('change', update);
    update();

    // 輪切りボタン
    const bohrBtn = document.getElementById('size-bohr-btn');
    bohrBtn.addEventListener('click', () => {
        showBohr = !showBohr;
        bohrBtn.textContent = showBohr ? '🌐 原子サイズ比較に戻る' : '🔍 輪切り（ボーアモデル）';
        bohrBtn.classList.toggle('btn', !showBohr);
        bohrBtn.classList.toggle('btn', showBohr);
    });

    // ── ボーアモデル描画 ─────────────────────────────
    function drawBohrModel(el, centerX, centerY, maxR, label, hue, shells) {
        shells = shells || el.shells; // イオン殻配置 or 中性殻配置
        const shellNames = ['K', 'L', 'M', 'N'];
        const nShells    = shells.length;
        const shellStep  = maxR / (nShells + 1);

        // 殻と電子
        for (let s = 0; s < nShells; s++) {
            const r = shellStep * (s + 1);
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${hue},70%,65%,0.35)`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 殻名
            ctx.fillStyle = `hsla(${hue},70%,80%,0.7)`;
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(shellNames[s], centerX, centerY - r - 5);

            // 電子（イオン殻配置を使用）
            const eCount = shells[s];
            for (let e = 0; e < eCount; e++) {
                const ang = (Math.PI * 2 / eCount) * e - Math.PI / 2;
                const ex  = centerX + Math.cos(ang) * r;
                const ey  = centerY + Math.sin(ang) * r;
                ctx.beginPath();
                ctx.arc(ex, ey, 5, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${hue},80%,65%)`;
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = '7px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('−', ex, ey);
            }
        }

        // 核
        const nR = Math.max(18, shellStep * 0.5);
        const grd = ctx.createRadialGradient(centerX - nR * .3, centerY - nR * .3, nR * .1, centerX, centerY, nR);
        grd.addColorStop(0, `hsl(${hue},80%,65%)`);
        grd.addColorStop(1, `hsl(${hue},60%,35%)`);
        ctx.beginPath();
        ctx.arc(centerX, centerY, nR, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (nR > 22) {
            // 2行表示: 上に元素記号、下に「原子番号+」
            ctx.font = `bold 11px Arial`;
            ctx.fillText(label, centerX, centerY - 6);
            ctx.font = `bold 10px Arial`;
            ctx.fillStyle = 'rgba(255,255,180,0.95)';
            ctx.fillText(`${el.num}+`, centerX, centerY + 7);
        } else {
            // 核が小さい場合は原子番号+のみ
            ctx.font = `bold 9px Arial`;
            ctx.fillText(`${el.num}+`, centerX, centerY);
        }
    }

    // ── メインドロー ─────────────────────────────────
    function draw() {
        if (!document.getElementById('view-size').classList.contains('active')) {
            requestAnimationFrame(draw);
            return;
        }

        canvas.width  = container.clientWidth;
        canvas.height = container.clientHeight;
        const cx = canvas.width  / 2;
        const cy = canvas.height / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (showBohr) {
            // ── ボーアモデル表示（サイズ比較あり）─────
            // 実際の相対半径を取得（イオンスケール込み）
            currentIonScaleL += (targetIonScaleL - currentIonScaleL) * 0.1;
            currentIonScaleR += (targetIonScaleR - currentIonScaleR) * 0.1;
            const rL_real = getBaseRadius(atomL) * currentIonScaleL;
            const rR_real = getBaseRadius(atomR) * currentIonScaleR;
            const maxReal = Math.max(rL_real, rR_real);

            // 描画可能な最大半径（カニ・吹き出し分の余白を広く確保）
            const panelW   = canvas.width  / 2 - 50;
            const panelH   = canvas.height - 190; // 下部に十分な余白
            const maxDrawR = Math.min(panelW * 0.42, panelH * 0.42);

            // 相対比でスケール
            const bohrRL = maxDrawR * (rL_real / maxReal);
            const bohrRR = maxDrawR * (rR_real / maxReal);

            // 中心（右パネルは少し内側に寄せてカニと重ならないように）
            const leftCX  = cx * 0.52;
            const rightCX = cx * 1.40;

            // 分割線
            ctx.beginPath();
            ctx.moveTo(cx, 10);
            ctx.lineTo(cx, canvas.height - 10);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();

            drawBohrModel(atomL, leftCX,  cy, bohrRL, ionLabel(atomL), 210, getIonShells(atomL));
            drawBohrModel(atomR, rightCX, cy, bohrRR, ionLabel(atomR), 0,   getIonShells(atomR));

            // タイトル（名前＋相対サイズ）
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(`${atomL.name}`, leftCX,  22);
            ctx.fillText(`${atomR.name}`, rightCX, 22);

            // 相対サイズ表示
            ctx.font = '12px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fillText(`相対半径 ${rL_real.toFixed(0)}`, leftCX,  canvas.height - 48);
            ctx.fillText(`相対半径 ${rR_real.toFixed(0)}`, rightCX, canvas.height - 48);

            // 大小比較テキスト
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            if (rL_real > rR_real) {
                ctx.fillStyle = '#60a5fa';
                ctx.fillText(`${ionLabel(atomL)}  ＞  ${ionLabel(atomR)}`, cx, canvas.height - 18);
            } else if (rL_real < rR_real) {
                ctx.fillStyle = '#f87171';
                ctx.fillText(`${ionLabel(atomL)}  ＜  ${ionLabel(atomR)}`, cx, canvas.height - 18);
            } else {
                ctx.fillStyle = '#e2e8f0';
                ctx.fillText(`${ionLabel(atomL)}  ＝  ${ionLabel(atomR)}`, cx, canvas.height - 18);
            }

        } else {
            // ── サイズ比較表示 ──────────────────────
            currentIonScaleL += (targetIonScaleL - currentIonScaleL) * 0.1;
            currentIonScaleR += (targetIonScaleR - currentIonScaleR) * 0.1;

            const leftX  = cx - 155;
            const rightX = cx + 155;

            // 左の原子
            const rL = getBaseRadius(atomL) * currentIonScaleL;
            const gL = ctx.createRadialGradient(leftX - rL * .3, cy - rL * .3, rL * .1, leftX, cy, rL);
            gL.addColorStop(0, '#60a5fa'); gL.addColorStop(1, '#2563eb');
            ctx.beginPath(); ctx.arc(leftX, cy, rL, 0, Math.PI * 2);
            ctx.fillStyle = gL; ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = 'white'; ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(ionLabel(atomL), leftX, cy);

            // 右の原子
            const rR = getBaseRadius(atomR) * currentIonScaleR;
            const gR = ctx.createRadialGradient(rightX - rR * .3, cy - rR * .3, rR * .1, rightX, cy, rR);
            gR.addColorStop(0, '#f87171'); gR.addColorStop(1, '#dc2626');
            ctx.beginPath(); ctx.arc(rightX, cy, rR, 0, Math.PI * 2);
            ctx.fillStyle = gR; ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = 'white'; ctx.font = 'bold 22px Arial';
            ctx.textBaseline = 'middle';
            ctx.fillText(ionLabel(atomR), rightX, cy);

            // 比較テキスト（＞／＜で明確に）
            ctx.textBaseline = 'alphabetic';
            ctx.font = 'bold 26px Arial';
            ctx.textAlign = 'center';
            if (rL > rR) {
                ctx.fillStyle = '#60a5fa';
                ctx.fillText(`${ionLabel(atomL)}  ＞  ${ionLabel(atomR)}`, cx, cy + Math.max(rL, rR) + 40);
            } else {
                ctx.fillStyle = '#f87171';
                ctx.fillText(`${ionLabel(atomL)}  ＜  ${ionLabel(atomR)}`, cx, cy + Math.max(rL, rR) + 40);
            }

            // 半径の数値
            ctx.font = '13px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fillText(`相対半径 ${rL.toFixed(0)}`, leftX, cy + rL + 18);
            ctx.fillText(`相対半径 ${rR.toFixed(0)}`, rightX, cy + rR + 18);
        }

        requestAnimationFrame(draw);
    }
    draw();
};
