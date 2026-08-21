# Yeni Supabase kurulumu

Bu klasör, iki panelin ortak veritabanı şemasını kurmak için gereken tüm
migration dosyalarını içerir.

- `20260804000001`–`20260810000034`: Şantiye yönetim sisteminin temel şeması
- `20260811000035` ve sonrası: Dashboard'un ek proje, araç, imalat, pafta,
  puantaj ve kurumsal takip özellikleri

## Temiz bir Supabase projesine kurulum

Proje kökünde:

```powershell
supabase login
supabase link --project-ref YENI_PROJE_REF
supabase migration list
supabase db push
supabase migration list
```

`db push`, dosyaları zaman damgasına göre sırayla uygular. Aynı SQL dosyalarını
Dashboard üzerinden ayrıca elle çalıştırmayın.

## Uygulama bağlantısı

Yeni projenin URL ve publishable/anon anahtarını `.env.local` içine yazın:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YENI_PROJE_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Kullanıcı silme işlemi kullanılacaksa Edge Function'ı ayrıca yayımlayın:

```powershell
supabase functions deploy delete-user
```

## Kontrol

```powershell
npm run build
```

Mevcut ve veri içeren bir Supabase projesine geçiş yapılıyorsa `db push`
öncesinde veritabanı yedeği alınmalıdır.
