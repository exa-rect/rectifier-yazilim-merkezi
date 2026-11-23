#!/usr/bin/env node
// Rectifier Yazılım Merkezi — site üretici
// urunler/ klasörünü tarar, her sürümü doğrular, SHA-256 hesaplar,
// dist/ içine indirme sitesini ve manifest.json'u yazar.
// Bağımlılık yok: Node 18+ yeterli.  Kullanım:  node scripts/build.mjs

import { readdir, readFile, mkdir, copyFile, writeFile, rm, stat, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URUNLER = path.join(KOK, 'urunler');
const SITE = path.join(KOK, 'site');
const CIKTI = path.join(KOK, 'dist');
const MAX_BOYUT = 25 * 1024 * 1024; // Cloudflare Pages tek dosya sınırı: 25 MiB
const DURUMLAR = ['kararli', 'test', 'geri-cekildi'];
// Site alt klasörde yayınlanıyorsa (GitHub Pages proje sitesi gibi) taban yolu: /depo-adi/
const TABAN = ('/' + (process.env.SITE_TABAN || '').replace(/^\/+|\/+$/g, '') + '/').replace('//', '/');

const hatalar = [];
const uyarilar = [];
const goreli = (p) => path.relative(KOK, p).split(path.sep).join('/');

async function jsonOku(p, zorunlu = true) {
  let metin;
  try { metin = await readFile(p, 'utf8'); }
  catch { if (zorunlu) hatalar.push(`${goreli(p)} bulunamadı.`); return null; }
  try { return JSON.parse(metin.replace(/^﻿/, '')); }
  catch (e) { hatalar.push(`${goreli(p)} geçerli JSON değil: ${e.message} (virgül veya tırnak eksik olabilir).`); return null; }
}

async function klasorler(p) {
  try {
    return (await readdir(p, { withFileTypes: true }))
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => d.name).sort();
  } catch { return []; }
}

const kimlikGecerli = (s) => /^[a-z0-9][a-z0-9-]*$/.test(s);
const surumGecerli = (s) => /^\d+\.\d+\.\d+$/.test(s);
const surumKarsilastir = (a, b) => { // yeniden eskiye
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return y[i] - x[i];
  return 0;
};
const sha256 = async (p) => createHash('sha256').update(await readFile(p)).digest('hex');
const yonlendirme = (hedef) => `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${hedef}"><title>Yönlendiriliyor…</title></head><body><p>Dosya indiriliyor. Başlamazsa <a href="${hedef}">buraya tıklayın</a>.</p></body></html>\n`;

async function main() {
  const ayar = await jsonOku(path.join(KOK, 'ayarlar.json'));
  if (!ayar) return bitir();

  await rm(CIKTI, { recursive: true, force: true });
  await mkdir(CIKTI, { recursive: true });

  const manifest = {
    baslik: ayar.baslik || 'Yazılım Merkezi',
    aciklama: ayar.aciklama || '',
    olusturma: new Date().toISOString(),
    commit: process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || null,
    urunler: [],
  };

  const urunIdleri = await klasorler(URUNLER);
  if (!urunIdleri.length) hatalar.push('urunler/ klasöründe hiç ürün yok.');

  for (const urunId of urunIdleri) {
    const urunDir = path.join(URUNLER, urunId);
    if (!kimlikGecerli(urunId)) hatalar.push(`Ürün klasör adı "${urunId}" geçersiz: küçük harf, rakam ve tire kullanın.`);
    const bilgi = (await jsonOku(path.join(urunDir, 'urun.json'), false)) || {};
    const urun = { id: urunId, ad: bilgi.ad || urunId, aciklama: bilgi.aciklama || '', sira: bilgi.sira ?? 99, kategoriler: [] };

    // Bölümler ayarlar.json'dan gelir; klasörü henüz olmayan bölüm de "henüz yayınlanmadı" olarak görünür.
    const tanimlar = ayar.kategoriler || {};
    for (const katId of await klasorler(urunDir)) {
      if (!tanimlar[katId]) hatalar.push(`urunler/${urunId}/${katId}: "${katId}" bölümü ayarlar.json'da tanımlı değil.`);
    }
    for (const katId of Object.keys(tanimlar)) {
      const tanim = tanimlar[katId];
      const katDir = path.join(urunDir, katId);
      const surumler = [];

      for (const s of await klasorler(katDir)) {
        const sDir = path.join(katDir, s);
        const yer = `urunler/${urunId}/${katId}/${s}`;
        if (!surumGecerli(s)) { hatalar.push(`${yer}: sürüm klasörü 2.1.1 gibi üç sayıdan oluşmalı.`); continue; }
        const sj = await jsonOku(path.join(sDir, 'surum.json'));
        if (!sj) continue;
        if (!DURUMLAR.includes(sj.durum)) hatalar.push(`${yer}/surum.json: "durum" şunlardan biri olmalı: ${DURUMLAR.join(', ')}.`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(sj.tarih || '')) hatalar.push(`${yer}/surum.json: "tarih" YYYY-AA-GG biçiminde olmalı (örn. 2026-11-23).`);

        const girdiler = (await readdir(sDir, { withFileTypes: true }))
          .filter((f) => f.isFile() && f.name !== 'surum.json' && !f.name.startsWith('.'))
          .map((f) => f.name).sort();
        if (!girdiler.length) { hatalar.push(`${yer}: surum.json dışında yüklenecek dosya yok.`); continue; }

        const dosyalar = [];
        for (const ad of girdiler) {
          const kaynak = path.join(sDir, ad);
          const { size } = await stat(kaynak);
          if (size > MAX_BOYUT) { hatalar.push(`${yer}/${ad}: ${(size / 1048576).toFixed(1)} MiB, sınır 25 MiB.`); continue; }
          if (size === 0) uyarilar.push(`${yer}/${ad}: dosya boş.`);
          const hedefDir = path.join(CIKTI, 'dosyalar', urunId, katId, s);
          await mkdir(hedefDir, { recursive: true });
          await copyFile(kaynak, path.join(hedefDir, ad));
          dosyalar.push({ ad, boyut: size, sha256: await sha256(kaynak), yol: `dosyalar/${urunId}/${katId}/${s}/${encodeURIComponent(ad)}` });
        }
        const notlar = Array.isArray(sj.notlar) ? sj.notlar.map(String) : (sj.notlar ? [String(sj.notlar)] : []);
        surumler.push({ surum: s, tarih: sj.tarih, durum: sj.durum, notlar, donanim: sj.donanim || null, dosyalar });
      }

      surumler.sort((a, b) => surumKarsilastir(a.surum, b.surum));
      const son = surumler.find((x) => x.durum === 'kararli') || null;
      if (!son && surumler.length) uyarilar.push(`urunler/${urunId}/${katId}: kararlı sürüm yok, sitede "henüz yayınlanmadı" görünecek.`);

      // Sabit link: /son/<urun>/<kategori>/ her zaman son kararlı sürümün dosyasına gider.
      if (son) {
        const linkDir = path.join(CIKTI, 'son', urunId, katId);
        await mkdir(linkDir, { recursive: true });
        const hedef = son.dosyalar.length === 1 ? `${TABAN}${son.dosyalar[0].yol}` : `${TABAN}#${urunId}`;
        await writeFile(path.join(linkDir, 'index.html'), yonlendirme(hedef));
      }

      urun.kategoriler.push({
        id: katId, ad: tanim.ad || katId, aciklama: tanim.aciklama || '', kurulum: tanim.kurulum || [],
        sira: tanim.sira ?? 99, son: son ? son.surum : null, sabitLink: son ? `son/${urunId}/${katId}/` : null, surumler,
      });
    }
    urun.kategoriler.sort((a, b) => a.sira - b.sira);
    manifest.urunler.push(urun);
  }
  manifest.urunler.sort((a, b) => a.sira - b.sira);

  if (hatalar.length) return bitir();

  await cp(SITE, CIKTI, { recursive: true });
  await writeFile(path.join(CIKTI, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(path.join(CIKTI, '_headers'),
    '/*\n  X-Robots-Tag: noindex, nofollow\n/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/manifest.json\n  Cache-Control: no-cache\n/son/*\n  Cache-Control: no-cache\n/dosyalar/*\n  Cache-Control: public, max-age=86400\n');

  bitir(manifest);
}

function bitir(manifest) {
  for (const u of uyarilar) console.warn(`UYARI  ${u}`);
  if (hatalar.length) {
    console.error(`\n${hatalar.length} hata bulundu, site yayınlanmadı:\n`);
    for (const h of hatalar) console.error(`  ✗ ${h}`);
    console.error('');
    process.exit(1);
  }
  for (const u of manifest.urunler) {
    console.log(`${u.ad}`);
    for (const k of u.kategoriler) console.log(`  ${k.ad.padEnd(32)} son kararlı: ${k.son || '-'}  (${k.surumler.length} sürüm)`);
  }
  console.log(`\nSite hazır: ${goreli(CIKTI)}/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
