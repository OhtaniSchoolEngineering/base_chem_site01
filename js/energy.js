// js/energy.js

window.init_ionization = function() {
    const container = document.getElementById('ionization-canvas-container');
    const overlay = document.getElementById('ionization-overlay');
    if (!container || container.children.length > 0) return;

    overlay.innerHTML = `
        <h3>イオン化エネルギー</h3>
        <p>一番外側の電子をマウスでドラッグして引きはがすのだ！</p>
        <div class="info-item"><span class="label">元素:</span><select id="ie-element"></select></div>
        <div class="info-item"><span class="label">引っ張る力:</span><span class="value" id="ie-force">0</span></div>
    `;

    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const sel = document.getElementById('ie-element');
    sel.innerHTML = '';
    ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg'].forEach(sym => {
        const el = ELEMENTS.find(e => e.symbol === sym);
        if (el) {
            const opt = document.createElement('option');
            opt.value = el.num;
            opt.textContent = el.symbol;
            sel.appendChild(opt);
        }
    });

    let currentEl = ELEMENTS.find(e => e.symbol === 'H');
    let eX, eY, mX, mY, isDragging = false, isTorn = false;
    let cx = canvas.width / 2;
    let cy = canvas.height / 2;
    
    // Determine outer shell index and count
    let outerShellIndex = currentEl.shells.length - 1;
    // Make atom smaller!
    let outerOrbitRadius = 30 + outerShellIndex * 25;
    
    function reset() {
        outerShellIndex = currentEl.shells.length - 1;
        outerOrbitRadius = 30 + outerShellIndex * 25;
        
        // Place electron at 180 degrees (left side) to match staticAngles[0]
        eX = cx - outerOrbitRadius;
        eY = cy;
        mX = eX;
        mY = eY;
        isDragging = false;
        isTorn = false;
        document.getElementById('ie-force').textContent = '0';
        document.getElementById('mascot-text').textContent = MASCOT_MESSAGES.ionization;
    }
    reset();

    sel.addEventListener('change', (e) => {
        currentEl = ELEMENTS.find(el => el.num == e.target.value);
        reset();
    });

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        if (Math.hypot(mx - eX, my - eY) < 30 && !isTorn) {
            isDragging = true;
            mX = mx;
            mY = my;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        if (isDragging) {
            mX = e.clientX - rect.left;
            mY = e.clientY - rect.top;
        }
    });

    canvas.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            if (!isTorn) reset(); // snap back
        }
    });

    function drawElectron(ctx, ex, ey, isTarget) {
        const glow = isTarget ? 'rgba(249, 115, 22, 0.4)' : 'rgba(59, 130, 246, 0.4)';
        const main = isTarget ? '#fb923c' : '#60a5fa';
        const stroke = isTarget ? '#ea580c' : '#2563eb';
        
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
    }

    function draw() {
        if (!document.getElementById(`view-ionization`).classList.contains('active')) {
            requestAnimationFrame(draw);
            return;
        }
        
        // Update canvas size dynamically in case it wasn't visible when created
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        cx = canvas.width / 2;
        cy = canvas.height / 2;
        
        // Re-align default position if not dragging or torn (handles resize/init issues)
        if (!isDragging && !isTorn) {
            eX = cx - outerOrbitRadius;
            eY = cy;
            mX = eX;
            mY = eY;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Physics Logic based on IE
        // Electronegativity: Li=0.98, F=3.98, Ne=~4.5 (null in data but we assume high)
        let en = currentEl.electronegativity || (currentEl.group === 18 ? 4.5 : 2.0);
        
        // followRatio: 1.0 means it follows mouse perfectly. 0.2 means it moves 20% of mouse distance.
        const followRatio = Math.max(0.2, 1.0 - (en * 0.15)); 
        
        // Stretch limit before it breaks
        const maxStretch = 50 * en; 
        
        if (isDragging && !isTorn) {
            const dx = mX - cx;
            const dy = mY - cy;
            const distToMouse = Math.hypot(dx, dy);
            
            if (distToMouse > outerOrbitRadius) {
                // Determine stretch amount based on drag distance and follow ratio
                let mouseStretch = distToMouse - outerOrbitRadius;
                let actualStretch = mouseStretch * followRatio;
                
                const angle = Math.atan2(dy, dx);
                eX = cx + Math.cos(angle) * (outerOrbitRadius + actualStretch);
                eY = cy + Math.sin(angle) * (outerOrbitRadius + actualStretch);
                
                const force = Math.floor(actualStretch * en);
                document.getElementById('ie-force').textContent = force;
                
                // Break condition
                if (actualStretch > maxStretch) {
                    isTorn = true;
                    isDragging = false;
                    document.getElementById('mascot-text').textContent = "もぎ取ったのだ！陽イオンになったのだ！";
                }
            } else {
                eX = mX;
                eY = mY;
                document.getElementById('ie-force').textContent = '0';
            }
        } else if (isTorn) {
            // Float away
            eX += -2; // move left since we start on the left side
        }

        // Draw Bohr Model Background
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

        const staticAnglesDeg = [180, 0, 90, 270, 225, 135, 45, 315];
        const staticAngles = staticAnglesDeg.map(deg => deg * Math.PI / 180);

        for (let s = 0; s <= outerShellIndex; s++) {
            const radius = 30 + s * 25; // Smaller atom!
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();

            const count = currentEl.shells[s] || 0;
            for (let e = 0; e < count; e++) {
                if (s === outerShellIndex && e === 0) continue; 
                const angle = staticAngles[e % staticAngles.length];
                const sx = cx + Math.cos(angle) * radius;
                const sy = cy + Math.sin(angle) * radius;
                drawElectron(ctx, sx, sy, false);
            }
        }

        // Tension line to mouse
        if (isDragging && !isTorn) {
            ctx.beginPath();
            ctx.moveTo(eX, eY);
            ctx.lineTo(mX, mY);
            ctx.strokeStyle = `rgba(239, 68, 68, 0.8)`;
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.beginPath();
            ctx.arc(mX, mY, 5, 0, Math.PI*2);
            ctx.fillStyle = 'white';
            ctx.fill();
        }

        // Tension line to nucleus
        if (isDragging && !isTorn) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(eX, eY);
            ctx.strokeStyle = `rgba(59, 130, 246, 0.5)`;
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Target Electron
        drawElectron(ctx, eX, eY, true);
        
        requestAnimationFrame(draw);
    }
    draw();
};

window.init_affinity = function() {
    const container = document.getElementById('affinity-canvas-container');
    const overlay = document.getElementById('affinity-overlay');
    const controls = document.getElementById('affinity-controls');
    if (!container || container.children.length > 0) return;
    
    overlay.innerHTML = `
        <h3>電子親和力</h3>
        <p>電子を原子にドラッグしてぶつけるのだ！引力が強いと大きなエネルギーを放出するのだ！</p>
        <div class="info-item"><span class="label">元素:</span><select id="ea-element"></select></div>
        <div class="info-item"><span class="label">放出エネルギー:</span><span class="value" id="ea-energy">-</span></div>
    `;
    controls.innerHTML = `<button class="btn secondary" id="ea-reset">リセット</button>`;

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    const sel = document.getElementById('ea-element');
    sel.innerHTML = '';
    ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg'].forEach(sym => {
        const el = ELEMENTS.find(e => e.symbol === sym);
        if (el) {
            const opt = document.createElement('option');
            opt.value = el.num;
            opt.textContent = el.symbol;
            sel.appendChild(opt);
        }
    });

    let currentEl = ELEMENTS.find(e => e.symbol === 'H');
    let isDragging = false, isCollided = false, isSucked = false, explosionRadius = 0;
    
    // Explicit drag coordinates
    let dragX = 0, dragY = 0;

    function getEAFactor(el) {
        if (el.group === 18) return -1; // Noble gases repel
        if (el.group === 2) return -1;  // Alkaline earth (Be, Mg) generally don't accept electrons
        if (el.group === 17) return 10; // Halogens have highest EA
        if (el.group === 16) return 5;  // Chalcogens have high EA
        if (el.group === 1) return 2;   // Alkali metals (H, Li, Na) have slight positive EA
        return 3; // Others (B, C, N) have positive EA
    }

    function reset() {
        isDragging = false;
        isCollided = false;
        isSucked = false;
        explosionRadius = 0;
        document.getElementById('ea-energy').textContent = '-';
        document.getElementById('mascot-text').textContent = MASCOT_MESSAGES.affinity;
    }
    reset();

    sel.addEventListener('change', (e) => {
        currentEl = ELEMENTS.find(el => el.num == e.target.value);
        reset();
    });
    
    document.getElementById('ea-reset').addEventListener('click', reset);

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        
        // Target is the electron at the top right
        const defaultX = canvas.width - 80;
        const defaultY = 80;
        const ex = isDragging || isCollided || isSucked ? dragX : defaultX;
        const ey = isDragging || isCollided || isSucked ? dragY : defaultY;

        if (Math.hypot(mx - ex, my - ey) < 40 && !isCollided && !isSucked) {
            isDragging = true;
            dragX = mx;
            dragY = my;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const rect = canvas.getBoundingClientRect();
        dragX = e.clientX - rect.left;
        dragY = e.clientY - rect.top;
        
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const r = 80;
        const dist = Math.hypot(dragX - cx, dragY - cy);
        
        let EA_Factor = getEAFactor(currentEl);
        
        // Auto-suck if it enters the zone and has EA
        if (EA_Factor > 0 && dist < r + 100) {
            isDragging = false;
            isSucked = true;
        }
    });

    canvas.addEventListener('mouseup', () => { 
        if (isDragging) {
            isDragging = false;
            
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const r = 80;
            
            const dist = Math.hypot(dragX - cx, dragY - cy);
            if (dist < r + 100) {
                // If they release inside the zone but the mousemove didn't catch it
                let EA_Factor = getEAFactor(currentEl);
                
                if (EA_Factor > 0) {
                    isSucked = true;
                } else {
                    document.getElementById('mascot-text').textContent = "この原子は安定しているから電子を受け取らないのだ！";
                    document.getElementById('ea-energy').textContent = "0 kJ/mol (変化なし)";
                }
            } else if (getEAFactor(currentEl) < 0 && dist < r + 150) {
                document.getElementById('mascot-text').textContent = "この原子は安定しているから電子を受け取らないのだ！";
                document.getElementById('ea-energy').textContent = "0 kJ/mol (変化なし)";
            }
        }
    });

    function draw() {
        if (!document.getElementById(`view-affinity`).classList.contains('active')) {
            requestAnimationFrame(draw);
            return;
        }
        
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const r = 80;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let EA_Factor = getEAFactor(currentEl);
        
        // Sucking animation logic
        if (isSucked) {
            const angle = Math.atan2(dragY - cy, dragX - cx);
            const targetX = cx + Math.cos(angle) * r;
            const targetY = cy + Math.sin(angle) * r;
            
            dragX += (targetX - dragX) * 0.15;
            dragY += (targetY - dragY) * 0.15;
            
            const currentDist = Math.hypot(dragX - cx, dragY - cy);
            if (currentDist < r + 5) {
                isSucked = false;
                isCollided = true;
                dragX = targetX;
                dragY = targetY;
                
                const energy = EA_Factor * 33 + Math.floor(Math.random()*10);
                document.getElementById('ea-energy').textContent = `${energy} kJ/mol`;
                
                if (EA_Factor >= 5) {
                    document.getElementById('mascot-text').textContent = "ドカーン！電子を受け取って大きなエネルギーを放出したのだ！";
                } else {
                    document.getElementById('mascot-text').textContent = "シュポッ！電子を受け取って少しエネルギーを放出したのだ！";
                }
            }
        }

        // Draw Magnetic field zone
        if (EA_Factor > 0 && !isCollided && !isSucked) {
            ctx.beginPath();
            ctx.arc(cx, cy, r + 100, 0, Math.PI*2);
            ctx.fillStyle = `rgba(16, 185, 129, ${0.05 + Math.abs(Math.sin(Date.now()/500))*0.05})`;
            ctx.fill();
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
            ctx.setLineDash([10, 10]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Target Atom
        ctx.beginPath();
        ctx.arc(cx, cy, 40, 0, Math.PI*2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentEl.symbol, cx, cy);
        
        // Orbit
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.stroke();

        // Explosion effect
        if (isCollided && EA_Factor > 0) {
            explosionRadius += 10;
            if (explosionRadius < EA_Factor * 30) {
                ctx.beginPath();
                ctx.arc(cx, cy, r + explosionRadius, 0, Math.PI*2);
                ctx.strokeStyle = `rgba(250, 204, 21, ${1 - explosionRadius/(EA_Factor*30)})`;
                ctx.lineWidth = 15;
                ctx.stroke();
            }
        }

        // Electron Position
        const defaultX = canvas.width - 80;
        const defaultY = 80;
        const ex = isDragging || isCollided || isSucked ? dragX : defaultX;
        const ey = isDragging || isCollided || isSucked ? dragY : defaultY;

        // Draw Electron Box (hint)
        if (!isDragging && !isCollided && !isSucked) {
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(ex - 30, ey - 30, 60, 60);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.strokeRect(ex - 30, ey - 30, 60, 60);
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText('ドラッグ', ex, ey - 40);
        }

        // Electron
        ctx.beginPath();
        ctx.arc(ex, ey, 10, 0, Math.PI*2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        
        if(isDragging || isSucked) {
            ctx.beginPath();
            ctx.arc(ex, ey, 20, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
            ctx.fill();
            
            // Draw line to atom if close
            const dist = Math.hypot(ex - cx, ey - cy);
            if (dist < r + 100 && isDragging) {
                ctx.beginPath();
                ctx.moveTo(ex, ey);
                ctx.lineTo(cx, cy);
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        requestAnimationFrame(draw);
    }
    draw();
};

window.init_electronegativity = function() {
    const container = document.getElementById('electronegativity-canvas-container');
    const overlay = document.getElementById('electronegativity-overlay');
    const controls = document.getElementById('electronegativity-controls');
    if (!container || container.children.length > 0) return;
    
    overlay.innerHTML = `
        <h3>電気陰性度バトル</h3>
        <p>共有電子対を引っ張り合うのだ！</p>
        <div style="display:flex; justify-content:space-between; width:300px; margin: 10px auto;">
            <select id="en-left"></select>
            <span style="font-weight:bold; font-size:1.5rem;">VS</span>
            <select id="en-right"></select>
        </div>
    `;
    
    controls.innerHTML = `
        <button class="btn" id="en-fight" style="font-size: 1.2rem; padding: 10px 40px;">FIGHT!</button>
        <button class="btn secondary" id="en-reset">リセット</button>
    `;

    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    const selL = document.getElementById('en-left');
    const selR = document.getElementById('en-right');
    const options = [ELEMENTS[0], ELEMENTS[5], ELEMENTS[6], ELEMENTS[7], ELEMENTS[8], ELEMENTS[16]]; // H, C, N, O, F, Cl
    
    options.forEach(el => {
        selL.appendChild(new Option(el.symbol, el.num));
        selR.appendChild(new Option(el.symbol, el.num));
    });
    selL.value = 1; // H
    selR.value = 9; // F

    let state = 'idle'; // idle, fighting, finished
    let eOffset = 0; // electron pair offset from center
    let time = 0;

    document.getElementById('en-fight').addEventListener('click', () => {
        if (state === 'idle') state = 'fighting';
    });
    
    document.getElementById('en-reset').addEventListener('click', () => {
        state = 'idle';
        eOffset = 0;
        time = 0;
        document.getElementById('mascot-text').textContent = MASCOT_MESSAGES.electronegativity;
    });

    function draw() {
        if (!document.getElementById(`view-electronegativity`).classList.contains('active')) {
            requestAnimationFrame(draw);
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const elL = ELEMENTS.find(e => e.num == selL.value);
        const elR = ELEMENTS.find(e => e.num == selR.value);
        const enL = elL.electronegativity || 0;
        const enR = elR.electronegativity || 0;
        
        let cx = canvas.width/2;
        let cy = canvas.height/2;
        
        time += 0.1;
        
        // Fight animation logic
        let hx = cx - 150;
        let fx = cx + 150;
        
        if (state === 'fighting') {
            // Jitter atoms
            hx += (Math.random()-0.5)*10;
            fx += (Math.random()-0.5)*10;
            
            // Move electrons
            const targetOffset = ((enR - enL) / Math.max(enR, enL)) * 100;
            eOffset += (targetOffset - eOffset) * 0.05;
            
            if (Math.abs(eOffset - targetOffset) < 1) {
                state = 'finished';
                let winner = "引き分けなのだ！";
                if (enR > enL) winner = `${elR.symbol}の勝ちなのだ！電子を強く引いているのだ！`;
                if (enL > enR) winner = `${elL.symbol}の勝ちなのだ！電子を強く引いているのだ！`;
                document.getElementById('mascot-text').textContent = winner;
            }
        } else if (state === 'idle') {
            eOffset = 0;
        }

        // Draw Left Atom
        ctx.beginPath();
        ctx.arc(hx, cy, 40, 0, Math.PI*2);
        ctx.fillStyle = '#9ca3af';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(elL.symbol, hx, cy);
        ctx.font = '16px Arial';
        ctx.fillText(`EN: ${enL}`, hx, cy + 60);
        
        // Draw Right Atom
        ctx.beginPath();
        ctx.arc(fx, cy, 40, 0, Math.PI*2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText(elR.symbol, fx, cy);
        ctx.font = '16px Arial';
        ctx.fillText(`EN: ${enR}`, fx, cy + 60);
        
        // Draw shared electrons
        let ex = cx + eOffset; 
        ctx.beginPath();
        ctx.arc(ex, cy-12, 10, 0, Math.PI*2);
        ctx.arc(ex, cy+12, 10, 0, Math.PI*2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        
        // Tug of war rope
        ctx.beginPath();
        ctx.moveTo(hx+40, cy);
        ctx.lineTo(ex-15, cy);
        ctx.moveTo(fx-40, cy);
        ctx.lineTo(ex+15, cy);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 4;
        ctx.stroke();

        requestAnimationFrame(draw);
    }
    draw();
};

window.init_isotope = function() {
    const container = document.getElementById('view-isotope');
    if(container.children.length > 0) return;
    container.innerHTML = `<div class="glass-panel" style="text-align: center; margin: auto;"><h2>同位体比較（開発中）</h2><p>12C と 13C と 14C の中性子の数の違いを比較するのだ！</p></div>`;
};

window.init_radiation = function() {
    const container = document.getElementById('view-radiation');
    if(container.children.length > 0) return;
    container.innerHTML = `<div class="glass-panel" style="text-align: center; margin: auto;"><h2>放射線シミュレーション（開発中）</h2><p>α崩壊のビームを出すアニメーションなのだ！</p></div>`;
};

window.init_size = function() {
    const container = document.getElementById('view-size');
    if(container.children.length > 0) return;
    container.innerHTML = `<div class="glass-panel" style="text-align: center; margin: auto;"><h2>原子の大きさ比較（開発中）</h2><p>周期表の右上が一番小さく、左下が一番大きいのだ！</p></div>`;
};
