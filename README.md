# THÍ NGHIỆM ẢO: DÂY ĐAI ỐC GALILEO (RƠI TỰ DO & TIẾT TẤU ÂM THANH)

Ứng dụng web mô phỏng thí nghiệm vật lý cổ điển nổi tiếng của nhà bác học Galileo Galilei nhằm khảo sát quy luật rơi tự do $s = \frac{1}{2}gt^2$ thông qua thính giác và nhịp điệu âm thanh va chạm.

---

## 🌟 1. Vấn đề thực tế và Giải pháp của Thí nghiệm ảo

- **Vấn đề thực tế:** Khi làm thí nghiệm thực với sợi dây treo đai ốc, tổng thời gian rơi từ độ cao ~2.25 mét chỉ diễn ra trong vỏn vẹn **khoảng 0.68 giây**! Với tốc độ rơi chớp nhoáng như vậy, tai người rất khó bắt kịp và phân biệt rõ nhịp điệu đều đặn của dây tỉ lệ $t^2$ so với sự dồn dập của dây cách đều. Ngoài ra, việc đo đạc thủ công các khoảng cách $9\text{ cm}, 36\text{ cm}, 81\text{ cm}, 144\text{ cm}, 225\text{ cm}$ ngoài đời dễ bị sai số do độ võng của dây hoặc độ nảy của đai ốc.
- **Giải pháp của ứng dụng AI / Thí nghiệm ảo:**
  1. **Tính năng Làm chậm thời gian (Slow-Motion 0.25x / 0.1x / 0.5x):** Kéo dài thời gian rơi một cách mượt mà và chính xác, giúp học sinh nghe rành rọt từng tiếng *"CẠCH ... CẠCH ... CẠCH"* vang lên như tiếng máy đếm nhịp (Metronome).
  2. **Băng ghi nhịp điệu âm thanh (Rhythm Audio Track Visualizer):** Vẽ lại các xung âm thanh nổ ra theo trục thời gian thực, trực quan hóa nhịp điệu bằng mắt: các vạch của dây $t^2$ cách đều tăm tắp, trong khi dây đều dồn ứ về sau.
  3. **Âm thanh tổng hợp Web Audio API chân thực:** Không cần nạp tệp MP3 bên ngoài, tự động tổng hợp âm va chạm kim loại đai ốc với khay thiếc, chuông đồng, khối gỗ hoặc metronome.
  4. **Bảng số liệu thời gian thực & Đồ thị phân tích:** Tính toán chuẩn xác $s$, $t$, $\Delta t$, $v$.

---

## 📐 2. Cơ sở lý thuyết vật lý

### A. Dây tỉ lệ bình phương thời gian ($s \propto t^2$)
- Vị trí các đai ốc cách đáy dây lần lượt là:
  - Đai ốc 1: $s_1 = 9\text{ cm} = 1^2 \times 9\text{ cm}$
  - Đai ốc 2: $s_2 = 36\text{ cm} = 2^2 \times 9\text{ cm}$
  - Đai ốc 3: $s_3 = 81\text{ cm} = 3^2 \times 9\text{ cm}$
  - Đai ốc 4: $s_4 = 144\text{ cm} = 4^2 \times 9\text{ cm}$
  - Đai ốc 5: $s_5 = 225\text{ cm} = 5^2 \times 9\text{ cm}$
- Thời điểm chạm sàn: $t_n = \sqrt{\frac{2 s_n}{g}} = n \cdot \sqrt{\frac{2 \times 0.09}{9.8}} \approx n \times 0.1355\text{ s}$.
- Khoảng cách thời gian giữa 2 tiếng cạch liên tiếp:
  $$\Delta t = t_n - t_{n-1} = \text{const} \approx 0.136\text{ s}$$
  $\Rightarrow$ **Tiếng cạch phát ra đều đặn chằn chặn như nhịp tim / máy gõ nhịp!**
- Khoảng cách giữa các đai ốc liền kề tuân theo **Quy luật số lẻ của Galileo**:
  $$1 : 3 : 5 : 7 : 9 \quad (9\text{cm}, 27\text{cm}, 45\text{cm}, 63\text{cm}, 81\text{cm})$$

### B. Dây cách đều ($40\text{ cm}$)
- Vị trí các đai ốc: $40\text{ cm}, 80\text{ cm}, 120\text{ cm}, 160\text{ cm}, 200\text{ cm}, 240\text{ cm}$.
- Thời điểm va chạm: $t_n = \sqrt{\frac{2 \cdot (n \cdot 0.4)}{g}}$.
- Khoảng thời gian $\Delta t$ liên tục giảm:
  $$0.286\text{ s} \longrightarrow 0.118\text{ s} \longrightarrow 0.091\text{ s} \longrightarrow 0.076\text{ s} \longrightarrow 0.067\text{ s} \longrightarrow 0.061\text{ s}$$
  $\Rightarrow$ **Tiếng cạch dồn dập, gấp gáp về cuối do vận tốc tăng dần ($v = gt$).**

---

## 🚀 3. Hướng dẫn sử dụng

1. **Khởi chạy ứng dụng:**
   - Chỉ cần nhấp đúp chuột vào tệp `index.html` trong thư mục `D:/Download/DuAn` để mở trực tiếp trong bất kỳ trình duyệt web nào (Google Chrome, Microsoft Edge, Firefox, Cốc Cốc...).
   - Không cần cài đặt `node_modules` hay phần mềm bổ sung, hoạt động hoàn toàn offline 100%.

2. **Các bước tiến hành bài học:**
   - **Bước 1:** Bật âm thanh, bấm nút **"▶ Thử tiếng cạch"** để kiểm tra loa.
   - **Bước 2:** Chọn tốc độ **0.25x ★ (Khuyên dùng)** để tai nghe rõ nhất.
   - **Bước 3:** Nhấn nút **"Thả dây (Bắt đầu)"**.
   - **Bước 4:** Lắng nghe tiết tấu âm thanh và quan sát chuyển động của hai dây đai ốc.
   - **Bước 5:** Đối chiếu trên **Băng ghi nhịp điệu âm thanh** và **Bảng số liệu** để rút ra kết luận khoa học.

---

## 📁 4. Cấu trúc thư mục

- `index.html`: Giao diện chính của ứng dụng thí nghiệm ảo.
- `style.css`: Bộ giao diện phòng thí nghiệm hiện đại, tối giản, tương thích mọi màn hình.
- `audio.js`: Bộ tổng hợp âm thanh bằng Web Audio API (âm kim loại, chuông, metronome).
- `simulation.js`: Động cơ mô phỏng vật lý và kết xuất Canvas đồ họa 2D.
- `app.js`: Bộ điều phối giao diện, kết nối thời gian thực giữa mô phỏng, âm thanh, biểu đồ và bảng dữ liệu.
- `README.md`: Tài liệu hướng dẫn sử dụng và giải thích kiến thức vật lý.
