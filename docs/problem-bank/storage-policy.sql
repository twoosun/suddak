-- Problem bank file storage policy
--
-- Buckets:
-- - problem-set-files: private. Stores problem set PDFs and DOCX files.
-- - generated-exams: private. Stores generated exam PDFs and DOCX files.
-- - thumbnails: public. Stores lightweight thumbnails that may be shown in public listings.
--
-- DB columns keep their existing *_url names for compatibility, but new uploads store
-- Supabase Storage object paths, not permanent public URLs. Admin pages resolve these
-- paths through /api/admin/storage/signed-url before opening files.
--
-- File replacement policy:
-- New uploads create a new object and update the DB pointer. Old files are not deleted
-- immediately; a later orphan cleanup job can remove unreferenced objects.

insert into storage.buckets (id, name, public)
values
  ('problem-set-files', 'problem-set-files', false),
  ('generated-exams', 'generated-exams', false),
  ('thumbnails', 'thumbnails', true)
on conflict (id) do update
set public = excluded.public;

select id, name, public
from storage.buckets
where id in ('problem-set-files', 'generated-exams', 'thumbnails')
order by id;
