// js/bohr.js

window.init_bohr = function() {
    setupBohrSim('bohr');
};

window.init_ion = function() {
    setupBohrSim('ion');
};

function setupBohrSim(mode) {
    const container = document.getElementById(`${mode}-canvas-container`);
    const overlay = document.getElementById(`${mode}-overlay`);
    const controls = document.getElementById(`${mode}-controls`);
    if (!container || container.children.length > 0) return;

    // Create Canvas
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // UI Setup
    overlay.innerHTML = `
        <h3>${mode === 'bohr' ? '電子配置（ボーアモデル）' : 'イオン生成シミュレーション'}</h3>
        <div class="info-item"><span class="label">元素:</span><select id="${mode}-element"></select></div>
        <div class="info-item"><span class="label">状態:</span><span class="value" id="${mode}-status" style="color:var(--accent-primary)">原子</span></div>
    `;

    if (mode === 'ion') {
        controls.innerHTML = `
            <button class="btn" id="${mode}-btn">イオン化するのだ！</button>
            <button class="btn secondary" id="${mode}-reset">元に戻す</button>
            <button class="btn tertiary" id="${mode}-toggle">動かす</button>
        `;
    } else {
        controls.innerHTML = `
            <button class="btn tertiary" id="${mode}-toggle">動かす</button>
        `;
    }

    const sel = document.getElementById(`${mode}-element`);
    ELEMENTS.slice(0, 20).forEach(el => {
        const opt = document.createElement('option');
        opt.value = el.num;
        opt.textContent = `${el.num} ${el.symbol} (${el.name})`;
        sel.appendChild(opt);
    });

    let currentEl = ELEMENTS[0];
    let isIon = false;
    let isAnimating = false; // Default stopped
    let animProgress = 0; // 0 to 1 for ion animation

    sel.addEventListener('change', (e) => {
        currentEl = ELEMENTS.find(el => el.num == e.target.value);
        isIon = false;
        animProgress = 0;
        updateUI();
    });

    document.getElementById(`${mode}-toggle`).addEventListener('click', (e) => {
        isAnimating = !isAnimating;
        e.target.textContent = isAnimating ? '止める' : '動かす';
    });

    if (mode === 'ion') {
        document.getElementById(`${mode}-btn`).addEventListener('click', () => {
            if (!currentEl.ion || isIon) {
                document.getElementById('mascot-text').textContent = "この原子はイオンになりにくい（または既にイオン）なのだ！";
                return;
            }
            isIon = true;
            animProgress = 0; // trigger animation in loop
            document.getElementById('mascot-text').textContent = "閉殻（オクテット）になって安定したのだ！";
            updateUI();
        });
        document.getElementById(`${mode}-reset`).addEventListener('click', () => {
            isIon = false;
            animProgress = 0;
            document.getElementById('mascot-text').textContent = MASCOT_MESSAGES.ion;
            updateUI();
        });
    }

    function updateUI() {
        const statusEl = document.getElementById(`${mode}-status`);
        if (isIon) {
            let charge = currentEl.ion.replace('+', '<sup>+</sup>').replace('-', '<sup>-</sup>').replace('1', '');
            if (charge === '<sup>+</sup>' && currentEl.ion.includes('1+')) charge = '<sup>+</sup>'; 
            
            if (currentEl.ion === '+2') charge = '<sup>2+</sup>';
            if (currentEl.ion === '+3') charge = '<sup>3+</sup>';
            if (currentEl.ion === '-2') charge = '<sup>2-</sup>';
            if (currentEl.ion === '-3') charge = '<sup>3-</sup>';
            if (currentEl.ion === '+1') charge = '<sup>+</sup>';
            if (currentEl.ion === '-1') charge = '<sup>-</sup>';
            
            statusEl.innerHTML = `${currentEl.symbol}${charge} イオン`;
            statusEl.style.color = currentEl.ion.includes('+') ? 'var(--accent-secondary)' : 'var(--accent-primary)';
        } else {
            statusEl.innerHTML = `${currentEl.symbol} 原子`;
            statusEl.style.color = 'white';
        }
    }

    const staticAnglesDeg = [180, 0, 90, 270, 225, 135, 45, 315];
    const staticAngles = staticAnglesDeg.map(deg => deg * Math.PI / 180);

    let time = 0;
    function draw() {
        if (!document.getElementById(`view-${mode}`).classList.contains('active')) {
            requestAnimationFrame(draw);
            return;
        }

        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        
        if (isAnimating) {
            time += 0.02;
        }

        if (isIon && animProgress < 1) {
            animProgress += 0.02;
            if (animProgress > 1) animProgress = 1;
        } else if (!isIon && animProgress > 0) {
            animProgress -= 0.02; // reversing animation when reset
            if (animProgress < 0) animProgress = 0;
        }

        // Determine target shells
        let targetShells = [...currentEl.shells];
        let totalE = currentEl.num;
        if (currentEl.ion) {
            if (currentEl.ion.includes('+')) totalE -= parseInt(currentEl.ion.replace('+', ''));
            if (currentEl.ion.includes('-')) totalE += parseInt(currentEl.ion.replace('-', ''));
            
            targetShells = [];
            let remaining = totalE;
            const capacities = [2, 8, 18, 32];
            for (let i = 0; i < capacities.length; i++) {
                if (remaining <= 0) break;
                const count = Math.min(remaining, capacities[i]);
                targetShells.push(count);
                remaining -= count;
            }
        }

        // Draw Nucleus
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(cx-5, cy-5, 5, cx, cy, 20);
        grad.addColorStop(0, '#f87171');
        grad.addColorStop(1, '#dc2626');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`+${currentEl.num}`, cx, cy);

        // Calculate max shells to draw
        const drawnShellsCount = Math.max(currentEl.shells.length, targetShells.length);
        const activeOutermostShellIndex = (animProgress > 0.5) ? (targetShells.length - 1) : (currentEl.shells.length - 1);
        
        const shellNames = ['K', 'L', 'M', 'N'];
        const capacities = [2, 8, 18, 32];
        
        for (let s = 0; s < drawnShellsCount; s++) {
            const radius = 60 + s * 40;
            
            // Draw ring
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '12px Arial';
            ctx.fillText(shellNames[s], cx, cy - radius - 10);

            let startCount = currentEl.shells[s] || 0;
            let endCount = targetShells[s] || 0;
            
            // Draw electron slots (ghosts)
            const maxSlot = Math.max(startCount, endCount);
            for(let e = 0; e < maxSlot; e++) {
                 const angle = isAnimating ? ((Math.PI * 2 / maxSlot) * e + time) : staticAngles[e % staticAngles.length];
                 const ex = cx + Math.cos(angle) * radius;
                 const ey = cy + Math.sin(angle) * radius;
                 ctx.beginPath();
                 ctx.arc(ex, ey, 4, 0, Math.PI * 2);
                 ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                 ctx.stroke();
            }

            // Draw Electrons
            // If ionizing, interpolate position or opacity
            const isOutermost = (s === activeOutermostShellIndex);
            // Color logic: Outermost gets accent color (orange), others are blue
            const eFillGlow = isOutermost ? 'rgba(249, 115, 22, 0.4)' : 'rgba(59, 130, 246, 0.4)';
            const eFillMain = isOutermost ? '#fb923c' : '#60a5fa';
            const eStroke   = isOutermost ? '#ea580c' : '#2563eb';

            // Find how many stable electrons and how many moving electrons
            let stableCount = Math.min(startCount, endCount);
            let leavingCount = Math.max(0, startCount - endCount);
            let enteringCount = Math.max(0, endCount - startCount);

            // Draw stable
            for (let e = 0; e < stableCount; e++) {
                const angle = isAnimating ? ((Math.PI * 2 / maxSlot) * e + time) : staticAngles[e % staticAngles.length];
                const ex = cx + Math.cos(angle) * radius;
                const ey = cy + Math.sin(angle) * radius;
                drawElectron(ctx, ex, ey, eFillGlow, eFillMain, eStroke);
            }

            // Draw leaving
            for (let e = stableCount; e < stableCount + leavingCount; e++) {
                const angle = isAnimating ? ((Math.PI * 2 / maxSlot) * e + time) : staticAngles[e % staticAngles.length];
                const ex = cx + Math.cos(angle) * radius;
                const ey = cy + Math.sin(angle) * radius;
                
                // Animate outwards
                const animRad = radius + (animProgress * 500); 
                const animEx = cx + Math.cos(angle) * animRad;
                const animEy = cy + Math.sin(angle) * animRad;
                
                ctx.globalAlpha = 1 - animProgress;
                drawElectron(ctx, animEx, animEy, eFillGlow, eFillMain, eStroke);
                ctx.globalAlpha = 1.0;
            }

            // Draw entering
            for (let e = stableCount; e < stableCount + enteringCount; e++) {
                // Determine slot index for entering electrons
                const slotIndex = startCount + (e - stableCount);
                const angle = isAnimating ? ((Math.PI * 2 / maxSlot) * slotIndex + time) : staticAngles[slotIndex % staticAngles.length];
                const targetEx = cx + Math.cos(angle) * radius;
                const targetEy = cy + Math.sin(angle) * radius;
                
                // Animate inwards from outside
                const animRad = radius + ((1 - animProgress) * 500);
                const animEx = cx + Math.cos(angle) * animRad;
                const animEy = cy + Math.sin(angle) * animRad;

                ctx.globalAlpha = animProgress;
                drawElectron(ctx, animEx, animEy, eFillGlow, eFillMain, eStroke);
                ctx.globalAlpha = 1.0;
            }
        }

        requestAnimationFrame(draw);
    }
    
    function drawElectron(ctx, ex, ey, glow, main, stroke) {
        ctx.beginPath();
        ctx.arc(ex, ey, 8, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fillStyle = main;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = '8px Arial';
        ctx.fillText('-', ex, ey);
    }

    draw();
}
