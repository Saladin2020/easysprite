# Art style target

## รูปอ้างอิงตัวละคร (source style)

เรียกว่าอะไรก็ได้ในทีม แต่ชื่อกลางที่ตรงที่สุด:

**RPG Maker–style top-down ¾ chibi pixel**

ใกล้เคียง: Stardew Valley overworld sprites, RPG Maker MV/MZ characters, Liberated Pixel Cup (LPC)

### Checklist สไตล์ (top-down)

- [ ] มุมมองกึ่งบน (¾) — ถ้าต้องการ side-view ให้ใช้โหมด Side-view ด้านล่าง
- [ ] หัวใหญ่ ตัวสั้น (chibi)
- [ ] Outline ชัด + shading น้อยชั้น
- [ ] มี 4 ทิศ: หน้า / หลัง / ซ้าย / ขวา
- [ ] มี walk cycle (อย่างน้อย idle + 2–3 เฟรมเดิน)
- [ ] พื้นหลังโปร่งใสตอนใช้งานจริง
- [ ] ขนาดเฟรมคงที่ทั้งโปรเจกต์ (แนะนำเริ่ม 48 หรือ 64)

## โหมด Side-view (side-scroller chibi)

สำหรับฉากเดินด้านข้าง เช่นหมู่บ้านไทยแบบ HD-2D / platformer

- [ ] ยังเป็น chibi แต่หัวเล็กลง ขาและลำตัวยาวขึ้น (`BODY_SIDE` ใน `src/lib/sprite/rig.ts`)
- [ ] พื้นอยู่ที่แถว 44 จาก 48 (ต่ำกว่า top-down 2px) เพื่อยืนบนเส้นพื้นของฉาก
- [ ] แถว: `right` / `left` (mirror) / `front` (ไว้หันหน้าคุยกับกล้อง)
- [ ] id ขึ้นต้น `side_` และ `part.json` มี `"view": "side"`
- [ ] export RPG Maker ไม่รองรับ (ต้องมี 4 ทิศ) — ใช้ native / Godot / frames

## เกมเป้าหมาย (รูป 2)

Cozy life simulation / village RPG (ฉากไทย ร้านค้า เควส UI)

ตัวละครจากสไตล์รูป 1 เหมาะกับ:

- ผู้เล่น / NPC เดินในแมพ
- สลับเสื้อผ้า (paperdoll slots)
- Export เข้า Godot / Unity / RPG Maker

ฉากตึก/พื้นหลังของรูป 2 เป็นคนละ pipeline (tiles / props) — Easy Sprite โฟกัสตัวละครอย่างเดียว
