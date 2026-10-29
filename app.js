/**
 * Galileo Nut Drop Experiment - Application Controller & Visualizer
 * Quản lý giao diện, kết nối mô phỏng với băng ghi âm thanh và bảng số liệu
 */

function initApp() {
    // 1. Tham chiếu Canvas
    const simCanvas = document.getElementById('simCanvas');
    const timelineCanvas = document.getElementById('timelineCanvas');

    // Mảng lưu vết các cú va chạm để vẽ lên timeline
    let timelineHits = [];
    let sim = null;

    // Khởi tạo Engine mô phỏng
    const NutSimClass = window.NutSimulation || NutSimulation;
    sim = new NutSimClass(simCanvas, {
        g: 9.8,
        speed: 0.25, // Tốc độ mặc định 0.25x (Rất chậm để nghe rõ từng nhịp cạch)
        mode: 'both',
        onNutHit: (nut) => {
            handleNutHit(nut);
        },
        onSimulationEnd: (finalTime) => {
            handleSimulationEnd(finalTime);
        },
        onTimeUpdate: (simTime) => {
            updateHUD(simTime);
            drawTimeline();
        }
    });

    // 2. Các phần tử UI
    const btnDrop = document.getElementById('btnDrop');
    const btnPause = document.getElementById('btnPause');
    const btnReset = document.getElementById('btnReset');
    const btnTestAudio = document.getElementById('btnTestAudio');

    const selectSoundType = document.getElementById('selectSoundType');
    const sliderVolume = document.getElementById('sliderVolume');
    const volumeValue = document.getElementById('volumeValue');
    const btnToggleMute = document.getElementById('btnToggleMute');

    const modeRadios = document.querySelectorAll('input[name="expMode"]');
    const speedButtons = document.querySelectorAll('.speed-btn');

    const gSelect = document.getElementById('gSelect');
    const customGInput = document.getElementById('customGInput');

    const tableSquareBody = document.querySelector('#tableSquare tbody');
    const tableEqualBody = document.querySelector('#tableEqual tbody');

    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // 3. Xử lý âm thanh
    if (sliderVolume) {
        sliderVolume.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (volumeValue) volumeValue.textContent = `${Math.round(val * 100)}%`;
            if (window.soundEngine) window.soundEngine.setVolume(val);
        });
    }

    if (selectSoundType) {
        selectSoundType.addEventListener('change', (e) => {
            if (window.soundEngine) {
                window.soundEngine.setSoundType(e.target.value);
                window.soundEngine.playNutImpact(3.5, 1.0);
            }
        });
    }

    let isMuted = false;
    if (btnToggleMute) {
        btnToggleMute.addEventListener('click', () => {
            isMuted = !isMuted;
            if (window.soundEngine) window.soundEngine.setMuted(isMuted);
            btnToggleMute.innerHTML = isMuted
                ? '<svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>'
                : '<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>';
        });
    }

    if (btnTestAudio) {
        btnTestAudio.addEventListener('click', () => {
            if (window.soundEngine) {
                window.soundEngine.resume();
                window.soundEngine.playNutImpact(3.5, 1.0);
            }
        });
    }

    // 4. Các nút điều khiển mô phỏng
    if (btnDrop) {
        btnDrop.addEventListener('click', () => {
            if (!sim) return;
            if (window.soundEngine) window.soundEngine.resume();
            if (!sim.isRunning) {
                if (sim.isFinished) {
                    timelineHits = [];
                    resetDataTable();
                    drawTimeline();
                }
                sim.start();
                btnDrop.classList.add('active-running');
                btnDrop.innerHTML = '<span class="pulse-dot"></span> Đang rơi...';
                if (btnPause) btnPause.disabled = false;
            }
        });
    }

    if (btnPause) {
        btnPause.addEventListener('click', () => {
            if (!sim) return;
            if (sim.isRunning) {
                sim.pause();
                btnDrop.classList.remove('active-running');
                btnDrop.innerHTML = 'Tiếp tục';
            } else {
                sim.start();
                btnDrop.classList.add('active-running');
                btnDrop.innerHTML = '<span class="pulse-dot"></span> Đang rơi...';
            }
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (!sim) return;
            sim.reset(true);
            timelineHits = [];
            if (btnDrop) {
                btnDrop.classList.remove('active-running');
                btnDrop.innerHTML = 'Thả dây (Bắt đầu)';
            }
            if (btnPause) btnPause.disabled = true;
            resetDataTable();
            drawTimeline();
        });
    }

    // 5. Chọn chế độ hiển thị
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (!sim) return;
            const mode = e.target.value;
            sim.setMode(mode);
            if (btnReset) btnReset.click();
            updateTablesVisibility(mode);
        });
    });

    function updateTablesVisibility(mode) {
        const wrapSquare = document.getElementById('wrapTableSquare');
        const wrapEqual = document.getElementById('wrapTableEqual');
        if (wrapSquare && wrapEqual) {
            if (mode === 'square') {
                wrapSquare.style.display = 'block';
                wrapEqual.style.display = 'none';
            } else if (mode === 'equal') {
                wrapSquare.style.display = 'none';
                wrapEqual.style.display = 'block';
            } else {
                wrapSquare.style.display = 'block';
                wrapEqual.style.display = 'block';
            }
        }
    }

    // 6. Chọn tốc độ mô phỏng
    speedButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            speedButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const speed = parseFloat(btn.dataset.speed);
            if (sim) sim.setSpeed(speed);
        });
    });

    // 7. Chọn gia tốc rơi g
    if (gSelect) {
        gSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'custom') {
                if (customGInput) customGInput.classList.remove('hidden');
            } else {
                if (customGInput) customGInput.classList.add('hidden');
                if (sim) {
                    sim.setGravity(parseFloat(val));
                    initDataTable();
                    drawStaticAnalysisGraph();
                }
            }
        });
    }

    if (customGInput) {
        customGInput.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value);
            if (val > 0 && sim) {
                sim.setGravity(val);
                initDataTable();
                drawStaticAnalysisGraph();
            }
        });
    }

    // 8. Chuyển đổi Tab
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.dataset.tab;
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');

            if (targetId === 'tabGraph') {
                drawStaticAnalysisGraph();
            } else if (targetId === 'tabTimeline') {
                drawTimeline();
            }
        });
    });

    // 9. Xử lý khi đai ốc chạm sàn
    function handleNutHit(nut) {
        timelineHits.push({
            type: nut.type,
            index: nut.index,
            time: nut.hitTime,
            initialHeight: nut.initialHeight,
            velocity: nut.velocity
        });

        updateTableRow(nut);
        drawTimeline();
    }

    function handleSimulationEnd(finalTime) {
        if (btnDrop) {
            btnDrop.classList.remove('active-running');
            btnDrop.innerHTML = 'Thực hiện lại';
        }
        if (btnPause) btnPause.disabled = true;

        showSummaryVerdict();
    }

    function updateHUD(simTime) {
        const timeDisplay = document.getElementById('liveTimer');
        if (timeDisplay) {
            timeDisplay.textContent = `${simTime.toFixed(3)} s`;
        }
    }

    // 10. Khởi tạo bảng số liệu
    function initDataTable() {
        if (!sim || !tableSquareBody || !tableEqualBody) return;

        // Dây tỉ lệ t^2: 9, 36, 81, 144, 225 cm
        tableSquareBody.innerHTML = '';
        let prevTimeSq = 0;
        sim.squareStringDistances.forEach((dist, idx) => {
            const expTime = Math.sqrt((2 * dist) / sim.g);
            const deltaT = expTime - prevTimeSq;
            prevTimeSq = expTime;

            const tr = document.createElement('tr');
            tr.id = `row-sq-${idx + 1}`;
            tr.innerHTML = `
                <td class="font-bold text-sky-400">#${idx + 1}</td>
                <td>${Math.round(dist * 100)} cm</td>
                <td class="font-mono text-slate-300" data-field="time">${expTime.toFixed(3)} s</td>
                <td class="font-mono font-semibold text-emerald-400" data-field="delta">${deltaT.toFixed(3)} s</td>
                <td class="font-mono text-slate-400" data-field="velocity">${(sim.g * expTime).toFixed(2)} m/s</td>
                <td><span class="status-badge pending">Chờ rơi</span></td>
            `;
            tableSquareBody.appendChild(tr);
        });

        // Dây cách đều: 40, 80, 120, 160, 200, 240 cm
        tableEqualBody.innerHTML = '';
        let prevTimeEq = 0;
        sim.equalStringDistances.forEach((dist, idx) => {
            const expTime = Math.sqrt((2 * dist) / sim.g);
            const deltaT = expTime - prevTimeEq;
            prevTimeEq = expTime;

            const tr = document.createElement('tr');
            tr.id = `row-eq-${idx + 1}`;
            tr.innerHTML = `
                <td class="font-bold text-orange-400">#${idx + 1}</td>
                <td>${Math.round(dist * 100)} cm</td>
                <td class="font-mono text-slate-300" data-field="time">${expTime.toFixed(3)} s</td>
                <td class="font-mono font-semibold text-amber-400" data-field="delta">${deltaT.toFixed(3)} s</td>
                <td class="font-mono text-slate-400" data-field="velocity">${(sim.g * expTime).toFixed(2)} m/s</td>
                <td><span class="status-badge pending">Chờ rơi</span></td>
            `;
            tableEqualBody.appendChild(tr);
        });
    }

    function resetDataTable() {
        document.querySelectorAll('.status-badge').forEach(b => {
            b.className = 'status-badge pending';
            b.textContent = 'Chờ rơi';
        });
        document.querySelectorAll('tr').forEach(r => r.classList.remove('row-hit'));
        const verdictBox = document.getElementById('summaryVerdict');
        if (verdictBox) verdictBox.innerHTML = '';
    }

    function updateTableRow(nut) {
        const rowId = nut.type === 'square' ? `row-sq-${nut.index}` : `row-eq-${nut.index}`;
        const row = document.getElementById(rowId);
        if (row) {
            row.classList.add('row-hit');
            const badge = row.querySelector('.status-badge');
            if (badge) {
                badge.className = 'status-badge hit';
                badge.textContent = '✓ Đã chạm';
            }
        }
    }

    function showSummaryVerdict() {
        const verdictBox = document.getElementById('summaryVerdict');
        if (!verdictBox) return;

        verdictBox.innerHTML = `
            <div class="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div class="flex items-center gap-2 font-bold text-base text-white">
                    <span class="text-xl">🎯</span> Kết luận quan sát âm thanh và quy luật vật lý:
                </div>
                <div class="text-sm text-slate-300 leading-relaxed space-y-1">
                    <p><strong class="text-sky-400">1. Dây tỉ lệ t² (9, 36, 81, 144, 225 cm):</strong> Khoảng cách giữa hai tiếng cạch liên tiếp luôn là <strong class="text-emerald-400">Δt ≈ 0.136 s</strong> (hoàn toàn bằng nhau!). Nhịp âm vang lên <strong class="text-sky-300">đều đặn như máy đếm nhịp (Metronome)</strong>. Điều này chứng minh quãng đường rơi tự do tỉ lệ thuận với bình phương thời gian: <code class="bg-slate-900 px-1 py-0.5 rounded text-sky-300 font-mono">s = ½gt²</code>.</p>
                    <p><strong class="text-orange-400">2. Dây cách đều (mỗi đai ốc cách 40 cm):</strong> Khoảng cách thời gian giảm liên tục từ <strong class="text-amber-300">0.286s → 0.118s → 0.091s → 0.076s → 0.067s → 0.061s</strong>. Tiếng cạch phát ra <strong class="text-orange-300">cực kỳ dồn dập về cuối</strong> do vận tốc của vật tăng dần theo thời gian: <code class="bg-slate-900 px-1 py-0.5 rounded text-orange-300 font-mono">v = gt</code>.</p>
                </div>
            </div>
        `;
    }

    // 11. Vẽ Băng ghi âm thanh & Trục nhịp điệu (Rhythm Track Visualizer)
    function drawTimeline() {
        if (!timelineCanvas || !sim) return;
        const ctx = timelineCanvas.getContext('2d');
        const rect = timelineCanvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        const w = rect.width || timelineCanvas.clientWidth || 700;
        const h = rect.height || timelineCanvas.clientHeight || 220;

        if (timelineCanvas.width !== Math.floor(w * dpr) || timelineCanvas.height !== Math.floor(h * dpr)) {
            timelineCanvas.width = Math.floor(w * dpr);
            timelineCanvas.height = Math.floor(h * dpr);
        }

        if (ctx.resetTransform) {
            ctx.resetTransform();
        } else {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        const margin = { left: 110, right: 30, top: 25, bottom: 35 };
        const trackW = Math.max(10, w - margin.left - margin.right);
        const totalDuration = 0.8;

        const timeToX = (t) => margin.left + (t / totalDuration) * trackW;

        // Vẽ vạch chia thời gian
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';

        for (let t = 0; t <= totalDuration + 0.001; t += 0.1) {
            const x = timeToX(t);
            ctx.beginPath();
            ctx.moveTo(x, margin.top - 8);
            ctx.lineTo(x, h - margin.bottom);
            ctx.stroke();

            ctx.fillText(`${t.toFixed(1)}s`, x, h - margin.bottom + 16);
        }

        const track1Y = margin.top + 35;
        const track2Y = margin.top + 105;
        const trackH = 40;

        // Track 1
        ctx.fillStyle = 'rgba(56, 189, 248, 0.07)';
        ctx.fillRect(margin.left, track1Y - trackH / 2, trackW, trackH);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(margin.left, track1Y - trackH / 2, trackW, trackH);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Dây tỉ lệ t²', margin.left - 12, track1Y - 4);
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Nhịp đều đặn', margin.left - 12, track1Y + 10);

        // Track 2
        ctx.fillStyle = 'rgba(251, 146, 60, 0.07)';
        ctx.fillRect(margin.left, track2Y - trackH / 2, trackW, trackH);
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(margin.left, track2Y - trackH / 2, trackW, trackH);

        ctx.fillStyle = '#fb923c';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Dây cách đều', margin.left - 12, track2Y - 4);
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Nhịp dồn dập', margin.left - 12, track2Y + 10);

        // Xung lý thuyết mờ
        let prevX1 = timeToX(0);
        sim.squareStringDistances.forEach((d, idx) => {
            const t = Math.sqrt((2 * d) / sim.g);
            const x = timeToX(t);

            ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(x, track1Y - 18);
            ctx.lineTo(x, track1Y + 18);
            ctx.stroke();
            ctx.setLineDash([]);

            if (idx > 0) {
                const midX = (prevX1 + x) / 2;
                ctx.fillStyle = '#38bdf8';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Δt đều', midX, track1Y - 7);
            }
            prevX1 = x;
        });

        sim.equalStringDistances.forEach((d, idx) => {
            const t = Math.sqrt((2 * d) / sim.g);
            const x = timeToX(t);

            ctx.strokeStyle = 'rgba(251, 146, 60, 0.25)';
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(x, track2Y - 18);
            ctx.lineTo(x, track2Y + 18);
            ctx.stroke();
            ctx.setLineDash([]);
        });

        // Xung thực tế nổ ra
        timelineHits.forEach((hit) => {
            const isSq = hit.type === 'square';
            const trackY = isSq ? track1Y : track2Y;
            const x = timeToX(hit.time);
            const color = isSq ? '#38bdf8' : '#fb923c';

            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(x, trackY - 16);
            ctx.lineTo(x, trackY + 16);
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, trackY - 16, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Cạch ${hit.index}`, x, trackY + 28);
        });

        // Playhead
        if (sim.simTime > 0) {
            const playheadX = timeToX(sim.simTime);
            if (playheadX <= margin.left + trackW) {
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(playheadX, margin.top - 12);
                ctx.lineTo(playheadX, h - margin.bottom);
                ctx.stroke();

                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.moveTo(playheadX - 5, margin.top - 12);
                ctx.lineTo(playheadX + 5, margin.top - 12);
                ctx.lineTo(playheadX, margin.top - 4);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    // 12. Đồ thị Phân tích Vật lý
    function drawStaticAnalysisGraph() {
        const canvas = document.getElementById('analysisCanvas');
        if (!canvas || !sim) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        const w = rect.width || canvas.clientWidth || 700;
        const h = 320;

        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        if (ctx.resetTransform) {
            ctx.resetTransform();
        } else {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        const halfW = w / 2;
        drawDistanceTimeGraph(ctx, 0, 0, halfW, h);
        drawDeltaTimeGraph(ctx, halfW, 0, halfW, h);
    }

    function drawDistanceTimeGraph(ctx, ox, oy, gw, gh) {
        const pad = { left: 55, right: 25, top: 40, bottom: 45 };
        const plotW = Math.max(10, gw - pad.left - pad.right);
        const plotH = Math.max(10, gh - pad.top - pad.bottom);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Đồ thị s theo t: s = ½gt²', ox + gw / 2, oy + 22);

        const originX = ox + pad.left;
        const originY = oy + gh - pad.bottom;

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(originX, oy + pad.top);
        ctx.lineTo(originX, originY);
        ctx.lineTo(originX + plotW, originY);
        ctx.stroke();

        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'right';
        ctx.fillText('s (m)', originX - 6, oy + pad.top + 6);
        ctx.textAlign = 'center';
        ctx.fillText('t (s)', originX + plotW, originY + 20);

        const maxT = 0.75;
        const maxS = 2.5;

        const mapX = (t) => originX + (t / maxT) * plotW;
        const mapY = (s) => originY - (s / maxS) * plotH;

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let t = 0; t <= maxT; t += 0.01) {
            const s = 0.5 * sim.g * t * t;
            if (s > maxS) break;
            const px = mapX(t);
            const py = mapY(s);
            if (t === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        sim.squareStringDistances.forEach((s, idx) => {
            const t = Math.sqrt((2 * s) / sim.g);
            const px = mapX(t);
            const py = mapY(s);

            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(px, py, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(px, originY);
            ctx.lineTo(px, py);
            ctx.lineTo(originX, py);
            ctx.stroke();
            ctx.setLineDash([]);
        });

        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('● Đai ốc tỉ lệ t² (tăng đều theo trục t)', originX + 10, oy + pad.top + 15);
    }

    function drawDeltaTimeGraph(ctx, ox, oy, gw, gh) {
        const pad = { left: 55, right: 25, top: 40, bottom: 45 };
        const plotW = Math.max(10, gw - pad.left - pad.right);
        const plotH = Math.max(10, gh - pad.top - pad.bottom);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Khoảng thời gian giữa 2 tiếng cạch (Δt)', ox + gw / 2, oy + 22);

        const originX = ox + pad.left;
        const originY = oy + gh - pad.bottom;

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(originX, oy + pad.top);
        ctx.lineTo(originX, originY);
        ctx.lineTo(originX + plotW, originY);
        ctx.stroke();

        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'right';
        ctx.fillText('Δt (s)', originX - 6, oy + pad.top + 6);
        ctx.textAlign = 'center';
        ctx.fillText('Số thứ tự đai ốc (n)', originX + plotW - 10, originY + 20);

        const maxDelta = 0.32;
        const maxN = 6;

        const mapX = (n) => originX + (n / maxN) * plotW;
        const mapY = (dt) => originY - (dt / maxDelta) * plotH;

        // Dây tỉ lệ t^2: Đường nằm ngang
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let prevTSq = 0;
        sim.squareStringDistances.forEach((s, idx) => {
            const t = Math.sqrt((2 * s) / sim.g);
            const dt = t - prevTSq;
            prevTSq = t;
            const px = mapX(idx + 1);
            const py = mapY(dt);

            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();

        prevTSq = 0;
        sim.squareStringDistances.forEach((s, idx) => {
            const t = Math.sqrt((2 * s) / sim.g);
            const dt = t - prevTSq;
            prevTSq = t;
            const px = mapX(idx + 1);
            const py = mapY(dt);
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // Dây cách đều: Đường dốc xuống
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let prevTEq = 0;
        sim.equalStringDistances.forEach((s, idx) => {
            const t = Math.sqrt((2 * s) / sim.g);
            const dt = t - prevTEq;
            prevTEq = t;
            const px = mapX(idx + 1);
            const py = mapY(dt);

            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();

        prevTEq = 0;
        sim.equalStringDistances.forEach((s, idx) => {
            const t = Math.sqrt((2 * s) / sim.g);
            const dt = t - prevTEq;
            prevTEq = t;
            const px = mapX(idx + 1);
            const py = mapY(dt);
            ctx.fillStyle = '#fb923c';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('— Dây tỉ lệ t²: Δt = hằng số (Đều đặn)', originX + 10, oy + pad.top + 12);
        ctx.fillStyle = '#fb923c';
        ctx.fillText('— Dây cách đều: Δt giảm dần (Dồn dập)', originX + 10, oy + pad.top + 28);
    }

    // Khởi tạo ban đầu
    initDataTable();
    setTimeout(() => {
        if (sim) {
            sim.initCanvasSize();
            sim.draw();
        }
        drawTimeline();
        drawStaticAnalysisGraph();
    }, 60);

    window.addEventListener('resize', () => {
        drawTimeline();
        drawStaticAnalysisGraph();
    });
}

// Khởi chạy an toàn kể cả khi DOM đã sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
