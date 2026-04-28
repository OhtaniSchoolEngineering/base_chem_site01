// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('#nav-links li:not(.nav-header)');
    const viewTitle = document.getElementById('view-title');
    const viewContainer = document.getElementById('view-container');
    const characterBubble = document.getElementById('character-bubble');
    const mascotText = document.getElementById('mascot-text');
    
    // Create view sections dynamically
    const views = ['home', 'viewer3d', 'isotope', 'radiation', 'bohr', 'ion', 'ionization', 'affinity', 'electronegativity', 'size', 'periodic'];
    
    views.forEach(view => {
        const section = document.createElement('div');
        section.id = `view-${view}`;
        section.className = 'view-section';
        viewContainer.appendChild(section);
        
        // Initialize view content
        initViewContent(view, section);
    });
    
    // Setup Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Update title
            viewTitle.textContent = e.currentTarget.textContent;
            
            // Switch views
            document.querySelectorAll('.view-section').forEach(sec => {
                sec.classList.remove('active');
            });
            document.getElementById(`view-${target}`).classList.add('active');
            
            // Update Mascot Text
            showMascotMessage(MASCOT_MESSAGES[target]);
            
            // Trigger view specific logic
            if (window[`init_${target}`]) {
                window[`init_${target}`]();
            }
        });
    });
    
    // Show home view by default
    document.getElementById('view-home').classList.add('active');
    showMascotMessage(MASCOT_MESSAGES['home']);
    
    function showMascotMessage(msg) {
        if (!msg) return;
        mascotText.textContent = msg;
        characterBubble.classList.remove('hidden');
    }

    // カニを隠すボタン
    document.getElementById('mascot-close').addEventListener('click', () => {
        characterBubble.classList.add('hidden');
    });
    
    function initViewContent(view, section) {
        switch(view) {
            case 'home':
                section.innerHTML = `
                    <div class="home-grid">
                        <div class="home-card" onclick="document.querySelector('[data-target=\\'viewer3d\\']').click()">
                            <div class="emoji">⚛️</div>
                            <h3>3D原子ビューワ</h3>
                            <p>原子の立体構造を見てみるのだ！</p>
                        </div>
                        <div class="home-card" onclick="document.querySelector('[data-target=\\'bohr\\']').click()">
                            <div class="emoji">🎯</div>
                            <h3>電子配置</h3>
                            <p>マンションの部屋割りルールなのだ！</p>
                        </div>
                        <div class="home-card" onclick="document.querySelector('[data-target=\\'periodic\\']').click()">
                            <div class="emoji">🧩</div>
                            <h3>周期表ゲーム</h3>
                            <p>元素の地図を完成させるのだ！</p>
                        </div>
                    </div>
                `;
                break;
            case 'viewer3d':
                section.innerHTML = `
                    <div class="sim-overlay">
                        <h3>原子の構造</h3>
                        <div class="info-item"><span class="label">元素:</span><select id="viewer3d-element"></select></div>
                        <div class="info-item"><span class="label">陽子(p⁺):</span><span class="value" id="viewer3d-p"></span></div>
                        <div class="info-item"><span class="label">中性子(n⁰):</span><span class="value" id="viewer3d-n"></span></div>
                        <div class="info-item"><span class="label">電子(e⁻):</span><span class="value" id="viewer3d-e"></span></div>
                    </div>
                    <div id="viewer3d-canvas" class="canvas-container"></div>
                `;
                // Populate select
                setTimeout(() => {
                    const sel = document.getElementById('viewer3d-element');
                    if (sel) {
                        ELEMENTS.slice(0, 18).forEach(el => {
                            const opt = document.createElement('option');
                            opt.value = el.num;
                            opt.textContent = `${el.num} ${el.symbol} (${el.name})`;
                            sel.appendChild(opt);
                        });
                        sel.addEventListener('change', (e) => {
                            if (window.viewer3d_update) window.viewer3d_update(parseInt(e.target.value));
                        });
                    }
                }, 100);
                break;
            case 'periodic':
                section.innerHTML = `
                    <div style="display:flex;gap:8px;padding:6px 14px;flex-shrink:0;align-items:center;background:rgba(15,23,42,0.6);border-bottom:1px solid rgba(255,255,255,0.08);">
                        <button class="btn btn-sm" id="pt-check">✅ 答え合わせ</button>
                        <button class="btn btn-sm secondary" id="pt-reset">🔄 リセット</button>
                        <span id="pt-score" style="margin-left:10px;font-size:0.95rem;color:#60a5fa;font-weight:900;"></span>
                    </div>
                    <div id="periodic-cards"></div>
                    <div style="flex:1;overflow:auto;padding:6px 10px 10px;">
                        <div id="periodic-table"></div>
                    </div>
                `;
                break;
            case 'isotope':
            case 'radiation':
            case 'bohr':
            case 'ion':
            case 'ionization':
            case 'affinity':
            case 'electronegativity':
            case 'size':
                // Shared canvas container pattern for 2D sims
                section.innerHTML = `
                    <div class="sim-overlay" id="${view}-overlay"></div>
                    <div class="controls-bar" id="${view}-controls" style="position: absolute; bottom: 20px; z-index: 10;"></div>
                    <div id="${view}-canvas-container" class="canvas-container"></div>
                `;
                break;
            default:
                section.innerHTML = `<div class="glass-panel"><h2>開発中なのだ！🔧</h2><p>もう少し待っててほしいのだ！</p></div>`;
        }
    }
});
