// js/periodic.js

window.init_periodic = function() {
    const tableContainer = document.getElementById('periodic-table');
    const cardsContainer = document.getElementById('periodic-cards');
    if (!tableContainer || !cardsContainer) return;
    if (tableContainer.children.length > 0) return;

    // グリッド生成 (7行 × 18列)
    for (let r = 1; r <= 7; r++) {
        for (let c = 1; c <= 18; c++) {
            const cell = document.createElement('div');
            cell.className = 'pt-cell empty';
            cell.dataset.r = r;
            cell.dataset.c = c;
            tableContainer.appendChild(cell);
        }
    }

    // 各元素のドロップターゲットを配置
    ELEMENTS.forEach(el => {
        const index = (el.period - 1) * 18 + (el.group - 1);
        const cell = tableContainer.children[index];
        if (cell) {
            cell.classList.remove('empty');
            cell.classList.add('drop-target');
            cell.dataset.num = el.num;
            cell.dataset.expected = el.symbol;

            const numEl = document.createElement('div');
            numEl.className = 'atomic-number';
            numEl.textContent = el.num;
            cell.appendChild(numEl);
        }
    });

    // シャッフルしてカードを生成
    const shuffledElements = [...ELEMENTS].sort(() => Math.random() - 0.5);
    shuffledElements.forEach(el => {
        const card = document.createElement('div');
        card.className = 'pt-card';
        card.draggable = true;
        card.textContent = el.symbol;
        card.dataset.num = el.num;
        card.dataset.symbol = el.symbol;
        card.dataset.type = el.type;

        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', el.symbol);
            setTimeout(() => card.style.opacity = '0.5', 0);
        });
        card.addEventListener('dragend', () => { card.style.opacity = '1'; });
        cardsContainer.appendChild(card);
    });

    // ドロップターゲット設定
    document.querySelectorAll('.pt-cell.drop-target').forEach(target => {
        target.addEventListener('dragover', (e) => {
            e.preventDefault();
            target.style.background = 'rgba(59,130,246,0.3)';
        });
        target.addEventListener('dragleave', () => { target.style.background = ''; });
        target.addEventListener('drop', (e) => {
            e.preventDefault();
            target.style.background = '';
            const symbol = e.dataTransfer.getData('text/plain');
            const card = document.querySelector(`.pt-card[data-symbol="${symbol}"]`);
            if (card) {
                const existingCard = target.querySelector('.pt-card');
                if (existingCard) cardsContainer.appendChild(existingCard);
                target.appendChild(card);
                card.style.width  = '100%';
                card.style.height = '100%';
                card.style.border = 'none';
                card.style.borderRadius = '0';
                card.classList.add(card.dataset.type);
            }
        });
    });

    // ── コンフェッティ ─────────────────────────────────
    function launchConfetti() {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:10001;pointer-events:none;';
        document.body.appendChild(canvas);
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        const cctx = canvas.getContext('2d');

        const colors = ['#f87171','#60a5fa','#34d399','#fbbf24','#c084fc','#fb923c','#f472b6'];
        const particles = Array.from({ length: 160 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height * 0.5,
            w: Math.random() * 12 + 6,
            h: Math.random() * 7 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rot: Math.random() * 360,
            speed: Math.random() * 4 + 2,
            drift: Math.random() * 2 - 1,
            rotSpeed: Math.random() * 8 - 4,
            phase: Math.random() * Math.PI * 2
        }));

        let frame = 0;
        function animate() {
            cctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.y      += p.speed;
                p.x      += Math.sin(frame * 0.04 + p.phase) * 1.8 + p.drift;
                p.rot    += p.rotSpeed;
                cctx.save();
                cctx.translate(p.x, p.y);
                cctx.rotate(p.rot * Math.PI / 180);
                cctx.fillStyle = p.color;
                cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                cctx.restore();
            });
            frame++;
            if (frame < 250) requestAnimationFrame(animate);
            else canvas.remove();
        }
        animate();
    }

    // ── おめでとうオーバーレイ ─────────────────────────
    function showCongrats() {
        launchConfetti();

        const overlay = document.createElement('div');
        overlay.id = 'pt-congrats';
        overlay.style.cssText = [
            'position:fixed;top:0;left:0;width:100%;height:100%;',
            'background:rgba(0,0,0,0.75);z-index:10000;',
            'display:flex;flex-direction:column;align-items:center;justify-content:center;',
            'cursor:pointer;'
        ].join('');

        overlay.innerHTML = `
            <div style="text-align:center;animation:ptBounceIn 0.7s cubic-bezier(.36,.07,.19,.97);">
                <div style="font-size:5rem;animation:ptSpin 1s ease-out;">🎉</div>
                <h2 style="
                    font-size:3.2rem;font-weight:900;margin:16px 0 8px;
                    background:linear-gradient(135deg,#fbbf24,#f87171,#c084fc,#60a5fa);
                    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                    filter:drop-shadow(0 2px 8px rgba(0,0,0,0.4));
                ">Congratulations! 🏆</h2>
                <p style="font-size:1.3rem;color:#f0fdf4;font-weight:700;margin-bottom:6px;">
                    周期表を完璧にマスターしたのだ！
                </p>
                <p style="font-size:0.95rem;color:#94a3b8;">画面をクリックして閉じる</p>
            </div>
        `;
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    }

    // ── 答え合わせ（段階アニメーション付き）────────────
    document.getElementById('pt-check').addEventListener('click', () => {
        const targets = Array.from(document.querySelectorAll('.pt-cell.drop-target'));
        const total   = targets.length;
        let correct   = 0;

        // 一旦ボーダーをリセット
        targets.forEach(t => {
            t.style.borderColor = '';
            t.style.boxShadow   = '';
            t.style.animation   = '';
        });

        targets.forEach((target, i) => {
            setTimeout(() => {
                const card = target.querySelector('.pt-card');
                const isOk = card && card.dataset.symbol === target.dataset.expected;
                if (isOk) {
                    correct++;
                    target.style.borderColor = '#10b981';
                    target.style.boxShadow   = '0 0 10px rgba(16,185,129,0.7)';
                    target.style.animation   = 'ptCellPop 0.35s ease';
                } else {
                    target.style.borderColor = '#ef4444';
                    target.style.boxShadow   = '0 0 8px rgba(239,68,68,0.6)';
                    target.style.animation   = 'ptShake 0.35s ease';
                }

                // 最後のセルが終わったら結果表示
                if (i === total - 1) {
                    setTimeout(() => {
                        // 非同期のため再カウント
                        let finalCorrect = 0;
                        targets.forEach(t => {
                            const c = t.querySelector('.pt-card');
                            if (c && c.dataset.symbol === t.dataset.expected) finalCorrect++;
                        });

                        document.getElementById('pt-score').textContent =
                            `${finalCorrect} / ${total}`;

                        if (finalCorrect === total) {
                            showCongrats();
                            document.getElementById('mascot-text').textContent =
                                '完璧なのだ！周期表マスターなのだ！🎉';
                        } else {
                            document.getElementById('mascot-text').textContent =
                                `${finalCorrect}個正解なのだ！赤いところを直すのだ！`;
                        }
                    }, 150);
                }
            }, i * 35); // 35ms ずつずらして波のように判定
        });
    });

    // ── リセット ───────────────────────────────────────
    document.getElementById('pt-reset').addEventListener('click', () => {
        document.querySelectorAll('.pt-cell .pt-card').forEach(card => {
            card.style.width        = '50px';
            card.style.height       = '50px';
            card.style.border       = '';
            card.style.borderRadius = '6px';
            card.className          = 'pt-card';
            cardsContainer.appendChild(card);
        });
        document.querySelectorAll('.pt-cell.drop-target').forEach(target => {
            target.style.borderColor = '';
            target.style.boxShadow   = '';
            target.style.animation   = '';
        });
        document.getElementById('pt-score').textContent = '';
        document.getElementById('mascot-text').textContent = MASCOT_MESSAGES.periodic;
    });
};
