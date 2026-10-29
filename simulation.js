/**
 * Galileo Nut Drop Experiment - Physics & Canvas Engine
 * Mô phỏng rơi tự do chính xác theo định luật s = 1/2 * g * t^2
 * Hỗ trợ làm chậm thời gian (Slow-motion), hiệu ứng sóng âm, đồ họa kim loại sắc nét.
 */

// Polyfill an toàn cho CanvasRenderingContext2D.roundRect
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'number') r = [r, r, r, r];
        const [tl, tr, br, bl] = r || [0, 0, 0, 0];
        this.moveTo(x + tl, y);
        this.lineTo(x + w - tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + tr);
        this.lineTo(x + w, y + h - br);
        this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
        this.lineTo(x + bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - bl);
        this.lineTo(x, y + tl);
        this.quadraticCurveTo(x, y, x + tl, y);
        this.closePath();
        return this;
    };
}

class NutSimulation {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Thông số vật lý
        this.g = options.g || 9.8; // m/s^2
        this.playbackSpeed = options.speed || 0.25; // Mặc định chạy chậm 0.25x để học sinh nghe cực rõ

        // Chế độ hiển thị: 'both' (cả hai dây), 'square' (dây tỉ lệ t^2), 'equal' (dây cách đều)
        this.mode = options.mode || 'both';

        // Trạng thái mô phỏng
        this.isRunning = false;
        this.isFinished = false;
        this.simTime = 0; // Thời gian vật lý thực trong mô phỏng (giây)
        this.lastFrameTime = 0;
        this.animationId = null;

        // Callback khi có đai ốc chạm sàn
        this.onNutHit = options.onNutHit || null;
        this.onSimulationEnd = options.onSimulationEnd || null;
        this.onTimeUpdate = options.onTimeUpdate || null;

        // Cấu hình các dây đai ốc
        // Dây 1: Tỉ lệ t^2 (9, 36, 81, 144, 225 cm)
        this.squareStringDistances = [0.09, 0.36, 0.81, 1.44, 2.25]; // Đơn vị: mét
        // Dây 2: Cách đều 40 cm (40, 80, 120, 160, 200, 240 cm)
        this.equalStringDistances = [0.40, 0.80, 1.20, 1.60, 2.00, 2.40]; // Đơn vị: mét

        // Danh sách đai ốc
        this.stringSquare = [];
        this.stringEqual = [];

        // Hiệu ứng hạt / sóng âm va chạm
        this.impactEffects = [];

        // Tùy chọn hiển thị
        this.showRuler = true;
        this.showGuideLines = true;
        this.showVelocities = true;
        this.showHeights = true;

        this.initCanvasSize();
        // Không gọi onTimeUpdate trong constructor để tránh TDZ khi app.js chưa gán xong biến sim
        this.reset(false);

        // Lắng nghe resize
        window.addEventListener('resize', () => {
            this.initCanvasSize();
            this.draw();
        });
    }

    initCanvasSize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width || this.canvas.clientWidth || 600;
        this.height = rect.height || this.canvas.clientHeight || 640;
        this.canvas.width = Math.floor(this.width * dpr);
        this.canvas.height = Math.floor(this.height * dpr);
        if (this.ctx) {
            if (this.ctx.resetTransform) {
                this.ctx.resetTransform();
            } else {
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
            this.ctx.scale(dpr, dpr);
        }
    }

    reset(notify = true) {
        this.isRunning = false;
        this.isFinished = false;
        this.simTime = 0;
        this.lastFrameTime = 0;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.impactEffects = [];

        // Khởi tạo đai ốc dây tỉ lệ t^2
        this.stringSquare = this.squareStringDistances.map((dist, idx) => ({
            id: `sq_${idx + 1}`,
            index: idx + 1,
            type: 'square',
            initialHeight: dist, // mét
            currentHeight: dist,
            velocity: 0,
            hasHit: false,
            hitTime: null,
            expectedHitTime: Math.sqrt((2 * dist) / this.g),
            color: '#3b82f6', // Xanh dương hiện đại
            name: `Đai ốc ${idx + 1} (${Math.round(dist * 100)}cm)`
        }));

        // Khởi tạo đai ốc dây cách đều
        this.stringEqual = this.equalStringDistances.map((dist, idx) => ({
            id: `eq_${idx + 1}`,
            index: idx + 1,
            type: 'equal',
            initialHeight: dist,
            currentHeight: dist,
            velocity: 0,
            hasHit: false,
            hitTime: null,
            expectedHitTime: Math.sqrt((2 * dist) / this.g),
            color: '#f97316', // Cam rực rỡ
            name: `Đai ốc ${idx + 1} (${Math.round(dist * 100)}cm)`
        }));

        this.draw();
        if (notify && this.onTimeUpdate) {
            this.onTimeUpdate(this.simTime);
        }
    }

    setMode(mode) {
        this.mode = mode;
        this.draw();
    }

    setGravity(g) {
        this.g = Math.max(0.1, g);
        this.reset(true);
    }

    setSpeed(speed) {
        this.playbackSpeed = speed;
    }

    start() {
        if (this.isRunning) return;
        if (this.isFinished) {
            this.reset(true);
        }
        if (window.soundEngine) {
            window.soundEngine.resume();
            window.soundEngine.playReleaseSound();
        }
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.animationId = requestAnimationFrame((ts) => this.loop(ts));
    }

    pause() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        const deltaMs = Math.min(Math.max(timestamp - this.lastFrameTime, 0), 100);
        this.lastFrameTime = timestamp;

        // Thời gian vật lý tăng theo tốc độ playbackSpeed
        const dt = (deltaMs / 1000) * this.playbackSpeed;
        this.simTime += dt;

        // Cập nhật vật lý
        this.updatePhysics(dt);

        // Vẽ frame
        this.draw();

        // Cập nhật giao diện
        if (this.onTimeUpdate) {
            this.onTimeUpdate(this.simTime);
        }

        // Kiểm tra kết thúc
        let allDone = true;
        const activeLists = [];
        if (this.mode === 'both' || this.mode === 'square') activeLists.push(this.stringSquare);
        if (this.mode === 'both' || this.mode === 'equal') activeLists.push(this.stringEqual);

        if (activeLists.length === 0) {
            allDone = false;
        } else {
            for (const list of activeLists) {
                if (!list || list.length === 0) {
                    allDone = false;
                    break;
                }
                for (const nut of list) {
                    if (!nut.hasHit) {
                        allDone = false;
                        break;
                    }
                }
            }
        }

        if (allDone) {
            this.isRunning = false;
            this.isFinished = true;
            if (this.onSimulationEnd) {
                this.onSimulationEnd(this.simTime);
            }
            return;
        }

        this.animationId = requestAnimationFrame((ts) => this.loop(ts));
    }

    updatePhysics(dt) {
        // Quãng đường rơi của cả hệ thống dây: s = 0.5 * g * t^2
        const fallDist = 0.5 * this.g * this.simTime * this.simTime;
        const currentVel = this.g * this.simTime;

        const checkList = (nuts) => {
            for (const nut of nuts) {
                if (nut.hasHit) continue;

                // Chiều cao hiện tại so với sàn
                const newHeight = nut.initialHeight - fallDist;

                if (newHeight <= 0) {
                    // Đai ốc chạm sàn!
                    nut.hasHit = true;
                    nut.currentHeight = 0;
                    // Thời điểm va chạm lý thuyết chuẩn xác
                    nut.hitTime = nut.expectedHitTime;
                    nut.velocity = this.g * nut.expectedHitTime;

                    // Hiệu ứng âm thanh
                    if (window.soundEngine) {
                        const pitchMod = 1.0 + (nut.index - 3) * 0.04;
                        window.soundEngine.playNutImpact(nut.velocity, pitchMod);
                    }

                    // Thêm hiệu ứng chấn động trực quan tại vị trí mâm hứng
                    this.addImpactEffect(nut);

                    // Báo hiệu ra controller ngoài
                    if (this.onNutHit) {
                        this.onNutHit(nut);
                    }
                } else {
                    nut.currentHeight = newHeight;
                    nut.velocity = currentVel;
                }
            }
        };

        if (this.mode === 'both' || this.mode === 'square') {
            checkList(this.stringSquare);
        }
        if (this.mode === 'both' || this.mode === 'equal') {
            checkList(this.stringEqual);
        }

        // Cập nhật hiệu ứng hạt / sóng âm
        for (let i = this.impactEffects.length - 1; i >= 0; i--) {
            const ef = this.impactEffects[i];
            ef.age += dt;
            ef.radius += ef.speed * dt;
            ef.alpha = Math.max(0, 1 - ef.age / ef.lifetime);
            if (ef.age >= ef.lifetime) {
                this.impactEffects.splice(i, 1);
            }
        }
    }

    addImpactEffect(nut) {
        const x = this.getStringX(nut.type);
        const floorY = this.getFloorY();

        // Vòng sóng âm xung kích lan rộng
        this.impactEffects.push({
            x: x,
            y: floorY,
            radius: 8,
            speed: 120, // px/s
            lifetime: 0.35,
            age: 0,
            alpha: 1,
            color: nut.color
        });

        // Vài tia sáng tóe ra
        for (let i = 0; i < 6; i++) {
            const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
            const speed = 60 + Math.random() * 80;
            this.impactEffects.push({
                x: x,
                y: floorY - 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2.5,
                lifetime: 0.25,
                age: 0,
                alpha: 1,
                isSpark: true,
                color: '#facc15'
            });
        }
    }

    getFloorY() {
        return this.height - 75; // Sàn mâm kim loại
    }

    getCeilingY() {
        return 50; // Giá treo đỉnh
    }

    getMaxHeightMeters() {
        return 2.6; // mét
    }

    metersToPixels(m) {
        const floorY = this.getFloorY();
        const ceilY = this.getCeilingY();
        const availablePx = Math.max(10, floorY - ceilY);
        const scale = availablePx / this.getMaxHeightMeters();
        return m * scale;
    }

    getStringX(type) {
        if (this.mode === 'square') {
            return this.width * 0.55;
        } else if (this.mode === 'equal') {
            return this.width * 0.55;
        } else {
            return type === 'square' ? this.width * 0.42 : this.width * 0.72;
        }
    }

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const floorY = this.getFloorY();
        const ceilY = this.getCeilingY();

        ctx.clearRect(0, 0, w, h);

        // Nền tối hiện đại
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Lưới tọa độ mờ
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let y = ceilY; y <= floorY; y += 40) {
            ctx.beginPath();
            ctx.moveTo(50, y);
            ctx.lineTo(w - 20, y);
            ctx.stroke();
        }
        ctx.restore();

        // 2. Thước đo vật lý
        if (this.showRuler) {
            this.drawRuler();
        }

        // 3. Giá đỡ kim loại
        this.drawStand();

        // 4. Mâm hứng kim loại
        this.drawMetalTrays();

        // 5. Các dây và đai ốc
        if (this.mode === 'both' || this.mode === 'square') {
            this.drawNutString(this.stringSquare, 'square');
        }
        if (this.mode === 'both' || this.mode === 'equal') {
            this.drawNutString(this.stringEqual, 'equal');
        }

        // 6. Hiệu ứng sóng âm & tia sáng
        this.drawEffects();

        // 7. HUD
        this.drawHUD();
    }

    drawStand() {
        const ctx = this.ctx;
        const floorY = this.getFloorY();
        const ceilY = this.getCeilingY();
        const standX = 100;

        ctx.save();
        const poleGrad = ctx.createLinearGradient(standX - 8, 0, standX + 8, 0);
        poleGrad.addColorStop(0, '#64748b');
        poleGrad.addColorStop(0.4, '#e2e8f0');
        poleGrad.addColorStop(1, '#475569');
        ctx.fillStyle = poleGrad;
        ctx.fillRect(standX - 6, ceilY - 20, 12, Math.max(10, floorY - ceilY + 45));

        const baseGrad = ctx.createLinearGradient(standX - 45, 0, standX + 45, 0);
        baseGrad.addColorStop(0, '#334155');
        baseGrad.addColorStop(0.5, '#64748b');
        baseGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(standX - 45, floorY + 18, 90, 16);

        const barGrad = ctx.createLinearGradient(0, ceilY - 22, 0, ceilY - 10);
        barGrad.addColorStop(0, '#94a3b8');
        barGrad.addColorStop(1, '#475569');
        ctx.fillStyle = barGrad;
        ctx.fillRect(standX - 10, ceilY - 22, Math.max(50, this.width - standX - 30), 12);

        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(standX - 12, ceilY - 25, 24, 18);
        ctx.restore();
    }

    drawRuler() {
        const ctx = this.ctx;
        const rulerX = 55;
        const floorY = this.getFloorY();

        ctx.save();
        const rGrad = ctx.createLinearGradient(rulerX - 18, 0, rulerX + 6, 0);
        rGrad.addColorStop(0, '#eab308');
        rGrad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = rGrad;
        ctx.fillRect(rulerX - 18, this.getCeilingY() - 10, 24, Math.max(10, floorY - this.getCeilingY() + 10));

        ctx.fillStyle = '#0f172a';
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let cm = 0; cm <= 250; cm += 10) {
            const m = cm / 100;
            const y = floorY - this.metersToPixels(m);
            if (y < this.getCeilingY() - 15) break;

            const isMajor = cm % 20 === 0;
            const lineLen = isMajor ? 12 : 6;

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = isMajor ? 1.5 : 1;
            ctx.beginPath();
            ctx.moveTo(rulerX + 6, y);
            ctx.lineTo(rulerX + 6 - lineLen, y);
            ctx.stroke();

            if (isMajor && cm > 0) {
                ctx.fillText(cm.toString(), rulerX - 8, y);
            }
        }

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        ctx.fillText('cm', rulerX - 2, this.getCeilingY() - 4);
        ctx.restore();
    }

    drawMetalTrays() {
        const ctx = this.ctx;
        const floorY = this.getFloorY();

        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, floorY + 15, this.width, Math.max(10, this.height - floorY - 15));
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, floorY + 15);
        ctx.lineTo(this.width, floorY + 15);
        ctx.stroke();

        const drawTray = (x, color, label) => {
            const trayWidth = 90;
            const trayHeight = 12;
            const tx = x - trayWidth / 2;
            const ty = floorY;

            const trayGrad = ctx.createLinearGradient(tx, ty, tx, ty + trayHeight);
            trayGrad.addColorStop(0, '#94a3b8');
            trayGrad.addColorStop(0.3, '#f1f5f9');
            trayGrad.addColorStop(1, '#475569');
            ctx.fillStyle = trayGrad;

            ctx.beginPath();
            ctx.roundRect(tx, ty, trayWidth, trayHeight, 4);
            ctx.fill();

            ctx.strokeStyle = color;
            ctx.lineWidth = 1.8;
            ctx.stroke();

            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x - 25, ty + trayHeight, 50, 4);

            ctx.fillStyle = '#cbd5e1';
            ctx.font = '11px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, ty + 28);
        };

        if (this.mode === 'both' || this.mode === 'square') {
            const x = this.getStringX('square');
            drawTray(x, '#38bdf8', 'Mâm Dây tỉ lệ t²');
        }
        if (this.mode === 'both' || this.mode === 'equal') {
            const x = this.getStringX('equal');
            drawTray(x, '#fb923c', 'Mâm Dây cách đều');
        }

        ctx.restore();
    }

    drawNutString(nuts, type) {
        if (!nuts || nuts.length === 0) return;
        const ctx = this.ctx;
        const x = this.getStringX(type);
        const floorY = this.getFloorY();
        const ceilY = this.getCeilingY();

        ctx.save();

        const highestNut = nuts[nuts.length - 1];
        const hookY = ceilY - 10;

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 2]);

        ctx.beginPath();
        if (this.simTime === 0) {
            ctx.moveTo(x, hookY);
            ctx.lineTo(x, floorY);
        } else {
            const topStringHeight = (highestNut.initialHeight + 0.15) - 0.5 * this.g * this.simTime * this.simTime;
            const topY = floorY - this.metersToPixels(Math.max(0, topStringHeight));

            ctx.moveTo(x, Math.min(floorY, topY));
            const lowestUnHit = nuts.find(n => !n.hasHit);
            if (lowestUnHit) {
                const lowY = floorY - this.metersToPixels(lowestUnHit.currentHeight);
                ctx.lineTo(x, lowY);
            } else {
                ctx.lineTo(x, floorY);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);

        nuts.forEach((nut, idx) => {
            const nutY = floorY - this.metersToPixels(nut.currentHeight);
            this.drawHexNut(x, nutY, nut);

            if (this.showGuideLines && this.simTime === 0) {
                ctx.strokeStyle = nut.type === 'square' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(251, 146, 60, 0.4)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(60, nutY);
                ctx.lineTo(x - 14, nutY);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            if (this.showHeights) {
                const labelX = nut.type === 'square' ? x - 22 : x + 22;
                const align = nut.type === 'square' ? 'right' : 'left';

                ctx.textAlign = align;
                ctx.font = '11px Inter, system-ui, sans-serif';

                if (!nut.hasHit) {
                    ctx.fillStyle = '#f8fafc';
                    const hCm = Math.round(nut.currentHeight * 100);
                    ctx.fillText(`${hCm} cm`, labelX, nutY + 4);
                } else {
                    ctx.fillStyle = '#4ade80';
                    const tStr = (nut.hitTime || nut.expectedHitTime).toFixed(3) + 's';
                    ctx.fillText(`✓ ${tStr}`, labelX, floorY - (idx * 5) - 6);
                }
            }
        });

        ctx.font = 'bold 13px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        if (type === 'square') {
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('DÂY TỈ LỆ t²', x, ceilY - 30);
            ctx.font = '11px Inter, system-ui, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('(9, 36, 81, 144, 225 cm)', x, ceilY - 14);
        } else {
            ctx.fillStyle = '#fb923c';
            ctx.fillText('DÂY CÁCH ĐỀU', x, ceilY - 30);
            ctx.font = '11px Inter, system-ui, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('(Mỗi đai ốc cách 40 cm)', x, ceilY - 14);
        }

        ctx.restore();
    }

    drawHexNut(cx, cy, nut) {
        const ctx = this.ctx;
        const radius = 10;

        ctx.save();
        ctx.translate(cx, cy);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const nutGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
        if (nut.hasHit) {
            nutGrad.addColorStop(0, '#86efac');
            nutGrad.addColorStop(0.5, '#22c55e');
            nutGrad.addColorStop(1, '#15803d');
        } else if (nut.type === 'square') {
            nutGrad.addColorStop(0, '#93c5fd');
            nutGrad.addColorStop(0.5, '#3b82f6');
            nutGrad.addColorStop(1, '#1d4ed8');
        } else {
            nutGrad.addColorStop(0, '#fed7aa');
            nutGrad.addColorStop(0.5, '#f97316');
            nutGrad.addColorStop(1, '#c2410c');
        }

        ctx.fillStyle = nutGrad;
        ctx.fill();

        ctx.strokeStyle = nut.hasHit ? '#4ade80' : '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nut.index.toString(), 0, -1);

        ctx.restore();
    }

    drawEffects() {
        const ctx = this.ctx;
        ctx.save();

        this.impactEffects.forEach(ef => {
            if (ef.isSpark) {
                ctx.fillStyle = ef.color;
                ctx.globalAlpha = ef.alpha;
                ctx.beginPath();
                ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.strokeStyle = ef.color;
                ctx.globalAlpha = ef.alpha;
                ctx.lineWidth = 2.5 * ef.alpha;

                ctx.beginPath();
                ctx.ellipse(ef.x, ef.y, ef.radius * 1.4, ef.radius * 0.45, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        ctx.restore();
    }

    drawHUD() {
        const ctx = this.ctx;
        ctx.save();

        const boxX = Math.max(10, this.width - 150);
        const boxY = 15;
        const boxW = 135;
        const boxH = 48;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`t = ${this.simTime.toFixed(3)} s`, boxX + 12, boxY + 22);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Inter, system-ui, sans-serif';
        const speedText = this.playbackSpeed === 1 ? '1.0x (Chuẩn)' : `${this.playbackSpeed}x (Làm chậm)`;
        ctx.fillText(`Tốc độ: ${speedText}`, boxX + 12, boxY + 38);

        ctx.restore();
    }
}

window.NutSimulation = NutSimulation;
