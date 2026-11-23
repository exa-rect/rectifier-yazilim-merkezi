# Rectifier Yazılım Merkezi

Indoor ve outdoor rectifier ürünlerinin **app**, **web arayüzü** ve **ayar (config)** dosyaları. Fabrika ve saha ekibi indirme sitesinden her zaman en son kararlı sürümü indirir.

Bu depoya bir dosya yüklediğinizde site 1–2 dakika içinde kendini günceller. Başka bir şey yapmanız gerekmez.

## Yeni yazılım yayınlamak

1. Doğru klasörü açın:

| Ürün | App | Web arayüzü | Ayar dosyası |
| --- | --- | --- | --- |
| Indoor | `urunler/indoor/app/` | `urunler/indoor/web-arayuzu/` | `urunler/indoor/config/` |
| Outdoor | `urunler/outdoor/app/` | `urunler/outdoor/web-arayuzu/` | `urunler/outdoor/config/` |

2. **Add file → Upload files**'a basın, dosyayı sürükleyin, **Commit changes**'e basın.

Bu kadar. 1–2 dakika sonra sitede görünür.

- **En son yüklenen dosya** sitede "Son kararlı" olur. Sabit link de onu indirir.
- Sürüm numarası dosya adından okunur: `..._V213.7.7z` → **v213.7**. Adında `V` numarası olmayan dosyalarda (örn. config) dosya adı gösterilir.
- Eski dosyayı silmezseniz "Tüm sürümler" listesinde kalır, gerektiğinde oradan indirilebilir.
- Yeni yüklediğiniz dosya sorunluysa onu silin (dosyayı açın → **⋯ → Delete file**). Bir önceki dosya otomatik olarak yeniden son sürüm olur.
- Yükledikten sonra depo ana sayfasında son commit'in yanında yeşil tik görünmeli. Kırmızı çarpı çıkarsa tıklayın, sebebi Türkçe yazar (örn. 25 MiB'ı aşan dosya).

### İsteğe bağlı: sürüm notu eklemek

Bir sürüme not veya "test" etiketi eklemek isterseniz dosyayı doğrudan klasöre değil, sürüm klasörüne koyun. Örnek: `urunler/indoor/app/213.8.0/` içine dosya ve şu `surum.json`:

```json
{
  "tarih": "2026-11-23",
  "durum": "test",
  "notlar": ["Bu sürümde ne değişti, kısaca yazın."]
}
```

`durum`: `kararli` (son sürüm olabilir), `test` (sadece geçmişte, sarı uyarıyla), `geri-cekildi` (üstü çizili).

## Linkler

Site adresi: depo **Settings → Pages** sayfasında yazar (`https://<hesap>.github.io/rectifier-yazilim-merkezi/`).

| Link | Ne işe yarar |
| --- | --- |
| `…/rectifier-yazilim-merkezi/` | Ana sayfa |
| `…/rectifier-yazilim-merkezi/#indoor` veya `#outdoor` | Doğrudan ürün sekmesi |
| `…/rectifier-yazilim-merkezi/son/indoor/app/` | **Sabit link:** her zaman Indoor'un son kararlı app dosyasını indirir. Fabrika talimatına veya QR koda bu yazılır. |

Sabit link biçimi: `/son/<indoor|outdoor>/<app|web-arayuzu|config>/`

Site arama motorlarına kapalıdır. Ancak depo herkese açık olduğu için dosyalar GitHub'da da görünür.

## Teknik not

- `ayarlar.json`: site başlığı, bölüm adları ve "Nasıl yüklenir" adımları. Cihaz menüsü değişirse buradan düzenlenir.
- `scripts/build.mjs`: dosyaları kontrol eder, SHA-256 hesaplar, siteyi `dist/` klasörüne üretir. Node 18+ ile çalışır, başka kurulum gerekmez.
- `.github/workflows/yayinla.yml`: her yüklemede bu betiği çalıştırıp siteyi GitHub Pages'e yayınlar.
- Bilgisayarda denemek için: `node scripts/build.mjs` sonra `python -m http.server 8000 -d dist`.
