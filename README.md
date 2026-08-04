# AZG İLETİŞİM ŞANTİYE — Proje Takip Sistemi

Production kalitesinde şantiye proje aşama takip uygulaması.

## Teknoloji

- Next.js 15 (App Router) + TypeScript
- TailwindCSS + shadcn/ui tarzı bileşenler
- Supabase (Auth + PostgreSQL + RLS)
- React Hook Form + Zod
- TanStack Query + TanStack Table
- Framer Motion + Lucide + Sonner

## Kurulum

1. Bağımlılıklar:
   ```bash
   npm install
   ```

2. Ortam değişkenleri:
   ```bash
   cp .env.example .env.local
   ```
   Supabase Dashboard → Settings → API içinden `anon` key değerini yapıştırın.

3. Veritabanı migration:
   Supabase SQL Editor’da şu dosyayı çalıştırın:
   `supabase/migrations/20260804000001_create_santiye_project_schema.sql`

4. Auth kullanıcı oluşturun (Supabase Auth → Users).

5. Geliştirme sunucusu:
   ```bash
   npm run dev
   ```

## Özellikler (v1)

- Login / Logout / Şifre sıfırlama / Session koruması
- Dashboard istatistik kartları
- Proje CRUD + firma Proje ID (manuel)
- Mevki manuel giriş + öneri
- 4 sabit + 4 manuel proje türü
- Durumlar: Bekliyor, Devam Ediyor, Kazı İzni Bekliyor, Gecikmiş, Tamamlandı
- Tamamlanan projeler otomatik arşiv
- Arama, filtre, pagination, indexler
- Dark mode, toast, skeleton, responsive

## Mimari

```
src/
  app/           # Route katmanı (server components)
  components/    # UI bileşenleri
  modules/       # Domain repository'leri (SOLID)
  lib/           # Supabase, validasyon, sabitler
  providers/     # Theme + React Query
  types/         # Paylaşılan tipler
```
