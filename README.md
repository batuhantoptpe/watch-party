# Cinemate

Uzaktaki iki (ya da daha fazla) kişinin, herhangi bir internet sitesindeki
filmi/diziyi kendi cihazlarından, kalite kaybı olmadan senkron izlemesi için
bir Chrome eklentisi + relay sunucusu.

Video/ses hiçbir zaman sunucudan geçmez — her taraf videoyu kendi
internetinden çeker, sunucu sadece play/pause/seek gibi küçük kontrol
sinyallerini iletir.

Protokol detayları için [docs/PROTOCOL.md](docs/PROTOCOL.md).

## Kurulum

```
npm install
```

## Sunucuyu çalıştırma

```
npm run dev:server
```

- Relay sunucu: `http://localhost:8080`
- Eklentisiz protokol test sayfası: `http://localhost:8080/test.html` (iki
  sekmede açıp oda oluştur/katıl ile senkronu deneyebilirsiniz)

## Eklentiyi geliştirme / yükleme

```
npm run build:extension
```

Ardından Chrome'da `chrome://extensions` → Geliştirici modu → **Paketlenmemiş
öğe yükle** → `extension/dist` klasörünü seçin.

İki farklı kişiyi simüle etmek için iki ayrı Chrome profili kullanıp her
ikisine de eklentiyi yükleyin.

## Kullanım

1. Sunucuyu çalıştırın.
2. Bir sitede (ör. bir film sitesi) videoyu açın.
3. Eklenti ikonuna tıklayıp **Film Gecesi Başlat** deyin, oluşan kodu paylaşın.
4. Karşı taraf aynı videoyu kendi tarayıcısında açıp eklenti ikonuna tıklayarak
   kodu girip **Katıl** desin.
5. Biriniz play/pause/ileri-geri sararsa diğerinde de aynısı olur.

## Bilinen sınırlamalar

`docs/PROTOCOL.md` içindeki "Known limitations" bölümüne bakın (DRM'li
platformlar, davet linkinin otomatik eklenti açamaması, reconnect sonrası
peerId değişimi).
