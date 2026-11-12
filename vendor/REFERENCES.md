# Reference repos (style target: Image 1 → Game Image 2)

## Style name (รูป 1)

**Top-down / ¾ chibi pixel characters** — แนว **RPG Maker MV/MZ** + **Stardew Valley-like**

| คุณสมบัติ | ค่า |
|-----------|------|
| Perspective | Top-down / ¾ (มองเฉียงลง) |
| Proportion | Chibi (หัวใหญ่ ตัวเล็ก) |
| Use | Overworld walk 4 ทิศ |
| Typical size | 32×32 / 48×48 / 64×64 ต่อเฟรม |
| Sheet | กริดทิศ × เฟรมเดิน |

ใช้ประกอบเกมแนว cozy life sim (รูป 2) ได้สำหรับ **ตัวละครเดินในแมพ / NPC**  
หมายเหตุ: ม็อกอัปรูป 2 เป็นฉากข้างทางน้ำแบบ side composition — ถ้าต้องการแอนิเมชัน side-view เต็มรูปแบบ ต้องมีชีตมุมข้างแยกต่างหากในอนาคต แต่สไตล์พิกเซล chibi ตั้งต้นจากรูป 1

## Repos ในโฟลเดอร์นี้

รัน `npm run vendor:fetch` เพื่อ clone / อัปเดตทั้งหมด

| โฟลเดอร์ | Repo | สถานะ | ใช้ทำอะไรกับ Easy Sprite |
|----------|------|--------|---------------------------|
| `universal-lpc-generator` | [LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) | cloned | **คลังพาร์ทหลัก** ผม/ตัว/ชุด modular — ใกล้สไตล์รูป 1 ที่สุด |
| `pixygoat` | [FosselDev/pixygoat](https://github.com/FosselDev/pixygoat) | cloned | UX catalog + preview หลายแอนิเมชัน + paperdoll export |
| `pixeldoll` | [Shilo/PixelDoll](https://github.com/Shilo/PixelDoll) | cloned | paperdoll + export Godot/Unity/RPG Maker |
| `spritebrew` | [GAlbanese09/spritebrew](https://github.com/GAlbanese09/spritebrew) | cloned | export หลายฟอร์แมต |
| `pixabots` | [pablostanley/pixabots](https://github.com/pablostanley/pixabots) | cloned | UI composer เลเยอร์แบบบาง |

เปิดดู LPC ได้ที่ `vendor/universal-lpc-generator` (อ่าน README ของเขา) แล้วคัดพาร์ทมาใส่ `parts/<slot>/<id>/`

## License ระวัง

- **LPC art** ไม่ใช่ของ Easy Sprite — แต่ละเลเยอร์เป็น CC0 / CC-BY / CC-BY-SA / OGA-BY / GPL
- เวลาเอาพาร์ท LPC เข้าเกม **ต้องเก็บ credits** จาก generator
- โค้ด Easy Sprite เองแยกต่างหากจาก license ของ art

## วิธีใช้กับโปรเจกต์นี้

1. เปิด LPC generator ใน `universal-lpc-generator` (ตาม README ของเขา) เลือกชิ้นส่วน
2. Export / คัดลอกเลเยอร์ที่ต้องการ
3. จัดเป็น `parts/<slot>/<id>/sheet.png` + `part.json` ตามสเปก Easy Sprite
4. ประกอบใน UI local → export เข้าเกม
