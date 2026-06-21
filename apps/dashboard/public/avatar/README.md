# Karakter Avatarı — Asset Üretim Spec'i (ComfyUI)

Modüler full-body avatar. Oyuncu her kategoriden bir parça seçer; katmanlar z-sırasına göre
üst üste bindirilir. Bu klasördeki dosyalar `apps/dashboard/lib/avatar.ts` manifest'i ile eşleşir.

## Teknik şartlar (HEPSİ için sabit)
- **Boyut:** 1024×1024 px, **şeffaf PNG** (alpha). (Şu an placeholder olarak `.svg` var.)
- **Çerçeveleme:** Tam boy (full-body), karakter **ortalı**, ön cephe.
- **Ortak anchor (tüm katmanlar aynı):**
  - Kafa merkezi: **(512, 200)**, kafa yarıçapı ~**110 px**
  - Boyun: ~(512, 300) · Omuzlar: y≈**340** · Torso: x **384–640**, y **330–630**
  - Kalça: y≈**640** · Bacaklar: y **610–960** · Ayaklar: y≈**960**
- Her parça **kendi kategorisinin bölgesini** doldurur, gerisi şeffaf kalır.

## Kategoriler ve z-sırası (küçük = altta)
| z | kategori | dosya yolu | not |
|---|----------|-----------|-----|
| 0 | `body` (Gövde) | `body/body-XX.png` | ten/vücut tabanı, baştan ayağa silüet |
| 10 | `outfit` (Kıyafet) | `outfit/outfit-XX.png` | torso + kollar + bacak üstü |
| 20 | `face` (Yüz) | `face/face-XX.png` | sadece kafa bölgesinde göz/ağız/ifade |
| 30 | `hair` (Saç) | `hair/hair-XX.png` | kafanın üstü/yanı |
| 40 | `headwear` (Başlık) | `headwear/headwear-XX.png` | şapka/maske — en üstte (opsiyonel) |

## Stil tutarlılığı (en kritik!)
AI ile ayrı ayrı üretirken parçaların **aynı stilde + aynı silüete** oturması şart:
1. **Tek checkpoint + (varsa) karakter LoRA + sabit stil prompt prefix'i** — tüm üretimlerde aynı.
   Tema: *neon dark carnival, stylized, painterly, clean edges*.
2. Önce **bir BASE gövde** üret ve sabit poz referansı yap. Diğer parçaları **ControlNet
   (OpenPose / lineart / depth)** ile bu poza bağlayarak üret → hepsi aynı vücuda oturur.
3. Pratik yol: her parça için **tüm karakteri o parçayla** üret, sonra **rembg / SAM** ile
   **sadece o parçayı maskele** → hizalama garanti, kalan şeffaf.
4. Çıktıyı **alpha'lı PNG** olarak ver (arka plan tamamen şeffaf).

## Yeni parça ekleme
1. PNG'yi doğru klasöre koy (örn. `hair/hair-03.png`).
2. `apps/dashboard/lib/avatar.ts` içindeki ilgili kategoriye bir satır ekle:
   `{ id: "hair-03", label: "Örgü", file: f("hair", "hair-03") }`
   ve `const f = (cat, id) => \`/avatar/${cat}/${id}.svg\`` → uzantıyı `.png` yap (placeholder'lar gidince).
3. Panelde otomatik seçenek olarak çıkar.

## Notlar
- Placeholder'lar `.svg`; gerçek asset gelince `lib/avatar.ts`'teki uzantıyı `.png` yapmak yeterli.
- v1'de avatar **kozmetik**; ekipman/güç/stage kod ile çizilen çerçeve+rozetlerle gösterilir.
- İleride "gear bedende görünsün" istenirse: `weapon/`, `armor/` gibi yeni kategoriler + slot eşlemesi.
