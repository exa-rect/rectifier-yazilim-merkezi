# Rectifier Yazılım Merkezi

Indoor ve outdoor rectifier ürünlerinin **app**, **web arayüzü** ve **ayar (config)** dosyaları. Fabrika ve saha ekibi indirme sitesinden her zaman en son kararlı sürümü indirir.

Bu depoya bir dosya yüklediğinizde site 1–2 dakika içinde kendini günceller. Başka bir şey yapmanız gerekmez.

## Yeni yazılım yayınlamak

**1. Doğru klasörü açın**

| Ürün | App | Web arayüzü | Ayar dosyası |
| --- | --- | --- | --- |
| Indoor | `urunler/indoor/app/` | `urunler/indoor/web-arayuzu/` | `urunler/indoor/config/` |
| Outdoor | `urunler/outdoor/app/` | `urunler/outdoor/web-arayuzu/` | `urunler/outdoor/config/` |

**2. Sürüm bilgisini oluşturun**

Klasördeyken **Add file → Create new file**'a basın. Ad kutusuna sürüm numarasını ve `surum.json` yazın, örneğin `2.1.2/surum.json`. Eğik çizgiyi yazınca klasör kendiliğinden oluşur. İçine şunu yapıştırın, düzenleyin ve **Commit changes**'e basın:

```json
{
  "tarih": "2026-11-23",
  "durum": "kararli",
  "notlar": [
    "Bu sürümde ne değişti, kısaca yazın."
  ]
}
```

**3. Dosyayı yükleyin**

Yeni oluşan `2.1.2` klasörüne girin. **Add file → Upload files**'a basın, dosyayı sürükleyin ve **Commit changes**'e basın.

**4. Kontrol edin**

Depo ana sayfasında son commit'in yanında önce sarı nokta (çalışıyor), sonra yeşil tik görünür. Kırmızı çarpı çıkarsa tıklayın: neyin yanlış olduğu Türkçe yazar. Genelde eksik virgül, yanlış tarih biçimi ya da 25 MiB'ı aşan dosyadır.

### Durumlar

| `durum` | Sitede ne olur |
| --- | --- |
| `kararli` | En yüksek numaralı kararlı sürüm **Son kararlı** olarak gösterilir. Sabit link onu indirir. |
| `test` | Sadece geçmiş listesinde görünür, üstte sarı "daha yeni test sürümü var" uyarısı çıkar. |
| `geri-cekildi` | Üstü çizili ve kırmızı görünür. Son sürüm otomatik olarak bir önceki kararlı sürüme döner. |

Sorunlu bir sürümü geri çekmek için o sürümün `surum.json` dosyasını açın, kalem simgesine basın, `"durum": "geri-cekildi"` yapın ve kaydedin. Dosyayı silmeyin.

### Kurallar

- Sürüm klasörü her zaman üç sayıdır: `2.1.2`, `9.9.8`, `1.0.0`.
- Yayınlanmış bir dosyayı değiştirmeyin. Düzeltme gerekiyorsa yeni sürüm numarası verin.
- Tek dosya en fazla 25 MiB olabilir.
- İsterseniz `surum.json`'a `"donanim": "V100.0.1 ve üzeri"` satırı ekleyebilirsiniz. Sitede tarihin yanında görünür.

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
